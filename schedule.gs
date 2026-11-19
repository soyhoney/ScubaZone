/**
 * 스쿠버존 스케줄 (2단계) — Apps Script 에 "스케줄" 파일을 하나 더 만들어 붙여 넣어요 (회원 관리 코드와 같이 써요)
 *
 * 탭
 *   홈      날짜 고르기 + 버튼 (스케줄 만들기 · 픽업 안내 · 회원 찾기 · ＋ 신청 추가 · 펀다 / 패밀리방 스케줄 이미지 · ＋ 회원 직접 추가 · 퍼밋 명단). "스케줄 만들기"를 누르면 홈 아래에 스케줄표 · 픽업 요약 · 영어 픽업 안내가 나와요
 *   일정    누가 언제 무엇을 하는지 한 줄씩 (날짜 · 회원번호 · 이름 · 카테고리 · 종류 · 다이빙 사이트 · 시간 · 강사 · 픽업 · 메모 · 입력 · 깡수 · 패키지 여부 · 패키지 카운팅)
 *   캘린더  한 달 달력. 종류(전체 · 교육만 · 펀다이빙만 · OW 하나만 …)를 골라서 그 일정만 보여 줘요
 *   설정    약어 → 이름 · 종류 · 캘린더 색 / 픽업 줄임말 / 강사 이니셜
 *
 * 처음 한 번: setupSchedule 실행
 */

var SC = { HOME: '홈', DATA: '일정', CAL: '캘린더', SET: '설정', PERMIT: 'Permit', BOAT: 'Boat Permit' };
var SC_HEAD = ['날짜', '회원번호', '이름', '카테고리', '종류', '다이빙 사이트', '시간', '강사', '픽업', '메모', '입력', '깡수', '패키지 여부', '패키지 카운팅', '패키지 구분'];   // 카테고리(D열) · 종류(E열) 순서예요 — 종류 D열이던 옛날 버전이랑 헷갈리지 않게 주의! L(깡수) · M(패키지 여부, 체크박스) · N(패키지 카운팅) · O(패키지 구분)은 펀다이빙 패키지(패키지.gs)용 — 비워두면 자동으로 채워져요. O열은 이 줄이 그 회원의 "몇 차" 패키지에서 깎였는지 숫자로 표시(1, 2 …) — 한 회원이 패키지를 여러 번 끊었을 때 구분하려고 써요
// F열(다이빙 사이트): 교육 · 나이트다이빙은 종류(E열)에 과정/종류 이름, 사이트는 여기 따로 (선택) / 펀다이빙 · 보트다이빙은 종류(E열)가 "-" 고정이고 사이트는 전부 여기로
// scSynthLabel_()이 둘을 합쳐서 기존 코드(scGroup_ 등)가 쓰던 "과정+사이트" 결합 라벨을 그대로 만들어줘요 — 그 아래 로직은 안 바뀌어요
function scSynthLabel_(catVal, typeVal, siteVal) {
  catVal = String(catVal || '').trim(); typeVal = String(typeVal || '').trim(); siteVal = String(siteVal || '').trim();
  if (typeVal && typeVal !== '-') return siteVal ? typeVal + '+' + siteVal : typeVal;   // 교육(과정 이름) · 나이트다이빙(Night Diving)처럼 종류가 따로 있는 경우
  return siteVal || typeVal;
}
var SC_KINDS = ['교육', '펀다이빙', '보트다이빙', '체험다이빙', '기타', '셋업'];   // 일정 탭 카테고리(D열) 드롭다운 고정 목록. 나이트다이빙은 따로 안 두고 펀다이빙에서 🌙 체크로 처리해요. 기타 = 다이빙 아닌 픽업(오피스 직원 등) · 셋업 = 보트다이빙 전날 준비 같은 작업
var SC_OUT = 11;   // 홈 탭: 버튼 바로 아래 이 줄부터 스케줄표가 나와요
var SC_COLOR = { head: '#D9E1F2', input: '#FFF2CC', line: '#9AA7AD', fun: '#D9EAD3' };

// 약어 · 스케줄표 이름 · 종류 · 캘린더 색 (펀다이빙은 모두 같은 색, 교육은 과정마다 다른 색)
// [스케줄표 이름(=일정 탭에 쓰는 이름), 동의어(약어 · 예전 표기 · 쉼표로), 종류, 캘린더 색]
var SC_LABELS = [
  ['Fun Diving', 'F/D', 'Fun', '#D9EAD3'], ['Blue Hole', 'B.H', 'Fun', '#D9EAD3'], ['Canyon', '', 'Fun', '#D9EAD3'], ['Mashraba', 'Mash', 'Fun', '#D9EAD3'],
  ['Islands', 'Island', 'Fun', '#D9EAD3'], ['South', '', 'Fun', '#D9EAD3'], ['Caves', 'Cave', 'Fun', '#D9EAD3'], ['Lighthouse', 'L.H', 'Fun', '#D9EAD3'],
  ['Eel Garden', 'E.G', 'Fun', '#D9EAD3'], ['Um Sid', 'Umsid', 'Fun', '#D9EAD3'], ['T-Gorm', 'T-gorm', 'Fun', '#D9EAD3'], ["Rick's Reef", 'Ricks', 'Fun', '#D9EAD3'],
  ['Moray Garden', 'Moray', 'Fun', '#D9EAD3'], ['Abu Talha', 'Abu, Abutal', 'Fun', '#D9EAD3'], ['3 Kings', '', 'Fun', '#D9EAD3'], ['Tiger', '', 'Fun', '#D9EAD3'],
  ['Night Diving', 'Night Dive, N/D, N.D', 'Night', '#D9EAD3'],
  ['Gabr el Bint', 'Bint, Gabr', 'Boat', '#D9EAD3'], ['Tiran', '', 'Boat', '#D9EAD3'], ['Thistlegorm', 'Thistle', 'Boat', '#D9EAD3'],
  ['DSD', '', 'Course', '#F9CB9C'], ['Check Diving', 'Check Dive, C/D, C.D, CheckDive', 'Fun', '#B6D7A8'], ['Open Water', 'OW', 'Course', '#C9DAF8'], ['Semi Open Water', 'Semi OW', 'Course', '#A2C4C9'],
  ['Advanced Open Water', 'AOW', 'Course', '#FFE599'], ['EFR', '', 'Course', '#F4CCCC'], ['Rescue', 'Res', 'Course', '#EA9999'], ['EFR / Rescue', 'EFR/Res', 'Course', '#EA9999'],
  ['DMT', '', 'Course', '#B4A7D6'], ['IDC', '', 'Course', '#D5A6BD'], ['IE', '', 'Course', '#D5A6BD'],
  ['Deep Specialty', 'Deep', 'Course', '#FCE5CD'], ['Nitrox Specialty', 'EAN', 'Course', '#D9D2E9'], ['Kick Training', 'Kick, K.T', 'Course', '#E6B8AF'],
  ['SMB Training', 'SMB', 'Course', '#E6B8AF'], ['Buoyancy Training', 'Buoyancy', 'Course', '#E6B8AF'], ['Swimming', '', 'Course', '#EFEFEF'], ['Training', 'Trainning', 'Course', '#EFEFEF']
];
var SC_PICKUPS = [['Coffee Corner', 'C.C'], ['Tranquilo', 'Tranquilo'], ['Coral Coast', 'Coral'], ['El Salam', 'El Salam'], ['1000 mart', '1000mart'],
  ['Gmart', 'Gmart'], ['German', 'German'], ['Darwish', 'Darwish'], ['Wooyooni', 'Wooyooni']];
var SC_GUIDES = [['H', ''], ['S', ''], ['Q', ''], ['M', ''], ['Ga', ''], ['O', ''], ['MJ', 'MJ']];
var SC_TIMES = ['04:00am', '07:00am', '08:00am', '08:30am', '09:00am', '09:30am', '10:00am', '11:00am', '12:00pm', '01:00pm', '02:00pm', '03:00pm', '04:00pm', '05:00pm', '05:30pm', '06:00pm'];
// 일정 탭 F열(시간) 드롭다운 — 새벽 4시부터 저녁 7시까지 30분 단위 (오전 9:10처럼 딱 안 맞는 시간은 그냥 직접 타이핑해도 돼요 — 경고만 뜨고 막히진 않아요)
var SC_TIME_CHOICES = (() => {
  const list = [];
  for (let h = 4; h <= 19; h++) {
    for (let mm = 0; mm < 60; mm += 30) {
      if (h === 19 && mm > 0) continue;
      const ap = h < 12 ? '오전' : '오후';
      const dh = h > 12 ? h - 12 : h;
      list.push(ap + ' ' + dh + ':' + (mm === 0 ? '00' : '30'));
    }
  }
  return list;
})();
// 캘린더 탭 카테고리(D2) 목록
var SC_CAL_MAJOR = ['전체', '교육', '펀다이빙', '나이트다이빙', '보트다이빙', '체험다이빙'];

/* ================= 처음 한 번 ================= */
function setupSchedule() {
  const ss = SpreadsheetApp.getActive();
  // 회원 관리 코드(Code.gs)가 같이 있어야 해요
  if (typeof memberRows_ !== 'function') throw new Error('회원 관리 코드가 없어요. Code.gs 에 회원 코드를 붙여 넣어 주세요. (스케줄 코드가 두 파일에 들어가 있지 않은지도 확인해 주세요)');
  scSettings_(ss);
  scData_(ss);
  scHome_(ss);
  scCalendarSheet_(ss);
  setupPermitSheet_(ss);
  if (typeof setupPackageSheet === 'function') setupPackageSheet();
  if (typeof setupTheorySheet === 'function') setupTheorySheet();
  // 예전에 썼던 나이트 자동 계산 트리거가 남아 있으면 지워요 (이제 나이트는 안내 문구만 써요)
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'updateNightOption').forEach(t => ScriptApp.deleteTrigger(t));
  ss.getSheetByName(SC.HOME).activate();
  say_('홈 · 일정 · 캘린더 · 설정 탭을 만들었어요. 홈 탭 버튼으로 쓰면 돼요.');
}

var SC_SET_HEAD = ['스케줄표 이름', '동의어 (약어 · 예전 표기, 쉼표로)', '종류 (Fun · Night · Boat · Course)', '캘린더 색 (칸 색을 바꾸면 돼요)',
  '안내문 (스케줄표 Remark 칸에 자동으로 들어가요 — {names}=손님 이름(@붙여서) · {time}=시간 · {pickup}=픽업 장소로 적으면 자동으로 채워져요)'];
function scSettings_(ss) {
  let sh = ss.getSheetByName(SC.SET);
  if (sh) {
    // 이미 있던 설정 탭이면 "안내문" 칸(E열)만 헤더로 추가해요 (기존 데이터는 안 건드려요)
    if (String(sh.getRange(1, 5).getValue()).trim() !== SC_SET_HEAD[4]) {
      sh.getRange(1, 5).setValue(SC_SET_HEAD[4]).setFontWeight('bold').setBackground(SC_COLOR.head).setWrap(true);
      sh.setColumnWidth(5, 260);
    }
    return sh;
  }
  sh = ss.insertSheet(SC.SET);
  sh.getRange(1, 1, 1, 5).setValues([SC_SET_HEAD]);
  sh.getRange(2, 1, SC_LABELS.length, 3).setValues(SC_LABELS.map(r => r.slice(0, 3)));
  sh.getRange(2, 4, SC_LABELS.length, 1).setBackgrounds(SC_LABELS.map(r => [r[3]]));
  sh.getRange(1, 6, 1, 2).setValues([['픽업', '1행 요약 줄임말']]);
  sh.getRange(2, 6, SC_PICKUPS.length, 2).setValues(SC_PICKUPS);
  sh.getRange(1, 9, 1, 2).setValues([['강사 이니셜', 'Guide 칸 이름']]);
  sh.getRange(2, 9, SC_GUIDES.length, 2).setValues(SC_GUIDES);
  [[1, 5], [6, 2], [9, 2]].forEach(([c, w]) => sh.getRange(1, c, 1, w).setFontWeight('bold').setBackground(SC_COLOR.head).setWrap(true));
  sh.getRange(2, 3, 300, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Fun', 'Night', 'Boat', 'Course'], true).build());
  sh.setColumnWidths(1, 10, 110); sh.setColumnWidth(2, 220); sh.setColumnWidth(3, 190); sh.setColumnWidth(4, 170); sh.setColumnWidth(5, 260);
  sh.setFrozenRows(1);
  return sh;
}

// 예전 "약어 중심" 설정 표(이미 쓰고 있던 설정 탭)를 "이름 중심"으로 한 번 정리해요.
// 같은 스케줄표 이름(B열)으로 묶고, 그 줄들의 약어(A열)를 동의어로 합쳐요. 색 · 종류는 첫 줄 것을 써요.
// 메뉴 "스쿠버존 → 설정표 이름 중심으로 정리" 또는 Apps Script 편집기에서 relabelSettings 실행
function relabelSettings() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.SET);
  if (!sh) { scSettings_(ss); say_('설정 탭을 새로 만들었어요.'); return; }
  const last = sh.getLastRow();
  if (last < 2) { say_('설정 탭에 정리할 줄이 없어요.'); return; }
  const v = sh.getRange(2, 1, last - 1, 3).getValues();
  const bg = sh.getRange(2, 4, last - 1, 1).getBackgrounds();
  const byName = {}, order = [];
  v.forEach((r, i) => {
    const a = String(r[0] || '').trim(), b = String(r[1] || '').trim(), kind = String(r[2] || '').trim();
    const name = b || a;   // 이미 "이름 중심"으로 정리됐으면 B열이 비어 있을 수 있어요 → A열(이름)을 써요
    if (!name) return;
    const k = scNorm_(name);
    if (!byName[k]) { byName[k] = { name, syn: [], kind: kind || 'Course', color: bg[i][0] && bg[i][0] !== '#ffffff' ? bg[i][0] : '#EFEFEF' }; order.push(k); }
    const syn = byName[k].syn;
    [a, b].forEach(x => { if (x && x !== name && scNorm_(x) !== k && syn.indexOf(x) < 0) syn.push(x); });
  });
  const rows = order.map(k => [byName[k].name, byName[k].syn.join(', '), byName[k].kind, '']);
  const colors = order.map(k => [byName[k].color]);
  const area = sh.getRange(2, 1, Math.max(last - 1, rows.length), 4);
  area.clearContent(); area.setBackground(null);
  sh.getRange(1, 1, 1, 4).setValues([SC_SET_HEAD]);
  sh.setColumnWidth(2, 220);
  sh.getRange(2, 1, rows.length, 4).setValues(rows);
  sh.getRange(2, 4, rows.length, 1).setBackgrounds(colors);
  ss.toast(v.length + '줄 → ' + rows.length + '줄로 정리했어요. 동의어 · 색은 확인해서 고쳐 주세요.', '설정 정리', 10);
}

function scData_(ss) {
  let sh = ss.getSheetByName(SC.DATA);
  if (!sh) sh = ss.insertSheet(SC.DATA);
  if (sh.getMaxColumns() < SC_HEAD.length) sh.insertColumnsAfter(sh.getMaxColumns(), SC_HEAD.length - sh.getMaxColumns());   // 칸이 늘어나서(패키지 구분 등), 시트 열 자체가 모자라면 늘려줘요
  sh.getRange(1, 1, 1, SC_HEAD.length).setValues([SC_HEAD]).setFontWeight('bold').setBackground(SC_COLOR.head);
  sh.setFrozenRows(1);
  const n = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, 1, n, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(2, 15, n, 1).setNumberFormat('0');   // O열 = 패키지 구분(몇 차 패키지인지, 숫자)
  sh.setColumnWidths(1, SC_HEAD.length, 110); sh.setColumnWidth(6, 160); sh.setColumnWidth(10, 220); sh.setColumnWidth(14, 150);
  sh.getRange(2, 13, n, 1).insertCheckboxes();   // M열 = 패키지 여부 (체크되면 "이미 소모 처리됨"이라는 뜻)
  return sh;
}

function scHome_(ss) {
  let sh = ss.getSheetByName(SC.HOME);
  if (!sh) sh = ss.insertSheet(SC.HOME, 0);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
  sh.getRange('A1').setValue('스쿠버존 다이빙 관리').setFontSize(18).setFontWeight('bold');
  sh.getRange('A2').setValue('날짜').setFontWeight('bold').setBackground(SC_COLOR.head);
  if (!(sh.getRange('B2').getValue() instanceof Date)) sh.getRange('B2').setValue(tomorrow);
  sh.getRange('B2').setNumberFormat('yyyy-mm-dd (ddd)').setBackground(SC_COLOR.input).setFontWeight('bold')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build())
    .setBorder(true, true, true, true, null, null, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('C2').setValue('← 두 번 누르면 달력. 스케줄 만들기 · 픽업 안내 · 이미지는 이 날짜로 해요').setFontColor('#587078');
  sh.getRange('E2:G2').clearContent().setBackground(null);   // 예전 "패밀리방 한마디" 칸은 안 써서 지웠어요
  sh.setColumnWidth(1, 130); sh.setColumnWidth(2, 140); sh.setColumnWidth(3, 150); sh.setColumnWidth(4, 120);
  sh.setColumnWidth(5, 130); sh.setColumnWidth(6, 95); sh.setColumnWidth(7, 160); sh.setColumnWidth(8, 200);
  sh.setRowHeights(4, 6, 26);
  sh.setHiddenGridlines(true);
  // 왼쪽: 스케줄 만들기 · 신청 추가 · 픽업 안내 / 가운데: 이미지 두 개 / 오른쪽: 회원 찾기 · 회원 직접 추가
  scButtons_(sh, [['schedule', 'buildSchedule', 4, 1], ['add', 'openAddDialog', 6, 1], ['wechat', 'pickupMessage', 8, 1],
    ['imgfun', 'openFunImage', 4, 3], ['imgfam', 'openFamilyImage', 6, 3],
    ['permit', 'buildPermit', 8, 3],
    ['find', 'openFindDialog', 4, 5], ['addm', 'openAddMemberDialog', 6, 5], ['pending', 'openPendingFormDialog', 8, 5],
    ['boatpermit', 'buildBoatPermit', 10, 1]]);
  // 캘린더는 캘린더 탭에서 · 예전 손님 불러오기는 회원 찾기로 (홈의 두 버튼은 지워요)
  sh.getImages().forEach(im => { try { if (['buildCalendar', 'openRestoreDialog'].indexOf(im.getScript()) >= 0) im.remove(); } catch (e) {} });
}

function scCalendarSheet_(ss) {
  let sh = ss.getSheetByName(SC.CAL);
  if (!sh) sh = ss.insertSheet(SC.CAL);
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  sh.getRange('A2').setValue('달').setFontWeight('bold').setBackground(SC_COLOR.head);
  if (!(sh.getRange('B2').getValue() instanceof Date)) sh.getRange('B2').setValue(month);
  sh.getRange('B2').setNumberFormat('yyyy-mm').setBackground(SC_COLOR.input).setFontWeight('bold').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());
  sh.getRange('C2').setValue('카테고리').setFontWeight('bold').setBackground(SC_COLOR.head);
  if (!sh.getRange('D2').getValue()) sh.getRange('D2').setValue('전체');
  sh.getRange('D2').setBackground(SC_COLOR.input).setFontWeight('bold')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(SC_CAL_MAJOR, true).build());
  sh.getRange('E2:F2').clearContent();   // 예전 소분류 칸은 지워요 — 이제 카테고리로만 조회해요
  sh.getRange('G2').setValue('← 달 · 카테고리를 고르고 오른쪽 버튼').setFontColor('#587078');
  scButtons_(sh, [['calendar', 'buildCalendar', 1, 9]]);
}

// 분류(펀다이빙 · 보트다이빙 · 나이트다이빙)별 사이트 이름 목록. 보트 · 나이트 전용으로 등록된 게 아직 없으면
// 일단 펀다이빙 사이트 전체를 보여줘요 (설정 탭에 그 kind로 따로 등록해두면 자동으로 그걸로 좁혀져요)
function scSiteNames_(S, kind) {
  const set = new Set();
  Object.keys(S.labels).forEach(k => { if (S.labels[k].kind === kind) set.add(S.labels[k].name); });
  if ((kind === 'Boat' || kind === 'Night') && !set.size) {
    Object.keys(S.labels).forEach(k => { if (S.labels[k].kind !== 'Course') set.add(S.labels[k].name); });
  } else if (kind === 'Fun' && !set.size) {
    Object.keys(S.labels).forEach(k => { if (S.labels[k].kind !== 'Course') set.add(S.labels[k].name); });
  }
  return [...set].sort();
}
var SC_MAJOR_KIND = { '펀다이빙': 'Fun', '보트다이빙': 'Boat', '나이트다이빙': 'Night' };   // 대분류 한글 → 실제 kind 값

// 그림 버튼 (누르면 함수 실행). 다시 만들 때는 같은 함수 버튼을 지우고 새로 붙여요
// 구글이 그림을 한꺼번에 받다가 가끔 실패해서, 하나씩 붙이고 실패하면 몇 번 다시 시도해요
function scButtons_(sh, list) {
  const fns = list.map(x => x[1]);
  sh.getImages().forEach(im => { try { if (fns.indexOf(im.getScript()) >= 0) im.remove(); } catch (e) {} });
  SpreadsheetApp.flush();
  const failed = [];
  list.forEach(([key, fn, row, col]) => {
    let ok = false;
    for (let k = 0; k < 3 && !ok; k++) {
      try {
        const img = sh.insertImage(Utilities.newBlob(Utilities.base64Decode(SC_BUTTONS[key] || M_BUTTONS[key]), 'image/png', key + '.png'), col, row, 4, 2);
        img.setWidth(220); img.setHeight(40);
        img.assignScript(fn);
        ok = true;
      } catch (e) { Logger.log('버튼 실패 ' + fn + ' (' + (k + 1) + '번째): ' + e.message); Utilities.sleep(800); }
    }
    if (!ok) failed.push(fn);
    SpreadsheetApp.flush();
  });
  // 붙었는지 다시 세어 보기
  const have = sh.getImages().map(im => { try { return im.getScript(); } catch (e) { return ''; } });
  const missing = fns.filter(f => have.indexOf(f) < 0);
  if (missing.length) say_('버튼 ' + missing.length + '개를 못 붙였어요. setupSchedule 을 한 번 더 실행해 주세요.');
}

