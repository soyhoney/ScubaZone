/**
 * 스쿠버존 회원 관리 (1단계)
 *
 * 탭: 활성 회원 · 비활성 회원 (1행 = 버튼 줄, 2행 = 제목, 3행부터 회원)
 *  - [회원 찾기]  이름 · 영문 · 회원번호로 두 탭 모두에서 찾아요 → 시트에서 보기 · 비활성화 · 활성화
 *  - 상태 칸(O열) 드롭다운: 활성 회원에서 "비활성"을 고르면 → 비활성 회원 탭 맨 위로
 *                          비활성 회원에서 "활성"을 고르면 → 활성 회원 탭 맨 위로 (🔁 재방문 표시)
 *  - 회원 등록 폼으로 등록하면 → 활성 회원 탭 맨 위에 새 회원번호(J….) · 🆕 신규
 *
 * 처음 한 번: setup 실행 (가져온 탭에 버튼 줄을 넣어요) → buildForm
 */

var ACTIVE = '활성 회원';
var INACTIVE = '비활성 회원';
var FORM_RESP = '폼 응답';
var HEAD = ['회원번호', 'FirstName', 'LastName', 'Birthdate', 'Nationality', 'Gender', 'PassportNumber', 'Activity', 'Accomodation', 'RoomNumber',
  'ResponsiblePassportNumber', 'ResponsibleNationality', '최초 등록일', '한글 이름', '상태', '신규', '방문 기록 (기존)', '마지막 방문', 'E-mail', '연락처',
  '숙소 · 위치', '픽업', '레벨', '발급 단체', '총 다이빙', '마지막 다이빙', '신청 종류', '여권 사본', '자격증', '증명사진', '메디컬', '주소', '영문 주소', '메모', '카카오톡 아이디',
  'Family'];   // 끝에 추가 — 강사는 아니지만 백업으로 다이빙 도와주는 가족/지인 회원 표시용 체크박스. 체크된 회원은 이론교육 리스트 대상에서 빠져요(이론교육.gs)
var H = t => HEAD.indexOf(t) + 1;                       // 열 번호
// 새 회원이 폼으로 등록되면 이 주소로 메일을 보내요 (MJ 쌤 이메일을 적어 주세요. 비워 두면 안 보내요)
var NOTIFY_EMAIL = '';
// 🆕 신규 · 🔁 재방문 표시를 며칠 동안 남길지 (지나면 매일 새벽에 자동으로 지워져요)
var NEW_MARK_DAYS = 2;    // 🆕 신규
var MARK_DAYS = 2;        // 🔁 재방문
var M_HEAD = 2;                                          // 제목 줄
var M_FIRST = 3;                                         // 첫 회원 줄
var C = { head: '#D9E1F2', active: '#E3F1EA', inactive: '#EFE9F7', mark: '#FFF2CC', warn: '#F8CBAD', bar: '#F3F7FA' };
var LINK_COLS = ['여권 사본', '자격증', '증명사진'];
var STATUS_RULE = () => SpreadsheetApp.newDataValidation().requireValueInList(['활성', '비활성'], true).setAllowInvalid(false).build();
var DATE_COLS = ['Birthdate', '최초 등록일', '마지막 방문', '마지막 다이빙'];
// 손님이 폼에 이름을 대문자 · 소문자 · 섞어서 적어도, FirstName · LastName은 항상 "첫 글자만 대문자"로 통일해서 저장해요 (예: CHAEYOUNG → Chaeyoung, mi ri → Mi Ri)
var toTitleCase_ = s => String(s || '').trim().toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, sep, c) => sep + c.toUpperCase());

/* ================= 처음 한 번 ================= */
function setup() {
  const ss = SpreadsheetApp.getActive();
  [ACTIVE, INACTIVE].forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getMaxColumns() < HEAD.length) sh.insertColumnsAfter(sh.getMaxColumns(), HEAD.length - sh.getMaxColumns());   // HEAD에 칸이 새로 늘어났는데 시트에 실제 칸이 모자라면 먼저 늘려요
    if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
    if (String(sh.getRange(1, 1).getValue()) === '회원번호') sh.insertRowBefore(1);   // 가져온 그대로면 맨 위에 버튼 줄 하나 넣기
    sh.getRange(M_HEAD, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground(C.head).setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');   // HEAD에 칸을 새로 추가해도 다음에 setup()만 다시 실행하면 자동으로 따라와요
    sh.getRange(1, 1, 1, HEAD.length).setBackground(C.bar);
    sh.setRowHeight(1, 52);
    sh.setFrozenRows(M_HEAD); sh.setFrozenColumns(2);
    const n = Math.max(sh.getMaxRows() - M_HEAD, 1);
    sh.getRange(M_FIRST, H('상태'), n, 1).setDataValidation(STATUS_RULE()).setFontWeight('bold').setBackground(name === ACTIVE ? C.active : C.inactive);
    DATE_COLS.forEach(t => sh.getRange(M_FIRST, H(t), n, 1).setNumberFormat('yyyy-mm-dd'));
    // 픽업: 설정 탭 F열(픽업 장소) 목록 + ? · - 로 드롭다운 — 일정 탭 픽업 드롭다운이랑 같은 목록이에요. 목록에 없는 값도 막지는 않아요(새 픽업 장소 생겼을 때 안 막히게)
    const setSh = ss.getSheetByName(typeof SC !== 'undefined' ? SC.SET : '설정');
    const pickupChoices = ['-', '?'];
    if (setSh && setSh.getLastRow() > 1) setSh.getRange(2, 6, setSh.getLastRow() - 1, 1).getValues().forEach(r => { if (r[0]) pickupChoices.push(String(r[0]).trim()); });
    sh.getRange(M_FIRST, H('픽업'), n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(pickupChoices, true).setAllowInvalid(true).build());
    sh.getRange(M_FIRST, H('Family'), n, 1).insertCheckboxes();
    markRules_(sh);
    // 예전 비활성화하기 · 활성화하기 버튼은 지우고 회원 찾기만
    sh.getImages().forEach(im => { try { if (['openDeactivateDialog', 'openActivateDialog'].indexOf(im.getScript()) >= 0) im.remove(); } catch (e) {} });
    mButtons_(sh, name === ACTIVE
      ? [['find', 'openFindDialog', 1], ['addm', 'openAddMemberDialog', 5], ['bulkoff', 'bulkDeactivate', 9]]
      : [['find', 'openFindDialog', 1], ['bulkon', 'bulkActivate', 5]]);
  });
  // 신규 · 재방문 표시 자동 정리 (매일 새벽 5시)
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'clearOldMarks')) {
    ScriptApp.newTrigger('clearOldMarks').timeBased().everyDays(1).atHour(5).create();
  }
  say_('준비됐어요! 활성 · 비활성 회원 탭 맨 위에 버튼이 생겼어요.');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('스쿠버존')
    .addItem('회원 찾기', 'openFindDialog')
    .addItem('회원 직접 추가', 'openAddMemberDialog')
    .addItem('회원 이력 조회', 'openHistoryDialog')
    .addItem('대기중인 폼 신청', 'openPendingFormDialog')
    .addSeparator()
    .addItem('패키지 소모 일정 조회', 'pkgMemberHistory')
    .addItem('패키지에 일정 추가', 'pkgAddConsumptionDialog')
    .addSeparator()
    .addItem('서식 다시 맞추기 · 버튼 다시 붙이기', 'setup')
    .addItem('폼 만들기 (완성될 때까지 반복)', 'buildForm')
    .addToUi();
}

// 그림 버튼 (누르면 함수 실행). 같은 함수 버튼이 있으면 지우고 새로 붙여요
function mButtons_(sh, list) {
  const fns = list.map(x => x[1]);
  sh.getImages().forEach(im => { try { if (fns.indexOf(im.getScript()) >= 0) im.remove(); } catch (e) {} });
  list.forEach(([key, fn, col]) => {
    try {
      const img = sh.insertImage(Utilities.newBlob(Utilities.base64Decode(M_BUTTONS[key]), 'image/png', key + '.png'), col, 1, 4, 6);
      img.setWidth(220); img.setHeight(40);
      img.assignScript(fn);
    } catch (e) { Logger.log('버튼 실패 ' + fn + ': ' + e.message); }
  });
}

// 신규 회원 줄 = 노란색 (MJ 쌤 확인용) · 재방문 줄 = 하늘색. 신규 칸(P열)을 지우면 색이 빠져요
// 1 → A, 27 → AA 처럼 열 번호를 글자로
function colLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function markRules_(sh) {
  const rng = sh.getRange(M_FIRST, 1, Math.max(sh.getMaxRows() - M_HEAD, 1), HEAD.length);
  const p = '$P' + M_FIRST;
  const rules = [];
  if (sh.getName() === ACTIVE) {
    // 활성 회원인데 픽업 장소가 비어있거나 "?"(모르겠음)면 연한 빨간색으로 — 확인하고 채워 넣으라는 표시예요
    // "-"(픽업 필요 없음 · 직접 옴)는 정상적인 값이라 빨간색에서 빼요
    // 맨 앞에 둬서 신규/재방문 표시보다 우선 보이게 해요 (조건부 서식은 먼저 적힌 규칙이 이겨요)
    const pk = '$' + colLetter_(H('픽업')) + M_FIRST;
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=OR(' + pk + '="",' + pk + '="?")').setBackground('#F9CBC5').setRanges([rng]).build());
  }
  rules.push(
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=ISNUMBER(SEARCH("신규",' + p + '))').setBackground('#FFE599').setRanges([rng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=ISNUMBER(SEARCH("재방문",' + p + '))').setBackground('#DDEBF7').setRanges([rng]).build()
  );
  sh.setConditionalFormatRules(rules);
}

// 신규(최초 등록일 기준) · 재방문(메모의 "재방문 날짜" 기준)이 MARK_DAYS 일 지나면 표시를 지워요
function clearOldMarks() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(ACTIVE);
  const rows = memberRows_(sh);
  const now = new Date();
  const days = d => (now - d) / 864e5;
  let n = 0;
  rows.forEach((r, i) => {
    const mark = String(r[H('신규') - 1] || '');
    if (!mark) return;
    let since = null, limit = MARK_DAYS;
    if (/신규/.test(mark) && r[H('최초 등록일') - 1] instanceof Date) { since = r[H('최초 등록일') - 1]; limit = NEW_MARK_DAYS; }
    if (/재방문/.test(mark)) {
      const m = String(r[H('메모') - 1] || '').match(/재방문 (\d{4})-(\d{2})-(\d{2})(?![\s\S]*재방문 \d)/);
      if (m) since = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    if (since && days(since) > limit) { sh.getRange(M_FIRST + i, H('신규')).clearContent(); n++; }
  });
  if (n) Logger.log('신규 · 재방문 표시 ' + n + '개를 지웠어요');
}

