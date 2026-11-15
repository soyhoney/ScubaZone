/**
 * 패키지 관리 — 일정(스케줄) 코드와 같이 써요 (Apps Script에 "패키지"라는 이름으로 새 파일 하나 더 만들어 붙여 넣어요)
 * 펀다이빙 10회 · 20회 · 한 달 무제한 패키지를 회원별로 등록해두면,
 * buildSchedule() 이 그 날 펀다이빙 일정을 넣을 때마다 자동으로 횟수를 소모하고
 * 스케줄표 · 이미지에 이름 옆에 "(3/10)"처럼 표시해 줘요. 보트다이빙 · 나이트다이빙 · 교육은 패키지 대상이 아니에요.
 *
 * 패키지 탭에서 직접 적는 건(노란색) 회원번호 · 패키지 종류 · 시작일 · 결제완료 · 메모 — 이름은 회원번호만 적으면 자동으로 가져와요(회색)
 * 가격 · 종료일 · 사용 횟수 · 잔여 횟수 · 상태(회색)도 전부 자동 계산 · 자동 기록이에요
 * 결제완료는 소모 · 상태 계산이랑 상관없는 별개의 체크예요 (돈 받았는지만 기록하는 용도) — 체크 안 해도 패키지는 시작일부터 바로 소모돼요
 *
 * 폼으로 "펀다이빙 (패키지 혜택 신청)"이 들어오면 pkgRegisterFromForm_()이 여기 자동으로 한 줄 등록해요 (결제완료는 입금 확인 후 손으로 체크)
 * 샵에서 직접 문의 · 결제한 경우는 관리자가 패키지 탭에 손으로 한 줄 추가하면 돼요
 *
 * 처음 한 번: setupPackageSheet 실행 (setupSchedule 안에서도 같이 실행돼요)
 *
 * 그 패키지(한 줄)로 어느 날짜 · 어느 사이트에서 깎였는지 보고 싶으면: 조회하려는 줄(아무 칸)을 선택하고 메뉴 "스쿠버존 → 패키지 소모 일정 조회"
 * (Apps Script에서 pkgMemberHistory 직접 실행도 똑같이 동작해요)
 * (결과 창에서 줄마다 "제외" 버튼으로 바로 그 소모를 취소하고 패키지 사용 횟수를 돌려받을 수 있어요)
 * (차수 열: 같은 회원이 패키지를 여러 번 끊으면 1차 · 2차 …로 자동 번호가 매겨져요 — 줄별로 소모 내역이 안 섞여요)
 * (패키지번호 열: 줄마다 "PK-0001"처럼 절대 안 겹치는 고유 번호가 자동으로 매겨져요 — 회원번호를 새로 타이핑해도, 스크립트로 추가해도 똑같이 매겨져요)
 */
var PKG = '패키지';
var PKG_HEAD = ['회원번호', '이름', '패키지 종류', '시작일', '결제완료', '가격', '종료일', '사용 횟수', '잔여 횟수', '상태', '최근 소모일', '메모', '종료 예정일', '차수', '패키지번호'];
var PKG_INPUT_COLS = [1, 3, 4, 5, 12];   // 회원번호 · 종류 · 시작일 · 결제완료 · 메모 — 관리자가 적는 칸(노란색)
var PKG_AUTO_COLS = [2, 6, 7, 8, 9, 10, 11, 13, 14, 15];   // 이름 · 가격 · 종료일 · 사용횟수 · 잔여횟수 · 상태 · 최근소모일 · 종료예정일 · 차수 · 패키지번호 — 자동(회색, 직접 안 적어도 돼요)
// 종류별 횟수 · 가격 · (무제한이면) 기간(일) — 여기 숫자만 바꾸면 가격 수식도 같이 바뀌어요
var PKG_TYPES = {
  '펀다이빙 10회 패키지': { count: 10, price: 180, days: null },
  '펀다이빙 20회 패키지': { count: 20, price: 340, days: null },
  '펀다이빙 한 달 무제한': { count: null, price: 600, days: 30 }
};
var PKG_DEFAULT_USE = 2;   // 일정 탭 K열(깡수)을 비워두면 하루 기본 2회 소모 — 2-3깡 다르게 할 때만 K열에 직접 숫자(1 · 3 등)를 적어요
var PKG_COLOR = { input: '#FFF2CC', auto: '#EFEFEF' };
var PKG_ROWS = 300;   // 패키지 탭에 미리 준비해두는 줄 수 (넉넉하게)