/* ================= 설정 읽기 ================= */
var scNorm_ = s => String(s).trim().toLowerCase().replace(/\s+/g, '');

// labels · raw 둘 다 "스케줄표 이름"(동의어로 적은 예전 약어 포함)로 찾을 수 있어요.
// raw[...] 는 항상 정식 이름을 돌려줘요 → 일정 탭 · ＋ 신청 추가에는 이제 약어 대신 이 이름을 써요.
function scReadSettings_(ss) {
  const sh = ss.getSheetByName(SC.SET);
  const labels = {}, raw = {}, pickups = {}, guides = {};
  const put = (name, syn, kind, color, remark) => {
    name = String(name || '').trim();
    if (!name) return;
    const info = { name, kind: String(kind || 'Course'), color: color || '#EFEFEF', remark: String(remark || '').trim() };
    [name].concat(String(syn || '').split(/[,，]/)).forEach(x => { const k = scNorm_(x); if (k) { labels[k] = info; raw[k] = name; } });
  };
  if (!sh) {
    SC_LABELS.forEach(r => put(r[0], r[1], r[2], r[3]));
    SC_PICKUPS.forEach(r => { pickups[r[0]] = r[1]; });
    SC_GUIDES.forEach(r => { guides[r[0]] = r[1]; });
  } else {
    const n = Math.max(sh.getLastRow() - 1, 1);
    const v = sh.getRange(2, 1, n, 10).getValues();
    const bg = sh.getRange(2, 4, n, 1).getBackgrounds();
    v.forEach((r, i) => {
      put(r[0], r[1], r[2], bg[i][0] && bg[i][0] !== '#ffffff' ? bg[i][0] : '', r[4]);
      if (r[5]) pickups[String(r[5]).trim()] = String(r[6] || r[5]).trim();
      if (r[8]) guides[String(r[8]).trim()] = String(r[9] || '').trim();
    });
  }
  return { labels, raw, pickups, guides };
}

/* ================= 일정 읽기 · 묶기 ================= */
var scFmt_ = (d, f) => Utilities.formatDate(new Date(d), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), f || 'yyyy-MM-dd');
var scMinutes_ = t => { const m = String(t).match(/(\d+):(\d+)\s*(am|pm)?/i); return m ? (Number(m[1]) % 12 + (/pm/i.test(m[3] || '') ? 12 : 0)) * 60 + Number(m[2]) : 9999; };
var scIsShop_ = p => !p || /^-+$/.test(String(p).trim()) || /직접/.test(p);

// getLastRow()은 예전에 지웠던 서식 · 테두리가 아래쪽에 남아있으면 실제 데이터보다 훨씬 크게 잡힐 때가 있어요(buildSchedule 주석 참고)
// → 그 상태로 getValues(15칸)를 돌리면 쓸데없이 느려지니, A열(1칸)만 먼저 싸게 읽어서 진짜 마지막 데이터 줄을 찾아요
function scRealLastRow_(sh, col) {
  const last = sh.getLastRow();
  if (last < 2) return last;
  const v = sh.getRange(2, col || 1, last - 1, 1).getValues();
  for (let i = v.length - 1; i >= 0; i--) if (String(v[i][0]).trim()) return i + 2;
  return 1;
}

// 일정 탭 → { 'yyyy-MM-dd': [ {code, name, label, time, guide, pickup} ] }
// 일정 탭 전체를 한 번만 읽어서 재사용해요 (실행 한 번 안에서 여러 번 불러도 시트는 한 번만 읽어요 — 전에 느렸던 큰 원인)
var SC_ROWS_CACHE_ = null;
function scRawRows_(ss) {
  if (SC_ROWS_CACHE_) return SC_ROWS_CACHE_;
  const sh = ss.getSheetByName(SC.DATA);
  const last = sh ? scRealLastRow_(sh, 1) : 0;
  SC_ROWS_CACHE_ = (!sh || last < 2) ? [] : sh.getRange(2, 1, last - 1, SC_HEAD.length).getValues();
  return SC_ROWS_CACHE_;
}

function scReadEntries_(ss, from, to) {
  const out = {};
  const v = scRawRows_(ss);
  const a = from ? scFmt_(from) : '', b = to ? scFmt_(to) : '';
  v.forEach((r, idx) => {
    if (!(r[0] instanceof Date) || !r[4]) return;
    const k = scFmt_(r[0]);
    if ((a && k < a) || (b && k > b)) return;
    (out[k] = out[k] || []).push({ code: String(r[1]), name: String(r[2] || r[1]), label: scSynthLabel_(r[3], r[4], r[5]), cat: String(r[3] || '').trim(), type: String(r[4] || '').trim(), site: String(r[5] || '').trim(), time: scTime_(r[6]), guide: String(r[7] || '').trim(), pickup: String(r[8] || '').trim(),
      row: idx + 2, pkgUse: r[11], pkgDone: r[12] === true, pkgBadge: String(r[13] || '').trim() });   // row · pkgUse · pkgDone · pkgBadge: 패키지.gs가 소모 처리할 때 써요 (L · M · N열)
  });
  return out;
}

// 시간 칸이 날짜 형식으로 들어와도 "09:00am" 으로
function scTime_(t) {
  if (t instanceof Date) return Utilities.formatDate(t, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'hh:mma').toLowerCase();
  const m = String(t || '').match(/(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?/i);
  if (!m) return String(t || '').trim();
  const h = Number(m[1]); const ap = m[3] ? m[3].toLowerCase() : (h >= 12 || h <= 6 ? 'pm' : 'am'); const h12 = h > 12 ? h - 12 : h;
  return (h12 < 10 ? '0' : '') + h12 + ':' + m[2] + ap;
}

// 스페셜티 · 트레이닝 과정 — 교육이긴 하지만 실제로는 펀다이빙팀이랑 같이 움직여서, 순서 · 펀다 이미지에서 펀다이빙처럼 다뤄요
var SC_TRAINING_COURSES = new Set(['EFR', 'Rescue', 'EFR / Rescue', 'Deep Specialty', 'Nitrox Specialty', 'Kick Training', 'SMB Training', 'Buoyancy Training']);

// 종류(E열)가 설정 탭에 등록 안 된 글자(사이트 2~3개를 붙이거나 "또는"으로 묶은 경우 등)일 때, 카테고리(D열)를 보고 종류를 맞춰요 (기본은 펀다이빙)
var SC_CAT_KIND_HINT = { '교육': 'Course', '펀다이빙': 'Fun', '보트다이빙': 'Boat', '나이트다이빙': 'Night', '체험다이빙': 'Course', '기타': 'Other', '셋업': 'Setup' };

// 일정 탭 한 줄(카테고리 · 종류 · 사이트)을 보고 "종류(kind: Fun/Boat/Course/Night 등)"와 정식 이름을 돌려줘요.
// 패키지 처리 · 회원 이력 조회처럼 "대충 Fun/Boat/Course 정도만 알면 되는" 간단한 조회에서 써요 — 전에는 pkgAddConsumptionDialog · getMemberHistory가 각자 따로
// 거의 똑같은 코드를 짜놨었는데, 여기 하나로 합쳤어요. (스케줄표를 실제로 그리는 scGroup_()은 색깔 · 안내문 · "+"로 묶인 사이트까지 더 많이 다뤄야 해서 따로예요 — 안 건드렸어요)
function scKindOf_(cat, type, site, S) {
  const label = scSynthLabel_(cat, type, site);
  const info = S.labels[scNorm_(label)];
  const kind = info ? info.kind : (SC_CAT_KIND_HINT[String(cat || '').trim()] || 'Fun');
  return { kind, name: info ? info.name : label, label };
}

// 같은 약어 · 시간 · 강사끼리 한 팀
// 설정 탭에 없는 종류(두 사이트를 "Canyon+Coral Garden"처럼 붙여 적은 경우 등)는
// 전부 펀다이빙으로 보고, 적힌 글자 그대로를 다이빙 사이트 칸에 넣어요
function scGroup_(entries, S) {
  const groups = {}; const unknown = {};
  const resolved = (entries || []).map(e => {
    const cat = e.cat, type = e.type;
    // 펀다이빙 · 보트다이빙은 종류(E열) · 사이트(F열)가 이미 따로 적혀있으니, 합친 라벨을 다시 쪼개 맞히지 않고 그대로 읽어요.
    // 종류가 "-"면 평범한 다이빙 — Activity는 카테고리 기본값(Fun Diving · Boat Diving), 사이트가 팀을 가르는 기준이자 Diving Site 칸.
    // 종류가 "-"가 아니면(Night Diving · Check Diving처럼 전용 이름) — 그 이름이 그대로 Activity, 사이트는 있으면 따로 Diving Site 칸에.
    if (cat === '펀다이빙' || cat === '보트다이빙') {
      const defaultKind = cat === '보트다이빙' ? 'Boat' : 'Fun';
      if (!type || type === '-') {
        const siteInfo = e.site ? S.labels[scNorm_(e.site)] : null;
        if (e.site && !siteInfo) unknown[e.site] = true;
        const name = siteInfo ? siteInfo.name : e.site;
        return { e, kind: defaultKind, name, extraSite: '', isSpecial: false, color: siteInfo ? siteInfo.color : SC_COLOR.fun, remark: siteInfo ? siteInfo.remark : '' };
      }
      const typeInfo = S.labels[scNorm_(type)];
      if (!typeInfo) unknown[type] = true;
      const siteInfo = e.site ? S.labels[scNorm_(e.site)] : null;
      return { e, kind: typeInfo ? typeInfo.kind : defaultKind, name: typeInfo ? typeInfo.name : type, extraSite: e.site ? (siteInfo ? siteInfo.name : e.site) : '',
        isSpecial: true, color: typeInfo ? typeInfo.color : SC_COLOR.fun, remark: typeInfo ? typeInfo.remark : '' };
    }
    // 교육 · 체험다이빙 · 기타 · 셋업은 기존처럼 라벨(종류+사이트를 합친 값) 기준으로 찾아요
    let info = S.labels[scNorm_(e.label)];
    let extraSite = '';   // 교육인데 "Advanced Open Water+Canyon"처럼 사이트가 붙어 있으면, 앞부분(과정 이름)만으로 종류를 맞추고 뒷부분은 사이트로 따로 챙겨요
    if (!info && e.label.indexOf('+') >= 0) {
      const parts = e.label.split('+');
      const head = S.labels[scNorm_(parts[0])];
      if (head && head.kind === 'Course') { info = head; extraSite = parts.slice(1).join('+'); }
    }
    if (!info) unknown[e.label] = true;
    const kind = info ? info.kind : (SC_CAT_KIND_HINT[cat] || 'Fun');
    const name = info ? info.name : e.label;   // "OW"랑 "Open Water"처럼 다르게 적어도 설정 탭에 있으면 정식 이름으로 통일
    return { e, kind, name, extraSite, isSpecial: true, color: info ? info.color : SC_COLOR.fun, remark: info ? info.remark : '' };   // 교육 · 체험다이빙 · 기타 · 셋업은 전부 자기 이름을 그대로 Activity로 써요(펀다이빙 기본값 아님)
  });
  // 교육(Course)은 같은 과정 · 같은 시간 · 같은 강사끼리 묶어요 (오전반 · 오후반처럼 시간이 다르면 나눠요).
  // 강사 칸이 비어있는 사람은, 그 과정+시간에 강사가 딱 한 명으로만 적혀 있으면 그 강사로 자동 맞춰요
  // (강사가 둘 이상 섞여 있으면 헷갈리니까 그땐 그대로 나눠요)
  const guideByCourse = {};
  resolved.forEach(({ e, kind, name }) => { if (kind === 'Course' && e.guide) { const k = scNorm_(name) + '|' + e.time; (guideByCourse[k] = guideByCourse[k] || new Set()).add(e.guide); } });
  resolved.forEach(({ e, kind, name, extraSite, isSpecial, color, remark }) => {
    let key;
    if (kind === 'Course') {
      const ck = scNorm_(name) + '|' + e.time;
      const set = guideByCourse[ck];
      const guide = e.guide || (set && set.size === 1 ? Array.from(set)[0] : '');
      key = 'C|' + ck + '|' + guide;
    } else {
      // 펀다 · 나이트 · 체크 · 보트는 같은 이름(사이트 또는 전용 종류) · 같은 시간끼리 묶어요 (강사는 안 따져요)
      key = 'F|' + scNorm_(name) + '|' + e.time;
    }
    const g = groups[key] = groups[key] || { label: e.label, name, kind, isSpecial, color, time: e.time, guides: [], members: [], extraSite, remark };
    if (e.guide && g.guides.indexOf(e.guide) < 0) g.guides.push(e.guide);
    g.members.push(e);
  });
  // 보트 → 펀다이빙 → 나이트 → 교육 순으로 먼저 묶고, 그 안에서는 시간이 빠른 순서대로
  const order = { Boat: 0, Fun: 1, Night: 2, Course: 3, Setup: 4, Other: 5 };
  // EFR · 레스큐 · 스페셜티 · 트레이닝(SC_TRAINING_COURSES)은 종류는 Course지만, 표에서는 펀다이빙(일반 · 나이트 · 체크) 바로 다음, 진짜 교육(OW · AOW · DMT …)보다는 위에 와요
  const rank = g => g.kind === 'Course' && SC_TRAINING_COURSES.has(g.name) ? 2.5 : (order[g.kind] ?? 9);
  return { groups: Object.keys(groups).map(k => groups[k]).sort((a, b) => (rank(a) - rank(b)) || (scMinutes_(a.time) - scMinutes_(b.time)) || a.name.localeCompare(b.name)),
    unknown: Object.keys(unknown) };
}

// 지금 실제로 쓰고 있는 강사 이름들을 설정 탭(I · J열)에 등록해요 (코드 = 이름 그대로).
// 이미 등록된 건 건너뛰고, 안 된 것만 I열 맨 아래에 새로 추가해요. 한 번만 실행하면 돼요
function addGuidesToSettings() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.SET);
  if (!sh) { Logger.log('설정 탭을 못 찾았어요.'); return; }
  const GUIDES = ['Hany', 'Waleed', 'Sokar', 'Omar', 'Salah', 'Moataz', 'MJ'];
  const lastRow = Math.max(sh.getLastRow(), 1);
  const col = lastRow > 1 ? sh.getRange(2, 9, lastRow - 1, 1).getValues() : [];
  const existing = new Set();
  let lastUsed = 1;
  col.forEach((r, i) => { if (r[0]) { existing.add(String(r[0]).trim()); lastUsed = i + 2; } });
  const toAdd = GUIDES.filter(g => !existing.has(g));
  if (!toAdd.length) { SpreadsheetApp.getActive().toast('이미 다 등록되어 있어요.', '강사 추가', 6); return; }
  sh.getRange(lastUsed + 1, 9, toAdd.length, 2).setValues(toAdd.map(g => [g, g]));
  SpreadsheetApp.getActive().toast(toAdd.length + '명 추가했어요: ' + toAdd.join(', '), '강사 추가', 8);
}

// 보트다이빙 전용 사이트를 설정 탭(A~D열)에 등록해요. 가브엘빈트 · 티란 · 티슬곰은 이미 있을 가능성이 높아서
// 이름이 겹치면 건너뛰고, 라스아부갈룸만 새로 추가돼요. 한 번만 실행하면 돼요
function addBoatSitesToSettings() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.SET);
  if (!sh) { Logger.log('설정 탭을 못 찾았어요.'); return; }
  const NEW = [
    ['Ras Abu Galum', 'Ras, 라스아부갈룸, Ras Abu Gallum', 'Boat', '#D9EAD3'],
    ['Gabr el Bint', 'Bint, Gabr, 가브엘빈트', 'Boat', '#D9EAD3'],
    ['Tiran', 'Tiran Island, 티란, 티란아일랜드', 'Boat', '#D9EAD3'],
    ['Thistlegorm', 'Thistle, T-gorm, T-Gorm, Thislegorm, 티슬곰', 'Boat', '#D9EAD3']
  ];
  const lastRow = Math.max(sh.getLastRow(), 1);
  const colA = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 1).getValues() : [];
  const existing = new Set();
  let lastUsed = 1;
  colA.forEach((r, i) => { if (r[0]) { existing.add(String(r[0]).trim().toLowerCase()); lastUsed = i + 2; } });
  const toAdd = NEW.filter(r => !existing.has(r[0].toLowerCase()));
  if (!toAdd.length) { SpreadsheetApp.getActive().toast('이미 다 등록되어 있어요.', '보트 사이트 추가', 6); return; }
  sh.getRange(lastUsed + 1, 1, toAdd.length, 3).setValues(toAdd.map(r => [r[0], r[1], r[2]]));
  toAdd.forEach((r, i) => sh.getRange(lastUsed + 1 + i, 4).setBackground(r[3]));
  SpreadsheetApp.getActive().toast(toAdd.length + '개 추가했어요: ' + toAdd.map(r => r[0]).join(', '), '보트 사이트 추가', 8);
}

/* ================= 일정 탭 입력칸 드롭다운 (오타 · 표기 다른 것 예방) ================= */
// 설정 탭에 새 사이트 · 강사를 추가했으면 이 함수를 다시 실행해서 드롭다운을 갱신해주세요
function setupScheduleValidation() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.DATA);
  const set = ss.getSheetByName(SC.SET);
  if (!sh) { Logger.log('일정 탭을 못 찾았어요.'); return; }

  // 종류 목록: 설정 탭 이름(A열)만 써요. 동의어(B열 약어)는 선택지에 안 보이게 해서 깔끔하게 — 약어로 적고 싶으면 normalizeScheduleLabels()로 나중에 한 번에 정식 이름으로 바꿀 수 있어요
  const typeSet = new Set();
  const typeAltSet = new Set();   // +조합 맞는지 검사할 때는 동의어(약어)까지 다 인정해줘요 (드롭다운엔 안 보여도 입력은 맞는 값으로)
  if (set && set.getLastRow() > 1) {
    set.getRange(2, 1, set.getLastRow() - 1, 2).getValues().forEach(r => {
      if (r[0]) { typeSet.add(String(r[0]).trim()); typeAltSet.add(String(r[0]).trim()); }
      if (r[1]) String(r[1]).split(/[,，]/).forEach(x => { const t = x.trim(); if (t) typeAltSet.add(t); });
    });
  }

  // 강사 목록: 설정 탭 강사 코드(I열) · 이름(J열) + 일정 탭에 이미 쓰인 값들
  const guideSet = new Set();
  if (set && set.getLastRow() > 1) {
    set.getRange(2, 9, set.getLastRow() - 1, 2).getValues().forEach(r => {
      if (r[0]) guideSet.add(String(r[0]).trim());
      if (r[1]) guideSet.add(String(r[1]).trim());
    });
  }
  if (sh.getLastRow() > 1) sh.getRange(2, 8, sh.getLastRow() - 1, 1).getValues().forEach(r => { if (r[0]) guideSet.add(String(r[0]).trim()); });

  // 픽업 목록: 설정 탭 F열 + 일정 탭에 이미 쓰인 값들 + ? · - (강제로 막는 옛날 규칙이 남아있으면 새 픽업 장소를 못 넣게 돼서, 여기서 느슨한 규칙으로 덮어써요)
  const pickupSet = new Set(['?', '-']);
  if (set && set.getLastRow() > 1) set.getRange(2, 6, set.getLastRow() - 1, 1).getValues().forEach(r => { if (r[0]) pickupSet.add(String(r[0]).trim()); });
  if (sh.getLastRow() > 1) sh.getRange(2, 9, sh.getLastRow() - 1, 1).getValues().forEach(r => { if (r[0]) pickupSet.add(String(r[0]).trim()); });

  const n = Math.max(sh.getLastRow(), 2) + 3000 - 1;   // 앞으로 쓸 줄까지 넉넉하게
  // 다이빙 사이트(F열)는 "A+B"처럼 사이트 2~3개를 합쳐 적을 수도 있어서, 목록에 있는 이름을 +로 이어 붙인 것까지 맞는 값으로 봐요 (그래야 빨간 삼각 경고가 안 떠요)
  // 띄어쓰기 차이(예: "CoralGarden" vs "Coral Garden")로도 안 걸리게, 비교 전에 공백을 다 지워요 — scNorm_()이랑 같은 기준
  const escRe_ = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const typeAlt = '(' + Array.from(typeAltSet).map(s => escRe_(s.replace(/\s+/g, ''))).join('|') + ')';
  const comboPattern = '^' + typeAlt + '(\\+' + typeAlt + '){0,2}$';
  const siteRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=OR(F2="",REGEXMATCH(LOWER(SUBSTITUTE(TO_TEXT(F2)," ","")),LOWER("' + comboPattern.replace(/"/g, '""') + '")))')
    .setAllowInvalid(true).build();
  // 종류(E열)는 이제 교육 과정 이름 · 나이트다이빙(Night Diving) (또는 "-" · "DSD") — 사이트는 F열에 따로 적어요
  const courseNameSet = new Set(['-', 'DSD', 'Check Diving']);   // Check Diving은 종류(kind)가 Fun이라(사이트랑 같은 묶음) 아래 kind 체크로는 안 잡혀서 이름으로 직접 추가해요
  if (set && set.getLastRow() > 1) set.getRange(2, 1, set.getLastRow() - 1, 3).getValues().forEach(r => { if (r[0] && (String(r[2]).trim() === 'Course' || String(r[2]).trim() === 'Night')) courseNameSet.add(String(r[0]).trim()); });
  const typeRule = SpreadsheetApp.newDataValidation().requireValueInList(Array.from(courseNameSet).sort(), true).setAllowInvalid(true).build();
  const guideRule = SpreadsheetApp.newDataValidation().requireValueInList(Array.from(guideSet).sort(), true).setAllowInvalid(true).build();
  const kindRule = SpreadsheetApp.newDataValidation().requireValueInList(SC_KINDS, true).setAllowInvalid(true).build();
  const pickupRule = SpreadsheetApp.newDataValidation().requireValueInList(Array.from(pickupSet).sort(), true).setAllowInvalid(true).build();
  sh.getRange(2, 5, n, 1).setDataValidation(typeRule);    // E열 = 종류 (교육 과정 이름 · "-" · "DSD")
  sh.getRange(2, 6, n, 1).setDataValidation(siteRule);   // F열 = 다이빙 사이트
  sh.getRange(2, 8, n, 1).setDataValidation(guideRule);  // H열 = 강사
  sh.getRange(2, 4, n, 1).setDataValidation(kindRule);   // D열 = 카테고리 (교육 · 펀다이빙 · 체험다이빙 — 고르면 E열 · F열이 거기 맞게 바뀌어요)
  sh.getRange(2, 9, n, 1).setDataValidation(pickupRule); // I열 = 픽업 (새 픽업 장소도 막히지 않게 느슨한 규칙으로)
  const timeRule = SpreadsheetApp.newDataValidation().requireValueInList(SC_TIME_CHOICES, true).setAllowInvalid(true).build();
  sh.getRange(2, 7, n, 1).setDataValidation(timeRule);   // G열 = 시간 — 새벽 4시~저녁 7시 30분 단위 드롭다운 (예전 강사 이름 목록은 이걸로 덮어써서 없어져요)
  sh.getRange(2, 7, n, 1).setNumberFormat('hh:mm AM/PM');   // 시간을 직접 타이핑해서 날짜로 자동 인식된 칸은 "Sat Dec 30 1899 ..." 대신 깔끔하게 보이게
  sh.getRange(2, 11, n, 1).clearDataValidations();   // K열 = 입력 — 예전에 분류(카테고리)가 J열이던 시절 규칙이 안 지워지고 남아있던 걸 지워요
  const useRule = SpreadsheetApp.newDataValidation().requireNumberBetween(1, 6).setAllowInvalid(true).setHelpText('비워두면 기본 2회 소모돼요. 다르게 소모할 때만 숫자를 적어주세요.').build();
  sh.getRange(2, 12, n, 1).setDataValidation(useRule);   // L열 = 패키지소모

  SpreadsheetApp.getActive().toast('종류 ' + typeSet.size + '개 · 강사 ' + guideSet.size + '개 · 픽업 ' + pickupSet.size + '개로 드롭다운 만들었어요. D열(카테고리)을 먼저 고르면 E열(종류) · F열(다이빙 사이트) 선택지가 거기 맞게 좁혀져요.', '드롭다운 설정', 10);
}