/* ================= 상태 칸에서 바로 바꾸기 ================= */
// 활성 회원 탭에서 상태를 "비활성"으로 → 비활성 회원 탭으로 / 비활성 회원 탭에서 "활성"으로 → 활성 회원 탭으로
function onEdit(e) {
  if (!e || !e.range || e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
  const sh = e.range.getSheet();
  const name = sh.getName();
  const ss = e.source;

  // 일정 탭: D열(카테고리) 고르면 E열(종류) 선택지를 거기 맞게 바꾸고, E열(종류)에서 교육 과정을 한글로 고르면 영문 값으로 바꿔요
  if (name === SC.DATA && e.range.getRow() >= 2) {
    const col = e.range.getColumn();
    if (col === 4) { try { scOnKindEdit_(sh, e.range.getRow(), e.value); } catch (err) {} return; }
    if (col === 5) { try { scOnTypeEdit_(sh, e.range.getRow(), e.value); } catch (err) {} return; }
    // L열(깡수) — 이미 패키지 소모 처리된 줄(M열에 배지 있음)에서 숫자를 고치면, 패키지 탭 사용 횟수를 차이만큼 바로 조정해요
    if (col === 12) { try { pkgOnUseEdit_(sh, e.range.getRow(), e.value, e.oldValue); } catch (err) { Logger.log('패키지 조정 실패: ' + err.message); } return; }
  }
  // 패키지 탭: 회원번호(A열)를 손으로 타이핑해서 새 줄을 만들면, 패키지번호(O열)가 비어있을 때만 자동으로 다음 번호("PK-0001" 다음 번호)를 매겨요
  if (typeof PKG !== 'undefined' && name === PKG && e.range.getRow() >= 2 && e.range.getColumn() === 1) {
    try {
      if (String(e.value || '').trim() && !sh.getRange(e.range.getRow(), 15).getValue()) sh.getRange(e.range.getRow(), 15).setValue(pkgNextId_(sh));
    } catch (err) { Logger.log('패키지번호 자동 부여 실패: ' + err.message); }
    return;
  }
  // 이론교육 탭: 발송완료(F열) 체크하면 발송일(G열)을 오늘 날짜로 자동 기록하고, 체크 해제하면 발송일도 같이 지워요
  if (typeof THEORY !== 'undefined' && name === THEORY && e.range.getRow() >= 2 && e.range.getColumn() === 6) {
    try { theoryOnDoneEdit_(sh, e.range.getRow(), e.value); } catch (err) { Logger.log('이론교육 발송일 기록 실패: ' + err.message); }
    return;
  }
  // 폼 응답 탭 "활성화" 체크는 여기서 안 하고, 설치형 트리거(onFormActivateEdit)가 따로 처리해요 —
  // 이 onEdit(단순 트리거)는 구글이 권한을 제한해서 DriveApp(파일 이름 바꾸기)을 못 써요. 아래 onFormActivateEdit 참고
  // 회원 탭 픽업 칸을 바꾸면, 오늘 이후(오늘 포함) 이미 잡혀있던 그 회원 일정의 픽업도 같이 바꿔줘요 (지난 날짜는 안 건드려요)
  if ((name === ACTIVE || name === INACTIVE) && e.range.getRow() >= M_FIRST && e.range.getColumn() === H('픽업')) {
    try { pickupCascade_(ss, sh, e.range.getRow(), e.value); } catch (err) { Logger.log('픽업 일정 반영 실패: ' + err.message); }
    return;
  }
  if ((name !== ACTIVE && name !== INACTIVE) || e.range.getRow() < M_FIRST || e.range.getColumn() !== H('상태')) return;
  if (name === ACTIVE && e.value === '비활성') {
    const v = moveRow_(sh, e.range.getRow(), ss.getSheetByName(INACTIVE), '비활성', '');
    ss.toast((v[H('한글 이름') - 1] || v[1]) + ' (' + v[0] + ') → 비활성 회원 맨 위', '옮겼어요', 5);
  } else if (name === INACTIVE && e.value === '활성') {
    const v = moveRow_(sh, e.range.getRow(), ss.getSheetByName(ACTIVE), '활성', '🔁 재방문');
    ss.toast((v[H('한글 이름') - 1] || v[1]) + ' (' + v[0] + ') → 활성 회원 맨 위', '옮겼어요', 5);
  }
}

// 폼 응답 탭 "활성화" 체크 전용 — 반드시 설치형 트리거로 등록해야 해요 (setupFormActivateTrigger 한 번 실행)
// 단순 트리거(onEdit)는 권한이 제한돼서 DriveApp(파일 이름 바꾸기)을 못 쓰는데, 설치형 트리거는 완전한 권한으로 돌아서 파일 이름도 제대로 바뀌어요
function onFormActivateEdit(e) {
  if (!e || !e.range || e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== FORM_RESP || e.range.getRow() < 2) return;
  const ss = e.source;
  const cols = formActivateCols_(sh);
  if (e.range.getColumn() !== cols.actCol) return;
  if (String(e.value).toUpperCase() !== 'TRUE') return;   // 체크 해제는 아무 것도 안 해요
  const doneCell = sh.getRange(e.range.getRow(), cols.doneCol);
  if (String(doneCell.getValue() || '').trim()) { ss.toast('이미 등록된 신청이에요: ' + doneCell.getValue(), '활성화', 6); return; }
  try {
    const result = activateFormRow_(sh, e.range.getRow());
    doneCell.setValue(result);
    e.range.clearDataValidations().setValue(true).setFontColor('#999999');   // 체크박스를 없애고 회색 TRUE 글자로 — 다시 못 누르게
    ss.toast(result + ' 등록 완료!', '활성화', 6);
  } catch (err) {
    e.range.setValue(false);
    ss.toast('등록 실패: ' + err.message, '활성화', 8);
  }
}

// 한 번만 실행: onFormActivateEdit을 설치형 트리거로 등록해요 (이미 등록돼 있으면 또 안 만들어요)
function setupFormActivateTrigger() {
  const ss = SpreadsheetApp.getActive();
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'onFormActivateEdit')) {
    ScriptApp.newTrigger('onFormActivateEdit').forSpreadsheet(ss).onEdit().create();
  }
  ss.toast('활성화 체크박스 트리거를 설치했어요. 이제 파일 이름도 제대로 바뀔 거예요.', '설치 완료', 6);
}

/* ================= 회원 옮기기 ================= */
// 줄 하나를 다른 탭 맨 위(첫 회원 줄)로 옮겨요. 파일 링크 칸은 링크 그대로
// 회원 탭에서 픽업 장소를 바꾸면, 오늘 이후(오늘 포함) 일정 탭에 이미 잡혀있던 그 회원 줄의 픽업(H열)도 같이 바꿔줘요
// 오늘 이미 "스케줄 만들기"로 뽑아놓은 표 자체는 자동으로 안 바뀌니, 홈 탭은 다시 한 번 "스케줄 만들기"를 눌러야 반영돼요
function pickupCascade_(ss, sh, row, newPickup) {
  const code = String(sh.getRange(row, 1).getValue() || '').trim();
  if (!code) return;
  const dataSh = ss.getSheetByName(typeof SC !== 'undefined' ? SC.DATA : '일정');
  const last = dataSh && typeof scRealLastRow_ === 'function' ? scRealLastRow_(dataSh, 1) : (dataSh ? dataSh.getLastRow() : 0);
  if (!dataSh || last < 2) return;
  const n = last - 1;
  const dates = dataSh.getRange(2, 1, n, 1).getValues();
  const codes = dataSh.getRange(2, 2, n, 1).getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let updated = 0;
  for (let i = 0; i < n; i++) {
    if (String(codes[i][0]).trim() !== code) continue;
    const d = dates[i][0];
    if (!(d instanceof Date) || d < today) continue;   // 지난 날짜는 그대로 둬요(기록이니까)
    dataSh.getRange(i + 2, 9).setValue(newPickup);
    updated++;
  }
  if (updated) ss.toast(code + ' 오늘 이후 일정 ' + updated + '건 픽업을 "' + newPickup + '"로 같이 바꿨어요. (홈 탭은 "스케줄 만들기" 다시 눌러야 보여요)', '픽업 반영', 8);
}

function moveRow_(from, row, to, status, mark) {
  const n = HEAD.length;
  const src = from.getRange(row, 1, 1, n);
  const vals = src.getValues()[0];
  const rich = src.getRichTextValues()[0];
  vals[H('상태') - 1] = status;
  vals[H('신규') - 1] = mark;
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  vals[H('메모') - 1] = [vals[H('메모') - 1], (status === '활성' ? '재방문 ' : '비활성 ') + today].filter(String).join('\n');
  writeTopRow_(to, vals, rich);
  from.deleteRow(row);
  return vals;
}

function writeTopRow_(sh, vals, rich) {
  sh.insertRowBefore(M_FIRST);
  const r = sh.getRange(M_FIRST, 1, 1, HEAD.length);
  r.clearFormat();
  r.setValues([vals]).setFontWeight('normal').setFontSize(10).setBackground(null);
  if (rich) LINK_COLS.forEach(t => { const c = H(t); if (rich[c - 1] && rich[c - 1].getText()) sh.getRange(M_FIRST, c).setRichTextValue(rich[c - 1]); });
  DATE_COLS.forEach(t => sh.getRange(M_FIRST, H(t)).setNumberFormat('yyyy-mm-dd'));
  sh.getRange(M_FIRST, H('상태')).setDataValidation(STATUS_RULE()).setFontWeight('bold').setBackground(sh.getName() === ACTIVE ? C.active : C.inactive);
  sh.getRange(M_FIRST, H('방문 기록 (기존)')).setWrap(true);
  markRules_(sh);
}

/* ================= 여러 명 한 번에 비활성화 · 활성화 ================= */
// 버튼(이미지)을 누르면 그 전에 시트에서 선택해 둔 줄(행)이 그대로 유지돼요 → 그 선택을 읽어서 옮겨요
// 줄 번호 전체를 클릭해도 되고, 그 줄의 칸 몇 개만 걸치게 선택해도 돼요. 여러 줄은 Shift(범위)나 Cmd/Ctrl(한 줄씩 추가)로
function selectedMemberRows_(sh) {
  let ranges;
  try { ranges = sh.getActiveRangeList().getRanges(); } catch (e) { ranges = []; }
  if (!ranges.length) { const a = sh.getActiveRange(); if (a) ranges = [a]; }
  const rows = new Set();
  ranges.forEach(rg => { const r0 = rg.getRow(), n = rg.getNumRows(); for (let i = 0; i < n; i++) { const r = r0 + i; if (r >= M_FIRST) rows.add(r); } });
  return Array.from(rows).sort((a, b) => a - b);
}

function bulkMove_(fromName, toStatus, mark) {
  const ss = SpreadsheetApp.getActive();
  const from = ss.getSheetByName(fromName);
  const rows = selectedMemberRows_(from);
  if (!rows.length) { ss.toast('옮길 회원 줄을 먼저 선택해 주세요 (줄 번호를 클릭 · 여러 줄은 Shift나 Cmd로).', '선택 처리', 8); return; }
  const to = ss.getSheetByName(toStatus === '활성' ? ACTIVE : INACTIVE);
  const names = [];
  rows.slice().reverse().forEach(row => {   // 아래에서 위로 옮겨야 번호가 안 꼬여요
    const v = moveRow_(from, row, to, toStatus, mark);
    names.push(v[H('한글 이름') - 1] || v[1]);
  });
  ss.toast(names.length + '명을 ' + toStatus + ' 회원으로 옮겼어요: ' + names.join(', '), '선택 처리', 10);
}
function bulkDeactivate() { bulkMove_(ACTIVE, '비활성', ''); }
function bulkActivate() { bulkMove_(INACTIVE, '활성', '🔁 재방문'); }