/* ================= 처음 한 번 ================= */
function setupPackageSheet() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(PKG);
  if (!sh) sh = ss.insertSheet(PKG);
  const n = PKG_ROWS;
  if (sh.getMaxRows() < n + 1) sh.insertRowsAfter(sh.getMaxRows(), n + 1 - sh.getMaxRows());
  if (sh.getMaxColumns() < PKG_HEAD.length) sh.insertColumnsAfter(sh.getMaxColumns(), PKG_HEAD.length - sh.getMaxColumns());
  // 예전에 썼던 "조회" 체크박스 칸 · 그림 버튼(PKG_HEAD보다 뒤쪽 열)이 남아있으면 지워요 — 이제 메뉴 "스쿠버존 → 패키지 소모 일정 조회"만 써요
  if (sh.getMaxColumns() > PKG_HEAD.length) {
    sh.getRange(1, PKG_HEAD.length + 1, sh.getMaxRows(), sh.getMaxColumns() - PKG_HEAD.length).clearDataValidations().clearContent().setBackground(null).setFontWeight('normal');
  }
  sh.getImages().forEach(im => { try { if (im.getScript() === 'pkgMemberHistory') im.remove(); } catch (e) {} });
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, PKG_HEAD.length, 110);
  sh.setColumnWidth(2, 100); sh.setColumnWidth(3, 190); sh.setColumnWidth(12, 220);

  // 헤더 · 바탕색 — 노란색(관리자 입력) · 회색(자동) 칸을 열 위치 상관없이 구분해요
  PKG_INPUT_COLS.forEach(c => {
    sh.getRange(1, c).setValue(PKG_HEAD[c - 1]).setFontWeight('bold').setBackground(PKG_COLOR.input);
    sh.getRange(2, c, n, 1).setBackground('#FFFDF5');
  });
  PKG_AUTO_COLS.forEach(c => {
    sh.getRange(1, c).setValue(PKG_HEAD[c - 1]).setFontWeight('bold').setBackground(PKG_COLOR.auto);
    sh.getRange(2, c, n, 1).setBackground('#F8F8F8');
  });

  sh.getRange(2, 3, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(PKG_TYPES), true).build());
  sh.getRange(2, 4, n, 1).setNumberFormat('yyyy-mm-dd')     // 시작일 — 달력 아이콘으로 날짜 찍을 수 있게
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());
  sh.getRange(2, 5, n, 1).insertCheckboxes();                // 결제완료
  sh.getRange(2, 6, n, 1).setNumberFormat('"$"#,##0');       // 가격
  sh.getRange(2, 7, n, 1).setNumberFormat('yyyy-mm-dd');     // 종료일
  sh.getRange(2, 11, n, 1).setNumberFormat('yyyy-mm-dd');    // 최근 소모일
  sh.getRange(2, 13, n, 1).setNumberFormat('yyyy-mm-dd');    // 종료 예정일(1년 기준)
  sh.getRange(2, 14, n, 1).setNumberFormat('0');              // 차수(1차 · 2차 …)

  // 이름 · 가격 · 종료일 · 잔여 · 상태 · 종료예정일 · 차수는 전부 수식이에요 — 입력 칸(회원번호 · 종류 · 시작일 · 결제완료 · 메모) 말고는 손대지 않아도 저절로 맞춰져요
  const nameF = "=IF(A{r}=\"\",\"\",IFERROR(IFERROR(VLOOKUP(A{r},'활성 회원'!A:N,14,0),VLOOKUP(A{r},'비활성 회원'!A:N,14,0)),\"\"))";
  const priceF = '=IF(C{r}="","",IF(C{r}="펀다이빙 10회 패키지",180,IF(C{r}="펀다이빙 20회 패키지",340,IF(C{r}="펀다이빙 한 달 무제한",600,""))))';
  const endF = '=IF(AND(C{r}="펀다이빙 한 달 무제한",ISNUMBER(D{r})),D{r}+29,"")';
  // 패키지는 횟수 다 남아있어도 1년 지나면 유효기간이 끝나요 — 10회 · 20회 · 무제한 전부 시작일 + 365일로 똑같이 계산해요
  const oneYearF = '=IF(ISNUMBER(D{r}),D{r}+365,"")';
  const remainF = '=IF(C{r}="","",IF(C{r}="펀다이빙 한 달 무제한","-",IF(C{r}="펀다이빙 10회 패키지",10-N(H{r}),IF(C{r}="펀다이빙 20회 패키지",20-N(H{r}),""))))';
  const statusF = '=IF(C{r}="","",IF(C{r}="펀다이빙 한 달 무제한",IF(AND(ISNUMBER(G{r}),TODAY()>G{r}),"만료","진행중"),IF(AND(ISNUMBER(M{r}),TODAY()>M{r}),"만료",IF(N(I{r})<=0,"소진","진행중"))))';
  // 같은 회원번호(A열)가 위에서부터 몇 번째로 나왔는지 세는 거라, 그 회원이 패키지를 두 번째 끊었으면 자동으로 "2"가 돼요 — 손으로 적을 필요 없어요
  const seqF = '=IF(A{r}="","",COUNTIF($A$2:A{r},A{r}))';
  const put = (col, tpl) => {
    const formulas = [];
    for (let i = 0; i < n; i++) formulas.push([tpl.replace(/\{r\}/g, String(i + 2))]);
    sh.getRange(2, col, n, 1).setFormulas(formulas);
  };
  put(2, nameF); put(6, priceF); put(7, endF); put(9, remainF); put(10, statusF); put(13, oneYearF); put(14, seqF);

  // 사용 횟수(H열)는 빈 칸일 때만 0으로 — 이미 쓰고 있던 숫자는 절대 안 건드려요
  const hRange = sh.getRange(2, 8, n, 1);
  const hVals = hRange.getValues();
  let filled = 0;
  for (let i = 0; i < hVals.length; i++) if (hVals[i][0] === '') { hVals[i][0] = 0; filled++; }
  if (filled) hRange.setValues(hVals);

  // 패키지번호(O열)는 "PK-0001"처럼 줄마다 겹치지 않는 고유 번호예요 — 회원번호가 같아도(패키지를 여러 번 끊어도) 절대 안 겹쳐요.
  // 수식이 아니라 값으로 한 번만 찍어두는 거라서, 나중에 줄을 정렬하거나 옮겨도 번호가 안 바뀌어요. 이미 번호가 있는 줄은 그대로 두고, 없는 줄에만 새로 매겨요.
  const idRange = sh.getRange(2, 15, n, 1);
  const idVals = idRange.getValues();
  const codeVals = sh.getRange(2, 1, n, 1).getValues();
  let maxId = 0;
  idVals.forEach(r => { const m = String(r[0] || '').match(/^PK-(\d+)$/); if (m) maxId = Math.max(maxId, Number(m[1])); });
  let idFilled = 0;
  for (let i = 0; i < idVals.length; i++) {
    if (idVals[i][0] === '' && String(codeVals[i][0] || '').trim()) { maxId++; idVals[i][0] = 'PK-' + String(maxId).padStart(4, '0'); idFilled++; }
  }
  if (idFilled) idRange.setValues(idVals);

  pkgSetupConditionalFormat_(sh);
  say_('패키지 탭을 만들었어요. 노란 칸(회원번호 · 종류 · 시작일 · 결제완료 · 메모)만 적으면, 회색 칸은 전부 자동으로 채워져요.');
  return sh;
}