// 일정 탭 D열(카테고리)을 고르면 E열(종류) 드롭다운을 거기 맞는 목록으로 바꿔요 (＋ 신청 추가 창이랑 같은 선택지).
// 교육은 폼이랑 똑같이 한글 과정 이름으로 고르게 하고, 고른 직후 scOnTypeEdit_가 영문 종류 값으로 바꿔줘요.
// 체험다이빙은 바로 DSD로 채워요 (onEdit에서 불러요)
// 종류(E열)는 교육 과정 이름(또는 "-" · "DSD")만, 사이트는 다이빙 사이트(F열)에 따로 골라요
function scOnKindEdit_(sh, row, value) {
  const ss = sh.getParent();
  const S = scReadSettings_(ss);
  const eCell = sh.getRange(row, 5), nCell = sh.getRange(row, 6);
  if (value === '교육') {
    eCell.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(COURSE_LABEL), true).setAllowInvalid(true).build()).clearContent();
    nCell.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(scSiteNames_(S, 'Fun'), true).setAllowInvalid(true).build()).clearContent();
  } else if (SC_MAJOR_KIND[value]) {
    eCell.clearDataValidations().setValue('-');
    nCell.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(scSiteNames_(S, SC_MAJOR_KIND[value]), true).setAllowInvalid(true).build()).clearContent();
  } else if (value === '체험다이빙') {
    eCell.clearDataValidations().setValue('DSD');
    nCell.clearDataValidations().clearContent();
  } else {
    eCell.clearDataValidations().setValue('-');
    nCell.clearDataValidations().clearContent();
  }
}

// 일정 탭 E열(종류)에서 교육 과정을 한글로 고르면, 그 자리에서 바로 영문 종류 값으로 바꿔줘요 (onEdit에서 불러요)
function scOnTypeEdit_(sh, row, value) {
  const kind = sh.getRange(row, 4).getValue();
  if (kind === '교육' && COURSE_LABEL[value]) sh.getRange(row, 5).setValue(COURSE_LABEL[value]);
}

// 일정 탭 전체를 훑어서 설정 탭에 등록 안 된 종류(사이트 · 코스 이름)를 한 번에 보여줘요 — 몇 건인지도 같이
// 찾은 줄의 종류(D열) 칸은 빨간 배경으로 칠해서 시트에서 바로 눈에 띄게 해요 (노란색 = 새로 추가된 줄이랑은 다른 색이에요)
function findUnknownScheduleLabels() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.DATA);
  const S = scReadSettings_(ss);
  if (!sh || sh.getLastRow() < 2) { Logger.log('일정 탭이 비어있어요.'); return; }
  const n = sh.getLastRow() - 1;
  const vals = sh.getRange(2, 1, n, SC_HEAD.length).getValues();
  const unknown = {};
  const rows = [];
  vals.forEach((r, i) => {
    const label = scSynthLabel_(r[3], r[4], r[5]);
    if (!label || label === '-') return;   // '-'는 펀다이빙 등에서 아직 사이트 안 정한 줄 — 정상이에요
    // "+"로 2~3개 사이트를 합쳐 적은 경우, 조각 하나하나가 설정 탭에 있는지 봐요 — 조각이 다 있으면 모르는 종류가 아니에요
    const bad = label.split('+').some(seg => !S.labels[scNorm_(seg)]);
    if (bad) { unknown[label] = (unknown[label] || 0) + 1; rows.push(i + 2); }
  });
  sh.getRange(2, 5, n, 1).setBackground(null); sh.getRange(2, 6, n, 1).setBackground(null);   // 이전에 칠했던 건 지우고 다시 칠해요 (종류 · 다이빙 사이트 둘 다)
  rows.forEach(row => { sh.getRange(row, 5).setBackground('#F4CCCC'); sh.getRange(row, 6).setBackground('#F4CCCC'); });
  const list = Object.keys(unknown).sort((a, b) => unknown[b] - unknown[a]);
  const msg = list.length ? list.map(k => k + ' — ' + unknown[k] + '건').join('\n') : '설정 탭에 없는 종류가 없어요. 깨끗해요!';
  Logger.log('설정 탭에 없는 종류 (' + list.length + '개)\n' + msg);
  SpreadsheetApp.getActive().toast(list.length + '개 찾아서 E열 빨간색으로 칠했어요 — 실행 로그에 전체 목록도 있어요', '설정 탭에 없는 종류', 10);
}

// 일정 탭의 종류(E열) 전체를 설정 탭 기준 정식 이름으로 통일해요 (OW → Open Water 처럼).
// 설정 탭에 등록 안 된 값(오타 · 애매한 표기)은 안전하게 그대로 둬요 — findUnknownScheduleLabels()로 따로 확인하세요
function normalizeScheduleLabels() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.DATA);
  const S = scReadSettings_(ss);
  if (!sh || sh.getLastRow() < 2) { Logger.log('일정 탭이 비어있어요.'); return; }
  const n = sh.getLastRow() - 1;
  let changed = 0;
  const skipped = {};
  const normalize = rng => {
    const out = rng.getValues().map(r => {
      const v = String(r[0] || '').trim();
      if (!v || v === '-') return r;
      const info = S.labels[scNorm_(v)];
      if (!info) { skipped[v] = (skipped[v] || 0) + 1; return r; }
      if (info.name === v) return r;
      changed++;
      return [info.name];
    });
    rng.setValues(out);
  };
  normalize(sh.getRange(2, 5, n, 1));    // E열 = 종류(교육 과정)
  normalize(sh.getRange(2, 6, n, 1));    // F열 = 다이빙 사이트
  const skipList = Object.keys(skipped).sort((a, b) => skipped[b] - skipped[a]).map(k => k + ' — ' + skipped[k] + '건');
  Logger.log(changed + '건 정식 이름으로 통일.\n설정 탭에 없어서 그대로 둔 것(' + skipList.length + '개):\n' + skipList.join('\n'));
  SpreadsheetApp.getActive().toast(changed + '건 통일했어요 · 설정 탭에 없는 ' + skipList.length + '개는 그대로 뒀어요 (실행 로그 확인)', '종류 통일', 10);
}

// 일정 탭에서 완전히 똑같은 줄(날짜 · 회원번호 · 종류 · 시간 · 강사 · 픽업 다 같은 줄)이 중복으로 들어간 걸 지워요.
// "＋ 신청 추가"를 두 번 눌렀거나 네트워크가 느려서 같은 내용이 두 번 들어간 경우에 써요 — 메모 · 입력이 달라도 나머지가 같으면 중복으로 봐요
function dedupeSchedule() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.DATA);
  if (!sh || sh.getLastRow() < 3) { Logger.log('일정 탭이 비어있어요.'); return; }
  const n = sh.getLastRow() - 1;
  const rng = sh.getRange(2, 1, n, SC_HEAD.length);
  const vals = rng.getValues();
  const seen = new Set();
  const keepRows = [];
  let removed = 0;
  vals.forEach(r => {
    const key = [r[0] instanceof Date ? scFmt_(r[0]) : r[0], r[1], r[4], r[5], scTime_(r[6]), r[7], r[8]].join('|');
    if (seen.has(key)) { removed++; return; }
    seen.add(key);
    keepRows.push(r);
  });
  if (!removed) { SpreadsheetApp.getActive().toast('중복된 줄이 없어요. 깨끗해요!', '중복 제거', 6); return; }
  rng.clearContent();
  sh.getRange(2, 1, keepRows.length, SC_HEAD.length).setValues(keepRows);
  SpreadsheetApp.getActive().toast(removed + '개 중복 줄을 지웠어요 (' + n + '줄 → ' + keepRows.length + '줄).', '중복 제거', 10);
}

function scPickupSummary_(groups, S) {
  const byTime = {};
  groups.forEach(g => g.members.forEach(m => {
    if (scIsShop_(m.pickup)) return;
    const t = g.time || '?';
    const loc = S.pickups[m.pickup] || m.pickup;
    const x = byTime[t] = byTime[t] || { order: [], n: {} };
    if (!(loc in x.n)) { x.order.push(loc); x.n[loc] = 0; }
    x.n[loc]++;
  }));
  return Object.keys(byTime).sort((a, b) => scMinutes_(a) - scMinutes_(b)).map((t, i) => (i + 1) + '. ' + t + ' ' + byTime[t].order.map(l => l + ' : ' + byTime[t].n[l] + 'p').join(' / ')).join('\n');
}

function scWechat_(groups, date) {
  const byTime = {}; let shop = 0, total = 0;
  groups.forEach(g => g.members.forEach(m => {
    if (scIsShop_(m.pickup)) { shop++; return; }
    const t = g.time || 'Time TBD';
    const loc = /^\?+$/.test(m.pickup) ? 'TBD (hotel)' : m.pickup;
    const x = byTime[t] = byTime[t] || { order: [], n: {} };
    if (!(loc in x.n)) { x.order.push(loc); x.n[loc] = 0; }
    x.n[loc]++; total++;
  }));
  const lines = ['Pick-up · ' + scFmt_(date, 'EEE d MMM yyyy')];
  Object.keys(byTime).sort((a, b) => scMinutes_(a) - scMinutes_(b)).forEach(t => {
    const x = byTime[t]; const sum = x.order.reduce((n, l) => n + x.n[l], 0);
    lines.push('', t + ' (' + sum + ' pax)');
    x.order.forEach(l => lines.push('• ' + l + ': ' + x.n[l] + ' pax'));
  });
  if (!total) lines.push('', 'No pick-up.');
  lines.push('', 'Total pick-up: ' + total + ' pax' + (shop ? ' · Coming to the shop: ' + shop + ' pax' : ''));
  return lines.join('\n');
}

function scHomeDate_(ss) {
  const sh = ss.getSheetByName(SC.HOME);
  const v = sh ? sh.getRange('B2').getValue() : null;
  if (!(v instanceof Date)) throw new Error('홈 탭 B2에 날짜를 넣어 주세요.');
  return v;
}

// 일정에서 "나이트" 일정인지 (라벨에 나이트 · night 가 들어 있거나 예전 약어 N/D · N.D)
const scIsNightLabel_ = l => /^n[\/.]?d$/i.test(String(l).trim()) || /나이트|night/i.test(l);

// 설정 탭에 사이트별로 적어둔 안내문을 Remark 칸에 채워요. {names}=손님 이름(@붙여서) · {time}=시간 · {pickup}=픽업 장소
function scRenderRemark_(tpl, g, ms) {
  tpl = String(tpl || '').trim();
  if (!tpl) return '';
  const names = ms.map(m => '@' + m.name).join(' ');
  const pickup = [...new Set(ms.map(m => scIsShop_(m.pickup) ? '-' : m.pickup))].join(', ');
  return tpl.replace(/\{names\}/g, names).replace(/\{time\}/g, g.time || '').replace(/\{pickup\}/g, pickup);
}

/* ================= 스케줄 만들기 (홈 아래) ================= */
function buildSchedule() {
  const ss = SpreadsheetApp.getActive();
  const date = scHomeDate_(ss);
  const S = scReadSettings_(ss);
  const key = scFmt_(date);
  const { groups, unknown } = scGroup_(scReadEntries_(ss, date, date)[key], S);
  // 이론교육(이론교육.gs) 리스트 갱신 — 첫 교육 예정자를 자동으로 챙겨줘요. 날짜랑 상관없이 일정 탭 전체를 훑어요
  if (typeof theoryRefresh_ === 'function') { try { theoryRefresh_(ss); } catch (e) { Logger.log('이론교육 리스트 갱신 실패: ' + e.message); } }
  const sh = ss.getSheetByName(SC.HOME);
  // 9행부터 넉넉하게만 지워요 (시트 전체 행 수만큼 지우면 느려져요 — 예전엔 이게 느렸던 원인이에요)
  const area = sh.getRange(9, 1, SC_OUT + 100, 9);
  area.breakApart(); area.clearContent(); area.clearFormat(); area.clearNote();
  // 이전 날짜 스케줄표에서 픽업 요약 · 위챗용 칸에 줬던 큰 줄 높이가 남아있으면
  // 오늘 표의 빈 줄에 그 높이가 겹쳐서 이미지로 뽑을 때 밑에 공백이 크게 떠요 — 매번 기본 높이로 되돌려요
  sh.setRowHeights(9, SC_OUT + 100, 21);

  let r = SC_OUT;
  sh.getRange(r, 1).setValue('■ 스케줄표 · ' + scFmt_(date, 'yyyy-MM-dd (EEE)')).setFontWeight('bold').setFontSize(13);
  if (groups.some(g => scIsNightLabel_(g.label))) sh.getRange(r, 4).setValue('🌙 나이트 있는 날').setFontColor('#587078');
  r++;
  sh.getRange(r, 1, 1, 8).setValues([['Activity', 'Guide', 'Name', 'Package (사용/총)', 'Pick up', 'Time', 'Diving Site', 'Remark']])
    .setFontWeight('bold').setBackground(SC_COLOR.head).setHorizontalAlignment('center').setWrap(true);
  r++;
  const keys = Object.keys(S.pickups);
  const rank = p => { const i = keys.indexOf(p); return scIsShop_(p) ? -1 : i >= 0 ? i : keys.length; };
  const marks = [], teams = [];   // 서류 코드(서류.gs)가 첫 방문 · Registration form 표시에 써요
  const tableGroups = groups.filter(g => g.kind !== 'Other');   // 기타(스케줄 외 픽업)는 다이빙 스케줄표에는 안 보이고 픽업 요약 · 안내에만 들어가요
  if (!tableGroups.length) { sh.getRange(r, 1).setValue('이날 일정 탭에 적힌 일정이 없어요. "＋ 신청 추가"로 넣어 주세요.'); r += 2; }
  tableGroups.forEach(g => {
    const ms = g.members.slice().sort((a, b) => rank(a.pickup) - rank(b.pickup));
    const n = ms.length;
    // 펀다이빙 패키지(패키지.gs) 소모 처리 — 이름 옆에 "(3/10)"처럼 붙여요. 보트 · 나이트 · 교육은 대상 아니에요
    if (g.kind === 'Fun' && typeof pkgApplyToMembers_ === 'function') { try { pkgApplyToMembers_(ss, date, ms); } catch (e) { Logger.log('패키지 처리 실패: ' + e.message); } }
    const act = g.isSpecial ? g.name : (g.kind === 'Boat' ? 'Boat Diving' : 'Fun Diving');
    const guide = g.guides.length ? g.guides.map(x => S.guides[x] || x).join('\n/\n') : '?';
    const remark = scRenderRemark_(g.remark, g, ms);
    sh.getRange(r, 1, n, 8).setValues(ms.map((m, i) => [i ? '' : act, i ? '' : guide, m.name, m.pkgBadge || '-', scIsShop_(m.pickup) ? '-' : m.pickup, i ? '' : g.time, i ? '' : (g.isSpecial ? (g.extraSite || '') : g.name), i ? '' : remark]));
    if (n > 1) [1, 2, 6, 7, 8].forEach(c => sh.getRange(r, c, n, 1).merge());
    let i = 0;
    while (i < n) { let j = i; while (j + 1 < n && ms[j + 1].pickup === ms[i].pickup) j++; if (j > i) sh.getRange(r + i, 5, j - i + 1, 1).merge(); i = j + 1; }
    sh.getRange(r, 1, n, 1).setBackground(g.color).setFontWeight('bold');
    sh.getRange(r, 1, n, 8).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true)
      .setBorder(true, true, true, true, true, true, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
    if (remark) sh.setRowHeight(r, Math.max(21, 20 * remark.split('\n').length));   // 안내문이 길면 그만큼 줄을 늘려요
    ms.forEach((m, i) => marks.push({ row: r + i, code: m.code, name: m.name }));
    teams.push({ row: r, members: ms, remark });   // remark: 방금 쓴 값을 그대로 넘겨줘서, 서류.gs가 다시 안 읽어도 되게 해요 (읽기-쓰기 왔다갔다 줄이기)
    r += n + 1;
  });

  // 첫방문/서류작성 표시(formMarkHome_)는 일정 전체를 훑어야 해서 느려요 — 속도 때문에 일단 꺼둠
  // 다시 켜려면 아래 줄 주석만 풀면 돼요
  // if (typeof formMarkHome_ === 'function') { try { formMarkHome_(ss, sh, date, marks, teams, SC_OUT); } catch (e) { Logger.log('서류 표시 실패: ' + e.message); } }
  // 패키지 안내 문구 — 고정 문구, 조건 없이 항상 표 바로 밑에 넣어요
  sh.getRange(r, 1, 1, 8).merge().setValue('*패키지에는 내일 예정된 다이빙까지 포함되어 있으며, (총 사용 횟수/패키지 전체 횟수)로 표시됩니다.')
    .setFontColor('#B45F06').setFontWeight('bold').setHorizontalAlignment('left').setWrap(true);
  r += 1;
  const pickupGroups = groups.filter(g => g.kind !== 'Setup');   // 셋업(준비 작업)은 픽업 요약 · 안내에는 안 넣어요 — 손님 픽업이 아니니까
  const summary = scPickupSummary_(pickupGroups, S);
  const wechat = scWechat_(pickupGroups, date);
  r++;
  sh.getRange(r, 1).setValue('■ 픽업 요약').setFontWeight('bold').setFontSize(13);
  sh.getRange(r + 1, 1, 1, 7).merge().setValue(summary || '픽업 없음').setWrap(false).setVerticalAlignment('top').setBackground('#F3F7FA');
  sh.setRowHeight(r + 1, 21 * (String(summary).split('\n').length + 1));
  r += 3;
  sh.getRange(r, 1).setValue('■ Pick-up (English · 위챗용)').setFontWeight('bold').setFontSize(13);
  sh.getRange(r + 1, 1, 1, 7).merge().setValue(wechat).setWrap(true).setVerticalAlignment('top').setBackground('#F3F7FA');
  sh.setRowHeight(r + 1, 21 * (wechat.split('\n').length + 1));

  sh.activate(); sh.getRange(SC_OUT, 1).activate();
  if (unknown.length) ss.toast('설정 탭에 없는 약어: ' + unknown.join(', ') + ' → 설정 탭에 추가해 주세요', '확인', 10);
}

function pickupMessage() {
  const ss = SpreadsheetApp.getActive();
  const date = scHomeDate_(ss);
  // 홈 스케줄표를 손으로 고쳤으면(시간 · 픽업) 그 내용으로
  const table = scReadHomeTable_(ss, date);
  const groups = table ? table.map(g => ({ time: g.time, members: g.members.map(m => ({ pickup: m.pickup === '샵으로' ? '-' : m.pickup })) }))
    : scGroup_(scReadEntries_(ss, date, date)[scFmt_(date)], scReadSettings_(ss)).groups;
  scCopyDialog_(scWechat_(groups, date), '픽업 안내 (영어) · 복사해서 위챗에 붙여넣기');
}