// 회원 줄 값들 (3행부터)
// getLastRow()이 예전 서식 흔적 때문에 실제 회원 수보다 훨씬 크게 잡힐 때가 있어요(schedule.gs의 scRealLastRow_랑 같은 문제) —
// 그 상태로 HEAD.length(여러 칸)를 통째로 읽으면 느려지니, A열(회원번호, 1칸)만 먼저 싸게 읽어서 진짜 마지막 줄을 찾아요
function memberRows_(sh, cols) {
  let last = sh.getLastRow();
  if (last < M_FIRST) return [];
  if (typeof scRealLastRow_ === 'function') {
    const real = scRealLastRow_(sh, 1);
    last = Math.max(real, M_FIRST - 1);   // scRealLastRow_은 2행 기준이라, 회원 탭 시작 줄(M_FIRST)에 맞춰 보정
  }
  if (last < M_FIRST) return [];
  return sh.getRange(M_FIRST, 1, last - M_FIRST + 1, cols || HEAD.length).getValues();
}

function findRow_(sh, code) {
  const i = memberRows_(sh, 1).map(r => String(r[0]).trim()).indexOf(String(code).trim());
  return i < 0 ? -1 : i + M_FIRST;
}


/* ================= 회원 찾기 · 비활성화 · 활성화 창 ================= */
function openFindDialog() { memberDialog_('find'); }
function openDeactivateDialog() { memberDialog_('deactivate'); }
function openActivateDialog() { memberDialog_('activate'); }
function openRestoreDialog() { memberDialog_('activate'); }   // 홈 탭 "예전 손님 불러오기" 버튼

function memberDialog_(mode) {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const f = d => (d instanceof Date ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : '');
  const pack = (name, status) => memberRows_(ss.getSheetByName(name)).filter(r => r[0]).map(r => ({
    code: String(r[0]), status, name: String(r[H('한글 이름') - 1] || ''), en: (r[1] + ' ' + r[2]).trim(),
    birth: r[3] instanceof Date ? Utilities.formatDate(r[3], tz, 'yyyy') : '', nation: String(r[4] || ''), reg: f(r[H('최초 등록일') - 1]), last: f(r[H('마지막 방문') - 1]),
    level: String(r[H('레벨') - 1] || ''), email: String(r[H('E-mail') - 1] || ''), tel: String(r[H('연락처') - 1] || ''), pickup: String(r[H('픽업') - 1] || ''),
    mark: String(r[H('신규') - 1] || ''), product: String(r[H('신청 종류') - 1] || ''),
    passport: String(r[H('여권 사본') - 1] || ''), cert: String(r[H('자격증') - 1] || ''), photo: String(r[H('증명사진') - 1] || '') }));
  const list = (mode !== 'activate' ? pack(ACTIVE, '활성') : []).concat(mode !== 'deactivate' ? pack(INACTIVE, '비활성') : []);
  const title = { find: '회원 찾기', deactivate: '비활성화하기 (활성 회원 → 비활성 회원)', activate: '활성화하기 (비활성 회원 → 활성 회원)' }[mode];
  const t = HtmlService.createTemplate(MEMBER_HTML);
  t.data = JSON.stringify({ mode, list });
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(560).setHeight(560), title);
}

// 창에서 누른 버튼 → 옮기기
function memberAction(code, to) {
  const ss = SpreadsheetApp.getActive();
  const from = ss.getSheetByName(to === '비활성' ? ACTIVE : INACTIVE);
  const row = findRow_(from, code);
  if (row < 0) throw new Error(code + ' 회원을 ' + from.getName() + ' 탭에서 찾지 못했어요. 이미 옮겼을 수 있어요.');
  const v = moveRow_(from, row, ss.getSheetByName(to === '비활성' ? INACTIVE : ACTIVE), to, to === '활성' ? '🔁 재방문' : '');
  return (v[H('한글 이름') - 1] || v[1]) + ' (' + code + ') → ' + (to === '활성' ? '활성 회원' : '비활성 회원') + ' 맨 위로 옮겼어요.';
}
function restoreByCode(code) { return memberAction(code, '활성'); }

// 창에서 "시트에서 보기" → 그 회원 줄로 이동
function goToMember(code) {
  const ss = SpreadsheetApp.getActive();
  for (const name of [ACTIVE, INACTIVE]) {
    const sh = ss.getSheetByName(name); const row = findRow_(sh, code);
    if (row > 0) { sh.activate(); sh.getRange(row, 1, 1, HEAD.length).activate(); return name + ' ' + row + '행'; }
  }
  throw new Error('찾지 못했어요.');
}

var MEMBER_HTML = `<!doctype html><html><head><base target="_top"><style>
body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1F2A30;margin:0;padding:2px}
input{width:100%;box-sizing:border-box;padding:9px;border:1px solid #B7C7CC;border-radius:8px;font-size:15px}
#list{max-height:400px;overflow:auto;border:1px solid #E1E8EB;border-radius:8px;margin-top:8px}
.p{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px;border-bottom:1px solid #F0F3F4}
.p small{color:#6A7A82;display:block;margin-top:2px}.tag{font-size:11px;border-radius:6px;padding:1px 6px;margin-left:4px}
.on{background:#E3F1EA;color:#2E7D5B}.off{background:#EFE9F7;color:#6E5A96}
.btns{display:flex;flex-direction:column;gap:4px}
button{border:0;border-radius:8px;color:#fff;font-weight:700;padding:6px 10px;cursor:pointer;white-space:nowrap;font-size:13px}
.go{background:#2E5E80}.de{background:#96503C}.ac{background:#2E7D5B}button:disabled{opacity:.4}
.msg{margin-top:8px;color:#2E5E80;font-size:13px}
</style></head><body>
<input id="q" placeholder="이름 · 영문 · 회원번호 · 이메일 (두 글자 이상)" autofocus><div id="list"></div><div class="msg" id="msg"></div>
<script>
var D = <?!= data ?>; const $ = id => document.getElementById(id);
function photoLinks(label, urls) {
  const list = String(urls || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return '';
  return list.map((u, i) => '<a href="' + u + '" target="_blank" class="pic">' + label + (list.length > 1 ? (i + 1) : '') + '</a>').join(' ');
}
function card(p) {
  const act = p.status === '활성'
    ? (D.mode !== 'activate' ? '<button class="de" data-a="비활성" data-c="' + p.code + '">비활성화</button>' : '')
    : (D.mode !== 'deactivate' ? '<button class="ac" data-a="활성" data-c="' + p.code + '">활성화</button>' : '');
  const pics = [photoLinks('여권', p.passport), photoLinks('자격증', p.cert), photoLinks('증명사진', p.photo)].filter(Boolean).join(' ');
  return '<div class="p"><div><b>' + (p.name || p.en) + '</b> ' + p.code + '<span class="tag ' + (p.status === '활성' ? 'on' : 'off') + '">' + p.status + '</span>' + (p.mark ? '<span class="tag on">' + p.mark + '</span>' : '') +
    '<small>' + [p.en, p.birth && p.birth + '년생', p.nation, p.level].filter(Boolean).join(' · ') + '</small>' +
    '<small>' + [p.reg && '최초 등록 ' + p.reg, p.last && '마지막 방문 ' + p.last, p.pickup && '픽업 ' + p.pickup].filter(Boolean).join(' · ') + '</small>' +
    (p.email || p.tel ? '<small>' + [p.email, p.tel].filter(Boolean).join(' · ') + '</small>' : '') +
    (pics ? '<div class="pics">' + pics + '</div>' : '') +
    '</div><div class="btns">' + act + '<button class="go" data-g="' + p.code + '">시트에서 보기</button></div></div>';
}
function draw() {
  const q = $('q').value.trim().toLowerCase();
  if (q.length < 2) { $('list').innerHTML = '<div class="p"><small>' + D.list.length + '명 중에서 찾아요</small></div>'; return; }
  const rows = D.list.filter(p => (p.name + ' ' + p.en + ' ' + p.code + ' ' + p.email).toLowerCase().includes(q)).slice(0, 60);
  $('list').innerHTML = rows.map(card).join('') || '<div class="p"><small>찾지 못했어요</small></div>';
  document.querySelectorAll('button[data-a]').forEach(b => b.onclick = () => {
    b.disabled = true; $('msg').textContent = '옮기는 중...';
    google.script.run.withSuccessHandler(m => { $('msg').textContent = m; const p = D.list.find(x => x.code === b.dataset.c); if (p) p.status = b.dataset.a; draw(); })
      .withFailureHandler(e => { b.disabled = false; $('msg').textContent = '오류: ' + e.message; }).memberAction(b.dataset.c, b.dataset.a);
  });
  document.querySelectorAll('button[data-g]').forEach(b => b.onclick = () => {
    google.script.run.withSuccessHandler(() => google.script.host.close()).withFailureHandler(e => { $('msg').textContent = '오류: ' + e.message; }).goToMember(b.dataset.g);
  });
}
$('q').oninput = draw; draw();
</script></body></html>`;

/* ================= 회원 직접 추가 (폼 없이 샵에서) ================= */
function openAddMemberDialog() {
  const t = HtmlService.createTemplate(ADD_MEMBER_HTML);
  t.data = JSON.stringify({ pickups: PICKUPS.filter(p => !/모르겠/.test(p)), levels: ['자격 없음'].concat(LEVELS) });
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(520).setHeight(640), '＋ 회원 직접 추가');
}

// 창에서 "추가" → 활성 회원 맨 위 (새 회원번호 · 최초 등록일 = 오늘 · 🆕 신규)
function addMemberManual(f) {
  const ss = SpreadsheetApp.getActive();
  const need = [['kname', '한글 이름'], ['first', '영문 이름'], ['last', '영문 성'], ['birth', '생년월일'], ['gender', '성별'], ['passport', '여권번호']].filter(x => !String(f[x[0]] || '').trim());
  if (need.length) throw new Error(need.map(x => x[1]).join(', ') + '을(를) 적어 주세요.');
  const passport = String(f.passport).trim().toUpperCase();
  // 이미 있는 회원인지 (여권번호)
  for (const name of [ACTIVE, INACTIVE]) {
    const hit = memberRows_(ss.getSheetByName(name)).find(r => String(r[H('PassportNumber') - 1]).trim().toUpperCase() === passport);
    if (hit) throw new Error('이미 있는 회원이에요: ' + (hit[H('한글 이름') - 1] || hit[1]) + ' (' + hit[0] + ', ' + name + '). ' + (name === INACTIVE ? '회원 찾기에서 활성화해 주세요.' : ''));
  }
  const [y, m, d] = String(f.birth).split('-').map(Number);
  const row = new Array(HEAD.length).fill('');
  const put = (t, v) => { row[H(t) - 1] = v; };
  // activateFormRow_랑 같은 이유 — 회원번호를 뽑는 동안 다른 등록이 끼어들지 않게 잠가요(같은 문서 잠금이라 폼 활성화랑도 서로 순서를 지켜요)
  const codeLock = LockService.getDocumentLock();
  codeLock.waitLock(30000);
  let code;
  try {
    code = nextCode_(ss);
    put('회원번호', code); put('FirstName', toTitleCase_(f.first)); put('LastName', toTitleCase_(f.last));
    put('Birthdate', new Date(y, m - 1, d)); put('Nationality', f.nation || 'South Korea'); put('Gender', f.gender); put('PassportNumber', passport);
    put('Activity', 'Diving'); put('Accomodation', 'House'); put('RoomNumber', 0);
    put('최초 등록일', new Date()); put('한글 이름', String(f.kname).trim()); put('상태', '활성'); put('신규', '🆕 신규');
    put('E-mail', f.email || ''); put('연락처', f.tel || ''); put('숙소 · 위치', f.stay || ''); put('픽업', /직접/.test(f.pickup) ? '-' : (f.pickup || ''));
    put('레벨', f.level || ''); put('총 다이빙', f.logs || ''); put('신청 종류', '샵에서 직접 등록'); put('메모', f.memo || '');
    writeTopRow_(ss.getSheetByName(ACTIVE), row, null);
  } finally {
    codeLock.releaseLock();
  }
  return f.kname + ' (' + code + ') 회원을 활성 회원 맨 위에 넣었어요.';
}