// 상태(J열)가 "소진"이면 그 줄 전체를 회색으로 — TODAY() 기준 수식이 아니라 상태 칸을 직접 보니까 시트를 열 때마다 알아서 맞아요
function pkgSetupConditionalFormat_(sh) {
  const range = sh.getRange(2, 1, PKG_ROWS, PKG_HEAD.length);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$J2="소진"')
    .setBackground('#D9D9D9')
    .setRanges([range])
    .build();
  sh.setConditionalFormatRules([rule]);
}

// 패키지 탭에서 회원번호(A열)가 비어있는 첫 줄을 찾아요 — 수식이 2000줄 넘게 미리 깔려 있어서 getLastRow()로는 못 찾아요
function pkgNextEmptyRow_(sh) {
  const n = Math.max(sh.getLastRow() - 1, 0);
  if (n > 0) {
    const codes = sh.getRange(2, 1, n, 1).getValues();
    for (let i = 0; i < codes.length; i++) if (!String(codes[i][0]).trim()) return i + 2;
  }
  return sh.getLastRow() + 1;
}

// 스크립트로 패키지 탭에 새 줄을 만들 때 바로 번호를 매기려고 — 지금까지 쓰인 가장 큰 "PK-0001" 다음 번호를 돌려줘요
// (수동으로 회원번호만 타이핑해서 만드는 줄은 onEdit이 따로 번호를 매겨요 — members.gs의 onEdit() 참고)
function pkgNextId_(sh) {
  const n = Math.max(sh.getLastRow() - 1, 0);
  let maxId = 0;
  if (n > 0) sh.getRange(2, 15, n, 1).getValues().forEach(r => { const m = String(r[0] || '').match(/^PK-(\d+)$/); if (m) maxId = Math.max(maxId, Number(m[1])); });
  return 'PK-' + String(maxId + 1).padStart(4, '0');
}

/* ================= 소모 처리 (schedule.gs의 buildSchedule() · scImageFromData_ 에서 불러요) ================= */

// 그 회원이 그 날짜 기준으로 쓸 수 있는 패키지를 패키지 탭에서 찾아요 (패키지 탭은 몇백 줄이라 매번 훑어도 느려지지 않아요)
// 패키지 탭 전체를 한 번만 읽어서 재사용해요(일정 탭의 scRawRows_()랑 같은 방식) — 그 날 펀다이빙 인원이 많으면
// 사람마다 패키지 탭을 처음부터 다시 훑던 게 제일 느렸던 부분이라, 한 실행 안에서는 이 캐시 하나로 다 처리해요.
// pkgConsume_()가 소모 처리할 때 이 캐시도 같이 갱신해서, 같은 실행 안에서 바로 다음 사람이 봐도 최신 상태예요.
var PKG_ROWS_CACHE_ = null;
function pkgRawRows_(ss) {
  if (PKG_ROWS_CACHE_) return PKG_ROWS_CACHE_;
  const sh = ss.getSheetByName(PKG);
  PKG_ROWS_CACHE_ = (!sh || sh.getLastRow() < 2) ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, PKG_HEAD.length).getValues();
  return PKG_ROWS_CACHE_;
}