function scCopyDialog_(text, title) {
  const t = HtmlService.createTemplate(SC_COPY_HTML);
  t.text = text;
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(460).setHeight(380), title);
}

var SC_COPY_HTML = `<!doctype html><html><head><base target="_top"><style>
body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;margin:0;padding:4px 2px}
textarea{width:100%;box-sizing:border-box;height:250px;padding:10px;border:1px solid #B7C7CC;border-radius:8px;font:14px/1.5 -apple-system,sans-serif}
button{margin-top:10px;width:100%;padding:11px;border:0;border-radius:10px;background:#2E7D5B;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
</style></head><body>
<textarea id="t"><?= text ?></textarea>
<button id="b">복사하기</button>
<script>
document.getElementById('b').onclick = function () {
  const t = document.getElementById('t'); t.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
  this.textContent = ok ? '복사했어요! 위챗에 붙여넣기 (⌘V)' : '글자를 길게 눌러 직접 복사해 주세요';
};
</script></body></html>`;

/* ================= 스케줄 이미지 (펀다 · 패밀리방) ================= */
// 홈 B2 날짜 스케줄을 그림(PNG)으로 만들어요. 창에서 다운로드 · 오른쪽 클릭 → 이미지 복사
function openFunImage() { scImage_('fun'); }
function openFamilyImage() { scImage_('family'); }

// 서류.gs(formMarkHome_)가 Remark 칸에 붙여둔 "📄 Reg form: 이름" 줄을 찾아서,
// 펀다 이미지(스태프용)에서는 빼고, 패밀리방 이미지(손님용)에서는 손님이 이해할 문구로 바꿔요
function scApplyRegNote_(groups, mode) {
  const re = /(^|\n)📄 Reg form:\s*(.*?)(?=\n|$)\n?/;
  return groups.map(g => {
    const m = re.exec(g.remark || '');
    let remark = String(g.remark || '').replace(re, '\n').trim();
    if (mode !== 'fun' && m) remark = (remark ? remark + '\n\n' : '') + m[2] + ' 서류작성필요';
    return Object.assign({}, g, { remark });
  });
}

function scImage_(mode) {
  const ss = SpreadsheetApp.getActive();
  const date = scHomeDate_(ss);
  // 홈에 그 날짜 스케줄표가 있으면 표 그대로(가이드 · 시간 · 사이트 · 비고를 고친 내용까지) 그려요
  let data = scReadHomeTable_(ss, date);
  if (data) data = data.filter(g => mode !== 'fun' || !g.course);
  else data = scImageFromData_(ss, date, mode);
  data = scApplyRegNote_(data, mode);
  const t = HtmlService.createTemplate(SC_IMG_HTML);
  t.data = JSON.stringify({ mode, groups: data, title: scFmt_(date, 'M월 d일 (EEE)'), titleEn: scFmt_(date, 'EEE d MMM yyyy'),
    file: (mode === 'fun' ? '펀다스케줄_' : '패밀리방스케줄_') + scFmt_(date) });
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(800).setHeight(660), mode === 'fun' ? '펀다이빙 스케줄 이미지' : '패밀리방 공유용 스케줄 이미지');
}

// 홈 탭 스케줄표 읽기 (스케줄 만들기 뒤에 손으로 고친 내용 포함). 날짜가 다르거나 표가 없으면 null
function scReadHomeTable_(ss, date) {
  const sh = ss.getSheetByName(SC.HOME);
  if (!sh || sh.getLastRow() < 3) return null;
  // 스케줄표 제목 줄 찾기 (버튼 위치가 바뀌어도 찾을 수 있게 A열에서 찾아요)
  const colA = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues().map(r => String(r[0]));
  const top = colA.findIndex(x => x.indexOf('■ 스케줄표') === 0) + 1;
  if (!top || colA[top - 1].indexOf(scFmt_(date)) < 0) return null;
  const n = sh.getLastRow() - top - 1;
  if (n < 1) return null;
  const v = sh.getRange(top + 2, 1, n, 8).getDisplayValues();
  const bg = sh.getRange(top + 2, 1, n, 1).getBackgrounds();
  const groups = []; let g = null; let lastPick = '';
  for (let i = 0; i < v.length; i++) {
    const r = v[i];
    if (String(r[0]).indexOf('■') === 0) break;                 // 픽업 요약부터는 표가 아니에요
    if (String(r[0]).indexOf('이날 일정') === 0) break;
    if (String(r[0]).indexOf('*') === 0) break;                 // "*패키지에는..." 안내 문구 줄 — 표가 끝났다는 뜻이에요 (이걸 안 거르면 이미지에 빈 줄로 섞여 들어가요)
    if (!r.join('').trim()) { g = null; continue; }              // 팀 사이 빈 줄
    if (r[0]) {
      const fun = /^(Fun|Night|Boat|Check) Diving$/.test(r[0]) || SC_TRAINING_COURSES.has(String(r[0]).trim());   // Check Diving · EFR · 레스큐 · 스페셜티 · 트레이닝도 펀다 이미지에서 안 빠지게
      const one = s => String(s || '').replace(/\s*\n\s*/g, ' ').trim();   // 칸 안 줄바꿈은 한 줄로 (Activity · Guide · Time · Site용)
      const keepLines = s => String(s || '').trim();   // Remark는 안내문 줄바꿈을 그대로 살려야 해서 따로
      g = { act: one(r[0]), guide: r[1] === '?' ? '' : one(r[1]), time: one(r[5]), site: one(r[6]), remark: keepLines(r[7]), color: bg[i][0] || '#FFFFFF', course: !fun, members: [] };
      groups.push(g); lastPick = '';
    }
    if (!g || !r[2]) continue;
    if (r[4]) lastPick = r[4];
    g.members.push({ name: r[2], pkg: r[3] || '-', pickup: scIsShop_(lastPick) ? '-' : lastPick });
  }
  return groups;
}

// 홈에 표가 없을 때: 일정 탭에서 바로
function scImageFromData_(ss, date, mode) {
  const S = scReadSettings_(ss);
  let { groups } = scGroup_(scReadEntries_(ss, date, date)[scFmt_(date)], S);
  groups = groups.filter(g => g.kind !== 'Other' && g.kind !== 'Setup');   // 기타(다이빙 아닌 픽업) · 셋업(준비 작업)은 다이빙 일정 이미지에는 안 넣어요
  if (mode === 'fun') groups = groups.filter(g => g.kind !== 'Course' || SC_TRAINING_COURSES.has(g.name));   // 교육 빼고 모든 펀다이빙(나이트 · 보트 포함) + 스페셜티 · 트레이닝은 포함
  const keys = Object.keys(S.pickups);
  const rank = p => { const i = keys.indexOf(p); return scIsShop_(p) ? -1 : i >= 0 ? i : keys.length; };
  return groups.map(g => {
    if (g.kind === 'Fun' && typeof pkgApplyToMembers_ === 'function') { try { pkgApplyToMembers_(ss, date, g.members); } catch (e) { Logger.log('패키지 처리 실패: ' + e.message); } }
    return {
      act: g.isSpecial ? g.name : (g.kind === 'Boat' ? 'Boat Diving' : 'Fun Diving'),
      guide: g.guides.length ? g.guides.map(x => S.guides[x] || x).join(' / ') : '',
      time: g.time, site: g.isSpecial ? (g.extraSite || '') : g.name, color: g.color, course: g.kind === 'Course',
      remark: scRenderRemark_(g.remark, g, g.members),
      members: g.members.slice().sort((a, b) => rank(a.pickup) - rank(b.pickup)).map(m => ({ name: m.name, pkg: m.pkgBadge || '-', pickup: scIsShop_(m.pickup) ? '-' : m.pickup }))
    };
  });
}

var SC_IMG_HTML = `<!doctype html><html><head><base target="_top"><style>
body{font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;margin:0;padding:4px;color:#1F2A30}
.bar{display:flex;gap:8px;margin-bottom:8px}button,a.b{flex:1;padding:10px;border:0;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;text-align:center;text-decoration:none}
.dl{background:#2E7D5B}.dr{background:#2E5E80}.msg{font-size:13px;color:#2E5E80;margin:4px 0}
#out{max-width:100%;border:1px solid #E1E8EB;border-radius:8px}
</style></head><body>
<div class="bar"><a class="b dl" id="dl">⬇ 이미지 다운로드</a></div>
<div class="msg" id="msg">그림 위에서 오른쪽 클릭 → "이미지 복사"하면 카톡에 바로 붙여넣을 수 있어요.</div>
<img id="out" alt="스케줄 이미지">
<script>
var D = <?!= data ?>;
var S = 2;   // 선명하게 2배로 그려요
var FONT = "-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif";
var fam = D.mode === 'family';
var LINE_H = 18;
// 안내문(Remark)이 하루 종일 하나도 없으면 그 칸은 좁히고, 남는 폭은 다른 칸에 나눠주면서 글자도 더 키워요
var anyRemark = D.groups.some(function (g) { return g.remark && String(g.remark).trim(); });
var FULL_REMARK_W = 260, REMARK_W = anyRemark ? FULL_REMARK_W : 70;
var FS = anyRemark ? 17 : 19, SITE_FS = anyRemark ? 15 : 17;   // 기본 글자 크기 · 사이트(2개 이상) 목록 글자 크기
var baseCols = fam
  ? [['프로그램', 140], ['가이드', 110], ['이름', 140], ['패키지 (사용/총)', 130], ['픽업', 140], ['시간', 95], ['장소', 150]]
  : [['Activity', 140], ['Guide', 110], ['Name', 140], ['Package (사용/총)', 130], ['Pick up', 140], ['Time', 95], ['Diving Site', 165]];
var extraW = FULL_REMARK_W - REMARK_W, baseTotalW = baseCols.reduce((n, c) => n + c[1], 0);
var cols = baseCols.map(c => [c[0], c[1] + Math.round(extraW * c[1] / baseTotalW)]).concat([[fam ? '안내문' : 'Remark', REMARK_W]]);
var W = cols.reduce((n, c) => n + c[1], 0) + 40, RH = 36, TH = fam ? 96 : 70, HH = 38;
// 안내문(Remark)은 길면 줄이 여러 개라, 먼저 재어보는 임시 캔버스로 각 팀의 실제 줄 수를 계산해요
var mcv = document.createElement('canvas'); var mx = mcv.getContext('2d');
function wrapLines(ctx, str, maxWidth, size) {
  str = String(str || ''); if (!str) return [];
  ctx.font = '700 ' + size + 'px ' + FONT;   // 안내문도 볼드로 그리니까, 줄바꿈 계산도 볼드 기준 너비로 재야 꽉 안 차요
  var out = [];
  str.split('\\n').forEach(function (p) {
    if (!p) { out.push(''); return; }
    var words = p.split(' '), cur = '';
    words.forEach(function (w) {
      var test = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(test).width > maxWidth) { out.push(cur); cur = w; } else cur = test;
    });
    if (cur) out.push(cur);
  });
  return out;
}
// 다이빙 사이트("+" 로 2~3개 합쳐 적은 거)를 "1. Blue Hole x2  2. Tiger Reef x1"처럼 번호 + 횟수로 보여줘요 (같은 사이트 반복되면 깡수로 묶어서)
function siteLines(site) {
  site = String(site || '').trim();
  if (!site) return [];
  var order = [], counts = [];
  site.split('+').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) {
    var i = order.indexOf(s);
    if (i < 0) { order.push(s); counts.push(1); } else counts[i]++;
  });
  // 사이트가 하나뿐이면 번호(1.) 없이 이름만 — 여러 개를 합친 경우에만 번호로 구분해요
  if (order.length === 1) return [order[0] + (counts[0] > 1 ? ' x' + counts[0] : '')];
  return order.map(function (s, i) { return (i + 1) + '. ' + s + (counts[i] > 1 ? ' x' + counts[i] : ''); });
}
var groupInfo = D.groups.map(g => {
  const lines = g.remark ? wrapLines(mx, g.remark, REMARK_W - 16, 15) : [];
  const site = siteLines(g.site);
  const h = Math.max(g.members.length * RH, lines.length * LINE_H + 12, site.length * LINE_H + 12);
  return { lines, h, site };
});
var NOTE_H = 34;   // 맨 아래 패키지 안내 문구 자리
var H = TH + HH + groupInfo.reduce((n, gi) => n + gi.h, 0) + D.groups.length * 8 + (D.groups.length ? 20 : 40) + NOTE_H;
var cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
var x = cv.getContext('2d'); x.scale(S, S);
var fill = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
var line = (a, b, w, h) => { x.strokeStyle = '#9AA7AD'; x.lineWidth = 1; x.strokeRect(a + .5, b + .5, w, h); };
function text(s, cx, cy, w, size, bold, color) {
  s = String(s || ''); let f = size;
  x.font = (bold ? '700 ' : '400 ') + f + 'px ' + FONT;
  while (f > 10 && x.measureText(s).width > w - 10) { f--; x.font = (bold ? '700 ' : '400 ') + f + 'px ' + FONT; }
  x.fillStyle = color || '#1F2A30'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, cx, cy);
}
function textBlock(lines, cx, topY, w, h, size, color, bold, center) {
  x.font = (bold ? '700 ' : '400 ') + size + 'px ' + FONT; x.fillStyle = color || '#1F2A30'; x.textAlign = center ? 'center' : 'left'; x.textBaseline = 'middle';
  const totalH = lines.length * LINE_H, startY = topY + Math.max((h - totalH) / 2, 6) + LINE_H / 2;
  lines.forEach((l, i) => x.fillText(l, center ? cx : cx - w / 2 + 8, startY + i * LINE_H));
}
fill('#FFFFFF', 0, 0, W, H);
// 제목
if (fam) {
  fill('#1F6FA8', 0, 0, W, TH);
  text('🌊 스쿠버존 다합 · ' + D.title + ' 다이빙 일정', W / 2, 38, W - 40, 26, true, '#FFFFFF');
  text(D.titleEn, W / 2, 72, W - 40, 15, false, '#DDEBF7');
} else {
  fill('#2E7D5B', 0, 0, W, TH);
  text('Fun Diving Schedule · ' + D.titleEn, W / 2, TH / 2, W - 40, 24, true, '#FFFFFF');
}
// 머리 줄
let y = TH + 12, cx = 20;
cols.forEach(c => { fill('#D9E1F2', cx, y, c[1], HH); line(cx, y, c[1], HH); text(c[0], cx + c[1] / 2, y + HH / 2, c[1], FS, true); cx += c[1]; });
y += HH;
if (!D.groups.length) { text(fam ? '이날 일정이 없어요' : 'No fun diving on this day', W / 2, y + RH / 2, W, FS, false, '#7A8A92'); y += RH; }
// 팀마다
D.groups.forEach((g, gi) => {
  const n = g.members.length, h = groupInfo[gi].h; let c = 20;
  const cell = (w, val, bg, merge, idx) => {
    if (merge) { fill(bg || '#FFFFFF', c, y, w, h); line(c, y, w, h); text(val, c + w / 2, y + h / 2, w, FS, true, '#1F2A30'); }
    c += w;
  };
  const siteCell = w => {
    fill('#FFFFFF', c, y, w, h); line(c, y, w, h);
    const sites = groupInfo[gi].site;
    if (sites.length === 1) text(sites[0], c + w / 2, y + h / 2, w, FS, true);   // 사이트 하나면 다른 칸처럼 가운데 · 크게
    else if (sites.length) textBlock(sites, c + w / 2, y, w, h, SITE_FS, '#1F2A30', true, true);
    else text('-', c + w / 2, y + h / 2, w, FS, true);
    c += w;
  };
  const perRow = (w, key) => {
    let i = 0;
    while (i < n) {   // 같은 픽업끼리 칸 합치기 (마지막 묶음은 안내문 때문에 생긴 남는 높이까지 채워요)
      let j = i; if (key === 'pickup') while (j + 1 < n && g.members[j + 1].pickup === g.members[i].pickup) j++;
      const rh = (j === n - 1 ? h - i * RH : (j - i + 1) * RH);
      fill('#FFFFFF', c, y + i * RH, w, rh); line(c, y + i * RH, w, rh);
      text(g.members[i][key], c + w / 2, y + i * RH + rh / 2, w, FS, true); i = j + 1;
    }
    c += w;
  };
  if (fam) {
    cell(cols[0][1], g.act.replace('\\n', ' '), g.color, true, 0); cell(cols[1][1], g.guide || '-', '#FFFFFF', true);
    perRow(cols[2][1], 'name'); perRow(cols[3][1], 'pkg'); perRow(cols[4][1], 'pickup'); cell(cols[5][1], g.time, '#FFFFFF', true); siteCell(cols[6][1]);
  } else {
    cell(cols[0][1], g.act, g.color, true, 0); cell(cols[1][1], g.guide || '?', '#FFFFFF', true);
    perRow(cols[2][1], 'name'); perRow(cols[3][1], 'pkg'); perRow(cols[4][1], 'pickup'); cell(cols[5][1], g.time, '#FFFFFF', true); siteCell(cols[6][1]);
  }
  fill('#FFFFFF', c, y, REMARK_W, h); line(c, y, REMARK_W, h);
  if (groupInfo[gi].lines.length) textBlock(groupInfo[gi].lines, c + REMARK_W / 2, y, REMARK_W, h, 15, '#444', true);
  y += h + 8;
});
// 패키지 안내 문구 — 고정 문구, 조건 없이 항상 맨 아래에 넣어요. 글자 크기는 21px 고정
x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = '700 21px ' + FONT; x.fillStyle = '#B45F06';
x.fillText('*패키지에는 내일 예정된 다이빙까지 포함되어 있으며, (총 사용 횟수/패키지 전체 횟수)로 표시됩니다.', 20, y + NOTE_H / 2);
text('Scuba Zone Dahab', W - 90, H - 14, 160, 11, false, '#9AA7AD');
var url = cv.toDataURL('image/png');
document.getElementById('out').src = url;
var dl = document.getElementById('dl'); dl.href = url; dl.download = D.file + '.png';
</script></body></html>`;

/* ================= 퍼밋 명단 (다이버 리스트) ================= */
// 홈 B2 날짜에 일정이 있는 회원을 다이버 리스트 형식(FirstName … ResponsibleNationality)으로 뽑아요
// → 퍼밋 탭에 표로 쓰고, 창에서 엑셀(.xlsx) · CSV 로 바로 다운로드
var PERMIT_HEAD = ['FirstName', 'LastName', 'Birthdate', 'Nationality', 'Gender', 'PassportNumber', 'Activity', 'Accomodation', 'RoomNumber', 'ResponsiblePassportNumber', 'ResponsibleNationality'];

// 그날 퍼밋이 필요한 사람 (funOnly = 펀다이빙 · 나이트 · 보트만)
function permitData_(ss, date, funOnly) {
  const S = scReadSettings_(ss);
  const entries = scReadEntries_(ss, date, date)[scFmt_(date)] || [];
  const byCode = {};
  [INACTIVE, ACTIVE].forEach(n => memberRows_(ss.getSheetByName(n)).forEach(r => { if (r[0]) byCode[String(r[0]).trim()] = r; }));
  const order = []; const info = {};
  entries.forEach(e => {
    let l = S.labels[scNorm_(e.label)];
    let extraSite = '';   // "Night Diving+Mashraba"처럼 종류+사이트가 합쳐진 라벨은, 종류(앞부분)로 kind를 판단하고 사이트(뒷부분)는 따로 챙겨요
    if (!l && e.label.indexOf('+') >= 0) {
      const parts = e.label.split('+');
      const head = S.labels[scNorm_(parts[0])];
      if (head && (head.kind === 'Course' || head.kind === 'Night')) { l = head; extraSite = parts.slice(1).join('+'); }
    }
    const course = l ? l.kind === 'Course' : false;
    const night = l ? l.kind === 'Night' : false;
    const k = e.code || ('?' + e.name);
    if (!info[k]) { info[k] = { code: e.code, name: e.name, course: false, fun: false, what: [], guides: [] }; order.push(k); }
    if (course) info[k].course = true; else info[k].fun = true;
    const what = night ? ('Night Diving' + (extraSite ? '(' + extraSite + ')' : '')) : e.label;
    info[k].what.push(what + (e.time ? ' ' + e.time : ''));
    if (e.guide && info[k].guides.indexOf(e.guide) < 0) info[k].guides.push(e.guide);
  });
  const rows = [], missing = [];
  order.forEach(k => {
    const x = info[k];
    if (funOnly && !x.fun) return;
    const m = byCode[x.code];
    if (!m) { missing.push(x.name + (x.code ? ' (' + x.code + ')' : '') + ' — not in member list'); return; }
    const v = PERMIT_HEAD.map((h, i) => m[i + 1]);
    v[6] = x.course && !funOnly ? 'Training' : 'Diving';
    if (!v[7]) v[7] = 'House';
    if (v[8] === '' || v[8] == null) v[8] = 0;
    const need = ['FirstName', 'LastName', 'Birthdate', 'PassportNumber'].filter(h => !v[PERMIT_HEAD.indexOf(h)]);
    if (need.length) missing.push((v[0] || '') + ' ' + (v[1] || '') + ' (' + x.code + ') — missing ' + need.join(', '));
    const instr = x.guides.length ? x.guides.map(g => S.guides[g] || g).join(' / ') : '-';
    rows.push({ code: x.code, v, what: x.what.join(' / '), instr });
  });
  rows.sort((a, b) => a.what.localeCompare(b.what));   // 같은 스케줄끼리 모이게 정렬
  return { rows, missing };
}

