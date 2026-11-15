/**
 * 스쿠버존 다합 · 서류 (서류.gs)
 *
 *   스케줄 만들기 → 펀다 손님 중 Registration form 이 필요한 사람 이름 칸에 색을 칠해요
 *     분홍 = 🆕 첫 방문 · 노랑 = 🎓 교육 끝나고 첫 펀다 · 보라 = 🔁 비활성 → 다시 활성화 후 첫 펀다
 *     (교육으로 처음 온 손님도 분홍 · 교육 손님은 Registration form 대신 교육 서류)
 *   홈 [서류 인쇄 (PDF)] → 홈 날짜 기준으로
 *     ① Registration Form: 필요한 사람만, 회원 정보로 이름 · 국적 · 주소 · 여권 · 생년월일 · E-mail · 연락처 · 숙소 · 방 · 단체 · 레벨 · 다이빙 기록 … 채워서
 *     ② Dive Planner: 빈 양식 그대로, 그날 펀다 인원만큼 장 수만 맞춰서 (전부 현장에서 손으로)
 *     → PDF 하나로 컴퓨터에 다운로드 → 열어서 인쇄 · 사인만
 *   양식 모양은 "양식 Registration" · "양식 Dive Planner" 탭에서 직접 고쳐도 돼요 ({{Name}} 같은 칸만 남겨 두면 채워져요)
 *
 * 처음 한 번: 이 파일을 "서류.gs"로 붙여 넣고 setupForms 실행
 */
var FM = { REG: '양식 Registration', PLAN: '양식 Dive Planner', PER_PAGE: 5 };
var FM_FUN = ['Fun', 'Night', 'Boat'];
var FM_WHY = {
  new: { mark: '🆕 첫 방문', color: '#F4CCCC' },
  course: { mark: '🎓 교육 후 첫 펀다', color: '#FFE599' },
  back: { mark: '🔁 다시 활성화', color: '#D9D2E9' }
};
var FM_RULES = [
  ['1.', 'All dives are to be no-decompression dives to maximum depth of 30m.', true],
  ['2.', 'The dive master/instructor is the only one in charge.', false],
  ['3.', 'A reactivate dive is required for any diver who hasn\'t dove for more than 6 months.', true],
  ['4.', 'All equipment damaged or lost has to be paid for or replaced.', false],
  ['5.', 'Equipment received from the shop is to be used by the diver only.', true],
  ['6.', 'There are no refunds for unused equipment or service.', false],
  ['7.', 'Equipment must stay in the lockers provided and not to be left by the rinsing pool after 5 pm.', true],
  ['8.', 'A charge of 10 Euros will be applied for regulators washed with the dust cap off.', false],
  ['9.', 'A charge of 10 Euros will be applied if tanks are returned with less than 30 bars.', true]
];

/* ================= 처음 한 번 ================= */
function setupForms() {
  const ss = SpreadsheetApp.getActive();
  if (typeof scReadSettings_ !== 'function' || typeof memberRows_ !== 'function') throw new Error('회원 코드(Code.gs)와 스케줄 코드(스케줄.gs)가 같이 있어야 해요.');
  if (!ss.getSheetByName(FM.REG)) fmRegTemplate_(ss.insertSheet(FM.REG));
  if (!ss.getSheetByName(FM.PLAN)) fmPlanTemplate_(ss.insertSheet(FM.PLAN));
  const home = ss.getSheetByName(SC.HOME);
  if (home) fmButton_(home, 'printForms', 4, 7);
  ss.toast('양식 탭 2개를 만들고 홈에 [서류 인쇄 (PDF)] 버튼을 붙였어요. 스케줄 만들기를 다시 누르면 색이 칠해져요.', '서류', 10);
}

function fmButton_(sh, fn, row, col) {
  sh.getImages().forEach(im => { try { if (im.getScript() === fn) im.remove(); } catch (e) {} });
  for (let k = 0; k < 3; k++) {
    try {
      const img = sh.insertImage(Utilities.newBlob(Utilities.base64Decode(FM_BUTTON), 'image/png', 'forms.png'), col, row, 4, 2);
      img.setWidth(220); img.setHeight(40); img.assignScript(fn);
      return;
    } catch (e) { Logger.log('버튼 실패: ' + e.message); Utilities.sleep(800); }
  }
}