function pkgActive_(ss, code, dateKey) {
  const vals = pkgRawRows_(ss);
  if (!vals.length) return null;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (String(v[0]).trim() !== String(code).trim()) continue;
    const type = PKG_TYPES[String(v[2]).trim()];
    if (!type) continue;
    const start = v[3];
    if (!(start instanceof Date) || scFmt_(start) > dateKey) continue;   // 시작일 전에는 소모 안 해요
    const oneYearEnd = v[12];   // 종료 예정일(1년 기준) — 횟수가 남아있어도 1년 지나면 더 이상 못 써요
    if (oneYearEnd instanceof Date && dateKey > scFmt_(oneYearEnd)) continue;
    if (type.days) {   // 무제한 — 기간 안인지
      const end = new Date(start.getTime() + (type.days - 1) * 864e5);
      if (dateKey > scFmt_(end)) continue;
    } else {           // 횟수제 — 이미 다 썼으면 패스
      if ((Number(v[7]) || 0) >= type.count) continue;
    }
    return { row: i + 2, type: type, start: start, seq: v[13] };
  }
  return null;
}

// 패키지 탭에 실제로 소모 횟수 · 최근 소모일을 적어요
function pkgConsume_(ss, row, addUse, date) {
  const sh = ss.getSheetByName(PKG);
  const idx = row - 2;
  const cached = PKG_ROWS_CACHE_ && PKG_ROWS_CACHE_[idx];
  // 캐시가 있으면 거기서 현재 사용 횟수를 읽어요(시트를 또 안 읽어도 돼요) — 바로 써서 다음 사람도 최신 값을 보게 해요
  const curUsed = cached ? (Number(cached[7]) || 0) : (Number(sh.getRange(row, 8).getValue()) || 0);
  const newUsed = curUsed + addUse;
  sh.getRange(row, 8, 1, 1).setValue(newUsed);
  sh.getRange(row, 11).setValue(date);
  if (cached) { cached[7] = newUsed; cached[10] = date; }
  return newUsed;
}

function pkgBadgeText_(type, used) {
  // 숫자는 그대로 "(사용/총)" — 뜻은 칸 제목("패키지 (사용/총)")에서 밝혀요
  return type.days ? ('[무제한 ' + used + '회]') : ('(' + used + '/' + type.count + ')');
}

// 일정 탭 N열(패키지 카운팅) 배지는 "그때그때 처리하면서 찍어둔 숫자"라서, 나중에 중간 줄 하나를 되돌리거나(제외 · 나이트 되돌리기) 깡수를 손으로 고치면
// 그 뒤에 이미 찍혀있던 배지들은 그대로 남아서 실제 잔여 횟수랑 안 맞게 돼요. 이 함수가 그 회원의 패키지별 배지를 날짜 순서로 처음부터 다시 계산해서 싹 다시 써요.
// (차수 구분이 없는 옛날 줄은 어느 패키지인지 몰라서 안 건드려요 — pkgShowHistory_의 "안 보여요" 안내랑 같은 이유예요)
function pkgRecalcBadges_(code) {
  const ss = SpreadsheetApp.getActive();
  const dataSh = ss.getSheetByName(SC.DATA);
  const pkgSh = ss.getSheetByName(PKG);
  if (!dataSh || dataSh.getLastRow() < 2 || !pkgSh) return;
  const typeBySeq = {};
  let onlySeq = null, pkgRowCount = 0;
  if (pkgSh.getLastRow() > 1) {
    pkgSh.getRange(2, 1, pkgSh.getLastRow() - 1, PKG_HEAD.length).getValues().forEach(r => {
      if (String(r[0]).trim() !== code) return;
      const seq = Number(r[13]) || 0;
      typeBySeq[seq] = PKG_TYPES[String(r[2]).trim()];
      onlySeq = seq; pkgRowCount++;
    });
  }
  const n = dataSh.getLastRow() - 1;
  const vals = dataSh.getRange(2, 1, n, SC_HEAD.length).getValues();
  const bySeq = {};
  vals.forEach((r, i) => {
    if (String(r[1]).trim() !== code || r[12] !== true) return;
    let seq = (typeof r[14] === 'number' && r[14] > 0) ? r[14] : 0;
    // 패키지가 딱 하나뿐인 회원이면, 차수 태그가 없는 옛날 줄도 그 패키지 것으로 봐도 안전해요 — 헷갈릴 다른 패키지가 없어서요
    if (seq === 0 && pkgRowCount === 1) seq = onlySeq;
    (bySeq[seq] = bySeq[seq] || []).push({ idx: i, use: Number(r[11]) || 0, date: r[0] });
  });
  Object.keys(bySeq).forEach(seq => {
    const type = typeBySeq[Number(seq)];
    if (!type) return;   // 패키지가 여러 개인데 태그가 없어서 어느 쪽인지 모르는 줄 — pkgShowHistory_랑 같은 이유로 안 건드려요
    let running = 0;
    bySeq[seq].sort((a, b) => a.date - b.date).forEach(x => {
      running += x.use;
      dataSh.getRange(x.idx + 2, 14).setValue(pkgBadgeText_(type, running));
    });
  });
}