/* ---------- Permit 탭 (이집션 스태프용 · 영어) ---------- */
// B2 날짜 · B3 종류(All divers / Fun diving only) → [Search] → 아래에 퍼밋 명단, [Download Excel] → .xlsx · CSV
function setupPermitSheet_(ss) {
  let sh = ss.getSheetByName(SC.PERMIT);
  if (!sh) sh = ss.insertSheet(SC.PERMIT);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
  sh.getRange('A1').setValue('Dive Permit List').setFontSize(18).setFontWeight('bold');
  sh.getRange('A2:A3').setValues([['Date'], ['Divers']]).setFontWeight('bold').setBackground(SC_COLOR.head);
  if (!(sh.getRange('B2').getValue() instanceof Date)) sh.getRange('B2').setValue(tomorrow);
  sh.getRange('B2').setNumberFormat('ddd d MMM yyyy').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());
  if (!sh.getRange('B3').getValue()) sh.getRange('B3').setValue('All divers');
  sh.getRange('B3').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['All divers', 'Fun diving only'], true).build());
  sh.getRange('B2:B3').setBackground(SC_COLOR.input).setFontWeight('bold')
    .setBorder(true, true, true, true, true, true, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('C2').setValue('← double-click to pick a date').setFontColor('#587078');
  sh.setColumnWidth(1, 90); sh.setColumnWidths(2, 12, 125);
  sh.setRowHeights(1, 4, 28);
  sh.setFrozenRows(0);
  scButtons_(sh, [['psearch', 'permitSearch', 2, 5], ['pdown', 'permitDownload', 2, 8]]);
  return sh;
}

function permitSearch() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.PERMIT) || setupPermitSheet_(ss);
  const date = sh.getRange('B2').getValue();
  if (!(date instanceof Date)) { ss.toast('Please put a date in B2.'); return; }
  const funOnly = String(sh.getRange('B3').getValue()) === 'Fun diving only';
  const { rows, missing } = permitData_(ss, date, funOnly);
  const max = Math.max(sh.getMaxRows(), 60);
  const area = sh.getRange(5, 1, max - 4, 14);
  area.breakApart(); area.clearContent(); area.clearFormat();
  sh.getRange(5, 1).setValue(scFmt_(date, 'EEE d MMM yyyy') + ' · ' + rows.length + ' divers' + (funOnly ? ' (fun diving only)' : '') + (missing.length ? ' · ⚠️ ' + missing.length + ' to check' : ''))
    .setFontWeight('bold').setFontSize(13);
  sh.getRange(6, 1, 1, PERMIT_HEAD.length + 3).setValues([['Code'].concat(PERMIT_HEAD, ['Schedule', 'Instructor'])]).setFontWeight('bold').setBackground('#C9DAF8').setWrap(true);
  if (rows.length) {
    sh.getRange(7, 1, rows.length, PERMIT_HEAD.length + 3).setValues(rows.map(r => [r.code].concat(r.v, [r.what, r.instr])));
    sh.getRange(7, 4, rows.length, 1).setNumberFormat('yyyy-mm-dd');
    sh.getRange(7, PERMIT_HEAD.length + 2, rows.length, 2).setFontColor('#7A8A92');
    sh.getRange(6, 1, rows.length + 1, PERMIT_HEAD.length + 3).setBorder(true, true, true, true, true, true, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
  } else sh.getRange(7, 1).setValue('No divers on this day.');
  if (missing.length) {
    const r = 7 + Math.max(rows.length, 1) + 1;
    sh.getRange(r, 1).setValue('⚠️ Please check').setFontWeight('bold').setFontColor('#C0392B');
    sh.getRange(r + 1, 1, missing.length, 1).setValues(missing.map(m => [m])).setFontColor('#C0392B');
  }
  sh.activate();
}

function permitDownload() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.PERMIT);
  const date = sh ? sh.getRange('B2').getValue() : null;
  if (!(date instanceof Date)) { ss.toast('Please put a date in B2 and press Search.'); return; }
  const funOnly = String(sh.getRange('B3').getValue()) === 'Fun diving only';
  const { rows, missing } = permitData_(ss, date, funOnly);
  const tz = ss.getSpreadsheetTimeZone();
  // 구글시트 자체 내보내기 — 제목 · 헤더 색깔 · 볼드가 그대로 살아있어요.
  // 시트 전체를 내보내면 Search · Download Excel 버튼 그림까지 같이 나와서, 표 부분(5행부터)만 임시 시트에 복사해서 그것만 내보내요
  let nativeB64 = '';
  try {
    const lastRow = sh.getLastRow();
    const cols = PERMIT_HEAD.length + 3;
    const tmp = SpreadsheetApp.create('Permit export ' + scFmt_(date));
    try {
      const tmpSh = tmp.getSheets()[0];
      sh.getRange(6, 1, Math.max(lastRow - 5, 1), cols).copyTo(tmpSh.getRange(1, 1));   // 6행(헤더)부터 — 5행 제목 줄은 안 넣어요
      tmpSh.getRange(1, 1, 1, cols).setFontWeight('bold').setBackground('#C9DAF8');   // 복사로 색이 안 묻어올 때를 대비해서 헤더 색 · 볼드를 다시 확실히 입혀요
      SpreadsheetApp.flush();
      Utilities.sleep(5000);   // 방금 만든 임시 시트를 내보내기 서비스가 바로 못 읽는 경우가 있어서 넉넉히 기다려요
      const url = 'https://docs.google.com/spreadsheets/d/' + tmp.getId() + '/export?format=xlsx&gid=' + tmpSh.getSheetId();
      const resp = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
      nativeB64 = Utilities.base64Encode(resp.getBlob().getBytes());
    } finally {
      DriveApp.getFileById(tmp.getId()).setTrashed(true);
    }
  } catch (e) { Logger.log('네이티브 엑셀 내보내기 실패(글자만 있는 엑셀로 대신 만들어요): ' + e.message); }
  const t = HtmlService.createTemplate(SC_PERMIT_HTML);
  t.data = JSON.stringify({ head: ['Code'].concat(PERMIT_HEAD, ['Schedule', 'Instructor']),
    rows: rows.map(r => [r.code].concat(r.v.map((c, i) => (i === 2 && c instanceof Date ? Utilities.formatDate(c, tz, 'yyyy-MM-dd') : c)), [r.what, r.instr])),
    file: 'Permit_' + scFmt_(date), title: scFmt_(date, 'EEE d MMM yyyy'), missing, nativeB64 });
  // 확인할 명단(missing)이 없으면 바로 자동 다운로드되고 닫히니까, 창을 최대한 작게 — 깜빡하고 지나가게
  const small = !missing.length;
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(small ? 230 : 520).setHeight(small ? 90 : 420), 'Permit · ' + scFmt_(date, 'd MMM') + ' · ' + rows.length + ' divers');
}

// 홈 버튼: 홈 B2 날짜로 Permit 탭을 열고 바로 조회
function buildPermit() {
  const ss = SpreadsheetApp.getActive();
  const date = scHomeDate_(ss);
  const sh = ss.getSheetByName(SC.PERMIT) || setupPermitSheet_(ss);
  sh.getRange('B2').setValue(date);
  permitSearch();
}

var SC_PERMIT_HTML = `<!doctype html><html><head><base target="_top">
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<style>
body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1F2A30;margin:0;padding:4px}
.bar{display:flex;gap:8px;margin:6px 0 10px}a.b{flex:1;padding:11px;border-radius:10px;color:#fff;font-weight:700;text-align:center;text-decoration:none;cursor:pointer}
.x{background:#2E7D5B}.c{background:#2E5E80}.warn{background:#FDECEA;border-radius:8px;padding:8px 10px;color:#9A2A1C;font-size:13px;margin-top:6px}
.ok{color:#2E7D5B;font-size:13px}ul{margin:4px 0 0 18px;padding:0}
</style></head><body>
<div><b id="t"></b></div>
<div id="full">
<div class="bar"><a class="b x" id="xlsx">⬇ Excel (.xlsx)</a><a class="b c" id="csv">⬇ CSV</a></div>
<div class="ok">The same list is on the "Permit" tab (you can copy it from there).</div>
</div>
<div id="miss"></div>
<script>
const D = <?!= data ?>;
document.getElementById('t').textContent = 'Permit · ' + D.title + ' · ' + D.rows.length + '명';
const aoa = [D.head].concat(D.rows);
// CSV
const esc = v => { v = v == null ? '' : String(v); return /[",\\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const csv = '\\uFEFF' + aoa.map(r => r.map(esc).join(',')).join('\\r\\n');
const c = document.getElementById('csv'); c.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); c.download = D.file + '.csv';
// XLSX — 구글시트에서 직접 내보낸 파일이 있으면 그걸 써요 (제목 · 헤더 색깔 · 볼드가 그대로 살아있어요)
const x = document.getElementById('xlsx');
let ok = false;
if (D.nativeB64) {
  x.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + D.nativeB64; x.download = D.file + '.xlsx'; ok = true;
} else {
  // 내보내기 실패했을 때만: SheetJS로 글자만 있는 엑셀 대신 만들어요 (색깔 · 볼드는 안 들어가요)
  try {
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = D.head.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Permit');
    const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    x.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + b64; x.download = D.file + '.xlsx'; ok = true;
  } catch (e) { x.textContent = 'Excel failed — please use CSV'; x.removeAttribute('href'); }
}
if (D.missing.length) document.getElementById('miss').innerHTML = '<div class="warn">⚠️ Please check<ul>' + D.missing.map(m => '<li>' + m.replace(/</g, '&lt;') + '</li>').join('') + '</ul></div>';
// 버튼 누를 필요 없이 창 열리자마자 바로 엑셀 다운로드되고 닫혀요 (실패하거나 확인할 명단이 있으면 창을 열어 둬요)
if (ok && !D.missing.length) {
  document.getElementById('full').style.display = 'none';
  document.getElementById('t').textContent = '다운로드 중...';
  x.click();
  setTimeout(() => google.script.host.close(), 700);
}
</script></body></html>`;

/* ================= 보트다이빙 전용 Permit (일반 Permit이랑 양식이 완전히 달라요 — 보트별로 제목 + No · Code · FirstName · LastName · Passport · Box No. · Weight Belt · Payment · Pick up · Remark 표) ================= */
var BOAT_PERMIT_HEAD = ['No', 'Code', 'FirstName', 'LastName', 'Passport', 'Box No.', 'Weight Belt', 'Payment', 'Pick up', 'Remark'];

// 1 → "1st", 11 → "11th", 22 → "22nd" 식으로. 보트 Permit 제목("Tiran 16th. Nov.")에 써요
function scOrdinal_(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + 'th';
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

// 그 날 보트다이빙마다(사이트별로) 하나씩 — Box No. · Weight Belt · Payment · Remark는 우리 시스템에 데이터가 없어서 항상 빈칸(사장님이 손으로 채워요)
function boatPermitData_(ss, date) {
  const S = scReadSettings_(ss);
  const { groups } = scGroup_(scReadEntries_(ss, date, date)[scFmt_(date)] || [], S);
  const byCode = {};
  [INACTIVE, ACTIVE].forEach(n => memberRows_(ss.getSheetByName(n)).forEach(r => { if (r[0]) byCode[String(r[0]).trim()] = r; }));
  const keys = Object.keys(S.pickups);
  const rank = p => { const i = keys.indexOf(p); return scIsShop_(p) ? -1 : i >= 0 ? i : keys.length; };
  const tz = ss.getSpreadsheetTimeZone();
  const missing = [];
  const trips = groups.filter(g => g.kind === 'Boat').map(g => {
    const ms = g.members.slice().sort((a, b) => rank(a.pickup) - rank(b.pickup));
    const rows = ms.map((m, i) => {
      const mem = byCode[String(m.code).trim()];
      const first = mem ? mem[1] : '', last = mem ? mem[2] : '', passport = mem ? mem[6] : '';
      if (!mem) missing.push(m.name + (m.code ? ' (' + m.code + ')' : '') + ' — not in member list');
      else if (!first || !last || !passport) missing.push((first || '') + ' ' + (last || '') + ' (' + m.code + ') — missing passport info');
      return [i + 1, m.code, first, last, passport, '', '', '', scIsShop_(m.pickup) ? '-' : m.pickup, ''];
    });
    return { title: g.name + ' ' + scOrdinal_(date.getDate()) + '. ' + Utilities.formatDate(date, tz, 'MMM') + '.', count: ms.length, rows };
  });
  return { trips, missing };
}

function setupBoatPermitSheet_(ss) {
  let sh = ss.getSheetByName(SC.BOAT);
  if (!sh) sh = ss.insertSheet(SC.BOAT);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
  sh.getRange('A1').setValue('Boat Dive Permit List').setFontSize(18).setFontWeight('bold');
  sh.getRange('A2').setValue('Date').setFontWeight('bold').setBackground(SC_COLOR.head);
  if (!(sh.getRange('B2').getValue() instanceof Date)) sh.getRange('B2').setValue(tomorrow);
  sh.getRange('B2').setNumberFormat('ddd d MMM yyyy').setBackground(SC_COLOR.input).setFontWeight('bold')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build())
    .setBorder(true, true, true, true, true, true, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('C2').setValue('← double-click to pick a date').setFontColor('#587078');
  sh.setColumnWidths(1, BOAT_PERMIT_HEAD.length, 100);
  sh.setColumnWidth(1, 45); sh.setColumnWidth(3, 120); sh.setColumnWidth(4, 120); sh.setColumnWidth(5, 130); sh.setColumnWidth(10, 150);
  sh.setRowHeights(1, 3, 28);
  sh.setFrozenRows(0);
  scButtons_(sh, [['psearch', 'boatPermitSearch', 2, 5], ['pdown', 'boatPermitDownload', 2, 8]]);
  return sh;
}

function boatPermitSearch() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.BOAT) || setupBoatPermitSheet_(ss);
  const date = sh.getRange('B2').getValue();
  if (!(date instanceof Date)) { ss.toast('B2에 날짜를 넣어 주세요.'); return; }
  const { trips, missing } = boatPermitData_(ss, date);
  const max = Math.max(sh.getMaxRows(), 80);
  const area = sh.getRange(5, 1, max - 4, BOAT_PERMIT_HEAD.length);
  area.breakApart(); area.clearContent(); area.clearFormat();
  let r = 5;
  if (!trips.length) { sh.getRange(r, 1).setValue('이 날짜엔 보트다이빙이 없어요.'); r += 2; }
  trips.forEach(trip => {
    sh.getRange(r, 1).setValue(trip.count).setFontWeight('bold').setFontStyle('italic').setBackground('#EFEFEF').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sh.getRange(r, 2, 1, BOAT_PERMIT_HEAD.length - 1).merge().setValue(trip.title).setFontWeight('bold').setFontStyle('italic').setFontSize(16)
      .setFontColor('#1155CC').setBackground('#EFEFEF').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sh.setRowHeight(r, 32);
    r++;
    sh.getRange(r, 1, 1, BOAT_PERMIT_HEAD.length).setValues([BOAT_PERMIT_HEAD]).setFontWeight('bold').setBackground('#C9DAF8').setHorizontalAlignment('center');
    r++;
    const n = trip.rows.length || 1;
    const body = trip.rows.length ? trip.rows : [['', '', '', '', '', '', '', '', '', '']];
    sh.getRange(r, 1, n, BOAT_PERMIT_HEAD.length).setValues(body).setHorizontalAlignment('center').setVerticalAlignment('middle');
    sh.getRange(r, 2, n, 1).setFontColor('#1155CC').setFontStyle('italic').setFontWeight('bold');   // Code 칸만 눈에 띄게
    sh.getRange(r - 1, 1, n + 2, BOAT_PERMIT_HEAD.length).setBorder(true, true, true, true, true, true, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
    r += n + 1;   // 데이터 밑에 손으로 추가할 수 있게 빈 줄 하나(테두리 있는 빈 칸) 남겨요
    sh.getRange(r, 1, 1, BOAT_PERMIT_HEAD.length).setBorder(true, true, true, true, true, true, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
    r += 2;   // 다음 보트 블록이랑 간격
  });
  if (missing.length) {
    sh.getRange(r, 1).setValue('⚠️ Please check').setFontWeight('bold').setFontColor('#C0392B'); r++;
    sh.getRange(r, 1, missing.length, 1).setValues(missing.map(m => [m])).setFontColor('#C0392B');
  }
  sh.activate();
}

function boatPermitDownload() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.BOAT) || setupBoatPermitSheet_(ss);
  const date = sh.getRange('B2').getValue();
  if (!(date instanceof Date)) { ss.toast('먼저 "보트 Permit 조회"로 날짜를 넣고 표를 만들어 주세요.'); return; }
  boatPermitSearch();   // 표가 비어있거나 날짜가 바뀌었을 수 있으니, 다운로드 전에 항상 최신으로 다시 그려요
  const { trips, missing } = boatPermitData_(ss, date);
  // 구글시트 자체 내보내기 — 제목 · 색깔 · 볼드 · 병합이 그대로 살아있어요. 5행부터(날짜 칸은 빼고) 임시 시트에 복사해서 그것만 내보내요
  let nativeB64 = '';
  try {
    const lastRow = sh.getLastRow();
    const cols = BOAT_PERMIT_HEAD.length;
    const tmp = SpreadsheetApp.create('Boat Permit export ' + scFmt_(date));
    try {
      const tmpSh = tmp.getSheets()[0];
      sh.getRange(5, 1, Math.max(lastRow - 4, 1), cols).copyTo(tmpSh.getRange(1, 1));
      SpreadsheetApp.flush();
      Utilities.sleep(5000);
      const url = 'https://docs.google.com/spreadsheets/d/' + tmp.getId() + '/export?format=xlsx&gid=' + tmpSh.getSheetId();
      const resp = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
      nativeB64 = Utilities.base64Encode(resp.getBlob().getBytes());
    } finally {
      DriveApp.getFileById(tmp.getId()).setTrashed(true);
    }
  } catch (e) { Logger.log('네이티브 엑셀 내보내기 실패(글자만 있는 엑셀로 대신 만들어요): ' + e.message); }
  // CSV · SheetJS 대체용으로 블록들을 평평한 표 하나로 풀어요(병합 없이, 제목 줄 + 헤더 줄 + 데이터 줄을 그냥 쭉 이어서)
  const aoaRows = [];
  trips.forEach(trip => {
    aoaRows.push([trip.count, trip.title].concat(new Array(BOAT_PERMIT_HEAD.length - 2).fill('')));
    aoaRows.push(BOAT_PERMIT_HEAD.slice());
    (trip.rows.length ? trip.rows : [new Array(BOAT_PERMIT_HEAD.length).fill('')]).forEach(row => aoaRows.push(row));
    aoaRows.push(new Array(BOAT_PERMIT_HEAD.length).fill(''));
  });
  const t = HtmlService.createTemplate(SC_PERMIT_HTML);
  t.data = JSON.stringify({ head: BOAT_PERMIT_HEAD, rows: aoaRows, file: 'BoatPermit_' + scFmt_(date), title: scFmt_(date, 'EEE d MMM yyyy'), missing, nativeB64 });
  const small = !missing.length;
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(small ? 230 : 520).setHeight(small ? 90 : 420),
    'Boat Permit · ' + scFmt_(date, 'd MMM') + ' · ' + trips.reduce((n, x) => n + x.count, 0) + ' divers');
}

// 메뉴: 홈 B2 날짜로 Boat Permit 탭을 열고 바로 조회
function buildBoatPermit() {
  const ss = SpreadsheetApp.getActive();
  const date = scHomeDate_(ss);
  const sh = ss.getSheetByName(SC.BOAT) || setupBoatPermitSheet_(ss);
  sh.getRange('B2').setValue(date);
  boatPermitSearch();
}

/* ================= 회원 이력 조회 (관리자용 — 그 손님이 일정 탭에 몇 번 잡혔는지만 조회, 수정 안 해요) ================= */
function openHistoryDialog() {
  const ss = SpreadsheetApp.getActive();
  const people = [];
  [ACTIVE, INACTIVE].forEach(n => {
    const sh = ss.getSheetByName(n);
    if (!sh) return;
    memberRows_(sh).forEach(r => {
      const code = String(r[0] || '').trim();
      if (!code) return;
      people.push({ code, name: String(r[H('한글 이름') - 1] || '').trim(), en: (String(r[1] || '') + ' ' + String(r[2] || '')).trim() });
    });
  });
  const t = HtmlService.createTemplate(SC_HISTORY_HTML);
  t.data = JSON.stringify({ people });
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(620).setHeight(760), '회원 이력 조회');
}

// 회원번호로 일정 탭 전체를 훑어서 이력 · 횟수를 돌려줘요 (다이얼로그에서 google.script.run 으로 불러요)
// 이름 끝에 _를 안 붙여요 — google.script.run은 밑줄로 끝나는 함수는 "비공개"로 보고 클라이언트에서 아예 못 불러요(이게 안 되던 진짜 원인이었어요)
function getMemberHistory(code) {
  // 어디서 느려지는지 몰라서 일단 단계별로 시간을 재서 실행 기록(Executions)에 남겨요 — 느려지면 이 로그로 원인을 바로 찾을 수 있어요
  const t0 = Date.now();
  const ss = SpreadsheetApp.getActive();
  let pkg = { type: '', remain: '' };
  if (typeof pkgFindRowByCode_ === 'function') {
    const pkgRow = pkgFindRowByCode_(code);
    if (pkgRow) {
      const psh = ss.getSheetByName(PKG);
      pkg = { type: String(psh.getRange(pkgRow, 3).getValue() || ''), remain: String(psh.getRange(pkgRow, 9).getValue() || '') };   // 종류 · 잔여 횟수 (패키지 탭)
    }
  }
  Logger.log('[이력조회] 패키지 조회 ' + (Date.now() - t0) + 'ms');
  const S = scReadSettings_(ss);
  Logger.log('[이력조회] 설정 읽기 ' + (Date.now() - t0) + 'ms');
  const rows = scRawRows_(ss);
  Logger.log('[이력조회] 일정 ' + rows.length + '줄 읽기 ' + (Date.now() - t0) + 'ms');
  const items = [];
  rows.forEach(r => {
    if (String(r[1] || '').trim() !== code) return;
    if (!(r[0] instanceof Date) || !r[4]) return;
    const { kind: baseKind, name } = scKindOf_(r[3], r[4], r[5], S);
    const kind = name === 'DSD' ? 'Dsd' : baseKind;
    items.push({ date: scFmt_(r[0]), name, kind, time: scTime_(r[6]), guide: String(r[7] || '').trim() });
  });
  items.sort((a, b) => b.date.localeCompare(a.date));
  const counts = { Course: 0, Fun: 0, Boat: 0, Night: 0, Dsd: 0 };
  items.forEach(it => { counts[it.kind] = (counts[it.kind] || 0) + 1; });
  Logger.log('[이력조회] 전체 끝 ' + (Date.now() - t0) + 'ms · 이 회원 일정 ' + items.length + '건');
  return { total: items.length, diveCount: counts.Fun + counts.Boat + counts.Night, counts, items, pkg };
}