/* ================= 누가 Registration form 이 필요한지 ================= */
// date 날 일정에 있는 회원번호 → { new | course | back | '' , first: 첫 방문인지 }
function fmNeeds_(ss, date, people) {
  const S = scReadSettings_(ss);
  people = people || fmMembers_(ss);
  const all = scReadEntries_(ss);
  const day = scFmt_(date);
  const isFun = e => { const i = S.labels[scNorm_(e.label)]; return i && FM_FUN.indexOf(i.kind) >= 0; };
  const past = {};   // 회원번호 → 그 전 일정들
  Object.keys(all).forEach(k => { if (k < day) all[k].forEach(e => (past[e.code] = past[e.code] || []).push({ day: k, fun: isFun(e) })); });
  const out = {};
  (all[day] || []).forEach(e => {
    if (out[e.code]) { if (isFun(e)) out[e.code].fun = true; return; }
    const p = past[e.code] || [];
    const lastFun = p.filter(x => x.fun).map(x => x.day).sort().pop();
    const react = (people[e.code] || {}).react;   // 비활성 → 활성으로 다시 켠 날 (메모의 "재방문 YYYY-MM-DD")
    const why = !p.length ? 'new' : !lastFun ? 'course' : react && react <= day && lastFun < react ? 'back' : '';
    out[e.code] = { why, first: !p.length, fun: isFun(e) };
  });
  // Registration form 은 펀다 손님만 (교육 손님은 교육 서류)
  Object.keys(out).forEach(c => { out[c].reg = out[c].fun && !!out[c].why; });
  return out;
}

// 스케줄 만들기(buildSchedule)가 표를 그린 뒤 불러요: 이름 칸 색 · Remark 에 "📄 Reg form"
function formMarkHome_(ss, sh, date, marks, teams, titleRow) {
  const need = fmNeeds_(ss, date);
  let any = false;
  marks.forEach(m => {
    const n = need[m.code];
    if (!n) return;
    const why = n.reg ? n.why : n.first ? 'new' : '';
    if (!why) return;
    any = true;
    sh.getRange(m.row, 3).setBackground(FM_WHY[why].color).setNote(FM_WHY[why].mark + (n.reg ? ' · Registration form 써야 해요' : ' · 교육 서류'));
  });
  teams.forEach(t => {
    const names = t.members.filter(m => need[m.code] && need[m.code].reg).map(m => m.name);
    if (!names.length) return;
    const cell = sh.getRange(t.row, 7);
    const old = String(cell.getValue() || '');
    cell.setValue((old ? old + '\n' : '') + '📄 Reg form: ' + names.join(', ')).setFontColor('#9C2A1E').setFontWeight('bold');
  });
  if (any) sh.getRange(titleRow, 6, 1, 2).merge().setValue('분홍 🆕 첫 방문 · 노랑 🎓 교육 후 첫 펀다 · 보라 🔁 다시 활성화').setFontSize(9).setFontColor('#587078').setWrap(true);
}

/* ================= 서류 인쇄 ================= */
function printForms() {
  const ss = SpreadsheetApp.getActive();
  const date = scHomeDate_(ss);
  const S = scReadSettings_(ss);
  const reg = ss.getSheetByName(FM.REG) || fmRegTemplate_(ss.insertSheet(FM.REG));
  const plan = ss.getSheetByName(FM.PLAN) || fmPlanTemplate_(ss.insertSheet(FM.PLAN));
  const people = fmMembers_(ss);
  const need = fmNeeds_(ss, date, people);
  const { groups } = scGroup_(scReadEntries_(ss, date, date)[scFmt_(date)], S);
  const fun = groups.filter(g => FM_FUN.indexOf(g.kind) >= 0);
  const seen = {}, regList = [], planList = [];
  fun.forEach(g => g.members.forEach(m => {
    const p = people[m.code] || { name: m.name };
    planList.push(p);
    if (need[m.code] && need[m.code].reg && !seen[m.code]) { seen[m.code] = true; regList.push({ p, why: FM_WHY[need[m.code].why].mark }); }
  }));
  if (!regList.length && !planList.length) { ss.toast(scFmt_(date, 'M/d') + ' 펀다 일정이 없어요.', '서류', 8); return; }

  const d = scFmt_(date, 'dd/MM/yyyy');
  const tmp = SpreadsheetApp.create('서류 만드는 중 ' + scFmt_(date));
  let base64, filename;
  try {
    regList.forEach((x, i) => fmFill_(reg.copyTo(tmp).setName('Reg ' + (i + 1)), fmRegValues_(x.p, d)));
    // Dive Planner는 아무것도 안 채워요. 빈 양식 그대로, 그날 펀다 인원만큼 장 수를 맞춰서 현장에서 다 손으로 적어요
    const planPages = Math.max(1, Math.ceil(planList.length / FM.PER_PAGE));
    for (let i = 0; i < planPages; i++) plan.copyTo(tmp).setName('Planner ' + (i + 1));
    tmp.deleteSheet(tmp.getSheets()[0]);
    SpreadsheetApp.flush();
    const url = 'https://docs.google.com/spreadsheets/d/' + tmp.getId() + '/export?format=pdf&size=A4&portrait=true&fitw=true&gridlines=false'
      + '&printtitle=false&sheetnames=false&pagenum=UNDEFINED&fzr=false&horizontal_alignment=CENTER&top_margin=0.4&bottom_margin=0.4&left_margin=0.4&right_margin=0.4';
    const blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
    filename = '서류 ' + scFmt_(date, 'yyyy-MM-dd') + ' (Reg ' + regList.length + ' · Planner ' + planList.length + ').pdf';
    base64 = Utilities.base64Encode(blob.getBytes());
  } finally {
    DriveApp.getFileById(tmp.getId()).setTrashed(true);
  }
  fmDoneDialog_(base64, filename, date, regList, planList.length);
}