// 지금까지 쌓인 배지가 이미 틀어져 있을 때 한 번 돌려서 전부 바로잡아요(패키지 탭에 있는 회원 전원 대상).
// 앞으로는 사용 횟수를 바꾸는 곳(깡수 수정 · 제외 버튼 · 나이트다이빙 되돌리기)마다 자동으로 같이 돌아서, 이건 지금 꼬여있는 걸 한 번 청소할 때만 쓰면 돼요.
function runRecalcAllBadges() {
  const ss = SpreadsheetApp.getActive();
  const pkgSh = ss.getSheetByName(PKG);
  if (!pkgSh || pkgSh.getLastRow() < 2) { SpreadsheetApp.getActive().toast('패키지 탭이 비어있어요.', '배지 다시 계산', 5); return; }
  const codes = new Set(pkgSh.getRange(2, 1, pkgSh.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim()).filter(Boolean));
  codes.forEach(code => pkgRecalcBadges_(code));
  SpreadsheetApp.getActive().toast(codes.size + '명의 패키지 배지를 다시 계산했어요.', '배지 다시 계산', 8);
}

// ms(그룹의 멤버 배열, scReadEntries_가 만든 {code, row, pkgUse, pkgDone, pkgBadge, name, ...})를 받아서
// 이미 처리된 적 있으면(L열 "패키지 여부" 체크박스가 TRUE면) 그대로 쓰고, 처음이면 패키지에서 소모해서 K · L · M열에 적고, m.name에 배지를 붙여요.
// 한 번 L열이 체크되고 나면 다시 돌려도 또 소모하지 않아요(같은 날짜로 스케줄을 다시 만들어도 안전) — 그래서 일정 탭 전체를 훑을 필요가 없어요.
function pkgApplyToMembers_(ss, date, ms) {
  const dataSh = ss.getSheetByName(SC.DATA);
  const dateKey = scFmt_(date);
  ms.forEach(m => {
    if (!m.code || m.code === '?') return;   // 회원번호 모르는 사람은 패키지 처리 안 해요
    let badge = String(m.pkgBadge || '').trim();
    if (!m.pkgDone) {
      const active = pkgActive_(ss, m.code, dateKey);
      if (active) {
        const use = (Number(m.pkgUse) > 0) ? Number(m.pkgUse) : PKG_DEFAULT_USE;
        const newUsed = pkgConsume_(ss, active.row, use, date);
        badge = pkgBadgeText_(active.type, newUsed);
        if (!active.type.days && newUsed >= active.type.count) badge += ' ⚠️다음부터 결제';   // 이번 다이빙으로 횟수를 다 썼어요 — 다음부터는 결제 필요
        // L · M · N · O열(깡수 · 패키지여부 · 배지 · 패키지구분)이 붙어있는 칸이라, 한 번에 묶어서 써요 — 사람마다 4번 왕복하던 걸 1번으로 줄여서 스케줄 만들기가 빨라져요
        if (dataSh && m.row) dataSh.getRange(m.row, 12, 1, 4).setValues([[use, true, badge, active.seq]]);
        m.pkgDone = true;
        m.pkgBadge = badge;
      } else {
        // 지금 쓸 수 있는 패키지가 없어요 — 패키지 탭에 이 회원 줄이 있는데(전에 패키지가 있었는데) 소진 · 만료됐으면, 지금은 패키지 없이 다이빙하는 거니까 결제 필요 표시를 해줘요
        const pkgRow = pkgFindRowByCode_(m.code);
        if (pkgRow) {
          const status = String(ss.getSheetByName(PKG).getRange(pkgRow, 10).getValue() || '').trim();
          if (status === '소진' || status === '만료') badge = '⚠️ 패키지 종료';
        }
      }
    }
    // 이름에는 더 이상 안 붙여요 — 스케줄표에서 이름 옆에 "패키지" 칸을 따로 둬서 거기에만 보여줘요 (패키지 없는 사람은 그 칸에 "-")
    m.pkgBadge = badge;
  });
}