var ADD_MEMBER_HTML = `<!doctype html><html><head><base target="_top"><style>
body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1F2A30;margin:0;padding:2px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px}label{display:block;font-size:12px;font-weight:700;color:#4A5A62;margin-bottom:3px}
input,select,textarea{width:100%;box-sizing:border-box;padding:7px;border:1px solid #B7C7CC;border-radius:8px;font-size:14px}
.full{grid-column:1 / -1}.req{color:#C0392B}
button{margin-top:12px;width:100%;padding:11px;border:0;border-radius:10px;background:#6E5A96;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
button:disabled{opacity:.5}.msg{margin-top:8px;color:#2E5E80;font-size:13px}
</style></head><body>
<div class="g">
<div><label>한글 이름 <span class="req">*</span></label><input id="kname"></div>
<div><label>회원번호</label><input value="자동 (다음 J번호)" disabled></div>
<div><label>영문 이름 (여권) <span class="req">*</span></label><input id="first" placeholder="SEOHYEON"></div>
<div><label>영문 성 (여권) <span class="req">*</span></label><input id="last" placeholder="KIM"></div>
<div><label>생년월일 <span class="req">*</span></label><input id="birth" type="date"></div>
<div><label>성별 <span class="req">*</span></label><select id="gender"><option value="">고르기</option><option>Male</option><option>Female</option></select></div>
<div><label>국적</label><input id="nation" value="South Korea"></div>
<div><label>여권번호 <span class="req">*</span></label><input id="passport"></div>
<div><label>E-mail</label><input id="email" type="email"></div>
<div><label>연락처</label><input id="tel"></div>
<div><label>숙소</label><input id="stay"></div>
<div><label>픽업</label><select id="pickup"></select></div>
<div><label>레벨</label><select id="level"></select></div>
<div><label>총 다이빙</label><input id="logs" type="number"></div>
<div class="full"><label>메모</label><textarea id="memo" rows="2"></textarea></div>
</div>
<button id="go">활성 회원에 추가</button><div class="msg" id="msg"></div>
<script>
var D = <?!= data ?>; const $ = id => document.getElementById(id);
D.pickups.forEach(v => { const o = document.createElement('option'); o.textContent = v; $('pickup').appendChild(o); });
D.levels.forEach(v => { const o = document.createElement('option'); o.textContent = v; $('level').appendChild(o); });
$('go').onclick = () => {
  const f = {}; ['kname', 'first', 'last', 'birth', 'gender', 'nation', 'passport', 'email', 'tel', 'stay', 'pickup', 'level', 'logs', 'memo'].forEach(k => f[k] = $(k).value.trim());
  $('go').disabled = true; $('msg').textContent = '넣는 중...';
  google.script.run.withSuccessHandler(m => { $('msg').textContent = m; setTimeout(() => google.script.host.close(), 1300); })
    .withFailureHandler(e => { $('go').disabled = false; $('msg').textContent = '⚠️ ' + e.message; }).addMemberManual(f);
};
</script></body></html>`;

/* ================= 첫 방문 폼 (회원 등록) ================= */
var FQ = {
  kname: '이름 (실명)', kind: '신청 종류',
  funDate: '첫 펀다 일자', night: '나이트다이빙도 하고 싶어요', pkg: '패키지 종류', courseDate: '교육 시작일', dsdDate: '체험다이빙 일자', course: '교육 과정',
  agency: '자격증 발급 단체', logs: '총 다이빙 횟수', lastDive: '마지막 다이빙 일자',
  med1: '복용 중인 약이 있으십니까?', med2: '12개월 이내 수술 이력이 있으십니까?', med3: '부비동 · 귀 쪽에 문제를 가지고 계실까요?', med4: '건강 상태에 대해 저희가 참고할 사항이 있을까요?',
  medAny: '위 4개 중에 하나라도 해당사항이 있나요?', medDetail: '체크하신 내용을 자세히 적어 주세요',
  address: '주소 (Address)', enAddress: '영문 주소 (PADI 아닌 경우만)',
  first: '영문 이름 (여권과 동일)', lname: '영문 성 (여권과 동일)', birth: '생년월일', gender: '성별', nation: '국적', passport: '여권번호',
  email: 'E-mail', tel: '연락처', kakao: '카카오톡 아이디', stay: '숙소 위치', pickup: '픽업 장소', friends: '같이 오는 일행', consent: '개인정보 수집 · 이용 동의', memo: '하고 싶은 말',
  level: '현재 자격 레벨'
};
var KINDS = ['펀다이빙 (일별 신청)', '펀다이빙 (패키지 혜택 신청)', '교육 (PADI)', '체험다이빙', '펀다이빙 (체크다이빙)'];   // 체크다이빙은 뒤 흐름이 "일별 신청"이랑 완전히 같아서(같은 페이지로 이동), 끝에만 추가했어요 — KINDS[1] 같은 인덱스 참조 코드가 안 깨져요
var NIGHT_CHOICE = ['예, 나이트다이빙도 할래요'];
var PKG_ITEMS = ['펀다이빙 10회 패키지', '펀다이빙 20회 패키지', '펀다이빙 한 달 무제한'];
var COURSES = ['오픈워터', '오픈워터 + 어드밴스드', '세미 오픈워터 (오래 쉬었을 때 리마인드)', '어드밴스드', 'EFR', '레스큐',
  '마스터 (다이브마스터)', 'IDC (강사)', '스페셜티 · Deep', '스페셜티 · Nitrox', '트레이닝 · Kick', '트레이닝 · SMB', '트레이닝 · Buoyancy'];
// 교육 과정 체크박스로 여러 개 고르면, 순서가 있는 과정(오픈워터 → 어드밴스드 → EFR → 레스큐)은 신청한 첫 날짜부터
// 레벨 순서대로 날짜를 이어 붙여서(한 과정 끝난 다음 날부터 다음 과정 시작) 전부 진짜 일정으로 만들어요.
// 마스터 · 인스트럭터 · 스페셜티 · 트레이닝은 순서가 있는 게 아니라 애드온이라 여기 안 넣어요 — 항상 날짜 미정으로 추가돼요(샵에서 직접 날짜를 잡아요)
var COURSE_LEVEL = { '오픈워터': 1, '오픈워터 + 어드밴스드': 1, '세미 오픈워터 (오래 쉬었을 때 리마인드)': 1, '어드밴스드': 2, 'EFR': 3, '레스큐': 3 };
// list: 폼에서 체크한 교육 과정들(한글 이름) → { sequential: 레벨 순서대로 날짜를 이어 붙일 과정들, pending: 날짜 미정으로 둘 과정들 }
function courseSplit_(list) {
  const sequential = list.filter(c => COURSE_LEVEL[c] != null).sort((a, b) => COURSE_LEVEL[a] - COURSE_LEVEL[b]);
  const pending = list.filter(c => COURSE_LEVEL[c] == null);
  return { sequential, pending };
}
var PICKUPS = ['Coffee Corner', 'Tranquilo', 'Coral Coast', 'El Salam', '1000 mart', 'Gmart', 'German', '샵으로 직접 갈게요', '잘 모르겠어요 (숙소 보고 정해 주세요)'];
var LEVELS = ['Open Water', 'Advanced', 'Rescue', 'Divemaster', 'Instructor'];

/*
 1장  이름 · 신청 종류
        ├ 펀다이빙 (일별 신청) ────── 첫 펀다 일자 · 나이트다이빙 희망 체크 ─┐
        ├ 펀다이빙 (패키지 혜택 신청) ─ 패키지(10회 · 20회 · 한 달 무제한) · 첫 펀다 일자 · 나이트다이빙 희망 체크 ─┴→ [펀다이빙 정보] 총 다이빙 횟수 · 마지막 다이빙 일자 → [다이버 명단 정보]
        ├ 교육 (PADI) ─ 교육 시작일 · 교육 과정 (체크박스 · 여러 개 선택 가능)
        │      → [교육 정보] 주소(오픈워터 선택 시) · 마지막 다이빙 일자 · 총 다이빙(레스큐 이상) · 자격증 발급 단체
        │           └ PADI가 아니면 → [PADI 아닌 경우만] 영문 주소 (+ 증명사진) ──────────────────────────┤
        └ 체험다이빙 → [체험다이빙] 체험다이빙 일자 ─────────────────────────────────────────────────────┤
                                                                                                     [메디컬 체크] (공통, 한 번만 · 펀다이빙은 없음)
 → [다이버 명단 정보] 영문 이름 · 성(여권과 동일) · 생년월일 · 성별 · 국적 · 여권번호 · E-mail(*중요) · 연락처 · 숙소 위치 · 픽업
 → [서류 첨부] 📎 여권 사본 · 📎 자격증(번호 보이게) · 📎 증명사진   ← 파일 업로드 질문 3개는 폼 편집에서 직접 넣어요
 → [마무리] 같이 오는 일행 · 동의 · 메모

 나이트다이빙 체크하면: 회원 메모에 "🌙 나이트다이빙 신청 — 손님 컨택 필요"(강조 색) + 일정 탭에 Night Dive 한 줄(메모에 컨택 필요 표시) 추가 → 정확한 날짜는 샵에서 직접 연락해서 정해요

 교육 과정을 체크박스로 여러 개 고르면: 그 중 레벨이 가장 낮은 과정 하나만 날짜 있는 진짜 일정으로 자동 생성(기존과 동일) +
 나머지 선택한 과정들은 일정 탭에 날짜 칸을 비운 채 진한 노란색(#FFD966)으로 추가돼요 → 샵에서 날짜를 직접 정해서 채워 넣어야 해요.
 체크박스 문항은 선택지별로 다른 섹션으로 이동하는 기능이 없어서(라디오·드롭다운만 가능), 오픈워터 전용이었던 [오픈워터] 섹션을
 [교육 정보] 섹션에 합쳤어요 — 오픈워터를 선택 안 했으면 주소 질문은 비워 둬도 되게 안내 문구로 처리.
*/
// 폼은 질문이 많고 구글폼이 느려서 한 번에 만들면 6분 제한에 걸려요.
// → buildForm 을 "완성!"이 나올 때까지 여러 번 실행하세요. 매번 멈춘 페이지부터 이어서 만들어요.
function setupForm() { buildForm(); }
var FORM_VERSION = 13;   // 폼 구조를 바꿀 때마다 올려요 → buildForm 이 예전 폼을 떼고 새로 만들어요 (12: 메디컬 1~4번 다시 한 페이지로, "하나라도 해당되나요?" 질문 하나로만 분기 — 페이지 분리 대신 원래 되던 방식으로 / 13: 생년월일을 달력 질문 대신 YYYY-MM-DD 직접 입력으로)
// "펀다이빙 (체크다이빙)" 추가(신청 종류)는 buildForm()으로 새 폼을 만드는 대신, 지금 쓰는 폼에 손으로 옵션 추가 + 섹션 이동 설정을 해뒀어요(폼 링크 안 바뀌게) — 그래서 버전은 안 올렸어요.
// KINDS 배열 · addFormEntry_ 쪽 코드는 그대로 있어서, 폼에 문구만 "펀다이빙 (체크다이빙)"로 정확히 들어오면 바로 작동해요.

function formTools_(form) {
  return {
    upload: title => form.addSectionHeaderItem().setTitle('📎 ' + title + ' — 여기에 "파일 업로드" 질문 추가'),
    num: () => FormApp.createTextValidation().requireNumber().build()
  };
}