function fmMembers_(ss) {
  const tz = ss.getSpreadsheetTimeZone(), out = {};
  const f = v => v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : String(v || '');
  [ACTIVE, INACTIVE].forEach(t => {
    const sh = ss.getSheetByName(t);
    if (!sh) return;
    memberRows_(sh).forEach(r => {
      const code = String(r[0]).trim();
      if (!code || out[code]) return;
      const g = h => r[H(h) - 1];
      out[code] = { name: (String(g('FirstName') || '') + ' ' + String(g('LastName') || '')).trim() || String(g('한글 이름') || code),
        nation: g('Nationality'), birth: f(g('Birthdate')), passport: g('PassportNumber'), email: g('E-mail'), tel: g('연락처'),
        hotel: [g('숙소 · 위치'), g('Accomodation')].map(x => String(x || '').trim()).filter(x => x && x !== 'House')[0] || '',   // 퍼밋용 기본값(House · 0)은 빈칸으로
        room: Number(g('RoomNumber')) === 0 ? '' : g('RoomNumber'), address: g('영문 주소') || g('주소'),
        agency: g('발급 단체'), level: g('레벨'), lastDive: f(g('마지막 다이빙')), dives: g('총 다이빙'),
        react: (String(g('메모') || '').match(/재방문 \d{4}-\d{2}-\d{2}/g) || []).map(x => x.slice(4)).sort().pop() || '' };
    });
  });
  return out;
}

function fmRegValues_(p, d) {
  return { Name: p.name, Nationality: p.nation, Address: p.address, Passport: p.passport, Birth: p.birth, Email: p.email, Tel: p.tel,
    Hotel: p.hotel, Room: p.room, CertNo: '', Agency: p.agency, Level: p.level, LastDive: p.lastDive, Dives: p.dives, CheckIn: d, Date: d };
}

// {{이름}} 칸을 값으로 바꿔요
function fmFill_(sh, vals) {
  const rg = sh.getDataRange(), v = rg.getValues();
  let hit = false;
  const out = v.map(r => r.map(c => {
    if (typeof c !== 'string' || c.indexOf('{{') < 0) return c;
    hit = true;
    return c.replace(/\{\{(\w+)\}\}/g, (_, k) => vals[k] === undefined || vals[k] === null ? '' : String(vals[k]));
  }));
  if (hit) rg.setValues(out);
}

function fmDoneDialog_(base64, filename, date, regList, planN) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const html = '<!doctype html><html><head><base target="_top"><style>'
    + 'body{font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;font-size:14px;line-height:1.6;color:#1F2A30;margin:12px}'
    + 'a.dl{display:inline-block;background:#3D6B8C;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:700}'
    + '</style></head><body>'
    + '<p><b>' + esc(scFmt_(date, 'M/d (EEE)')) + '</b> 서류 PDF를 만들었어요. 아래 버튼을 누르면 컴퓨터에 파일로 저장돼요.</p>'
    + '<p><a class="dl" id="dl" href="data:application/pdf;base64,' + base64 + '" download="' + esc(filename) + '">⬇ PDF 다운로드</a></p>'
    + '<p><b>Registration Form ' + regList.length + '장</b>' + (regList.length ? '<br>' + regList.map(x => esc(x.p.name) + ' · ' + esc(x.why)).join('<br>') : '') + '</p>'
    + '<p><b>Dive Planner</b> ' + planN + '명 (' + Math.ceil(planN / FM.PER_PAGE) + '장) · 빈 양식이에요, 현장에서 적어 주세요</p>'
    + '<p style="color:#587078;font-size:12px">Registration 받는 분은 메디컬 · PADI 서류(원본 PDF 2~4쪽)도 같이 인쇄해 주세요.</p>'
    + '<script>document.getElementById("dl").click();</script></body></html>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(420).setHeight(380), '서류 인쇄');
}