// 패키지 시작일이 과거라서, 이미 일정 탭에 쌓여있던 날짜들을 소급해서 한 번에 소모 처리하고 싶을 때 써요.
// (buildSchedule()은 "그 날짜"에 스케줄을 만들 때만 소모하기 때문에, 이미 지나간 날짜들은 따로 한 번 돌려줘야 해요)
// 회원번호 하나만 보고 그 사람 줄만 훑어요 — 일정 탭 전체를 여러 번 도는 게 아니라 한 번 읽고 필터링만 하는 거라 안 느려요.
function pkgBackfillMember_(code) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.DATA);
  if (!sh || sh.getLastRow() < 2) { Logger.log('일정 탭이 비어있어요.'); return; }
  const S = scReadSettings_(ss);
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, SC_HEAD.length).getValues();
  const mine = [];
  rows.forEach((r, idx) => {
    if (String(r[1]).trim() !== String(code).trim()) return;
    if (!(r[0] instanceof Date) || !r[4]) return;
    const cat = String(r[3] || '').trim();
    const label = scSynthLabel_(r[3], r[4], r[5]);
    const info = S.labels[scNorm_(label)];
    const kind = info ? info.kind : (SC_CAT_KIND_HINT[cat] || 'Fun');
    if (kind !== 'Fun') return;   // 보트 · 나이트 · 교육은 패키지 대상 아니에요
    mine.push({ date: r[0], m: { code: String(r[1]), name: String(r[2] || r[1]), row: idx + 2, pkgUse: r[11], pkgDone: r[12] === true, pkgBadge: String(r[13] || '').trim() } });
  });
  mine.sort((a, b) => a.date - b.date);   // 날짜 순서대로 소모해야 "몇 번째"가 맞아요
  let n = 0;
  mine.forEach(x => { pkgApplyToMembers_(ss, x.date, [x.m]); if (x.m.pkgBadge) n++; });
  SpreadsheetApp.getActive().toast(code + ' 과거 펀다이빙 ' + mine.length + '건 중 ' + n + '건 소급 처리했어요.', '패키지 소급 처리', 8);
}

// 회원번호로 패키지 탭 줄을 찾아요 (활성 조건 안 따지고 그냥 그 사람 줄 — 사용 횟수 손으로 조정할 때 써요)
function pkgFindRowByCode_(code) {
  const ss = SpreadsheetApp.getActive();
  const vals = pkgRawRows_(ss);   // 캐시 재사용 — 패키지 없는 회원(가장 흔한 경우)마다 또 전체를 읽지 않게
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() === String(code).trim()) return i + 2;
  return null;
}

// 패키지 탭에서 회원 줄(아무 칸이나) 선택해두고 이 함수를 실행하면, 그 회원이 패키지로 소모한 일정(날짜 · 다이빙 사이트 · 그날 소모 횟수)을
// 전부 모아서 창으로 보여줘요 — "사용 횟수" 숫자 하나만 보고는 어떤 날짜 · 사이트에서 깎였는지 알 수 없을 때 이걸로 확인하면 돼요.
// 회원이 아니라 "그 회원이 끊은 패키지 한 건"을 기준으로 조회해요 — 한 회원이 패키지를 여러 번 끊었으면, 지금 선택한 그 줄(차수)로
// 깎인 일정만 보여줘요. 일정 탭 O열(패키지 구분)에 그 소모가 몇 차 패키지 것인지 찍어두기 때문에 가능해요.
function pkgMemberHistory() {
  const ss = SpreadsheetApp.getActive();
  const cell = ss.getActiveCell();
  const sh = cell.getSheet();
  if (sh.getName() !== PKG) { SpreadsheetApp.getUi().alert('패키지 탭에서 조회하고 싶은 패키지 줄(아무 칸)을 선택하고 다시 실행해주세요.'); return; }
  const row = cell.getRow();
  const code = String(sh.getRange(row, 1).getValue() || '').trim();
  if (!code) { SpreadsheetApp.getUi().alert('그 줄에 회원번호가 없어요.'); return; }
  const name = sh.getRange(row, 2).getValue();
  const seq = Number(sh.getRange(row, 14).getValue()) || null;
  const type = sh.getRange(row, 3).getValue();
  const pkgId = String(sh.getRange(row, 15).getValue() || '').trim();
  pkgShowHistory_(code, name, seq, type, pkgId, row);
}