// 페이지 순서대로. build 는 그 페이지 질문을 만들고 나중에 연결할 질문 id 를 돌려줘요
var FORM_PAGES = [
  { key: 'start', build: (f) => {
      f.addTextItem().setTitle(FQ.kname).setHelpText('한글 이름').setRequired(true);
      return { kind: f.addMultipleChoiceItem().setTitle(FQ.kind).setRequired(true).getId() };
    } },
  { key: 'pFunDay', title: '펀다이빙 (일별 신청)', build: (f) => {
      f.addDateItem().setTitle(FQ.funDate).setHelpText('처음 방문해서 펀다이빙 하는 날짜를 적어 주세요').setIncludesYear(true).setRequired(true);
      f.addCheckboxItem().setTitle(FQ.night).setChoiceValues(NIGHT_CHOICE)
        .setHelpText('🌙 나이트다이빙은 보통 격일로 운영돼요. 체크하시면 가능한 날짜를 카카오톡으로 따로 안내해 드려요');
    } },
  { key: 'pFunPkg', title: '펀다이빙 (패키지 혜택 신청)', build: (f) => {
      f.addMultipleChoiceItem().setTitle(FQ.pkg).setChoiceValues(PKG_ITEMS).setRequired(true);
      f.addDateItem().setTitle(FQ.funDate + ' (패키지)').setHelpText('처음 방문해서 펀다이빙 하는 날짜를 적어 주세요').setIncludesYear(true).setRequired(true);
      f.addCheckboxItem().setTitle(FQ.night + ' (패키지)').setChoiceValues(NIGHT_CHOICE)
        .setHelpText('🌙 나이트다이빙은 보통 격일로 운영돼요. 체크하시면 가능한 날짜를 카카오톡으로 따로 안내해 드려요');
    } },
  { key: 'pFunInfo', title: '펀다이빙 정보', build: (f, T) => {
      f.addTextItem().setTitle(FQ.logs + ' (펀다)').setValidation(T.num()).setRequired(true);
      f.addDateItem().setTitle(FQ.lastDive + ' (펀다)').setIncludesYear(true).setRequired(true);
    } },
  { key: 'pEdu', title: '교육 (PADI)', help: '여러 개 신청하시면 체크박스로 전부 선택해 주세요 (스페셜티 · 트레이닝도 여기에서 골라요)', build: (f) => {
      f.addDateItem().setTitle(FQ.courseDate).setHelpText('교육을 시작하는 날짜를 적어 주세요 (여러 개 신청해도 가장 낮은 단계 과정의 시작일이에요)').setIncludesYear(true).setRequired(true);
      return { course: f.addCheckboxItem().setTitle(FQ.course).setChoiceValues(COURSES).setRequired(true).getId() };
    } },
  { key: 'pEduMed', title: '교육 정보', help: 'PADI 등록 안내: 교육이 끝나면 PADI 본사에 정식 등록돼요. 등록이 끝나면 padi.com 또는 PADI 앱에 본인 이메일로 로그인해서 자격증 번호 · 등록 여부를 확인하실 수 있어요', build: (f, T) => {
      f.addTextItem().setTitle(FQ.address).setHelpText('오픈워터를 선택하신 분만 — 예: 00gil, 00, Seoul / 12345 (오픈워터가 아니면 비워 두셔도 돼요)');
      f.addDateItem().setTitle(FQ.lastDive + ' (교육)').setIncludesYear(true).setRequired(true);
      f.addTextItem().setTitle(FQ.logs + ' (교육)').setHelpText('레스큐 · 스페셜티 · 마스터 · IDC는 꼭 적어 주세요').setValidation(T.num());
      return { agency: f.addMultipleChoiceItem().setTitle(FQ.agency).setHelpText('PADI가 아니면 다음 페이지에서 영문 주소를 받아요 (증명사진도 필요해요)').setRequired(true).getId() };
    } },
  { key: 'pNonPadi', title: 'PADI 아닌 경우만', help: 'PADI가 아닌 자격증이면 PADI에 새로 등록해야 해서 필요해요. 증명사진은 마지막 "서류 첨부"에서 올려 주세요', build: (f) => {
      f.addTextItem().setTitle(FQ.enAddress).setHelpText('예: 12, Teheran-ro 00-gil, Gangnam-gu, Seoul, 06234').setRequired(true);
    } },
  { key: 'pDsd', title: '체험다이빙', build: (f) => {
      f.addDateItem().setTitle(FQ.dsdDate).setHelpText('체험다이빙 하는 날짜를 적어 주세요').setIncludesYear(true).setRequired(true);
    } },
  { key: 'pMedical', title: '메디컬 체크', help: '펀다이빙 (일별 신청 · 패키지)은 이 체크가 없어요', build: (f) => {
      [FQ.med1, FQ.med2, FQ.med3, FQ.med4].forEach(t => f.addMultipleChoiceItem().setTitle(t).setChoiceValues(['아니요', '예']).setRequired(true));
      return { medAny: f.addMultipleChoiceItem().setTitle(FQ.medAny).setChoiceValues(['아니요', '예']).setRequired(true).getId() };
    } },
  { key: 'pMedicalDetail', title: '메디컬 체크 · 자세히', build: (f) => {
      f.addParagraphTextItem().setTitle(FQ.medDetail).setHelpText('다이빙 안전을 위해 꼭 필요해요').setRequired(true);
    } },
  { key: 'pInfo', title: '다이버 명단 정보', help: '보트 · 다이빙 사이트에 내는 다이버 명단에 들어가요', build: (f) => {
      f.addTextItem().setTitle(FQ.first).setHelpText('여권에 적힌 그대로 (예: SEOHYEON)').setRequired(true);
      f.addTextItem().setTitle(FQ.lname).setHelpText('예: KIM').setRequired(true);
      // 생년월일은 달력 위젯(Date 질문)이 아니라 직접 타이핑하는 질문으로 — 달력으로 수십 년 전까지 한 달씩 넘겨야 하는 불편을 없애요
      f.addTextItem().setTitle(FQ.birth).setHelpText('YYYY-MM-DD 형식으로 적어 주세요 (예: 1995-03-21)')
        .setValidation(FormApp.createTextValidation().requireTextMatchesPattern('^(19|20)\\d{2}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\\d|3[01])$').setHelpText('YYYY-MM-DD 형식으로 적어 주세요 (예: 1995-03-21)').build())
        .setRequired(true);
      f.addMultipleChoiceItem().setTitle(FQ.gender).setChoiceValues(['Male', 'Female']).setRequired(true);
      f.addMultipleChoiceItem().setTitle(FQ.nation).setChoiceValues(['South Korea']).showOtherOption(true).setRequired(true);
      f.addTextItem().setTitle(FQ.passport).setRequired(true);
      f.addTextItem().setTitle(FQ.email).setHelpText('*중요: 자격증 · 다이빙 기록이 이 주소로 가요. "정확하게" 확인해 주세요')
        .setValidation(FormApp.createTextValidation().requireTextIsEmail().build()).setRequired(true);
      f.addTextItem().setTitle(FQ.tel).setHelpText('현지 번호 · 한국 번호 상관없어요').setRequired(true);
      f.addTextItem().setTitle(FQ.stay).setHelpText('호텔 이름이나 구글맵 위치').setRequired(true);
      f.addMultipleChoiceItem().setTitle(FQ.pickup).setChoiceValues(PICKUPS).setRequired(true);
    } },
  { key: 'pFiles', title: '서류 첨부', help: '사진으로 찍어서 올려 주세요', build: (f) => {
      f.addSectionHeaderItem().setTitle('📎 여권 사본 — 여기에 "파일 업로드" 질문 추가 (모두 · 필수)');
      f.addSectionHeaderItem().setTitle('📎 자격증 (번호가 보이게) — 여기에 "파일 업로드" 질문 추가 (펀다이빙 · 자격증이 있는 교육)');
      f.addSectionHeaderItem().setTitle('📎 증명사진 — 여기에 "파일 업로드" 질문 추가 (오픈워터 · PADI가 아닌 자격증)');
    } },
  { key: 'pEnd', title: '마무리', build: (f) => {
      f.addTextItem().setTitle(FQ.friends).setHelpText('같이 신청하는 분이 있으면 이름을 적어 주세요');
      f.addCheckboxItem().setTitle(FQ.consent).setChoiceValues(['동의해요']).setRequired(true)
        .setHelpText('받는 정보: 이름, 생년월일, 성별, 국적, 여권번호 · 사본, E-mail, 연락처, 주소, 숙소, 자격 · 건강 정보 / 쓰는 곳: 다이버 명단 제출, 자격증 발급, 안전 관리, 픽업 / 보관: 마지막 다이빙 후 _년 (샵에서 정해 주세요)');
      f.addParagraphTextItem().setTitle(FQ.memo);
    } }
];

function say_(msg) { Logger.log(msg); try { SpreadsheetApp.getActive().toast(msg, '폼 만들기', 15); } catch (e) {} }