var SC_HISTORY_HTML = `<!doctype html><html><head><base target="_top"><style>
body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1F2A30;margin:0;padding:2px}
input{box-sizing:border-box;padding:7px;border:1px solid #B7C7CC;border-radius:8px;font-size:14px;width:100%}
#list{max-height:220px;overflow:auto;border:1px solid #E1E8EB;border-radius:8px;margin-top:6px}
.p{display:flex;gap:8px;align-items:center;padding:6px 8px;border-bottom:1px solid #F0F3F4;cursor:pointer}.p small{color:#7A8A92}
.p:hover{background:#F4F8F6}
.sum{margin-top:12px;padding:10px;background:#F4F8F6;border-radius:8px;font-size:13px;line-height:1.6}
.sum b{font-size:18px;color:#2E7D5B}
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
td,th{padding:4px 6px;border-bottom:1px solid #F0F3F4;text-align:left}
</style></head><body>
<input id="q" placeholder="이름 · 영문 · 회원번호로 찾기" autofocus>
<div id="list"></div>
<div id="result"></div>
<script>
var D = <?!= data ?>;
var $ = id => document.getElementById(id);
function draw() {
  const q = $('q').value.trim().toLowerCase();
  if (!q) { $('list').innerHTML = ''; return; }
  const rows = D.people.filter(p => (p.name + ' ' + p.en + ' ' + p.code).toLowerCase().includes(q)).slice(0, 30);
  $('list').innerHTML = rows.map(p => '<div class="p" data-c="' + p.code + '" data-n="' + (p.name || p.en) + '"><b>' + (p.name || p.en) + '</b> <small>' + p.en + ' · ' + p.code + '</small></div>').join('') || '<div class="p"><small>못 찾았어요.</small></div>';
  document.querySelectorAll('.p[data-c]').forEach(el => el.onclick = () => pick(el.dataset.c, el.dataset.n));
}
// seq로 요청 번호를 매겨서, 사람을 연달아 빠르게 눌렀을 때 먼저 누른 느린 응답이 나중에 와서 화면을 덮어쓰는 걸 막아요
// timer로 20초 넘게 응답이 없으면 "오래 걸려요" 메시지를 띄워요 — 전에는 끝까지 "불러오는 중..."에 멈춰 있어서 멈춘 줄 알기 쉬웠어요
var pickSeq_ = 0;
function pick(code, label) {
  var seq = ++pickSeq_;
  $('result').innerHTML = '<div class="sum">불러오는 중...</div>';
  var timer = setTimeout(() => {
    if (seq !== pickSeq_) return;
    $('result').innerHTML = '<div class="sum">응답이 너무 오래 걸려요 — 일정 탭이 커서 그럴 수 있어요. 잠시 후 다시 눌러주세요.</div>';
  }, 20000);
  // 요청 자체가 서버로 가기 전에(브라우저 쪽에서) 뭔가 막히면 아무 에러도 안 뜨고 타임아웃만 뜨는 게 이상해서,
  // google.script.run 호출 자체를 try/catch로 감싸서 그 경우도 화면에 바로 보이게 해요
  try {
  google.script.run.withSuccessHandler(res => {
    clearTimeout(timer);
    if (seq !== pickSeq_) return;
    try {
      var pkgLine = '';
      if (res.pkg && res.pkg.type) {
        pkgLine = '<br>📦 ' + res.pkg.type + ' · 남은 횟수 ' + (res.pkg.remain || '-');
      }
      $('result').innerHTML =
        '<div class="sum"><b>' + label + '</b> (' + code + ')' + pkgLine + '<br>' +
        '우리 샵 다이빙(펀 · 보트 · 나이트) <b>' + res.diveCount + '</b>회 · 교육 ' + res.counts.Course + '회 · 체험 ' + res.counts.Dsd + '회 · 전체 일정 ' + res.total + '건</div>' +
        '<table><tr><th>날짜</th><th>종류</th><th>시간</th><th>강사</th></tr>' +
        res.items.slice(0, 60).map(it => '<tr><td>' + it.date + '</td><td>' + it.name + '</td><td>' + it.time + '</td><td>' + (it.guide || '') + '</td></tr>').join('') +
        '</table>';
    } catch (err) {
      $('result').innerHTML = '<div class="sum">결과를 표시하다 오류가 났어요: ' + err.message + '</div>';
    }
  }).withFailureHandler(e => {
    clearTimeout(timer);
    if (seq !== pickSeq_) return;
    $('result').innerHTML = '<div class="sum">오류: ' + e.message + '</div>';
  }).getMemberHistory(code);
  } catch (syncErr) {
    clearTimeout(timer);
    $('result').innerHTML = '<div class="sum">요청을 보내다 바로 오류가 났어요: ' + syncErr.message + '</div>';
  }
}
$('q').oninput = draw;
</script></body></html>`;

/* ================= ＋ 신청 추가 (활성 회원 → 일정 탭) ================= */
function openAddDialog() {
  const ss = SpreadsheetApp.getActive();
  const v = memberRows_(ss.getSheetByName(ACTIVE));
  const people = v.filter(r => r[0]).map(r => ({ code: String(r[0]), name: String(r[H('한글 이름') - 1] || ''), en: (r[1] + ' ' + r[2]).trim(),
    pickup: String(r[H('픽업') - 1] || ''), isNew: String(r[H('신규') - 1] || '') }));
  const S = scReadSettings_(ss);
  let date = new Date(Date.now() + 864e5);
  try { date = scHomeDate_(ss); } catch (e) {}
  const t = HtmlService.createTemplate(SC_ADD_HTML);
  // 교육은 폼이랑 똑같은 과정 이름(한글)으로 고르게 하고, 제출할 때 COURSE_LABEL로 종류 값(영문)을 맞춰요
  // 펀다이빙 · 보트다이빙 · 나이트다이빙은 설정 탭에 등록된 사이트 이름으로만 고르게 해서 목록이 너무 안 길어지게 해요
  const guides = [...new Set(Object.keys(S.guides))];
  t.data = JSON.stringify({ people, courseLabels: Object.keys(COURSE_LABEL), courseMap: COURSE_LABEL, courseDays: COURSE_DAYS,
    funLabels: scSiteNames_(S, 'Fun'), boatLabels: scSiteNames_(S, 'Boat'), nightLabels: scSiteNames_(S, 'Night'),
    guides, times: SC_TIME_CHOICES, date: scFmt_(date), pickups: Object.keys(S.pickups) });
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(560).setHeight(720), '＋ 신청 추가 (활성 회원)');
}

// 일정 탭 한 줄을 SC_HEAD 길이만큼 채워요 (K열 깡수는 주어진 값 그대로, L열 패키지 여부는 체크박스라 false, M열은 빈 칸)
// — SC_HEAD에 칸이 늘어도 여기 한 곳만 맞으면 다른 데서 만든 짧은 줄도 항상 맞는 길이로 써져요
function scPadRow_(r) {
  while (r.length < SC_HEAD.length) r.push(r.length === 12 ? false : '');
  return r;
}