function pkgShowHistory_(code, name, seq, type, pkgId, pkgRow) {
  const ss = SpreadsheetApp.getActive();
  const dataSh = ss.getSheetByName(SC.DATA);
  const pkgSh = ss.getSheetByName(PKG);
  // 이 회원이 패키지를 몇 번 끊었는지 — 한 번뿐이면 "패키지 구분"(O열) 생기기 전에 깎인 옛날 줄도 당연히 이 패키지니까 같이 보여줘요
  const codeRowCount = pkgSh && pkgSh.getLastRow() > 1
    ? pkgSh.getRange(2, 1, pkgSh.getLastRow() - 1, 1).getValues().filter(r => String(r[0]).trim() === code).length : 0;
  const rows = []; let unassigned = 0, unassignedUse = 0;
  if (dataSh && dataSh.getLastRow() > 1) {
    const vals = dataSh.getRange(2, 1, dataSh.getLastRow() - 1, SC_HEAD.length).getValues();
    vals.forEach((r, i) => {
      if (String(r[1]).trim() !== code || r[12] !== true) return;   // M열(패키지 여부) 체크된, 실제로 소모된 줄만
      const tag = r[14];   // O열 = 패키지 구분(몇 차 패키지인지)
      const use = Number(r[11]) || 0;
      if (typeof tag === 'number' && tag > 0) {
        if (seq && tag !== seq) return;   // 다른 차수 패키지에서 깎인 줄은 제외
      } else if (codeRowCount > 1) {
        unassigned++; unassignedUse += use; return;   // 패키지가 여러 개인데 구분 기록이 없는 옛날 줄 — 몇 차인지 몰라서 합산에서 빼고 따로 안내만 해요
      }
      rows.push({ row: i + 2, date: r[0] instanceof Date ? scFmt_(r[0]) : String(r[0] || ''), site: String(r[5] || '') || '-', use: use });
    });
  }
  rows.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const total = rows.reduce((n, r) => n + r.use, 0);
  const subtitle = (pkgId ? pkgId + ' · ' : '') + (type ? type + ' · ' : '') + (seq ? seq + '차' : '차수 미상');
  const note = unassigned ? '<div class="warn">※ 이 회원은 패키지를 ' + codeRowCount + '번 끊었는데, 그 중 구분 기록이 없는 옛날 소모 ' + unassigned + '건(총 ' + unassignedUse + '회)은 몇 차인지 몰라서 안 보여요 — 날짜 보고 직접 확인해주세요.</div>' : '';
  const html = HtmlService.createHtmlOutput(
    '<style>body{font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;font-size:14px;padding:4px;color:#1F2A30}' +
    'table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:6px 8px;border-bottom:1px solid #E1E8EB;text-align:left}' +
    'th{background:#D9E1F2}h3{margin:0 0 2px}.sub{color:#2E5E80;font-size:12px;margin-bottom:6px}.sum{color:#7A8A92;margin-bottom:8px}' +
    '.warn{background:#FDECEA;color:#9A2A1C;border-radius:6px;padding:6px 8px;font-size:12px;margin-top:8px}' +
    'button.ex{background:#fff;border:1px solid #E08E79;color:#C0392B;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer}' +
    'button.ex:disabled{opacity:.5;cursor:default}' +
    'tr.gone{opacity:.35;text-decoration:line-through}</style>' +
    '<h3>' + (name || code) + ' (' + code + ')</h3>' +
    '<div class="sub">' + subtitle + '</div>' +
    '<div class="sum" id="sum">이 패키지로 소모된 일정 ' + rows.length + '건 · 총 ' + total + '회 소모</div>' +
    '<table><tr><th>날짜</th><th>다이빙 사이트</th><th>그날 소모</th><th></th></tr>' +
    '<tbody id="body">' +
    (rows.length ? rows.map(r => '<tr data-row="' + r.row + '" data-use="' + r.use + '"><td>' + r.date + '</td><td>' + r.site + '</td><td>' + r.use + '회</td>' +
      '<td><button class="ex" onclick="ex(this)">제외</button></td></tr>').join('') : '<tr><td colspan="4">패키지로 소모된 기록이 아직 없어요.</td></tr>') +
    '</tbody></table>' + note +
    '<script>' +
    'function ex(btn){' +
    "  if(!confirm('이 일정을 패키지 소모에서 제외할까요? 패키지 사용 횟수가 그만큼 다시 돌아가요.')) return;" +
    '  btn.disabled = true; btn.textContent = "...";' +
    '  var tr = btn.closest("tr"); var row = Number(tr.dataset.row); var use = Number(tr.dataset.use);' +
    '  google.script.run.withSuccessHandler(function(){' +
    '    tr.classList.add("gone"); btn.remove();' +
    '  }).withFailureHandler(function(err){ btn.disabled = false; btn.textContent = "제외"; alert("실패: " + err.message); })' +
    '  .pkgUnconsumeRow_(row, ' + pkgRow + ', use);' +
    '}' +
    '</script>'
  ).setWidth(460).setHeight(480);
  SpreadsheetApp.getUi().showModalDialog(html, '패키지 소모 일정 · ' + (name || code));
}

// pkgMemberHistory() 조회 창의 "제외" 버튼이 불러요 — 그 일정 한 줄만 패키지 소모에서 빼고(L · M · N · O열 지움), 패키지 탭 사용 횟수도 그만큼 돌려줘요.
function pkgUnconsumeRow_(dataRow, pkgRow, use) {
  const ss = SpreadsheetApp.getActive();
  const dataSh = ss.getSheetByName(SC.DATA);
  const pkgSh = ss.getSheetByName(PKG);
  if (!dataSh || !pkgSh) throw new Error('탭을 못 찾았어요.');
  const code = String(dataSh.getRange(dataRow, 2).getValue() || '').trim();
  dataSh.getRange(dataRow, 12).setValue('');     // L열 깡수
  dataSh.getRange(dataRow, 13).setValue(false);  // M열 패키지 여부
  dataSh.getRange(dataRow, 14).setValue('');     // N열 배지
  dataSh.getRange(dataRow, 15).setValue('');     // O열 패키지 구분
  const hCell = pkgSh.getRange(pkgRow, 8);
  hCell.setValue(Math.max(0, (Number(hCell.getValue()) || 0) - (Number(use) || 0)));
  if (code) pkgRecalcBadges_(code);   // 이 회원의 남은 배지들도 바뀐 숫자에 맞게 다시 계산해요
  return true;
}