function buildForm() {
  const t0 = Date.now();
  const LIMIT = 4.5 * 60 * 1000;      // 4분 30초가 지나면 저장하고 멈춰요 (다음 실행에서 이어서)
  const ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getDocumentProperties();
  let st = JSON.parse(props.getProperty('formBuild') || '{}');
  // 폼 구조가 바뀌었으면(예전 폼) 예전 폼은 시트에서 떼어 두고 새 폼을 처음부터 만들어요
  if (st.formId && st.v !== FORM_VERSION) {
    try { FormApp.openById(st.formId).removeDestination(); } catch (e) {}
    const old = ss.getSheetByName(FORM_RESP);
    if (old) old.setName(FORM_RESP + ' (예전 폼 ' + Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'MMdd-HHmm') + ')');
    props.deleteProperty('formId');
    say_('예전 폼은 시트에서 떼어 두고 새 폼을 만들기 시작해요. (예전 폼 파일은 드라이브에서 지워도 돼요)');
    st = {};
  }
  st.v = FORM_VERSION;
  st.ids = st.ids || {}; st.done = st.done || {};
  const save = () => props.setProperty('formBuild', JSON.stringify(st));

  let form;
  if (st.formId) form = FormApp.openById(st.formId);
  else {
    form = FormApp.create('스쿠버존 다합 · 회원 등록 (첫 방문)');
    form.setDescription('스쿠버존에 처음 오시는 분용 등록서예요. 두 번째부터는 카카오톡으로 말씀해 주시면 샵에서 바로 넣어 드려요.');
    st.formId = form.getId(); save();
  }
  const T = formTools_(form);

  for (const pg of FORM_PAGES) {
    if (st.done[pg.key]) continue;
    if (Date.now() - t0 > LIMIT) { save(); say_('시간이 다 돼서 여기서 멈췄어요. buildForm 을 한 번 더 실행해 주세요.'); return; }
    // 지난번에 이 페이지를 만들다 멈췄으면(맨 끝에 반쯤 남아 있음) 그 부분을 지우고 다시 만들어요
    const items = form.getItems();
    let cut = -1;
    if (pg.key === 'start') cut = items.length ? 0 : -1;
    else for (let i = items.length - 1; i >= 0; i--) if (items[i].getType() === FormApp.ItemType.PAGE_BREAK && items[i].getTitle() === pg.title) { cut = i; break; }
    if (cut >= 0) for (let i = items.length - 1; i >= cut; i--) form.deleteItem(i);
    if (pg.title) {
      const pb = form.addPageBreakItem().setTitle(pg.title);
      if (pg.help) pb.setHelpText(pg.help);
      st.ids[pg.key] = pb.getId();
    }
    Object.assign(st.ids, pg.build(form, T) || {});
    st.done[pg.key] = true; save();
  }

  if (!st.done.links) {
    if (Date.now() - t0 > LIMIT) { save(); say_('거의 다 됐어요. buildForm 을 한 번 더 실행해 주세요.'); return; }
    const pb = k => form.getItemById(st.ids[k]).asPageBreakItem();
    const mc = k => form.getItemById(st.ids[k]).asMultipleChoiceItem();
    const kind = mc('kind'), agency = mc('agency'), medAny = mc('medAny');
    // 신청 종류: 펀다이빙 둘은 각자 페이지로 · 교육은 과정 페이지로 · 체험다이빙은 메디컬로 바로 (따로 받을 정보가 없어요)
    // 체크다이빙(KINDS[4])도 "펀다이빙 (일별 신청)"이랑 똑같은 페이지(pFunDay)로 보내요 — 뒤 질문(첫 펀다 일자 · 나이트다이빙 체크)이 완전히 같아서요
    // 폼에서는 다른 펀다이빙 선택지들 옆(3번째)에 보이게 순서를 맞췄어요 — 나중에 index로 참조하는 코드는 순서가 아니라 KINDS[1] 같은 배열 값 자체를 봐서 안 깨져요
    kind.setChoices([kind.createChoice(KINDS[0], pb('pFunDay')), kind.createChoice(KINDS[1], pb('pFunPkg')), kind.createChoice(KINDS[4], pb('pFunDay')), kind.createChoice(KINDS[2], pb('pEdu')), kind.createChoice(KINDS[3], pb('pDsd'))]);
    // 교육 과정(course)은 체크박스라 선택지별 페이지 이동 기능이 없어요 — pEdu 페이지는 그냥 다음 페이지(pEduMed)로 순서대로 넘어가요
    // PADI · 자격증 없음은 메디컬로 바로 · PADI가 아니면 영문 주소부터 받고 메디컬로
    agency.setChoices([agency.createChoice('PADI', pb('pMedical')), agency.createChoice('그 외 (SSI, SDI …)', pb('pNonPadi')), agency.createChoice('자격증 없음 (EFR 등)', pb('pMedical'))]);
    // 메디컬: "하나라도 해당되나요?" 예/아니요 질문 하나로만 분기해요 (한 페이지에 분기 질문을 여러 개 넣으면 폼이 깨져요)
    medAny.setChoices([medAny.createChoice('아니요', pb('pInfo')), medAny.createChoice('예', pb('pMedicalDetail'))]);
    // 페이지 나누기.setGoToPage = 그 페이지를 마치면 갈 곳. 메디컬 체크는 모든 교육 · 체험다이빙 경로가 한 번만 거쳐 가요
    pb('pFunDay').setGoToPage(pb('pFunInfo'));
    pb('pFunPkg').setGoToPage(pb('pFunInfo'));
    pb('pFunInfo').setGoToPage(pb('pInfo'));
    pb('pEdu').setGoToPage(pb('pEduMed'));
    pb('pNonPadi').setGoToPage(pb('pMedical'));
    pb('pDsd').setGoToPage(pb('pMedical'));
    pb('pMedicalDetail').setGoToPage(pb('pInfo'));
    st.done.links = true; save();
  }

  if (!st.done.sheet) {
    if (Date.now() - t0 > LIMIT) { save(); say_('거의 다 됐어요. buildForm 을 한 번 더 실행해 주세요.'); return; }
    let connected = false;
    try { connected = form.getDestinationId() === ss.getId(); } catch (e) {}
    const before = ss.getSheets().map(sh => sh.getSheetId());
    if (!connected) form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    let resp = ss.getSheetByName(FORM_RESP);
    for (let i = 0; i < 10 && !resp; i++) {
      SpreadsheetApp.flush();
      resp = ss.getSheets().find(sh => before.indexOf(sh.getSheetId()) < 0) || ss.getSheets().find(sh => sh.getFormUrl());
      if (!resp) Utilities.sleep(1000);
    }
    if (resp && resp.getName() !== FORM_RESP) resp.setName(FORM_RESP);
    if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'onFormSubmitted')) {
      ScriptApp.newTrigger('onFormSubmitted').forSpreadsheet(ss).onFormSubmit().create();
    }
    props.setProperty('formId', form.getId());
    const msg = '손님용 링크:\n' + form.getPublishedUrl() + '\n\n폼 수정 링크:\n' + form.getEditUrl() +
      '\n\n폼 수정 화면의 "📎 … 파일 업로드 질문 추가" 자리마다 파일 업로드 질문을 넣고, 📎 안내 칸은 지워 주세요. 제목은 여권 사본 · 자격증 · 증명사진으로 시작하게요.' +
      '\n\n손님이 폼을 제출해도 자동으로 등록되지 않아요 — 이 탭 맨 뒤 "활성화" 체크박스를 눌러야 회원 · 일정에 실제로 반영돼요.';
    Logger.log(msg);
    if (resp) resp.getRange(1, 1).setNote(msg);
    st.done.sheet = true; save();
  }
  say_('폼 완성! 링크는 실행 로그와 폼 응답 탭 A1 메모에 있어요.');
}

// 폼 응답 탭 맨 뒤에 "활성화" 체크박스 · "등록 결과" 칸이 없으면 새로 만들어요. 이름으로 찾아서 매번 같은 칸을 가리켜요
// (폼 질문이 나중에 늘어도 위치가 안 밀려요 — 그냥 끝에 이 두 칸만 그대로 있어요)
function formActivateCols_(sh) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  let actCol = head.indexOf('활성화') + 1;
  let doneCol = head.indexOf('등록 결과') + 1;
  if (!actCol) {
    actCol = sh.getLastColumn() + 1;
    sh.getRange(1, actCol).setValue('활성화').setFontWeight('bold').setBackground('#FFF2CC');
    const n = Math.max(sh.getMaxRows() - 1, 500);
    if (sh.getMaxRows() < n + 1) sh.insertRowsAfter(sh.getMaxRows(), n + 1 - sh.getMaxRows());
    sh.getRange(2, actCol, n, 1).insertCheckboxes();
  }
  if (!doneCol) {
    doneCol = actCol + 1;
    sh.getRange(1, doneCol).setValue('등록 결과').setFontWeight('bold').setBackground('#EFEFEF');
  }
  return { actCol, doneCol };
}

// 손님이 폼을 제출하면 이것만 실행돼요 — 자동으로 회원 등록은 안 하고, "활성화" 체크 칸만 준비해둬요.
// 실제 등록은 관리자가 그 체크박스를 체크해야 일어나요(onEdit → activateFormRow_)
function onFormSubmitted(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== FORM_RESP) return;
  const { actCol } = formActivateCols_(sh);
  // formActivateCols_는 "활성화" 칸이 처음 생길 때만 앞쪽 500줄에 체크박스를 깔아요 — 응답이 그 범위를 넘어가면
  // 새로 들어온 이번 줄엔 체크박스가 아예 없이 빈 칸으로 보일 수 있어서, 매번 이번 줄엔 확실히 체크박스를 깔아요
  sh.getRange(e.range.getRow(), actCol).insertCheckboxes();
}

// 폼 응답 한 줄을 실제로 회원 등록 + 일정 추가해요. "활성화" 체크박스를 체크할 때 onEdit이 불러요 (members.gs 위쪽 onEdit 참고)
function activateFormRow_(sh, activateRow) {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const vals = sh.getRange(activateRow, 1, 1, head.length).getValues()[0];
  const sq = x => String(x).replace(/\s+/g, '');
  // 같은 질문이 여러 페이지에 있어도(자격 레벨 등) 값이 있는 칸을 읽어요
  const get = t => { for (let i = 0; i < head.length; i++) if (sq(head[i]).indexOf(sq(t)) === 0 && vals[i] !== '' && vals[i] != null) return vals[i]; return ''; };
  // 파일 업로드 칸: 제목이 그 글자로 시작하고 값이 드라이브 링크인 것만 모아요
  // (예전엔 여기서 DriveApp.getFileById().setName()으로 드라이브 파일 이름도 "종류_회원번호_이름_등록일자"로 바꿔줬는데,
  //  드라이브 API 호출이 파일당 1~3초씩 걸려서 활성화가 느려지는 가장 큰 원인이었어요 — 활성화 속도 때문에 뺐어요.
  //  드라이브에서 파일을 못 찾겠으면 폼 응답 탭의 여권 사본 · 자격증 · 증명사진 칸 링크를 그대로 따라가면 돼요)
  const files = t => head.map((h, i) => (sq(h).indexOf(sq(t)) === 0 && /^https?:/.test(String(vals[i] || '')) ? String(vals[i]) : '')).filter(Boolean)
    .flatMap(u => u.split(',').map(s => s.trim()).filter(Boolean)).join(', ');

  const kind = String(get(FQ.kind));
  // 교육 과정은 체크박스라 여러 개 골랐으면 쉼표로 묶여서 와요 — 순서 있는 과정(sequential)은 전부 날짜를 이어 붙이고, 나머지(pending)는 날짜 미정으로 들어가요
  const courseList = String(get(FQ.course)).split(',').map(s => s.trim()).filter(Boolean);
  const { sequential, pending } = courseSplit_(courseList);
  const course = sequential[0] || pending[0] || '';   // 레벨 · 신청종류 텍스트 등 아래에서 "대표 과정 하나"가 필요할 때 써요
  const product = /^교육/.test(kind) ? courseList.join(', ') : kind === '체험다이빙' ? '체험다이빙' : String(get(FQ.pkg) || '');
  const beginner = kind === '체험다이빙' || courseList.some(c => /^오픈워터/.test(c)) || String(get(FQ.agency)).indexOf('자격증 없음') === 0;
  let pickup = String(get(FQ.pickup));
  if (/직접/.test(pickup)) pickup = '-'; else if (/모르겠/.test(pickup)) pickup = '?';
  const med = [FQ.med1, FQ.med2, FQ.med3, FQ.med4].filter(t => /예/.test(String(get(t))));
  // 날짜는 신청 종류에 따라 다른 질문에서 와요
  const day = get(/^교육/.test(kind) ? FQ.courseDate : kind === '체험다이빙' ? FQ.dsdDate : FQ.funDate);
  const night = /예/.test(String(get(FQ.night)));

  const row = new Array(HEAD.length).fill('');
  const put = (t, v) => { row[H(t) - 1] = v; };
  // 활성화 버튼을 연달아(또는 거의 동시에) 누르면, "회원번호 다음 숫자 읽기"와 "그 번호로 줄 쓰기" 사이에 다른 활성화가 끼어들어서
  // 똑같은 번호를 읽어가 두 손님이 같은 회원번호로 등록될 수 있어요 — 그 구간만 잠가서 한 번에 한 사람씩만 번호를 뽑게 해요
  const active = ss.getSheetByName(ACTIVE);
  const codeLock = LockService.getDocumentLock();
  codeLock.waitLock(30000);
  try {
    put('회원번호', nextCode_(ss));
    put('FirstName', toTitleCase_(get(FQ.first))); put('LastName', toTitleCase_(get(FQ.lname)));
    put('Birthdate', get(FQ.birth)); put('Nationality', String(get(FQ.nation))); put('Gender', String(get(FQ.gender)));
    put('PassportNumber', String(get(FQ.passport)).trim().toUpperCase()); put('Activity', 'Diving'); put('Accomodation', 'House'); put('RoomNumber', 0);
    put('최초 등록일', vals[0] instanceof Date ? vals[0] : new Date()); put('한글 이름', String(get(FQ.kname)).trim());
    put('상태', '활성'); put('신규', '🆕 신규');
    put('E-mail', get(FQ.email)); put('연락처', get(FQ.tel)); put('카카오톡 아이디', get(FQ.kakao)); put('숙소 · 위치', get(FQ.stay)); put('픽업', pickup);
    const impliedLevel = beginner ? '자격 없음' : course === '어드밴스드' ? 'Open Water' : course === '레스큐' ? 'Advanced' : '';
    put('레벨', get(FQ.level) || impliedLevel); put('발급 단체', /자격증 없음/.test(String(get(FQ.agency))) ? '' : get(FQ.agency));
    put('총 다이빙', get(FQ.logs)); put('마지막 다이빙', get(FQ.lastDive));
    put('신청 종류', kind + (product && product !== kind ? ' · ' + product : '') + (day instanceof Date ? ' · 첫 다이빙 ' + Utilities.formatDate(day, tz, 'MM-dd') : ''));
    put('여권 사본', files('여권 사본')); put('자격증', files('자격증')); put('증명사진', files('증명사진'));
    put('메디컬', med.length ? med.join(' / ') + (get(FQ.medDetail) ? ' · ' + get(FQ.medDetail) : '') : '');
    put('주소', get(FQ.address)); put('영문 주소', get(FQ.enAddress));
    put('메모', [night ? '🌙 나이트다이빙 신청 — 손님 컨택 필요' : '', get(FQ.friends) ? '일행: ' + get(FQ.friends) : '', get(FQ.memo)].filter(String).join('\n'));
    writeTopRow_(active, row, null);
  } finally {
    codeLock.releaseLock();
  }
  // 스케줄 파일(스케줄.gs)이 있으면 첫 다이빙 날 일정도 같이 넣어요
  let scheduleWarn = '';
  if (typeof addFormEntry_ === 'function') {
    try {
      addFormEntry_({ code: row[0], name: row[H('한글 이름') - 1], pickup, kind, course, sequential, pending, pkg: String(get(FQ.pkg) || ''), night, day });
      // 일정이 들어간 김에 이론교육 리스트도 바로 갱신 — "스케줄 만들기"를 따로 안 눌러도 활성화하자마자 반영돼요
      if (typeof theoryRefresh_ === 'function') { try { theoryRefresh_(ss); } catch (e) { Logger.log('이론교육 리스트 갱신 실패: ' + e.message); } }
    }
    catch (err) { scheduleWarn = ' (⚠️ 일정 추가 실패: ' + err.message + ')'; Logger.log('일정 넣기 실패: ' + err.message); }
  }
  if (med.length) active.getRange(M_FIRST, H('메디컬')).setBackground(C.warn);
  if (night) active.getRange(M_FIRST, H('메모')).setBackground(C.warn).setFontWeight('bold');
  if (NOTIFY_EMAIL) {
    try {
      MailApp.sendEmail(NOTIFY_EMAIL, '[스쿠버존] 🆕 신규 회원 ' + row[H('한글 이름') - 1] + ' (' + row[0] + ')',
        ['신규 회원이 등록됐어요.', '', '회원번호: ' + row[0], '이름: ' + row[H('한글 이름') - 1] + ' (' + row[1] + ' ' + row[2] + ')',
          '신청: ' + row[H('신청 종류') - 1], '레벨: ' + row[H('레벨') - 1], '픽업: ' + row[H('픽업') - 1], '연락처: ' + row[H('연락처') - 1],
          med.length ? '⚠️ 메디컬 체크 있음: ' + row[H('메디컬') - 1] : '', '', '시트: ' + ss.getUrl()].filter(x => x !== '').join('\n'));
    } catch (err) { Logger.log('메일 실패: ' + err.message); }
  }
  return row[0] + ' ' + row[H('한글 이름') - 1] + scheduleWarn;
}