// 팀(사람들 묶음 + 그 팀이 하는 일정 하나)마다 × 날짜 → 일정 탭에 한 줄씩. 팀이 여러 개면 한 번에 다 들어가요
var SC_KIND_LABEL = { Fun: '펀다이빙', Course: '교육', Boat: '보트다이빙', Night: '나이트다이빙', Dsd: '체험다이빙', Other: '기타', Setup: '셋업' };
function addEntries(f) {
  const ss = SpreadsheetApp.getActive();
  const sh = scData_(ss);
  const teams = (f.teams || []).filter(t => t.entry && t.entry.type && t.people && t.people.length);
  if (!teams.length) throw new Error('팀마다 회원과 일정을 하나 이상 적어 주세요.');
  const [y, m, d] = f.date.split('-').map(Number);
  const rows = [];
  teams.forEach(t => {
    const days = Math.max(1, Number(t.days) || 1);   // 팀마다 며칠 연속인지 따로예요 (한 팀은 1일짜리 펀다이빙, 다른 팀은 5일짜리 교육일 수 있어서)
    const useCount = (t.entry.kind === 'Fun' && Number(t.entry.useCount) > 0) ? Number(t.entry.useCount) : '';   // 비워두면 패키지.gs가 기본 2로 처리해요
    // 나이트다이빙 · 체크다이빙은 카테고리(D열)는 펀다이빙 그대로 두고, 종류(E열)에 "Night Diving" · "Check Diving"으로 표시해요 (카테고리 드롭다운엔 둘 다 없어서요)
    const specialType = { Night: 'Night Diving', Check: 'Check Diving' }[t.entry.kind];
    for (let k = 0; k < days; k++) {
      const date = new Date(y, m - 1, d + k);
      t.people.forEach(p => rows.push(scPadRow_([date, p.code, p.name, SC_KIND_LABEL[specialType ? 'Fun' : t.entry.kind] || '', specialType || t.entry.type, t.entry.site || '', t.entry.time, t.entry.guide, p.pickup || '', t.entry.memo || '', '직접', useCount, false, ''])));
    }
  });
  sh.insertRowsBefore(2, rows.length);   // 맨 뒤가 아니라 맨 위(헤더 바로 아래)에 넣어요 — 새로 추가한 게 항상 위로 와요
  sh.getRange(2, 1, rows.length, SC_HEAD.length).setValues(rows);
  sh.getRange(2, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
  return rows.length + '줄(팀 ' + teams.length + '개)을 일정 탭 맨 위에 넣었어요. 홈에서 "스케줄 만들기"를 누르면 반영돼요.';
}

var SC_ADD_HTML = `<!doctype html><html><head><base target="_top"><style>
body{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1F2A30;margin:0;padding:2px}
label.t{display:block;font-weight:700;margin:12px 0 4px}
input,select{box-sizing:border-box;padding:7px;border:1px solid #B7C7CC;border-radius:8px;font-size:14px}
.q{width:100%}.list{max-height:140px;overflow:auto;border:1px solid #E1E8EB;border-radius:8px;margin-top:6px}
.p{display:flex;gap:8px;align-items:center;padding:6px 8px;border-bottom:1px solid #F0F3F4;cursor:pointer}.p small{color:#7A8A92}
.p.on{background:#E3F1EA}.p.hl{box-shadow:inset 0 0 0 2px #2E5E80}.row{display:flex;gap:6px;margin-bottom:6px}.row select,.row input{flex:1;min-width:0}
.team{border:1px solid #B7C7CC;border-radius:10px;padding:10px;margin-bottom:10px;background:#FAFBFC}
.team .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.team .top b{font-size:13px;color:#2E5E80}
.rm{background:none;border:0;color:#C0392B;font-size:12px;cursor:pointer;padding:2px 4px}
.ghost{background:#fff;border:1px dashed #9AA7AD;color:#2E5E80;border-radius:8px;padding:6px;width:100%;cursor:pointer}
button.go{margin-top:14px;width:100%;padding:11px;border:0;border-radius:10px;background:#2E7D5B;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
button.go:disabled{opacity:.5}.msg{margin-top:8px;color:#2E5E80;font-size:13px}.chips{font-size:12px;color:#2E7D5B;margin-top:4px}
</style></head><body>
<label class="t">날짜</label>
<div class="row"><input type="date" id="date"></div>
<label class="t">팀 (회원들 + 그 팀이 할 일정 하나씩 — 며칠 연속인지도 팀마다 따로예요)</label>
<div id="teams"></div>
<button class="ghost" id="more">＋ 팀 추가</button>
<datalist id="times"></datalist><datalist id="guides"></datalist><datalist id="pickups"></datalist>
<button class="go" id="go">일정에 넣기</button><div class="msg" id="msg"></div>
<script>
var D = <?!= data ?>;
var $ = id => document.getElementById(id);
D.times.forEach(v => { const o = document.createElement('option'); o.value = v; $('times').appendChild(o); });
D.guides.forEach(v => { const o = document.createElement('option'); o.value = v; $('guides').appendChild(o); });
D.pickups.forEach(v => { const o = document.createElement('option'); o.value = v; $('pickups').appendChild(o); });
$('date').value = D.date;
var teamSeq = 0;
// 팀마다: 그 팀만의 회원 찾기 · 선택 목록 + 그 팀이 할 일정(종류 · 사이트/과정 · 시간 · 강사 · 메모) 한 묶음
function team() {
  teamSeq++;
  const d = document.createElement('div'); d.className = 'team';
  d.innerHTML =
    '<div class="top"><b>팀 ' + teamSeq + '</b><select class="days" style="width:auto"></select><button type="button" class="rm">팀 삭제</button></div>' +
    '<div class="picker">' +
      '<input class="q" placeholder="회원 찾기 (이름 · 영문 · 회원번호)" autocomplete="off">' +
      '<div class="list"></div><div class="chips"></div>' +
    '</div>' +
    '<input class="dsdname" style="display:none;width:100%;margin-top:6px" placeholder="이름 (예: 김형규, 최소미) 또는 팀 이름 (예: 독일 가족 4명)">' +
    '<input class="dsdpickup" list="pickups" style="display:none;width:100%;margin-top:6px" placeholder="픽업 장소 (예: Coffee Corner, 없으면 비워두기)">' +
    '<div class="row" style="margin-top:8px">' +
      '<select class="k">' +
        '<option value="Fun">펀다이빙</option>' +
        '<option value="Course">교육</option>' +
        '<option value="Boat">보트다이빙</option>' +
        '<option value="Dsd">체험다이빙 (DSD)</option>' +
        '<option value="Other">기타 (스케줄 외 픽업)</option>' +
        '<option value="Setup">셋업 (보트 준비 등)</option>' +
      '</select>' +
      '<span class="sites" style="flex:1;display:flex;flex-wrap:wrap;gap:6px"></span>' +
    '</div>' +
    '<div class="row">' +
      '<input list="times" placeholder="시간 09:00am" class="tm">' +
      '<span class="guides" style="flex:1 1 180px;display:flex;flex-wrap:wrap;gap:4px">' +
        '<input list="guides" placeholder="강사1" class="g1" style="flex:1 1 60px;min-width:56px">' +
        '<input list="guides" placeholder="강사2" class="g2" style="flex:1 1 60px;min-width:56px">' +
        '<input list="guides" placeholder="강사3" class="g3" style="flex:1 1 60px;min-width:56px">' +
      '</span>' +
      '<input placeholder="메모" class="m" style="max-width:100px">' +
    '</div>';
  $('teams').appendChild(d);

  const picked = new Map();   // 이 팀만의 회원 선택 상태 (다른 팀이랑 안 섞여요)
  const pickerEl = d.querySelector('.picker'), dsdNameEl = d.querySelector('.dsdname'), dsdPickupEl = d.querySelector('.dsdpickup');
  const qInput = d.querySelector('.q'), listEl = d.querySelector('.list'), chipsEl = d.querySelector('.chips');
  const filterPeople = () => { const q = qInput.value.trim().toLowerCase(); return D.people.filter(p => !q || (p.name + ' ' + p.en + ' ' + p.code).toLowerCase().includes(q)).slice(0, 60); };
  let activeIdx = 0;   // 화살표로 움직이는, 지금 "선택 활성화"된 줄 — 엔터 누르면 이 줄이 체크돼요
  function drawList(keepActive) {
    const rows = filterPeople();
    if (!keepActive) activeIdx = 0;
    if (activeIdx >= rows.length) activeIdx = rows.length - 1;
    if (activeIdx < 0) activeIdx = 0;
    listEl.innerHTML = rows.map((p, i) => '<div class="p' + (picked.has(p.code) ? ' on' : '') + (i === activeIdx ? ' hl' : '') + '" data-c="' + p.code + '" data-i="' + i + '"><input type="checkbox"' + (picked.has(p.code) ? ' checked' : '') + '> <b>' + (p.name || p.en) + '</b> <small>' + p.en + ' · ' + p.code + (p.pickup ? ' · ' + p.pickup : '') + (p.isNew ? ' · ' + p.isNew : '') + '</small></div>').join('') || '<div class="p"><small>활성 회원에서 찾지 못했어요.</small></div>';
    listEl.querySelectorAll('.p[data-c]').forEach(el => el.onclick = () => { const c = el.dataset.c; activeIdx = Number(el.dataset.i); picked.has(c) ? picked.delete(c) : picked.set(c, D.people.find(p => p.code === c)); drawList(true); });
    const hl = listEl.querySelector('.p.hl'); if (hl) hl.scrollIntoView({ block: 'nearest' });
    chipsEl.textContent = picked.size ? '고른 회원 ' + picked.size + '명: ' + [...picked.values()].map(p => p.name || p.en).join(', ') : '';
  }
  qInput.oninput = () => drawList(false); drawList(false);
  // 이름 치고 화살표(↑↓)로 "선택 활성화"된 줄을 옮기고, 엔터 누르면 그 줄이 체크돼요 (여러 명이 걸릴 때를 위한 거예요)
  // (한글 조합 중에 엔터가 눌리면 e.isComposing이 true라서 그건 걸러요 — 안 그러면 아직 안 끝난 글자 기준으로 엉뚱한 사람이 걸려요)
  qInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = filterPeople();
      if (!rows.length) return;
      activeIdx = Math.max(0, Math.min(rows.length - 1, activeIdx + (e.key === 'ArrowDown' ? 1 : -1)));
      drawList(true);
      return;
    }
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    const rows = filterPeople();
    if (!rows.length) return;
    const p = rows[Math.min(activeIdx, rows.length - 1)];
    picked.has(p.code) ? picked.delete(p.code) : picked.set(p.code, p);
    qInput.value = '';
    drawList(false);
  });

  const kSel = d.querySelector('.k'), sites = d.querySelector('.sites');

  // 이 팀만의 "며칠 연속" — 교육 과정을 고르면 그 과정 보통 기간에 맞춰 자동으로 채워져요 (직접 바꾸면 그 뒤로는 안 건드려요)
  const daysSel = d.querySelector('.days');
  for (let i = 1; i <= 10; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i === 1 ? '하루' : i + '일 연속'; daysSel.appendChild(o); }
  let daysTouched = false;
  daysSel.addEventListener('change', () => { daysTouched = true; });
  function suggestDays() {
    if (daysTouched) return;
    const c = d.querySelector('.l');
    daysSel.value = kSel.value === 'Course' && c ? Math.min(D.courseDays[c.value] || 1, 10) : 1;
  }

  const opts = arr => arr.map(v => '<option value="' + v + '">' + v + '</option>').join('');
  // 사이트는 최대 3개까지 고를 수 있어요 (첫 번째만 필수)
  function siteSelects(list, night) {
    let html = '';
    for (let i = 1; i <= 3; i++) html += '<select class="l' + i + '" style="flex:1 1 140px">' + (i > 1 ? '<option value="">(사이트 ' + i + ' — 필요하면)</option>' : '') + opts(list) + '</select>';
    // 일반 펀다이빙 · 나이트다이빙 · 체크다이빙 중 하나를 고르는 드랍박스(교육 과정 고르는 것처럼) — 체크박스 두 개를 따로 두면 둘 다 체크되는 경우가 생길 수 있어서 하나로 통일했어요
    if (night) html += '<select class="funType" style="flex:0 0 150px"><option value="">일반 펀다이빙</option><option value="Night">🌙 나이트다이빙</option><option value="Check">체크다이빙</option></select>';
    if (night) html += '<label style="display:flex;align-items:center;gap:3px;white-space:nowrap;font-weight:400;font-size:12px;color:#7A8A92">깡수<input type="number" class="useCount" placeholder="2" style="width:44px;padding:4px"></label>';
    html += '<label style="display:flex;align-items:center;gap:3px;white-space:nowrap;font-weight:400;font-size:12px;color:#7A8A92">미정(또는)<input type="checkbox" class="orSite"></label>';
    return html;
  }
  function onKind() {
    const freeform = kSel.value === 'Dsd' || kSel.value === 'Other' || kSel.value === 'Setup';   // DSD · 기타 · 셋업 다 회원 찾기 대신 이름 직접 입력
    pickerEl.style.display = freeform ? 'none' : '';
    dsdNameEl.style.display = freeform ? '' : 'none';
    dsdPickupEl.style.display = freeform ? '' : 'none';
    dsdNameEl.placeholder = kSel.value === 'Other' ? '이름 (예: 오피스 김OO) 또는 용무 (예: 오피스 직원 출근)'
      : kSel.value === 'Setup' ? '할 일 (예: Thistlegorm 보트 다이빙 준비)'
      : '이름 (예: 김형규, 최소미) 또는 팀 이름 (예: 독일 가족 4명)';
    if (kSel.value === 'Course') {
      // 교육도 사이트(최대 3개)를 같이 고를 수 있어요 — 과정 이름 뒤에 붙어서 들어가요
      sites.innerHTML = '<select class="l" style="flex:1 1 140px">' + opts(D.courseLabels) + '</select>' + siteSelects(D.funLabels, false);
      sites.querySelector('.l').onchange = suggestDays;
    } else if (freeform) {
      sites.innerHTML = '';
    } else if (kSel.value === 'Boat') {
      sites.innerHTML = siteSelects(D.boatLabels, false);   // 보트다이빙: 최대 3개
    } else {
      sites.innerHTML = siteSelects(D.funLabels, true);   // 펀다이빙: 최대 3개 · 🌙 나이트다이빙이면 체크
    }
    suggestDays();
  }
  kSel.onchange = onKind; onKind();
  d.querySelector('.rm').onclick = () => { d.remove(); };
  d._people = () => {
    if (kSel.value === 'Dsd' || kSel.value === 'Other' || kSel.value === 'Setup') {
      const nm = dsdNameEl.value.trim();
      return nm ? [{ code: '-', name: nm, pickup: dsdPickupEl.value.trim() }] : [];
    }
    return [...picked.values()];
  };
}
team(); $('more').onclick = team;
$('go').onclick = () => {
  if ($('go').disabled) return;   // 누르는 중에 또 눌러도 두 번 안 들어가게
  const teams = [...document.querySelectorAll('#teams .team')].map(d => {
    const kSel = d.querySelector('.k'), kind = kSel.value;
    let type, site = '';
    const sitesChosen = () => { const seen = []; [1, 2, 3].forEach(i => { const el = d.querySelector('.l' + i); const v = el ? el.value.trim() : ''; if (v && seen.indexOf(v) < 0) seen.push(v); }); return seen; };
    const orBox = d.querySelector('.orSite');
    const siteSep = orBox && orBox.checked ? ' 또는 ' : '+';   // "미정(또는)" 체크하면 "Mashraba 또는 Lighthouse"처럼
    if (kind === 'Dsd') type = 'DSD';
    else if (kind === 'Other') type = d.querySelector('.dsdname').value.trim() || '기타 픽업';
    else if (kind === 'Setup') type = d.querySelector('.dsdname').value.trim() || '셋업';
    else if (kind === 'Course') {
      type = D.courseMap[d.querySelector('.l').value.trim()] || d.querySelector('.l').value.trim();
      site = sitesChosen().join(siteSep);   // 교육은 사이트가 있어도 되고 없어도 돼요
    } else {
      type = '-';
      site = sitesChosen().join(siteSep);   // 펀다이빙 · 보트다이빙은 종류(E열) 대신 다이빙 사이트(F열)에 적어요
    }
    const funTypeEl = d.querySelector('.funType');
    const actualKind = (kind === 'Fun' && funTypeEl && funTypeEl.value) ? funTypeEl.value : kind;
    const people = d._people().map(p => ({ code: p.code, name: p.name || p.en, pickup: p.pickup }));
    const guideVal = ['g1', 'g2', 'g3'].map(c => { const el = d.querySelector('.' + c); return el ? el.value.trim() : ''; }).filter(Boolean).join('/');
    const useCountEl = d.querySelector('.useCount');   // 펀다이빙일 때만 있어요 — 비워두면 서버에서 기본 2로 처리돼요
    return { people, days: d.querySelector('.days').value, entry: { type, site, kind: actualKind, time: d.querySelector('.tm').value.trim(), guide: guideVal, memo: d.querySelector('.m').value.trim(), useCount: useCountEl ? useCountEl.value.trim() : '' } };
  });
  const valid = teams.filter(t => t.people.length && t.entry.type);
  if (!valid.length) { $('msg').textContent = '팀마다 회원을 고르고 일정(사이트/과정)을 적어 주세요.'; return; }
  $('go').disabled = true; $('msg').textContent = '넣는 중...';
  google.script.run.withSuccessHandler(m => { $('msg').textContent = m; setTimeout(() => google.script.host.close(), 1300); })
    .withFailureHandler(e => { $('go').disabled = false; $('msg').textContent = '오류: ' + e.message; })
    .addEntries({ date: $('date').value, teams: valid });
};
</script></body></html>`;

// 회원 등록 폼 → 첫 다이빙 날 일정 한 줄 (시간은 비워 두고 메모에 "시간 정하기")
// 교육 과정별 보통 며칠 걸리는지 (연속된 날짜로 일정을 그만큼 넣어요). 없는 과정은 1일
var COURSE_DAYS = { '오픈워터': 3, '오픈워터 + 어드밴스드': 5, '어드밴스드': 2, 'EFR': 1, '레스큐': 2, '마스터 (다이브마스터)': 1,
  'IDC (강사)': 1, '세미 오픈워터 (오래 쉬었을 때 리마인드)': 1, '스페셜티 · Deep': 1, '스페셜티 · Nitrox': 1,
  '트레이닝 · Kick': 1, '트레이닝 · SMB': 1, '트레이닝 · Buoyancy': 1, '체크 다이빙': 1 };
// 폼의 "교육 과정" 한글 이름 → 일정 탭에 적는 종류(영문). ＋ 신청 추가 창에서도 같은 걸 써요 (폼이랑 똑같은 선택지가 되게)
var COURSE_LABEL = { '오픈워터': 'Open Water', '오픈워터 + 어드밴스드': 'Open Water', '세미 오픈워터 (오래 쉬었을 때 리마인드)': 'Semi Open Water', '어드밴스드': 'Advanced Open Water', 'EFR': 'EFR', '레스큐': 'Rescue',
  '마스터 (다이브마스터)': 'DMT', 'IDC (강사)': 'IDC', '스페셜티 · Deep': 'Deep Specialty', '스페셜티 · Nitrox': 'Nitrox Specialty', '트레이닝 · Kick': 'Kick Training', '트레이닝 · SMB': 'SMB Training', '트레이닝 · Buoyancy': 'Buoyancy Training', '체크 다이빙': 'Check Diving' };

function addFormEntry_(f) {
  // 날짜 질문에 답이 없거나 날짜 형식이 아니면 조용히 넘어가지 않고 에러로 알려요 — 그래야 활성화할 때 "일정 추가 실패"로 눈에 보여요
  if (!(f.day instanceof Date)) throw new Error('날짜 응답이 비어있거나 날짜 형식이 아니에요 (받은 값: "' + f.day + '")');
  const ss = SpreadsheetApp.getActive();
  const sh = scData_(ss);
  const addDaysFrom = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
  const rows = [];
  const pendingRowIdx = [];   // rows 안에서 "날짜 미정" · "사이트 미정" 줄 인덱스 — 나중에 진한 노란색으로 따로 칠해요(아직 채워야 할 게 있다는 표시)
  // 펀다이빙 계열은 종류(E열)가 "-" 고정이고, 실제 사이트(아직 안 정했으면 "Fun Diving"·"Night Diving" 같은 기본값)는 F열(다이빙 사이트)에 들어가요
  // "Fun Diving"처럼 사이트가 아직 진짜로 안 정해진 기본값 줄이라, pendingRowIdx에도 같이 넣어서 진한 노란색으로 표시해요
  const siteRow = (site, memo) => { pendingRowIdx.push(rows.length); return scPadRow_([f.day, f.code, f.name, '펀다이빙', '-', site, '', '', f.pickup || '', memo, '폼', '', false, '']); };

  if (/^교육/.test(f.kind)) {
    // 교육: 순서 있는 과정(오픈워터 → 어드밴스드 → EFR → 레스큐, sequential)은 신청한 날짜부터 레벨 순서대로
    // 날짜를 이어 붙여서(한 과정이 끝난 바로 다음 날부터 다음 과정 시작) 전부 날짜 있는 진짜 일정으로 넣어요
    let cursor = f.day;
    const seqList = (f.sequential && f.sequential.length) ? f.sequential : [f.course];
    seqList.forEach(c => {
      const label = COURSE_LABEL[c] || c;
      const days = COURSE_DAYS[c] || 1;
      for (let i = 0; i < days; i++) {
        rows.push([addDaysFrom(cursor, i), f.code, f.name, '교육', label, '', '', '', f.pickup || '',
          '폼 신청 · 시간 정하기' + (days > 1 ? ' (' + (i + 1) + '/' + days + '일차)' : ''), '폼']);
      }
      cursor = addDaysFrom(cursor, days);   // 다음 과정은 이 과정이 끝난 바로 다음 날부터
    });
    // 마스터 · 인스트럭터 · 스페셜티 · 트레이닝(pending)은 며칠짜리인지 정해진 게 아니라 애드온이라 날짜를 확정은 못 짓지만,
    // 손님이 폼에 적은 희망 시작일(f.day)은 일단 찍어두고 — 진한 노란색으로 표시해서 "이 날짜 맞는지 확인 필요"라고 알려줘요
    (f.pending || f.extraCourses || []).forEach(c => {
      pendingRowIdx.push(rows.length);
      rows.push([f.day, f.code, f.name, '교육', COURSE_LABEL[c] || c, '', '', '', f.pickup || '', '폼 신청 · 날짜 확인 필요', '폼']);
    });
  } else if (f.kind === '체험다이빙') {
    rows.push([f.day, f.code, f.name, '체험다이빙', 'DSD', '', '', '', f.pickup || '', '폼 신청 · 시간 정하기', '폼']);
  } else if (f.kind === KINDS[1]) {
    // 펀다이빙 패키지: 이제 빈 줄을 미리 깔아두지 않아요 — 첫 날만 평소처럼 한 줄 넣고, 패키지 탭(패키지.gs)에 자동으로 등록해서
    // 그 뒤로는 패키지 탭이 알아서 횟수를 세요 (결제완료는 아직 체크 안 해둬요 — 입금 확인되면 패키지 탭에서 체크박스만 눌러주면 돼요)
    rows.push(siteRow('Fun Diving', '폼 신청 · 시간 정하기'));
    if (typeof pkgRegisterFromForm_ === 'function') { try { pkgRegisterFromForm_(f.code, f.pkg, f.day); } catch (e) { Logger.log('패키지 자동 등록 실패: ' + e.message); } }
  } else if (f.kind === KINDS[4]) {
    // 체크다이빙도 카테고리(D열)는 펀다이빙 그대로, 종류(E열)에 "Check Diving" — 사이트는 아직 안 정했으니 F열은 비워 두고 나중에 채워요 (나이트다이빙이랑 똑같은 구조)
    pendingRowIdx.push(rows.length);
    rows.push(scPadRow_([f.day, f.code, f.name, '펀다이빙', 'Check Diving', '', '', '', f.pickup || '', '폼 신청 · 시간 정하기', '폼', '', false, '']));
    if (f.night) { pendingRowIdx.push(rows.length); rows.push(scPadRow_([f.day, f.code, f.name, '펀다이빙', 'Night Diving', '', '', '', f.pickup || '', '폼 신청 · 시간 정하기 · 🌙 손님 컨택 필요', '폼', '', false, ''])); }
  } else {
    rows.push(siteRow('Fun Diving', '폼 신청 · 시간 정하기'));
    // 나이트다이빙은 카테고리(D열) 펀다이빙 그대로, 종류(E열)에 "Night Diving" — 사이트는 아직 안 정했으니 F열은 비워 두고 나중에 채워요
    if (f.night) { pendingRowIdx.push(rows.length); rows.push(scPadRow_([f.day, f.code, f.name, '펀다이빙', 'Night Diving', '', '', '', f.pickup || '', '폼 신청 · 시간 정하기 · 🌙 손님 컨택 필요', '폼', '', false, ''])); }
  }

  // 맨 아래가 아니라 맨 위(헤더 바로 아래)에 넣어요 — "+ 신청 추가"랑 똑같이, 방금 들어온 폼 신청이 바로 눈에 보이게
  sh.insertRowsBefore(2, rows.length);
  sh.getRange(2, 1, rows.length, SC_HEAD.length).setValues(rows.map(scPadRow_));
  sh.getRange(2, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(2, 1, rows.length, SC_HEAD.length).setBackground('#FFF2CC');
  // 날짜 미정 줄만 진한 노란색 + 볼드로 다시 칠해서 "일정 잡아야 함"이 눈에 띄게 해요
  pendingRowIdx.forEach(i => sh.getRange(2 + i, 1, 1, SC_HEAD.length).setBackground('#FFD966').setFontWeight('bold'));
}

/* ================= 캘린더 (따로 탭) ================= */
// 캘린더 탭 B2 달 · D2 종류. 하루 = 두 칸 (이름 | 종류 시간), 교육은 과정 색 · 펀다이빙은 한 색
function buildCalendar() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SC.CAL) || (scCalendarSheet_(ss), ss.getSheetByName(SC.CAL));
  const m0 = sh.getRange('B2').getValue() instanceof Date ? sh.getRange('B2').getValue() : new Date();
  const major = String(sh.getRange('D2').getValue() || '전체');
  const first = new Date(m0.getFullYear(), m0.getMonth(), 1);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const S = scReadSettings_(ss);
  const all = scReadEntries_(ss, first, new Date(first.getFullYear(), first.getMonth(), days));
  // 카테고리(교육 · 펀다이빙 · 나이트다이빙 · 보트다이빙 · 체험다이빙) 기준으로만 걸러요
  const want = g => {
    if (major === '전체') return true;
    if (major === '교육') return g.kind === 'Course';
    if (major === '펀다이빙') return g.kind === 'Fun';
    if (major === '나이트다이빙') return g.kind === 'Night' || scIsNightLabel_(g.label);
    if (major === '보트다이빙') return g.kind === 'Boat';
    if (major === '체험다이빙') return scNorm_(g.name) === scNorm_('DSD');
    return false;
  };
  const typeLabel = major;

  // 아래쪽 달력만 지우고 다시 그려요 (1~2행 고르는 칸 · 버튼은 그대로)
  const max = Math.max(sh.getMaxRows(), 200);
  const area = sh.getRange(4, 1, max - 3, 14);
  area.breakApart(); area.clearContent(); area.clearFormat();
  sh.getRange('A1').setValue(Utilities.formatDate(first, ss.getSpreadsheetTimeZone(), 'yyyy년 M월') + ' · ' + typeLabel).setFontSize(16).setFontWeight('bold');
  const W = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  W.forEach((w, i) => sh.getRange(4, i * 2 + 1, 1, 2).merge().setValue(w));
  sh.getRange(4, 1, 1, 14).setFontWeight('bold').setBackground('#C9DAF8').setHorizontalAlignment('center');

  let r = 5, wd = first.getDay(), d = 1;
  const today = scFmt_(new Date());
  while (d <= days) {
    const week = [];   // [{d, items:[{name, text, color}]}]
    for (let k = 0; k < 7; k++) {
      if ((r === 5 && k < wd) || d > days) { week.push(null); continue; }
      const key = scFmt_(new Date(first.getFullYear(), first.getMonth(), d));
      const dayGroups = scGroup_(all[key], S).groups;
      const items = [];
      dayGroups.filter(want).forEach(g => g.members.forEach(m => items.push({ name: m.name, text: g.label + (g.time ? ' ' + g.time.replace(':00', '') : ''), color: g.color })));
      week.push({ d, key, items, night: dayGroups.some(g => scIsNightLabel_(g.label)) }); d++;
    }
    const h = Math.max(1, ...week.map(x => (x ? x.items.length : 0)));
    week.forEach((x, k) => {
      const c = k * 2 + 1;
      const head = sh.getRange(r, c, 1, 2).merge().setHorizontalAlignment('center').setBackground('#EFEFEF');
      if (!x) return;
      head.setValue(x.d + (x.night ? ' 🌙' : '') + (x.items.length ? '  (' + x.items.length + ')' : ''));
      if (x.key === today) head.setBackground('#FFE699').setFontWeight('bold');
      if (x.items.length) {
        sh.getRange(r + 1, c, x.items.length, 2).setValues(x.items.map(it => [it.name, it.text]))
          .setBackgrounds(x.items.map(it => [it.color, it.color]));
      }
    });
    sh.getRange(r + 1, 1, h, 14).setFontSize(10).setVerticalAlignment('middle');
    r += h + 1;
    sh.getRange(r, 1, 1, 14).setBackground('#FFFF66'); sh.setRowHeight(r, 6);
    r++;
  }
  for (let k = 0; k < 7; k++) sh.getRange(4, k * 2 + 1, r - 4, 2).setBorder(true, true, true, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.setColumnWidths(1, 14, 78);
  sh.setFrozenRows(4);
  sh.activate();
}

/* ================= 버튼 그림 (PNG) ================= */
var SC_BUTTONS = {
  pkglookup: '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',
  pending: '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',
  psearch: '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',
  pdown: 'iVBORw0KGgoAAAANSUhEUgAAAbgAAABQCAYAAABrqmDoAAAT/ElEQVR42u3deVhU9cIH8O8M+76vIoKIgKAYIC5RbqDmkmUqmppWdt9rV0vLrJtZ3ddb+VaWvenN8tU0c0m99uaamlq4iyYixCIijLLJvg/LDPcP5ThnFhwEhaHv53l4Hs+ZmcPMj+P5nt86EtynfstmNIGIiOgBS1y+RXI/r5Mw1IiIqCuGnYTBRkREXTHopAw3IiIyNPpkk5ThRkREXTHkpAw3IiLqiiEnZbgREVFXDDkpw42IiLpiyEkZbkRE1BVDTspwIyKirhhyUhYHERF1RVLW3oiIqCvW4liDIyKirluDIyIi6mokbJ4kIiLW4IiIiBhwREREDDgiIiIGHBEREQOOiIgYcERERAw4IiKiTsyYRdDx+nr5YVxolF7PXbF/EwuMiIgBZxh8nT0xfWAMA46IiAFH1Lm8Ej0Vvi7dAAC1DXK8vesrg/48A3z74NlBo4Xtr3/9Eal5WfxD89xgwJFhcLFxQA8nd52P19TLUVFbjcKqMtQ11LPAWhDWIwCP9AgAAFTKawz+83jYOWFEULiwvTP+aLueW7qkF8hQUVvNc4MYcNQ2I/tE4O/jZt/zeQqlAql5MpzOSMSO+F9wq6KUhUftcm6pm/fdxzidkcgCJHAUJT0URlIjBHfzxUtDJ+Ln11Zh/sgpkEp56hARa3BkIMpqqlBaUyGEmpuNA8xMTDXC7qWhExHk6YMFW1ZCqVSy4KhV51ZLahvqWFjEgKP2tyP+F6w5uku0z9naDqHevbEwJhbeKn0qUf6heDU6Fp8f3saCo/s6t4jAJkrqSEVV5Tj6RzwmrX4L288dET02a8gYeNg7630sU2MTmKvVCGEAzbMP8j23R5lIJBJIJJI2HcPKzLzNxzC4u3sjI1ibW95Xc7v0T1ZWrMFRl9agaMT/HNyMMJ8A9HbzFi7+MwaNxqc/b9H5umGBYXiy/2MI9wmCvaU1AEDeUI+knGs4nnIROy8c0xih6Wxjj8+nLRS2U/Oy8MG+jRrHtjG3xL9mLRG2l+xcjbyyIo3nzR85BQN7BgMALmanYtXh7cJjH01+GV4OrgCAxJsZ+OTg9+jp4omZQ57AoJ4h8LR3hkQiQVlNFZJyruGr47uRdPNam8ryfsqkmb2lNYYGhGGQXwgCPXxgb2kNOwsrKJuacKuiFLKSAuyKP4pjKRegbNL9XcbmJqaYGhmNmD6RCPL0gYmRMeoaG5BbVoiL11NRVVfboeebRCLBh8/ME/42ALDx1H4c/SNea3m++NiTwva3J/fiWMpFrceN8g/FU2FDEdYjAE7WdgCApqYm5JUX4UT6Zfz7wnGk5WdrDbRRIYPwRN/BCO3eC3aWNlAoFSiqLMPF7FSsj9uDzMJcXigYcGSolEoltp09jPcmzhX2DfIL0XEhtsGnsQswwLeP1otrhE8QInyCMPvRcVi47XMk52TerTVWlsHF1gEedk4AAH+37lhxYDMUSoXoOIP8QtCvey9h+7He/bHj/C8av298/yjhWIeSzooe6+3ujV6uXgAAMxNTfDh5Hp7oO0TjDt3e0hpR/qEY4tcXz379LlLyslpdfm0pk2bDAyPw/lNzNWuaALo5uKCbgwsG+4XgwvUU/GXTCo0yAwA/Vy+snvk6PO1dRPvNjE3g6+wJX2fPDj/XmpqasOdSHNbOfkvY9/a42Th7LQnVKuFrYmSMxWNmoLujGwAgszAXcekJGsdzsrbDisl/Q2TPPlrD1NPeBbGR0ejv7Y+p/1oqetzdzgmfTXsVwd16ikPPyBge9s4Ybx+FmOCBWHV4O7adO4ymFm4sCGyipM4r/nqKaLuXqxeszS3FJ5VUiq+eWyK6kCuUCqQXyJCccx019XJhv6utA9bNeRvONvaiY6gOFbcwNUNwN1+td+Pi7X4az/G0dxHC7fZxr+j8bAHu3hjX79EWm5+kUikWjprW+v9o7VAm2kKgtr5Oa00twjcI84ZP0tjvYGWLb2a/pRFuRVXluFpwo1PN0zpzLQn7Lp8U1eznj5wses60gTFCuAHAh/s2olGhUGt+tcD/Pf+21nCrlNdA3sIcTzsLa2x44R1RuBVVleNcZjLS8mXCDYSZsQneHDsLY/sN4UWCNTgyVDdKClDf2ABTYxPh7tfVxh5VKhfGaZEx6ON5N5B+Tf0d7+xeK1w8LUzNsHjMDEyOGCH0/ywaNQ1L/732bhBdTcQz4cPvXrB9gpB4I0P0Xob0EgdapG8wTIyM0aBoVHldoPDvgooSZBbm6PxsjQoFjqbE41DSOVwtuIGC8mJYm1tidMggvDl2ligIW6s9ygQALmSlYM765bhemIsKeTWUSiUkEgncbR0xY/AYzBryxN3aXlA4Vh/dKXr9wphYUXBeyk7Dsh+/wY2SAmGft5M7Fo2aLpro3VZ2FtaiIFKXU1aodUTuJwe3IMq/v9CUOy0yBj9dOoHUvCzYWljhL0OfEp57IPE04q//oXGM10ZPR887K4kAQGl1BT45uAWnMhJRVlMJAHC0ssXgXn3h79Zd9No3x85CN4e7NwNrj+/GurifhBAN9PDBmpmLhTL967CncfDKGY4uZg2ODJV6/4ythbXwb0crW9FddmZhLhZt+1xUM6itr8PyPRtEzXzj+j0quks+l5ksukhE+ASJfqe/W3e42jqI9lmYmiFcJdAAINw3SGutUGt4lxZgyY7VOPpHPGTF+ahrbEBxVTm2nj2EBNlVUS3IwtRM7/JqrzJpvsG4lJ2GsppKoXxu9yEV49Oft4j6j3ydPYQbkeaQUa1hlFZXYN7mj0XhBgCy4nwcT7nQrudMbGQ09i1cqfPH+U5/GDSmF1RipUofr1QqxbIJz0MqkeC/hj0NWwsrAEB1Xa3oeaq14aceGSoq5+lrl2F/4ikh3ACgpLoC+y+fEvXPetg744m+g4XtE+kJ+Or4blENMTUvC+vifhLdHAwLCONFggFHhkp9AISlqbnw76EBYbAysxC2N58+oHOww4YTe6HaDzIyKELUdHQl5+5gjv7evWEkNYK25knVlVXUmy1Va3AtNU/ey62KEqiPrtRXe5WJPjJu3RS9R0uVIA7rESAKvK3nDqO2vvPPO9uTcALnM+/WzEK8/PBqzDTERkYL+1Yf3YWiqnJoa8Y2NjJSKfuDyCsv1uv3Pt67v2iE5Y+//6b1eaevim+cerp48iLBgCMY8MomUFuz8m4Q+YseS865rvM4l1VqRQBETXjqgWRlZo4gTx9h+9E7/W3yhnp8+csOlf2hosEBzaPwlE1NOHct+b4/s7Lp/puc2rNM7kW9/6mlY6XmZT+0c6a+sQGV8hqdP/cal7F8z3rUNTYI23OixsHE6HYPS1p+NrafP6L1daHdxWV/NjNJ7/cc4uUn2s4qyoO1uaXGT43a5HQPO2deJMA+uD+d2MhojAoeqLHfycZO72Osf36pxj55Yz3++6f1KFCrZTwoqrURAKLFcZ3UmpryW7hbLq4uVxsAYaMx0ER1oESETyCSbl6Dpak5HvEOuNOUmYRjqRfxnkIBYyMj9HTxhIe9M/LKikTNlX/kZKK8tqpD/u7tWSbN3GwdEeEThP7e/vBydIW7nTM87JxabDpVP1aBnjWZ9rDx1P42TfSWlRTg619/xCvRU6E+0OaDvRt19nk5WtlCvYkXrWhaVrV7/gq9XteauaHEgOsydl04jgG+fRATHHnfx4jwFfdF1TU24NUtKx9auNmYW8LKzFx0gSmsLNUZfi3Np2pUKKBUKoVmINWmTgBIyslERW210M8S4ROEjSf3Y2DPYKHZKS4tAVXyGvyenSaMkovyD8XO+KOifru2NE+29w1BW8rE3tIGC6KnYFL48FZPNlZ/H2U1VQb1/+dMxhWNgKuQV4uaZdWpj/CtbsX8PvWy1/91ZrzYMeD+fBRKBd7cuQZGUilGtLJvRVezz8Ktn+PMtaSH9hlUmwkBIKs4T2OwBNTmVtXUK3ReQFT7ONS/JkWpVOJsZpJQ6w3rEQCpVCo0TwK3O/4BIC79kpaAu1uDO9WBK9S3V5kYSY2weuZi9FVpOssszEFavgwF5SW4VVmCEUERGgNyhPNFZXRp8/swFFKJBEvHz4G20ZmvRE/FRzq+CFi97J2s7FBdJ9frd6o2vQO3vxNPrsfXRhWUl/Bix4D784bcGzu+xKexr2B4YHibwm3RtlUP/atFxqiMKgOAC2rz4lRHpgG35y7JivO1HsvdzlG0XVhVBs0O/CtCwFmZWSDIo4cQcGn52ULN9be0S1g8ZgYAILJnH3jauwhrZ1bX1eJKG1cfQZsWGm6fMpkUPkwUbiv2b8I2teXTerl21xlw5Wrvw8XWAbJWNNl1pGkDR4n6xGrq5UINa2pkNPZdPqn1b1xWW6nRfKjvZy6prtBoMk9Q6yMlDjIhaDZDvfHDl4hLu4T7XTbr9R/+FyevXn6o7zvA3RsT+z8u2qf+RZjJueLVNwbouNgC0BgCfyk7HZqTfcVNi5MjRgqTlOPSEkRD27OK8oRa0EtDJ0J1yoG2FT0elvYqE9ULfHWdXCPc7kV9Kanm5cs6O3c7JyyIniJsH0k+j4/2bRLV7pY9+aLWka0puVloaXGAlqgvyRbWI5AXLwYc6RtSr23/Qmhie1jheL8mhQ/Dty8uEw25PpZyEWn5MtHzjqf8jnqV0W4vPD5B9BqoDIF/7tGxwra8oR6H1ZbRAm4PyFC9ME8KHyb8Oy5dXAaqZaL6vI7sf2vPMnGxvjtBu1HZ2Or3oTrUHgBmDBot9G92ZkvHzxFqazX1cnx8cDP2Xj6JBFm66OZr1pAxGq89mX5ZtHRW7MAY0fqWLYlLTxANXpn7+JMaK8DoWrWGGHAMuTshp28zo0KpwJKdq3E89eIDeT99PH0xecAITB4wAlMGjMRfh0/CR5Nfxu75K/DexLmiQQoFFSX4x0/rNI6RW1aITacOCNteDq5YNX0R3GwdRaPTvnh2kbBoM3C7f0PX/CRt5VNWU6lxh/1b+iW9X/8wtVeZqK7CYmdhrTEi19PeBYEePVp8H6o3Adbmllj/wlL0695LGLDiaGWL8aFReFltSaz2PLda+glwF7//USED8XjAI8L2mqO7cKuiVOvoyXnDn9EIoOtFufhN5TObGZtg+7x/YsqAkeju6AapVAprc0v08fTFlAEjsWnuu8Jz88qK8LPKDYaVmQU2zl2GyQNGwN7SRjSFxc/VCzMHj8Hu+SsQ3MqpHQT2wXVVzQNFvpjxOgbrWLhYdYCKttXU20uUf6heTThXC27glS2f6RyFt/7EHowPfVQYLv1Y7/449PoXuFVZCoVSoXERyrh1E9+dPqDz953OSMTMweK78xPplzUmS1/KTkelvAY2KiPnZMX5yCkt7PC/c3uUyamMRNFSXB9PnY/Y7GjcqiiFt6MbAjx6CHPDdFl5aCvCfQKFm5Xebt7Y/NL7qG9sQFVdrcbQ+Id9bn1x5AdhNRZbCyu8NfY54bG0/GxsPXdY2E4vkGHbuSOYMXg0gNsLVi+dMAd/2/yJ6Jj/3PstQrz8hNVSbMwt8c6E5wFANGIVgGiuHQCs2P8dQrv7C8t1udk6YtmEF7Bswguoa6hHvaJRdL4Ra3Ckpq6xAa9u/QznMpN1ruL/911f4Ujy+Q59nyXVFVh1eDtmfvMecssKWxw1+Pz65aIJzRKJBG62jhoX8rPXkvDihg9anKB8IStV48ITp6W2plAqcEqtX7Kjmyfbs0zOZFzBDyrfliCRSBDhE4Sx/YYgxMsPjQqF6HFtsorysGDLSpSqDaAwNTYRwq2+sQG74o91eJm9Nnq6MIdQ2dSE5Xs2aMx3W3NMvIJJlH8oRoWIa7aFlaWYve4fSM3LumdzYrHaQKfy2io8t+59jcFUzd8+oR5umYW5opV1iDU4urP81YItK7Fm5mLRivNKpRJLd6/V+JqX9pBTWthiX15NvRxlNVXILy/GxexUJOdc13uwRl55MWZ88y6GB4YhOjgS/bx63bmASlBcXY4EWToOJJ7GGT0CqK6hHtvOHhYtgaQruPYknBDNXzqcfK7FY1/MSkXunRpeS3MJU/OyRcdVL4eEG1eF6RK1DXUPrEw+3LcRp64mYvqgUfBxcoeDlS1Kayrxe3Yqvj7+I/LLi0XfntCg5cbhYlYqnvpyCWIjY/CId2/4uXrB2MgImYU5yCi4ie/P/IwbJQWwtbASvoxVPRDbem6hhcW8m2tKjla2wjESb2ZoHSVZXVeLD/ZuwNNhw4R9g/364kjyeVHf283SW5i+dhmGBYYjOngA+nr1gqOlDYyNjFFWU4mrBTdwKOksDl45A21f+vvitx9gYM9gjAoeiP49esPZ2g4WpuaoktegsLIUSTczcSz1As5kXNFoWdDn3KAHQ9Jv2Qx+eVEnYm5iijWz3kCETxCUTU14Z/da7L98igVDRAQ2URo0eUM95n//KS5kpeD9/1/HcCMiYg2ui915SCQ6V5wnIiLW4AwWw42IiAFHRETEgCMiIgYcERERA46IiIgBR0RExIAjIiJiwBERETHgiIiIAUdERGRYASeTyVgKRETUpchkMtbgiIiITZRERESGFXBspiQiInSh5knW4IiIqOvW4Mo2nZCwFkdERF2p9la26YREqu0BIiIiQw03nYNMGHJERGTo4SYEXHMzJUOOiIgMPdyaM03amjQkIiLq7DU3jSZK9VocQ46IiAwt3FSzTKrrAYYcEREZargBgETbC+1nP9akbb+3tzdLlYiIOl2TpLYKmkTXQXSFHMOOiIg6Sz+brnBrMeD0CTkiIqKOpCvcgHss1dXSC4mIiDpruOm1FiVDjoiIDC3cgHs0UYJNlkREZGDBdl8Bx7AjIqLOHGqq/gNMiI4mJ74/gQAAAABJRU5ErkJggg==',
  permit: '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',
  boatpermit: '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',
  addm: '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',
  imgfun: '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',
  imgfam: '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',
  schedule: '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',
  wechat: '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',
  add: 'iVBORw0KGgoAAAANSUhEUgAAAbgAAABQCAYAAABrqmDoAAANiElEQVR42u3deVRTVwIG8O8lhICsShRBRBA3FNTihsVWbd3R1qVq3R211naoTm1dW9uZ43I6LtXWtc6MW0FxodVOGRW3uu9SFRXcEJAd2XdImD/UyAMSEggK8fud4zm+9/LykstLvtz77r1PQBW1XzSuBERERDXsxuIAoSr7CQw1IiIyxrATGGxERGSMQSdhuBERUV2jSzZJGG5ERGSMISdhuBERkTGGnIThRkRExhhyEoYbEREZY8hJGG5ERGSMISdhuBERkTGGnITFQURExkjC2hsRERljLY41OCIiMt4aHBERkbER2DxJRESswRERETHgiIiIGHBEREQMOCIiIgYcEREx4IiIiBhwREREtZgJi4CoPHcHF2z/6Fv18vazwVh/bJ/WfZrZNYaF3Fzj9tScTCRkPDHY8fQ1u/8Y2Fs30PqY4BvncCoi9KWW9ZS3hmBG7+EvlrcsQdjjBzwJiQFHVBlrcwt0d/NULydnpeFaVITWfQRBgNxE9uKDIpFWepyFgyfD281D43b/84ew4qC/wY6nL5+WHdCikZPWx9yKi3zpASeVSETvXeApSww4It041W+E5aP81MunIkIrDTjSjVxmCplUv68RpUqJvMICFh4x4IjqivD4KK3bo54kvNLXt/Kgv9YmVAC4lxij13N+3m8MxnTrq9c+x+9cxee7VvOEIQYcUXVJJJIyTWLSGjnO6pBdteL9mslMYSYzLbf+Tvwjnfa3rWdZbl1Wfh6UKqVBXl9qTgZPSmLAERmCo62izBe4lUGe17aeJTZMmFflL3k//5U18n4/fWcEJvn4GvQ5x2/+FjcN1PEjLSeLJyUx4IgMoXnDJqJlF4UDTKRSFCuV1ewcIUW7Jq5V2jcxM9UoynbVoQD8cCRQ62NGdOqNOQPHq5cfpyXxpCQGHBmPzZMXwO1ZD761R3Zjf+ipl3Zst0bigLOQm6GLizvOPwgzyrLOzs/TGqDmMjmszS1E61KyM7Q2QRZp+DFQpCxGkbJY6+txamAvWr4dG8kPBDHgyHjY1rOEwtIGAGBmKn9px21kXR+9WnuVW//Xd0fiwsNbKCmp+u0Q03Kz8P6Pc8qtXzp8Bjyc3NTLIbculhvTJhEkMC9VDhVdM6vyj4mT+7H55H6N21eOnom+7bqK1h24dhI/Ht1TI3+DDk1bqP9fUFSIB8mx/EAQA46ouqb3HArTUmOsnvN0csMAD28cvHm+ys+tUqnwKCUeZcfctXFwEa3r4uKOmNQkUQ1pzsDxGN99wEsvj8k9fMuFGwD85a0huPIoHOfu34Bhr382RFvHF824V6PCDdZZhQicqoteV20cXDDMq5d6+XZcpKg57cuB4+GicDDoMX3bvwkTqbiXZn0Lawzp2OOVlkVjGzusnzAHn/cbIyqPzLycZzVKAesnzMEX/cdCbsDa5OAOPqLlQzcvVLqPqYlM9E8icOg3sQZHpNbK3hk/TZovCpvlB/3R3c0DH/caBgBQWNpg69RF+Hjbd7ibGF3tY7oqHDGr74cVbvtq8GREJsfhesw9AE+vXeUW5qu3SwWJQYPleWh5ubSBb3sfDPD0Rj1TM/W2uPRkfPrzCjg3sMdPk+bD3FQOiSBgos8g9PPoht/+PI3/XT+HyJS4Kh/f3FSOcd37o/T1uuN3rlS635YpX4uW5+5Zh8NhF3hSEwOOXv2Ys4oG/tavZ63+fxfXtpCWGZsWlZKAM/euG+Q1dHRuiR/GzhaN5zp3/wZCoyJwK/Yhurt5ov2z60INLKzxnylfYcOJIARdOYHC4qIqHdPBVoHvx8xSX1crUhZj/t71+OdIP5hIpTA1kWHjxLlYdWgngq6ewJqQQKwJedH7sK2jK3bNWFzt997Z1R1dXNzRqnEztHdyg8LKttxjIlPiMHvXGqTlZCItJxN+/iuxdMQMNLaxU9f2pvcciuk9hyIyJQ53E6JxP/Exgm+cRWxass6vZZx3f9GQjAOhp5CVn8sPCTHgqI6eUBIp5g6coPUxfdp2QZ+2XSBuujpf7YBzUTjA792R5a4xxaUnY8G+jQCAwuIi+PmvxLZp36B5Q0cAT6+bzR80EZN8fDFm0yKk5WTqddxebbyweNjHop6JP587iKO3L2PNkUB8OWAcAMBCbo5v3p+K9954G7svHcGx25dRUMVA1aRpfXvRxMUoM0XW1jPB+OmPX0VBfuXRHQxbOw9+747EGO9+oiZBV4UjXBWO6NY8Gzsvhuj8OprZNcb0ZzXl54H/75MH+AEhBhyRvgRBwJLhM+BZqvci8HQG/1kBq5Ge+2JwcUZeNqZtXYpVo2fijWatUXqOSl3DTRAE9GjZAZN9fNHZ1V207cy961h/fJ866JQqFeYOHA/hWXB0dG6Jjs4ta6Tp7cCfpzC5h6/o2mJ8xhMcuHYS+0NPIT49pcL9cgvzsfzgzwi4cAjDO/XGUK+e6l6vALD55K/I1rH2ZSYzxdIRn4gmUN53+TjiNdxJoaxPdizH7biH6uWcgnye4MSAo1dPqVJh18Uj5dYP9PRWN1ddfRSOu2XmPAyPq97YqJKSEszbuw67P1kKK7N6AICIhGjMClhV4Rfrk+wMTNu2DDP7jMJY7/6ISU3CqsM7dT6ejbkF/v7+tHJNgOcfhOGLwB9Eg8h3XjiM+0kxWPTeVDg/GxN2+u6fNXJdSaVSYcVBf7zTtjPC46NwJy4St2IfQqXjcIjYtGSsPboHG44HoV0TV7R1dIWLnQP2XDqm0/6mJjKsGTtb9EMjJjVRryEIWfk5SM/N5oeJGHBU2wJOie+Ct5db79WslTrgQm5dRGAFIVhdsWnJ+PqXTfjH0I+w7Uwwdl4MQUFRocbHFyuV+P7wLgRePAq5iUzrY8tKz83G179swsaJ8yAIApQqJTYcD8KW0/+tMEwuPbyND9bNx7BOvTCkQw8s/m1Ljf0Nzty7Xu3mXqVKiRsx93Ej5j70mdll+Sg/dC91yyCVSoWFQRtFHWqIGHBEVfBH+DX0WfFZpbNroMw1uqo4/yAM/zp5AJZm5vA/f6jCDhgSQUBjGwWcGjSEpbwesvJzsePcQbR2aAaFlS2inyQgKz8Xj9OSMHfPOvV+kclxevdYPLtwc42X7+m71zFr5/cVdi5aNmIGerfpJFq/NHibXiFJxIAj0uJ5uDW0qg8LuVmpprIkgw8yfn6trTSZ1AQDPL3Rr103dHZ1F3XPr0hMaiLO3b+JoCsnEJEQherMjVnTKhqT5mBjh2UffAqvUtczAWBNSCD2XT7OE5IYcESGNm/QBFGPyr4rP0NSZlqNHrOzqzuWDJ8Bh2dd7nXRtIE9Rne1x+iufXA47AIW/7alTnSnl0qkGN6pF2b2GSXqQVpSUoIfj+7B1jO/8yQkBhwRat2Exbk4FREKfZoMO7u6Y9PEeeXucJ2Wk4mw2IdIy81CRm425CYy2Nazgr1NA3g0aS6qefX38IajbUNM3bJEryEEeYUF6PDNeOg6P+eRL9eql4Ovn8XCoI3Qb25RK+z46Fs0s2ssWp9TkI+FQRvwR/g1nkTEgKPXw4ebFol+4dd20amJ+CxglV77LPCdJAq323GR+C54B248vq/xPVvIzTHU623M6jNaPZOJp5Mbhnr1xO5LR2tt+aTnZuFk+DVM9BmEF3c0f4QF+zbgYXIcT3hiwNHrQ6VSGfX7s7O0QYtntwN6WpPJw5QtS5BXWKB1v5yCPAScPwyVSoX5vpPU673dPGp1wAHA6iOBaNXYGe2btsCG40EIuHDY6P/OxIAjei1ncCmtsLhIr56cZQczm7yEDiOG+NEyd886mMlMjeYGrsSAI6qTXBWOsDKzqPL+0U8SNIZWUlYa4tNT4GCrAPD0DgIrR8/Est+3ae3YIggCerX2wt/6iSdpDo2+WyfKNCMvGxl5PLeIAUeEV31X8eoYvOYLxKQmQtNMKqtDArF8lJ96Xe82ndCrtRciEqIQFvsQGbnZyMzPgUxqAhtzS9jbNEAXF3fUt7AWPdfjtCTsvXyMfzAiBhxR7XA47ALMZaaY5ztRPfZNEAS0cXApdxNUTcIeP8Dcves46z4RA45Is8iUOIRGRRjs+QqKK5/Ka3/oKZy5dx2ju/ZFX4+ucFU46vC8Rbj2KBxBV0/g2J0r7KhBZCBC+0XjSlgMRDVDYWmD5o2awKl+I1jIzWEuk6NYpUR+USGeZGcgJjURD5IeG/y2OdpYyM0w4c0X3fvvJkTrdCPSmtLFtS3ebOGpXt596SgSdLzzABEDjoiIXjsSFgERETHgiIiIGHBEREQMOCIiIgYcERERA46IiBhwREREDDgiIiIGHBER0UsOuOjoaJYCEREZlejoaNbgiIiITZRERER1K+DYTElERDCi5knW4IiIyHhrcOnbTwusxRERkTHV3tK3nxYkFW0gIiKqq+GmsZMJQ46IiOp6uKkD7nkzJUOOiIjqerg9zzSJPmlIRERU22tu5Zooy9biGHJERFTXwq10lkk0bWDIERFRXQ03ABAq2tF20lslFa13dnZmqRIRUa1rkqyogiZoehJNIcewIyKi2nKdTVO4aQ04XUKOiIjoVdIUbkAlU3Vp25GIiKi2hptOc1Ey5IiIqK6FG1BJEyXYZElERHUs2KoUcAw7IiKqzaFW2v8B+a3GlalwyUcAAAAASUVORK5CYII=',
  restore: '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',
  calendar: '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'
};