// 디버그용: 깡수(L열) 셀 하나 클릭해서 선택해두고 이 함수를 실행하면, onEdit 없이 바로 pkgOnUseEdit_을 테스트해요.
// 실행 로그에 각 단계가 다 찍혀서, 어디서 멈추는지 바로 보여요.
function debugPkgRow() {
  const ss = SpreadsheetApp.getActive();
  const cell = ss.getActiveCell();
  const sh = cell.getSheet();
  if (sh.getName() !== SC.DATA) { Logger.log('일정 탭에서 깡수(L열) 셀을 선택하고 다시 실행해주세요. 지금 선택된 시트: ' + sh.getName()); return; }
  const row = cell.getRow();
  const newVal = sh.getRange(row, 12).getValue();
  Logger.log('선택한 행 ' + row + ', L열(깡수) 현재 값 = ' + newVal);
  pkgOnUseEdit_(sh, row, newVal, 2);
}

// 일정 탭에서 깡수(L열)를 "이미 소모 처리된 줄"(M열 "패키지 여부" 체크박스가 TRUE인 줄)에서 손으로 고치면,
// 패키지 탭 사용 횟수를 그 차이만큼 바로 조정하고 N열 배지도 새 숫자로 다시 그려요. members.gs의 onEdit()이 불러요.
// (처리 전 줄이면 — M열 체크가 안 돼있으면 — 아직 손댈 게 없어요. 다음에 스케줄 만들 때 고친 값 그대로 소모돼요)
function pkgOnUseEdit_(sh, row, newVal, oldVal) {
  const done = sh.getRange(row, 13).getValue() === true;
  Logger.log('pkgOnUseEdit_ row=' + row + ' newVal=' + newVal + ' oldVal=' + oldVal + ' done=' + done);
  if (!done) { Logger.log('→ M열(패키지 여부) 체크 안 돼있어서 중단'); return; }
  const code = String(sh.getRange(row, 2).getValue() || '').trim();
  if (!code || code === '?') { Logger.log('→ 회원번호 없음/? 라서 중단'); return; }
  const pkgRow = pkgFindRowByCode_(code);
  Logger.log('code=' + code + ' pkgRow=' + pkgRow);
  if (!pkgRow) { Logger.log('→ 패키지 탭에서 ' + code + ' 못 찾아서 중단'); return; }
  const oldUse = (Number(oldVal) > 0) ? Number(oldVal) : PKG_DEFAULT_USE;
  const newUse = (Number(newVal) > 0) ? Number(newVal) : PKG_DEFAULT_USE;
  const delta = newUse - oldUse;
  Logger.log('oldUse=' + oldUse + ' newUse=' + newUse + ' delta=' + delta);
  if (!delta) { Logger.log('→ 차이 0이라 중단'); return; }
  const ss = SpreadsheetApp.getActive();
  const pkgSh = ss.getSheetByName(PKG);
  const hCell = pkgSh.getRange(pkgRow, 8);
  const used = Math.max(0, (Number(hCell.getValue()) || 0) + delta);
  hCell.setValue(used);
  sh.getRange(row, 12).setValue(newUse);   // L열 — 비워서 기본값 쓴 거면 실제 숫자로 채워줘요
  pkgRecalcBadges_(code);                  // 이 줄만이 아니라, 이 회원의 모든 배지를 날짜 순서로 다시 계산해서 맞춰요
  ss.toast('패키지 사용 횟수 ' + (delta > 0 ? '+' : '') + delta + '회 반영했어요 (총 ' + used + '회). 스케줄표에 보이는 숫자는 "스케줄 만들기"를 다시 눌러야 갱신돼요.', '패키지 조정', 8);
}

/* ================= 폼 등록 ================= */

// 폼에서 "펀다이빙 (패키지 혜택 신청)"으로 들어오면 schedule.gs의 addFormEntry_()가 이 함수를 불러서
// 패키지 탭에 자동으로 한 줄 등록해요. 결제완료는 아직 체크 안 해둬요 — 입금 확인되면 체크박스만 눌러주면 돼요.
function pkgRegisterFromForm_(code, pkgLabel, day) {
  if (!PKG_TYPES[pkgLabel]) return;
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(PKG) || setupPackageSheet();
  if (sh.getLastRow() > 1) {
    const codes = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim());
    if (codes.indexOf(String(code).trim()) >= 0) return;   // 이미 등록돼 있으면 중복으로 또 안 만들어요
  }
  const row = pkgNextEmptyRow_(sh);
  sh.getRange(row, 1).setValue(code);
  sh.getRange(row, 3).setValue(pkgLabel);
  sh.getRange(row, 4).setValue(day);
  sh.getRange(row, 5).setValue(false);
  sh.getRange(row, 15).setValue(pkgNextId_(sh));
}