/* ================= 대기중인 폼 신청 (활성화 전용 창) ================= */
// 폼 응답 탭에서 아직 "활성화" 안 한 줄만 뽑아요. 긴 설문 전체가 아니라 핵심만 보여줘요
function getPendingFormRows_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(FORM_RESP);
  if (!sh || sh.getLastRow() < 2) return [];
  const cols = formActivateCols_(sh);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  const sq = x => String(x).replace(/\s+/g, '');
  const sqHead = head.map(sq);
  // 같은 질문이 여러 페이지(펀다이빙 · 교육 · 체험다이빙 분기)에 있을 수 있어서, 값이 있는 칸을 찾아서 읽어요 (activateFormRow_의 get()이랑 같은 방식)
  const getAns = (r, t) => { const tt = sq(t); for (let i = 0; i < head.length; i++) if (sqHead[i].indexOf(tt) === 0 && r[i] !== '' && r[i] != null) return r[i]; return ''; };
  const tz = ss.getSpreadsheetTimeZone();
  const out = [];
  vals.forEach((r, i) => {
    if (!(r[0] instanceof Date)) return;   // A열(타임스탬프) 없는 줄은 체크박스만 미리 깔아둔 빈 줄이에요 — 진짜 제출만 보여줘요
    const done = String(r[cols.doneCol - 1] || '').trim();
    if (done) return;   // 이미 활성화된 건 안 보여줘요
    const kind = String(getAns(r, FQ.kind) || '');
    const day = getAns(r, /^교육/.test(kind) ? FQ.courseDate : kind === '체험다이빙' ? FQ.dsdDate : FQ.funDate);
    out.push({
      row: i + 2,
      time: r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'MM-dd HH:mm') : String(r[0] || ''),
      name: String(getAns(r, FQ.kname) || ''),
      en: (String(getAns(r, FQ.first) || '') + ' ' + String(getAns(r, FQ.lname) || '')).trim(),
      kind,
      day: day instanceof Date ? Utilities.formatDate(day, tz, 'yyyy-MM-dd') : String(day || ''),
      tel: String(getAns(r, FQ.tel) || ''),
      stay: String(getAns(r, FQ.stay) || '')
    });
  });
  out.sort((a, b) => b.row - a.row);   // 최신 제출이 위로
  return out;
}

function openPendingFormDialog() {
  const t = HtmlService.createTemplate(SC_PENDING_HTML);
  t.data = JSON.stringify({ rows: getPendingFormRows_() });
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(460).setHeight(560), '대기중인 폼 신청');
}

// 창에서 "활성화" 버튼 누르면 호출돼요 — onEdit에서 체크박스로 하는 것과 똑같이 처리하고, 체크박스도 같이 잠가요
function activatePendingRow(row) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(FORM_RESP);
  const cols = formActivateCols_(sh);
  const doneCell = sh.getRange(row, cols.doneCol);
  if (String(doneCell.getValue() || '').trim()) return doneCell.getValue();
  const result = activateFormRow_(sh, row);
  doneCell.setValue(result);
  sh.getRange(row, cols.actCol).clearDataValidations().setValue(true).setFontColor('#999999');
  return result;
}

var SC_PENDING_HTML = `<!doctype html><html><head><base target="_top"><style>
body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;font-size:13px;color:#1F2A30;margin:0;padding:10px}
.card{border:1px solid #E1E8EB;border-radius:10px;padding:10px;margin-bottom:8px}
.card b{font-size:15px}.card small{color:#7A8A92}
.row{display:flex;justify-content:space-between;align-items:center;gap:8px}
button{background:#2E7D5B;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}
button:disabled{background:#B7C7CC;cursor:default}
.empty{color:#7A8A92;text-align:center;padding:30px 0}
</style></head><body>
<div id="list"></div>
<script>
const D = <?!= data ?>;
function render() {
  const el = document.getElementById('list');
  if (!D.rows.length) { el.innerHTML = '<div class="empty">대기중인 신청이 없어요 🎉</div>'; return; }
  el.innerHTML = D.rows.map(r => '<div class="card" id="r' + r.row + '"><div class="row"><div><b>' + (r.name || r.en || '(이름 없음)') +
    '</b><br><small>' + r.en + ' · ' + r.time + '</small><br><small>' + r.kind + (r.day ? ' · 첫 일정 ' + r.day : '') + (r.stay ? ' · ' + r.stay : '') + (r.tel ? ' · ' + r.tel : '') + '</small></div>' +
    '<button onclick="go(' + r.row + ')">활성화</button></div></div>').join('');
}
function go(row) {
  const btn = document.querySelector('#r' + row + ' button');
  btn.disabled = true; btn.textContent = '처리 중...';
  google.script.run.withSuccessHandler(res => {
    const card = document.getElementById('r' + row);
    card.style.opacity = 0.5;
    btn.textContent = res + ' 완료';
  }).withFailureHandler(e => { btn.disabled = false; btn.textContent = '활성화'; alert('실패: ' + e.message); }).activatePendingRow(row);
}
render();
</script></body></html>`;