/* ================= 양식 탭 만들기 (모양은 탭에서 바로 고쳐도 돼요) ================= */
function fmRegTemplate_(sh) {
  sh.clear();
  const widths = [150, 120, 120, 70, 150, 80, 70, 80];
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
  if (sh.getMaxColumns() > 8) sh.deleteColumns(9, sh.getMaxColumns() - 8);
  sh.setHiddenGridlines(true);
  const dot = SpreadsheetApp.BorderStyle.DOTTED;
  const seg = (r, list) => list.forEach(([c, span, text, kind]) => {
    const rg = sh.getRange(r, c, 1, span);
    if (span > 1) rg.merge();
    rg.setValue(text).setVerticalAlignment('bottom');
    if (kind === 'L') rg.setFontWeight('bold');
    if (kind === 'V') rg.setBorder(null, null, true, null, null, null, '#777777', dot).setFontColor('#1F3A93');
  });
  sh.getRange('A1:H1').merge().setValue('Diver Registration Form').setFontSize(22).setFontWeight('bold').setHorizontalAlignment('center');
  sh.setRowHeight(1, 46);
  const rows = [
    [3, [[1, 1, 'Name:', 'L'], [2, 3, '{{Name}}', 'V'], [5, 1, 'Nationality:', 'L'], [6, 3, '{{Nationality}}', 'V']]],
    [4, [[1, 1, 'Home Address:', 'L'], [2, 7, '{{Address}}', 'V']]],
    [5, [[1, 1, 'Passport No.:', 'L'], [2, 3, '{{Passport}}', 'V'], [5, 1, 'Birth date:', 'L'], [6, 3, '{{Birth}}', 'V']]],
    [6, [[1, 1, 'E-mail:', 'L'], [2, 3, '{{Email}}', 'V'], [5, 1, 'Tel.:', 'L'], [6, 3, '{{Tel}}', 'V']]],
    [7, [[1, 1, 'Hotel in DAHAB:', 'L'], [2, 3, '{{Hotel}}', 'V'], [5, 1, 'Room no.:', 'L'], [6, 3, '{{Room}}', 'V']]],
    [8, [[1, 2, 'Emergency contact name:', 'L'], [3, 2, '', 'V'], [5, 2, 'Emergency contact no.:', 'L'], [7, 2, '', 'V']]],
    [9, [[1, 2, 'Diving certification no.:', 'L'], [3, 2, '{{CertNo}}', 'V'], [5, 1, 'Agency:', 'L'], [6, 1, '{{Agency}}', 'V'], [7, 1, 'Level:', 'L'], [8, 1, '{{Level}}', 'V']]],
    [10, [[1, 1, 'Date of last dive:', 'L'], [2, 1, '{{LastDive}}', 'V'], [3, 1, 'No. of dives:', 'L'], [4, 1, '{{Dives}}', 'V'], [5, 4, 'Diving insurance      (yes)      (no)', 'L']]]
  ];
  rows.forEach(([r, list]) => { seg(r, list); sh.setRowHeight(r, 30); });
  sh.getRange('A11:H11').setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange('A12').setValue('Club Regulations:').setFontWeight('bold').setFontLine('underline');
  sh.setRowHeight(12, 30);
  FM_RULES.forEach(([n, t, bold], i) => {
    const r = 13 + i;
    sh.getRange(r, 1).setValue(n).setHorizontalAlignment('right');
    sh.getRange(r, 2, 1, 7).merge().setValue(t).setWrap(true).setFontWeight(bold ? 'bold' : 'normal');
    sh.setRowHeight(r, 24);
  });
  sh.getRange('A22:H22').setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  const gear = [
    [23, [[1, 1, 'Box no.:', 'L'], [2, 1, '', 'V'], [3, 1, 'BCD:', 'L'], [4, 1, '', 'V'], [5, 1, 'Mask:', 'L'], [6, 1, '', 'V'], [7, 1, 'Snorkel:', 'L'], [8, 1, '', 'V']]],
    [24, [[1, 1, 'Reg.:', 'L'], [2, 1, '', 'V'], [3, 1, 'Fins:', 'L'], [4, 1, '', 'V'], [5, 1, 'Boot:', 'L'], [6, 1, '', 'V'], [7, 1, 'Wet suit:', 'L'], [8, 1, '', 'V']]],
    [25, [[1, 1, 'Weights:', 'L'], [2, 3, '', 'V'], [5, 1, 'Belt:', 'L'], [6, 1, '', 'V']]],
    [26, [[1, 1, 'Check in date:', 'L'], [2, 2, '{{CheckIn}}', 'V'], [5, 2, 'Check out date:', 'L'], [7, 2, '', 'V']]]
  ];
  gear.forEach(([r, list]) => { seg(r, list); sh.setRowHeight(r, 30); });
  sh.getRange('A28:H28').merge().setValue('The signature of the diver on this form is her/his agreement to the above.').setFontWeight('bold').setFontSize(9);
  seg(30, [[1, 1, 'Signature:', 'L'], [2, 4, '', 'V'], [6, 1, 'Date:', 'L'], [7, 2, '{{Date}}', 'V']]);
  sh.getRange('A30').setFontSize(14);
  sh.setRowHeight(30, 40);
  sh.getRange('A32:H35').merge().setBorder(true, true, true, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeights(32, 4, 22);
  sh.getRange('A1:H35').setFontFamily('Arial');
  sh.getRange('A1').setNote('파란 글씨 {{ }} 칸이 회원 정보로 채워져요. 모양은 자유롭게 고쳐도 돼요 (A~H 열 안에서). 이 탭 밖으로 글씨를 쓰면 인쇄에도 같이 나와요.');
  return sh;
}

function fmPlanTemplate_(sh) {
  sh.clear();
  const widths = [170, 60, 85, 75, 60, 75, 60, 75, 60, 95];
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
  if (sh.getMaxColumns() > 10) sh.deleteColumns(11, sh.getMaxColumns() - 10);
  if (sh.getMaxRows() < 45) sh.insertRowsAfter(sh.getMaxRows(), 45 - sh.getMaxRows());
  sh.setHiddenGridlines(true);
  sh.getRange('A1:J1').merge().setValue('DIVE PLANNER').setFontSize(16).setFontWeight('bold').setFontLine('underline').setHorizontalAlignment('center');
  sh.setRowHeight(1, 34);
  const solid = SpreadsheetApp.BorderStyle.SOLID;
  for (let k = 1; k <= FM.PER_PAGE; k++) {
    const r = 2 + (k - 1) * 8;
    sh.getRange(r, 1, 1, 4).merge().setValue('DM/INST name: {{DM' + k + '}}').setFontWeight('bold');
    sh.getRange(r, 8, 1, 3).merge().setValue('Date: {{Date' + k + '}}').setFontWeight('bold').setHorizontalAlignment('right');
    const head = sh.getRange(r + 1, 1, 4, 10);
    head.setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setFontSize(9);
    [[1, 'Diver name'], [2, 'Cert.'], [3, 'Activity'], [10, 'Diver Signature']].forEach(([c, t]) => sh.getRange(r + 1, c, 4, 1).merge().setValue(t).setWrap(true));
    [[4, 'Dive 1'], [6, 'Dive 2'], [8, 'Dive 3']].forEach(([c, t]) => {
      sh.getRange(r + 1, c, 1, 2).merge().setValue(t);
      sh.getRange(r + 2, c, 1, 2).setValues([['Location', 'Time in']]);
      sh.getRange(r + 3, c, 1, 2).setValues([['', ':']]).setFontWeight('normal');
      sh.getRange(r + 4, c, 1, 2).setValues([['Depth', 'Time']]);
    });
    sh.getRange(r + 3, 4).setValue('{{Site' + k + '}}').setFontColor('#1F3A93');
    sh.getRange(r + 5, 1, 1, 3).setValues([['{{Diver' + k + '}}', '{{Cert' + k + '}}', '{{Act' + k + '}}']]).setFontColor('#1F3A93').setHorizontalAlignment('center').setFontSize(9).setWrap(true);
    sh.getRange(r + 1, 1, 5, 10).setBorder(true, true, true, true, true, true, '#000000', solid);
    sh.getRange(r + 6, 2, 1, 5).merge().setValue('DM/INST Signature: ……………………………………').setFontWeight('bold').setFontSize(9);
    sh.getRange(r + 6, 2, 1, 9).setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sh.setRowHeights(r, 1, 26); sh.setRowHeights(r + 1, 4, 18); sh.setRowHeight(r + 5, 30); sh.setRowHeight(r + 6, 22); sh.setRowHeight(r + 7, 10);
  }
  sh.getRange(1, 1, 42, 10).setFontFamily('Arial');
  sh.getRange('A1').setNote('한 장에 5명. {{ }} 칸이 그날 펀다 손님으로 채워져요. A~J 열 안에서 모양을 고쳐도 돼요.');
  return sh;
}

var FM_BUTTON = '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';