// 다음 회원번호: 활성 · 비활성 탭에서 가장 큰 J번호 + 1 (기존 J · M · D 번호는 그대로)
function nextCode_(ss) {
  let max = 0;
  [ACTIVE, INACTIVE].forEach(n => {
    const sh = ss.getSheetByName(n); if (!sh) return;
    memberRows_(sh, 1).forEach(r => { const m = String(r[0]).trim().match(/^J(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
  });
  const n = String(max + 1);
  return 'J' + (n.length < 4 ? ('0000' + n).slice(-4) : n);
}

// 폼을 다시 만들고 싶을 때: 예전 폼 연결을 끊고 기록을 지운 뒤 setupForm 을 다시 실행하세요
function resetForm() {
  const props = PropertiesService.getDocumentProperties();
  const id = props.getProperty('formId');
  if (id) { try { FormApp.openById(id).removeDestination(); } catch (e) {} }
  props.deleteProperty('formId');
  props.deleteProperty('formBuild');
  const ss = SpreadsheetApp.getActive();
  const old = ss.getSheetByName(FORM_RESP);
  if (old) old.setName(FORM_RESP + ' (예전 폼)');
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'onFormSubmitted').forEach(t => ScriptApp.deleteTrigger(t));
  try { SpreadsheetApp.getUi().alert('예전 폼 연결을 끊었어요. 이제 setupForm 을 실행하면 새 폼이 만들어져요.\n예전 폼 파일은 구글드라이브에서 지워도 돼요.'); } catch (e) {}
}

// "스프레드시트 바꾸기"로 데이터를 가져온 뒤 폼 응답 탭이 사라졌을 때: 지금 폼을 이 시트에 다시 연결해요 (폼은 그대로)
function relinkForm() {
  const ss = SpreadsheetApp.getActive();
  const id = PropertiesService.getDocumentProperties().getProperty('formId') || JSON.parse(PropertiesService.getDocumentProperties().getProperty('formBuild') || '{}').formId;
  if (!id) throw new Error('연결할 폼을 찾지 못했어요. buildForm 으로 폼을 먼저 만들어 주세요.');
  const form = FormApp.openById(id);
  if (ss.getSheetByName(FORM_RESP)) { say_('폼 응답 탭이 이미 있어요. 그대로 쓰면 돼요.'); return; }
  try { form.removeDestination(); } catch (e) {}
  const before = ss.getSheets().map(sh => sh.getSheetId());
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  let resp = null;
  for (let i = 0; i < 10 && !resp; i++) { SpreadsheetApp.flush(); resp = ss.getSheets().find(sh => before.indexOf(sh.getSheetId()) < 0); if (!resp) Utilities.sleep(1000); }
  if (resp) resp.setName(FORM_RESP);
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'onFormSubmitted')) ScriptApp.newTrigger('onFormSubmitted').forSpreadsheet(ss).onFormSubmit().create();
  PropertiesService.getDocumentProperties().setProperty('formId', id);
  say_('폼을 다시 연결했어요. 폼 응답 탭이 새로 생겼어요.');
}

/* ================= 버튼 그림 (PNG) ================= */
var M_BUTTONS = {
  bulkoff: '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',
  bulkon: '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',
  addm: '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',
  find: 'iVBORw0KGgoAAAANSUhEUgAAAbgAAABQCAYAAABrqmDoAAANyklEQVR42u3deVxU1QIH8N+9w74OCCiCKOGCRS6kmQRqZqU+15dpZWq5tPh57eVr/WQv87V9ylI/WimZ2aZWrmguKQhqRYKIPEFBQUQBWQRmmH3eH+iVKzPAwKAw/b7/4D33zp07l4O/zzn3nDMCWqjfzIVmEBERtbGMtQuFlrxOYKgREZEjhp3AYCMiIkcMOpHhRkREHU1zsklkuBERkSOGnMhwIyIiRww5keFGRESOGHIiw42IiBwx5ESGGxEROWLIiQw3IiJyxJATeTuIiMgRiWy9ERGRI7bi2IIjIiLHbcERERE5GoHdk0RExBYcERERA46IiIgBR0RExIAjIiJiwBEREQOOiIiIAUdERNSOOfEWkCNxd3VG4vIF0nZiWg5eXr7BpnMoFCJEQYDeYGzW8ctfnI7BfXtI23c8vhgmU8umlzo7KTB/8ohGj1m/LxXnL15qUD57XCyenDT86vbiNcjMO9em97tvj2B8/cZsafvrHQex/Kd9rIjEgCOyZtrdg+Hp5mJ1f3LGKeScLba4z9X5arV2UojNCrTRQ6IwLqYfunX2R9dOvhBEARfKLuFsSQV2HD6GrclHYTCaLP8RKUTZe7bqD1IhYva42EaPSUzPsRhwClGQXYcgtP3vSbj2fovsFCIGHFGj5oyLRWd/H6v7K2rUVgPOFtF9wrBo3mSEBCob7OsaoETXACWG3ByOJyYOxxtf/ILUE/n85RAx4Ijat16hQVj6/MPwcneVytQaHfKKSmE0mdEzJBCel/cFd/LFkmcfxKxF8cg9V9pm16QzGLEwfkujx5wtKW/1+7zw4D2YNSbGptccPJaLpz5ax4pDDDii1li8NgGuLtar5/G8ola/x7tPTJaF2/e7/8DSjXuh0ugAAG4uzpj/zxFSEHh7uOE/cydi+tur7PtHqBDh7KSQtncezkRznjUCgNFogq6Zzwpbq6JGzYpJDDgiW3i6u+Lu2yJha9didJ8waftE/gWbuiwDld7oE9blamCeLsJ763bIjtHo9Pj4h924JbwrBkX2AABE3RQCpbcHKqvVdn3euGD66Ba9dsNvqVj09fbrE3BVKlZWYsAR2SJQ6YV35k1q1TmW/fSbTQF3pQV0RWFJhdVjC0sqpIADAE83F7sG3I3wxeYkrPv1cKPH3BUdiddmjpW2z5ddYmUlBhxRe3e+7BKq1Rp4e7gBAOL690Lvbp0bhGR4cABG3tZX2q5Wa1BcXmXXa1FrdQ3OqRBFBCi95C2oajV0eoOsrFqtsR5iC2bCaLo68vPhhV+ioLju+V1NrRY1tdpGr6uTj6ds+/jpIlYcYsAR2aK8SoUPvt3ZqnMcPVVo0/F6gxGrtyXjuamjAAAebi5Y99ZcbEvJQNbpIpjMZkR274KJcQPg5nK1tbcm4aDV6QIt9UtiGn5JTJOVDRvQG0uff0hWtnbnIcRvS272eT2umWYhirbNG+jXM1T6t8lsRnbBBVZWYsAR2aJKpcG3u36Xlbm6OGHMkCj06tYZoUF+8PZwQ9HFSpwrrcSBoyftMoH5q+0pCAlQ4oGRg6T5c/ePiMb9I6ItHr/5QDpWbT1wXe7J5GEDG5RNHTkIaxJSWjyJ3BY+nm4Y3DdcNqhHfXnwDREDjqiFZoweijnjYuHn7SErv61PdwDAk5OGI/VEPt5ft6PVc+HeXbsdKcdOYe74OETdFGLxmOyCYqzaegB7/sy6Lp8/5tYIjBjYp0F5cCdfvDZjbLMHlby0bANO5J9HS56h3TckSjZJfufvmayYxIAjao254+Pw9JSRTR43KLI7Pl8wA7MWxUvPlVrCbAb2HcnGviPZ6Bbkh26d/REa6AeFKKKwtAJnS8px5nwZLC2ppW+D4fnhwQH4YP4UqTvx/MVLyDpThLsH1T0HfGDkIOgMRiz5cXeT0wMulNetxGIrhULEY2PvlN2jXX8cZ+UkBhxRS0V27yILN63egNXbkpGYlo0atRbhXQMwa0yMtO6jv48n3pk3CbMWxTf7PVydndAzNAgKUYQoCtJPZycF3Fyc4ersBL3RCIUoone3zoju0x0+Hm7w9nCDj6c7/H08EODrDX8fT9zx+GJodHq7ff5JcQPw70fGyJ6dffzjbvyRlYcBvcLQybdu0Mf0e4cgtl9PLFm/B0npOXZ/Jjg5bqBsZZc9qVkoqahmBSUGHBFa3DXXU7b9wbc7sXHfX9J2YWkFDmbmYsM7TyIiJBAAMKBXN3i5uzY5IrD+pOpv35pnl3Ua/Xw8LK4JaQtRFDBiYB/MuG+obF4fUDfH7UrLad77X2PlyzMQ5OcNAOjepRM+eWYaLlbWYPJry1Gl0sA+Uza88dy0Uag/uGTFL/tZOQn8uhyiVjCb5YMnyi7VNDjGaDSholol6z6zhUqjw/myyhZfo95gRNHFSqSfPAuF0Po/n3Ex/fDJM9MahNuW5KNYvDZB2s49V4qZ76zGX9nytTA3HUizW7iJgoC3506Qpk4AwI5Dx9p0aTIituDobyHjmqH+r8wYi2q1FqknzgAAvNxdMWdcrGzSde65kma33lBvKay+PYJhMpthMplhNJlgMJqgNxihNxhx5609pe5AncGIl5atR3F5FUoqqlFRrbI5VBuzJfko7oqOxMjLK7nUavX48Lud+Gn/EViauzfnv2swMW4gHh0bA1EQ8MXmJLtdy0sP34c767WiSyurWz19g4gBRwTgr+x87E39nzSgoou/D1a/OgsqjQ7Vag2ClN6yuVwmsxkffverze/z6Ya9je5f8/pjUsAZDEYkpuUAAPy8PfDExOENjg8N8mvV5164egu6dfbHwWOn8N2u33GhkYnkZjOwKSkNm5LS4OvpDm29id+7/sjCqcISaTv/QhlsGdwz/d4hsvd588tNqKypZcUkBhyRPby5ajPUWh3G39kf9ZfGuva74Sqr1Vj8TQIOH8+7btfm7+OJp5r4MtKWuKSqxZTXV0ghOiiye4vPVX9lkyA/nya7LwUBePHBezFj9FBZ+Wcb9+JQZh4rJDHgiOxFVavFG19swvq9qbh3yC2YENsfvp7u0v5DmXlITM/GjsOZHX49SEtuvzkcH8yfYpdzJaXn4OlPvre6P0DphUXzJmNo1E2y8lVbD9i0YgoRA47IBhm5hcjILURIgFJ6PgUALy1bb/Mzt8YMG9Abo4fcgvpLcaGRRZenvrmyYavz0fG4NSKkw9xbURQwIXYAnp86CsprJtPHb0vG0o2/sQISA47ouldYhQhfT3f4eNbNS/Pz9kCA0huBSi8kpZ9EQXGZTefrGRKIf8T0k7a3HcxA+smzUldf/WdcWr0B2QXFFkZm2i9wSyurkZSeA8vdiQJioiKgqLfCyPHTRRZHmwJApoXFkb3cXbH2zTnSNAvps+kMWBi/BQmHjrGSEQOOyB4UChGrX5kFURQhCgJEUYAgCFBc/hkSKB/Akbh8Aax3b+psDjhLlqzfc8Pux5HsAhzJLrC4b2DvMMT17yUryykobvIbwOurqdViz59ZiAi5Olgm71wpXv38Z5zI52LKxIAjshuj0YQu/r4IDvBt9bmCO/nekM/wwtL1cK7XqmqLxZB9PN3w9pwJDconDRuIxPS6pcaaa8Wm/egd1gUxURH4cmsSvtqeYvfVUIgYcEQATp+/2GTAmcxmqGq1qFZrUKXSoEpVi0uqWpRXqVBepcLFyhocP1N0wwbGtKVbwrvio389gK4BSilAq9QaKL3cIQjAx09Pw9KNe/FVQkqz5uiZzcDrn/8MP29PFJZWsAISA46orXz0/a8ISPCCwWiC0VQ34VqrN6BWq0OtVg+1RgetXt+s/7yv/aZuW3Xv0qnVozNLKqpx0cpzMVuEBvrh/hHRmDF6KJydFFL5ys2JSM8pwLIXp8PFSQFRFPDs1FG4/eZwrNqaLE2Mb2pFFxW//oYYcERtK/dcabtZDuqVR8a0+hyfrt+D+O0pNr/u5h7BCO8aiJBAJQZF9sDtfcNla2YajSYs+3mfNIT/qQ+/wXtP3Y9AZd36lEOjIjA0KgJ550qx+88snLlQhvwLZcg6U2TX1VeIGHBEZJPBfcPxwoP3WNxXWFqB11b+LPvm8tQT+Zjy+gq8NXuCbCrFTSGBeOLyIJL9adl4dskPvLnEgCP6uykur0JaToHdz9kS63YdxvjY/ugVGiSV5ZwtxpqEg9j5eyaMFgaCVNbU4vnPfsStESGYOz4Owwf0kVp9Gp0e732zg79k+tsS+s1cyM4LchjOTgrMr7ecVm5RKbalZHSY6+/fMxSTh0XjWF4hMk4V4mS9tSWbIyRQicGRPTCwdxgyTxdhw2+pbXq9QX7eeGjU7bJWZcqxU6yIxIAjIiICvw+OiIiIAUdERAw4IiIiBhwREREDjoiIiAFHRETEgCMiImLAERERA46IiMhBAq6goIB3gYiIHEpBQQFbcERExC5KIiKijhVw7KYkIiI4UPckW3BEROS4LbjK/fECW3FERORIrbfK/fGCaGkHERFRRw03q4NMGHJERNTRw00KuCvdlAw5IiLq6OF2JdNEW9KQiIiovbfcGnRRXtuKY8gREVFHC7f6WSZa28GQIyKijhpuACBYeqFyxGyzpfKwsDDeVSIianddkpYaaIK1k1gLOYYdERG1l+ds1sKt0YBrTsgRERHdSNbCDWhiqa7GXkhERNRew61Za1Ey5IiIqKOFG9BEFyXYZUlERB0s2FoUcAw7IiJqz6FW3/8B6S393IeHqpEAAAAASUVORK5CYII=',
  deact: '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',
  act: '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'
};
