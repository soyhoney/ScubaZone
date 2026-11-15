/**
 * 스쿠버존 다합 · 기사 일정표 (기사.gs)
 *
 *   홈 탭 [기사 일정표] → 홈 B2 날짜의 일정을 읽어서 "기사 일정" 탭에 운행 목록과 기사별 일정을 만들어요
 *   기사 일정 탭에서 사이트 · 시간 · 인원을 고치거나 피쉬앤프랜즈 팀을 빈 줄에 넣고 [기사 일정 다시 짜기]
 *   [기사님께 보낼 글] → 기사님별 영어 일정 (복사해서 왓츠앱 · 위챗에 붙여넣기)
 *
 *   "차량 설정" 탭: 장소 · 일정 약어 → 가는 곳 · 이동 시간(분)을 사람이 직접 고쳐요
 *   장소를 새로 넣었으면 [이동 시간표 정리] → 시간표에 줄 · 칸이 생겨요 (근처 장소 시간으로 먼저 채워 둬요)
 *
 * 처음 한 번: 이 파일을 "기사.gs"로 붙여 넣고 setupDrivers 실행
 * 처음 이동 시간: OpenStreetMap 도로 데이터 (OSRM) 계산값 × 1.5. 실제와 다르면 차량 설정 탭에서 고쳐 주세요
 */
var DRV = { TAB: '기사 일정', SET: '차량 설정', HEAD: 8, FIRST: 9, BLANK: 6 };
var DRV_TRIP_HEAD = ['샵', '사이트', '종류', '출발 (픽업 시작)', '손님', '가이드', '숙소 픽업', '깡', '복귀 (비우면 자동)', '팀'];
var DRV_COLS = DRV_TRIP_HEAD.length;
var DRV_ZONES = ['샵', '남쪽', '시내', '북쪽', '픽업'];
var DRV_SITE_ZONES = ['남쪽', '시내', '북쪽'];
var DRV_PLACE_HEAD = ['장소 (영어 이름)', '구역', '같은 곳으로 볼 이름 (쉼표로)', '근처 장소', '메모'];
var DRV_NOCAR = '차 안 씀', DRV_BOAT = '보트';
var DRV_SEC = { place: '■ 장소', label: '■ 일정 약어 → 가는 곳', time: '■ 이동 시간' };
var DRV_DEFAULT = {"places":[["ScubaZone","샵","스쿠버존, SZ","",""],["Fish & Friends","샵","피쉬앤프랜즈, F&F, FF","",""],["Caves","남쪽","Cave, The Caves","",""],["Um Sid","남쪽","Umsid, Umm Sid","",""],["Three Pools","남쪽","South, 3P, 3 Pools","","South = Three Pools 로 계산"],["Moray Garden","남쪽","Moray","",""],["Golden Blocks","남쪽","GB","",""],["Islands","시내","Island","",""],["Mashraba","시내","Mash","",""],["Lighthouse","시내","L.H, LH","",""],["Eel Garden","시내","E.G, EG","",""],["Abu Helal","북쪽","","",""],["Canyon","북쪽","","",""],["Rick's Reef","북쪽","Ricks","",""],["Blue Hole","북쪽","B.H, BH","",""],["Coffee Corner","픽업","C.C, CC","",""],["Coral Coast","픽업","Coral","",""],["Darwish","픽업","","",""],["1000 mart","픽업","1000mart, 1000","",""],["German Bakery","픽업","German","","등대 쪽 Ralph's German Bakery로 계산"],["Tranquilo","픽업","Tranq","","아살라 쪽 추정 위치"],["El Salam","픽업","","ScubaZone","위치 확인 필요 · 지금은 샵 근처로 계산"],["Gmart","픽업","G mart","ScubaZone","위치 확인 필요 · 지금은 샵 근처로 계산"],["Wooyooni","픽업","","ScubaZone","위치 확인 필요 · 지금은 샵 근처로 계산"]],"times":[[0,3,44,40,24,23,21,8,2,3,4,10,13,18,22,3,4,5,4,3,5,2,2,2],[5,0,49,45,29,27,26,13,7,2,3,9,12,17,21,2,3,4,3,2,4,7,7,7],[43,46,0,4,20,21,24,49,44,46,47,51,54,58,62,46,46,46,47,46,46,45,45,45],[39,42,4,0,16,18,20,45,40,42,43,47,50,54,58,42,42,42,43,42,42,41,41,41],[23,26,20,16,0,2,4,29,24,26,27,31,34,38,42,26,26,26,27,26,26,25,25,25],[22,24,21,18,2,0,2,28,22,25,25,29,32,36,41,24,25,25,25,24,25,24,24,24],[20,23,24,20,4,2,0,26,21,23,24,28,31,35,39,23,23,23,24,23,23,22,22,22],[8,11,50,46,30,29,27,0,8,11,12,19,21,26,30,11,12,13,12,11,13,10,10,10],[2,4,44,40,24,23,21,9,0,5,5,12,15,19,24,4,5,6,5,4,7,4,4,4],[5,3,48,44,28,27,25,13,6,0,2,9,12,16,21,1,2,3,3,1,4,7,7,7],[5,4,48,44,28,27,25,13,6,1,0,8,11,15,20,2,1,2,1,1,3,7,7,7],[11,10,51,47,31,30,28,19,13,9,8,0,3,7,12,10,8,6,7,9,7,13,13,13],[14,13,54,50,34,32,31,22,15,12,10,3,0,4,9,13,11,9,10,12,9,16,16,16],[18,17,58,54,38,37,35,27,20,16,15,7,4,0,5,17,15,13,14,16,14,20,20,20],[23,22,63,59,43,41,40,31,24,21,19,12,9,5,0,21,20,17,19,21,18,25,25,25],[4,3,47,44,27,26,24,12,5,2,2,8,11,15,20,0,1,3,2,2,3,6,6,6],[4,4,48,44,28,27,25,13,6,1,1,8,11,15,20,2,0,3,2,1,3,6,6,6],[5,4,47,43,27,25,24,14,7,3,2,6,9,13,17,4,2,0,1,3,1,7,7,7],[4,4,48,44,28,27,25,13,6,3,1,7,10,14,19,3,2,2,0,3,2,6,6,6],[4,3,48,44,28,27,25,13,6,1,2,9,12,16,21,1,1,3,2,0,4,6,6,6],[6,5,47,43,27,26,24,14,7,4,2,7,9,14,18,4,3,1,2,4,0,8,8,8],[2,5,46,42,26,25,23,10,4,5,6,12,15,20,24,5,6,7,6,5,7,0,4,4,4,4],[2,5,46,42,26,25,23,10,4,5,6,12,15,20,24,5,6,7,6,5,7,4,0,4,4],[2,5,46,42,26,25,23,10,4,5,6,12,15,20,24,5,6,7,6,5,7,4,4,0]],"labels":[["Check Dive","Lighthouse"],["Night Dive","Lighthouse"],["Open Water","Lighthouse"],["Semi Open Water","Lighthouse"],["DSD","Lighthouse"],["Advanced Open Water","Lighthouse"],["Deep Specialty","Lighthouse"],["Nitrox Specialty","Lighthouse"],["Rescue","Lighthouse"],["EFR / Rescue","Lighthouse"],["Kick Training","Lighthouse"],["SMB Training","Lighthouse"],["Buoyancy Training","Lighthouse"],["DMT","차 안 씀"],["IDC","차 안 씀"],["IE","차 안 씀"],["EFR","차 안 씀"],["Swimming","차 안 씀"],["Training","차 안 씀"],["Gabr el Bint","보트"],["Tiran","보트"],["Thistlegorm","보트"],["Fun Diving",""],["Abu Talha",""],["3 Kings",""],["Tiger",""],["T-Gorm",""]]};

/* ================= 처음 한 번 ================= */
function setupDrivers() {
  const ss = SpreadsheetApp.getActive();
  if (typeof scReadSettings_ !== 'function') throw new Error('스케줄 코드(스케줄.gs)가 같이 있어야 해요.');
  drvSettingsSheet_(ss);
  drvSheet_(ss);
  const home = ss.getSheetByName(SC.HOME);
  if (home) drvButtons_(home, [['drv', 'driverPlan', 8, 5]]);
  ss.toast('기사 일정 · 차량 설정 탭을 만들고 홈에 [기사 일정표] 버튼을 붙였어요.', '기사 일정표', 8);
}

function drvSheet_(ss) {
  let sh = ss.getSheetByName(DRV.TAB);
  const lab = (a1, v) => sh.getRange(a1).setValue(v).setFontWeight('bold').setBackground(SC_COLOR.head);
  const inp = (a1, v, fmt) => { const r = sh.getRange(a1).setValue(v).setBackground(SC_COLOR.input).setFontWeight('bold').setHorizontalAlignment('center'); if (fmt) r.setNumberFormat(fmt); return r; };
  if (sh) return sh;
  sh = ss.insertSheet(DRV.TAB, 1);
  sh.getRange('A1').setValue('기사 일정표').setFontSize(18).setFontWeight('bold');
  sh.getRange('C1').setValue('장소 · 이동 시간 · 일정 약어는 "차량 설정" 탭에서 고쳐요').setFontColor('#587078');
  lab('A2', '날짜'); inp('B2', '', 'yyyy-mm-dd (ddd)').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());
  lab('C2', '쓸 수 있는 차'); inp('D2', 4);
  lab('E2', '차 1대 자리'); inp('F2', 5);
  lab('G2', '펀다 1·2·3깡 (분)'); inp('H2', '60, 120, 160', '@').setNote('사이트에 내려준 뒤 다시 데리러 갈 때까지. 1깡 · 2깡 · 3깡 순서로 적어요.');
  lab('I2', '샵 정리 (분)'); inp('J2', 30).setNote('샵에 돌아와서 장비 세척 · 다이빙 플래너(로그) 쓰는 시간. 이 시간이 지나면 숙소까지 데려다줘요.');
  lab('A3', '시간 보정 ×'); inp('B3', 1).setNote('차량 설정 탭의 이동 시간에 곱해요. 바쁜 날 길이 막히면 1.2처럼 키워 주세요.');
  lab('C3', '늦어져도 되는 분'); inp('D3', 0).setNote('차가 모자랄 때 출발을 이만큼까지 늦춰서 같은 차가 한 번 더 돌게 해요.');
  lab('E3', '가이드도 자리 차지'); sh.getRange('F3').insertCheckboxes().setValue(true).setBackground(SC_COLOR.input);
  lab('G3', '교육 1깡 (분)'); inp('H3', 60).setNote('교육은 브리핑이 길어서 1깡에 50~70분. 깡 수만큼 곱해요.');
  lab('I3', '숙소까지 데려다주기'); sh.getRange('J3').insertCheckboxes().setValue(true).setBackground(SC_COLOR.input);
  sh.setColumnWidths(1, DRV_COLS, 110); sh.setColumnWidth(2, 130); sh.setColumnWidth(4, 130); sh.setColumnWidth(5, 230); sh.setColumnWidth(7, 230); sh.setColumnWidth(9, 130); sh.setColumnWidth(10, 200);
  sh.setRowHeights(4, 2, 26);
  sh.setHiddenGridlines(true);
  drvButtons_(sh, [['dload', 'driverPlan', 4, 1], ['dcalc', 'driverRecalc', 4, 3], ['dtext', 'driverText', 4, 6]]);
  return sh;
}

function drvButtons_(sh, list) {
  const fns = list.map(x => x[1]);
  sh.getImages().forEach(im => { try { if (fns.indexOf(im.getScript()) >= 0) im.remove(); } catch (e) {} });
  list.forEach(([key, fn, row, col]) => {
    for (let k = 0; k < 3; k++) {
      try {
        const img = sh.insertImage(Utilities.newBlob(Utilities.base64Decode(DRV_BUTTONS[key]), 'image/png', key + '.png'), col, row, 4, 2);
        img.setWidth(220); img.setHeight(40); img.assignScript(fn);
        break;
      } catch (e) { Logger.log('버튼 실패 ' + fn + ': ' + e.message); Utilities.sleep(800); }
    }
  });
}

/* ================= 차량 설정 탭 ================= */
function drvSettingsSheet_(ss) {
  let sh = ss.getSheetByName(DRV.SET);
  if (sh) return sh;
  sh = ss.insertSheet(DRV.SET);
  sh.getRange('A1').setValue('차량 설정').setFontSize(18).setFontWeight('bold');
  sh.getRange('A2').setValue('장소 · 일정 약어 · 이동 시간을 여기서 고쳐요. 장소를 새로 넣었으면 [이동 시간표 정리]를 눌러 주세요.').setFontColor('#587078');
  sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 90); sh.setColumnWidth(3, 230); sh.setColumnWidth(4, 130); sh.setColumnWidth(5, 260);
  sh.setRowHeights(3, 2, 26);
  sh.setHiddenGridlines(true);
  drvButtons_(sh, [['dset', 'driverPlacesRefresh', 3, 1]]);
  const D = DRV_DEFAULT, names = D.places.map(p => p[0]), min = {};
  names.forEach((a, i) => { min[a] = {}; names.forEach((b, j) => min[a][b] = D.times[i][j]); });
  drvWriteSettings_(sh, D.places, D.labels, min);
  return sh;
}

// 스케줄.gs 설정 탭의 이름이 바뀌었으면(약어 → 정식 이름) → "일정 약어 → 가는 곳" 왼쪽 칸을 새 이름으로 맞춰요
function driverLabelsRefresh() {
  const ss = SpreadsheetApp.getActive();
  if (typeof scReadSettings_ !== 'function') { ss.toast('스케줄 코드(스케줄.gs)가 있어야 해요.', '차량 설정', 8); return; }
  const sh = drvSettingsSheet_(ss);
  const R = drvReadSettings_(sh);
  const sch = scReadSettings_(ss);
  const seen = {}, rows = [];
  R.labels.forEach(l => {
    const canon = sch.raw[scNorm_(l[0])] || l[0];
    const k = scNorm_(canon);
    if (seen[k]) return;
    seen[k] = true;
    rows.push([canon, l[1]]);
  });
  drvWriteSettings_(sh, R.places, rows, R.min);
  ss.toast('일정 약어 → 가는 곳 표를 스케줄 탭의 새 이름에 맞췄어요 (' + R.labels.length + '줄 → ' + rows.length + '줄).', '차량 설정', 8);
}

// 장소를 새로 넣었거나 이름을 바꿨으면 → 시간표를 장소 목록에 맞춰 다시 그려요 (고친 시간은 그대로)
function driverPlacesRefresh() {
  const ss = SpreadsheetApp.getActive();
  const sh = drvSettingsSheet_(ss);
  const R = drvReadSettings_(sh);
  const names = R.places.map(p => p[0]), near = {};
  R.places.forEach(p => { near[p[0]] = p[3]; });
  const look = (a, b) => { const v = R.min[a] && R.min[a][b]; return typeof v === 'number' && !isNaN(v) ? v : null; };
  const base = n => { let x = n, g = 0; while (x && !R.min[x] && g < 6) { x = near[x]; g++; } return R.min[x] ? x : null; };
  const added = [];
  const min = {};
  names.forEach(a => {
    min[a] = {};
    names.forEach(b => {
      if (a === b) { min[a][b] = 0; return; }
      let v = look(a, b);
      if (v === null) {
        const ra = base(a), rb = base(b);
        v = ra && rb ? (ra === rb ? 2 : (look(ra, rb) || 10) + 2) : 10;
        if (added.indexOf(a) < 0 && !R.min[a]) added.push(a);
      }
      min[a][b] = v;
    });
  });
  drvWriteSettings_(sh, R.places, R.labels, min);
  ss.toast(added.length ? '새 장소 ' + added.join(', ') + ' 을(를) 근처 장소 시간으로 채웠어요. 실제와 다르면 시간표에서 고쳐 주세요.' : '시간표를 장소 목록에 맞췄어요.', '차량 설정', 10);
}

function drvWriteSettings_(sh, places, labels, min) {
  const max = sh.getMaxRows(), names = places.map(p => p[0]);
  const W = Math.max(6, names.length + 1);
  if (sh.getMaxColumns() < W) sh.insertColumnsAfter(sh.getMaxColumns(), W - sh.getMaxColumns());
  const all = sh.getRange(6, 1, Math.max(1, max - 5), sh.getMaxColumns());
  all.breakApart(); all.clearContent(); all.clearFormat(); all.clearDataValidations(); all.clearNote();
  const border = rg => rg.setBorder(true, true, true, true, true, true, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
  const title = (r, t) => sh.getRange(r, 1).setValue(t).setFontWeight('bold').setFontSize(13);
  let r = 6;
  // 장소
  title(r, DRV_SEC.place + ' · 구역: 샵 / 남쪽 / 시내 / 북쪽 / 픽업. 근처 장소 = 시간표에 없을 때 대신 쓸 곳');
  sh.getRange(r + 1, 1, 1, 5).setValues([DRV_PLACE_HEAD]).setFontWeight('bold').setBackground(SC_COLOR.head);
  const prow = places.map(p => [p[0], p[1], p[2] || '', p[3] || '', p[4] || '']);
  for (let i = 0; i < 8; i++) prow.push(['', '', '', '', '']);
  border(sh.getRange(r + 2, 1, prow.length, 5).setValues(prow));
  sh.getRange(r + 2, 2, prow.length, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(DRV_ZONES, true).build());
  sh.getRange(r + 2, 4, prow.length, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(names, true).setAllowInvalid(true).build());
  sh.getRange(r + 2, 1, prow.length, 1).setFontWeight('bold');
  r += prow.length + 3;
  // 일정 약어 → 가는 곳
  title(r, DRV_SEC.label + ' · 장소 이름과 같은 약어(B.H · Canyon …)는 안 적어도 돼요');
  sh.getRange(r + 1, 1, 1, 2).setValues([['일정 약어', '가는 곳']]).setFontWeight('bold').setBackground(SC_COLOR.head);
  const lrow = labels.map(l => [l[0], l[1] || '']);
  for (let i = 0; i < 8; i++) lrow.push(['', '']);
  border(sh.getRange(r + 2, 1, lrow.length, 2).setValues(lrow));
  const sites = places.filter(p => DRV_SITE_ZONES.indexOf(p[1]) >= 0).map(p => p[0]);
  sh.getRange(r + 2, 2, lrow.length, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(sites.concat([DRV_NOCAR, DRV_BOAT]), true).build());
  lrow.forEach((l, i) => { if (l[0] && !l[1]) sh.getRange(r + 2 + i, 2).setBackground('#F8D7DA'); });
  r += lrow.length + 3;
  // 이동 시간
  title(r, DRV_SEC.time + ' (분) · 왼쪽 장소에서 출발 → 위쪽 장소에 도착');
  sh.getRange(r + 1, 1, 1, names.length + 1).setValues([['출발 ＼ 도착'].concat(names)])
    .setFontWeight('bold').setBackground(SC_COLOR.head).setWrap(true).setVerticalAlignment('middle').setHorizontalAlignment('center');
  const trow = names.map(a => [a].concat(names.map(b => a === b ? 0 : min[a][b])));
  const tr = sh.getRange(r + 2, 1, trow.length, names.length + 1).setValues(trow);
  border(tr).setHorizontalAlignment('center');
  sh.getRange(r + 2, 1, trow.length, 1).setFontWeight('bold').setBackground(SC_COLOR.head).setHorizontalAlignment('left');
  sh.setRowHeight(r + 1, 48);
  if (names.length > 5) sh.setColumnWidths(6, names.length - 4, 80);
  names.forEach((a, i) => sh.getRange(r + 2 + i, i + 2).setBackground('#EEEEEE'));
}

function drvReadSettings_(sh) {
  const v = sh.getDataRange().getValues();
  const places = [], labels = [], min = {};
  let sec = '', head = null;
  for (let i = 0; i < v.length; i++) {
    const a = String(v[i][0] || '').trim();
    if (a.indexOf(DRV_SEC.place) === 0) { sec = 'place'; i++; continue; }
    if (a.indexOf(DRV_SEC.label) === 0) { sec = 'label'; i++; continue; }
    if (a.indexOf(DRV_SEC.time) === 0) { sec = 'time'; head = v[i + 1].slice(1).map(x => String(x).trim()); i++; continue; }
    if (!a) continue;
    if (sec === 'place') places.push([a, String(v[i][1] || '시내').trim(), String(v[i][2] || ''), String(v[i][3] || '').trim(), String(v[i][4] || '')]);
    else if (sec === 'label') labels.push([a, String(v[i][1] || '').trim()]);
    else if (sec === 'time' && head) { min[a] = {}; head.forEach((b, j) => { const x = v[i][j + 1]; if (b && x !== '' && !isNaN(Number(x))) min[a][b] = Number(x); }); }
  }
  return { places, labels, min };
}

// 계산에 쓰는 장소 정보
function drvPlaces_(ss) {
  const R = drvReadSettings_(drvSettingsSheet_(ss));
  const P = { names: [], zone: {}, near: {}, alias: {}, label: {}, min: R.min, shops: [], sites: [] };
  R.places.forEach(p => {
    const n = p[0];
    P.names.push(n); P.zone[n] = p[1]; P.near[n] = p[3];
    [n].concat(String(p[2]).split(/[,，]/)).forEach(x => { const k = scNorm_(x); if (k && !P.alias[k]) P.alias[k] = n; });
    if (p[1] === '샵') P.shops.push(n);
    if (DRV_SITE_ZONES.indexOf(p[1]) >= 0) P.sites.push(n);
  });
  if (!P.shops.length) throw new Error('차량 설정 탭 장소에 구역이 "샵"인 곳이 하나는 있어야 해요.');
  R.labels.forEach(l => { const k = scNorm_(l[0]); if (k) P.label[k] = l[1]; });
  P.resolve = x => P.alias[scNorm_(x || '')] || '';
  P.isShop = n => P.zone[n] === '샵';
  // 일정 약어 → 가는 곳 ('' = 모름 · NOCAR · BOAT)
  P.siteOf = lab => {
    const k = scNorm_(lab), t = P.label[k];
    if (t === DRV_NOCAR) return 'NOCAR';
    if (t === DRV_BOAT) return 'BOAT';
    const n = t ? P.resolve(t) : P.resolve(lab);
    return n && DRV_SITE_ZONES.indexOf(P.zone[n]) >= 0 ? n : '';
  };
  // 시간표에 있는 장소로 (없으면 근처 장소 → 그래도 없으면 첫 번째 샵)
  const timed = x => { let n = P.resolve(x) || x, g = 0; while (n && !P.min[n] && g < 6) { n = P.near[n]; g++; } return P.min[n] ? n : P.shops[0]; };
  P.time = (a, b) => {
    if (a === b) return 0;
    const x = timed(a), y = timed(b);
    if (x === y) return 2;
    const v = P.min[x][y] !== undefined ? P.min[x][y] : (P.min[y] && P.min[y][x] !== undefined ? P.min[y][x] : 10);
    return v;
  };
  return P;
}

/* ================= 버튼 ================= */
// 홈 [기사 일정표] · 탭 [스케줄에서 다시 불러오기]: 홈 날짜 일정 → 운행 목록 → 기사 일정
function driverPlan() {
  const ss = SpreadsheetApp.getActive();
  const P = drvPlaces_(ss);
  const sh = drvSheet_(ss);
  const date = scHomeDate_(ss);
  const old = drvReadTrips_(sh, P);
  const sameDay = sh.getRange('B2').getValue() instanceof Date && scFmt_(sh.getRange('B2').getValue()) === scFmt_(date);
  const { trips, skipped } = drvFromSchedule_(ss, date, P);
  const keep = sameDay ? old.filter(t => t.shop !== P.shops[0]) : [];   // 같은 날이면 직접 넣은 다른 샵(피쉬앤프랜즈) 팀은 남겨요
  sh.getRange('B2').setValue(date);
  drvWriteTrips_(sh, trips.concat(keep), P);
  const res = drvCompute_(sh, P);
  drvWritePlan_(sh, res);
  sh.activate();
  const msg = [];
  if (skipped.nocar.length) msg.push('차 안 쓰는 일정 빼고: ' + skipped.nocar.join(', '));
  if (skipped.boat.length) msg.push('보트는 따로: ' + skipped.boat.join(', '));
  if (skipped.nosite.length) msg.push('가는 곳을 몰라서 비워 둔 줄: ' + skipped.nosite.join(', ') + ' → 사이트를 고르고 [기사 일정 다시 짜기] (자주 쓰는 약어면 차량 설정 탭에 적어 두세요)');
  if (msg.length) ss.toast(msg.join('\n'), '확인해 주세요', 15);
  scCopyDialog_(res.text, '기사님께 보낼 글 · 복사해서 붙여넣기');
}

// 탭에서 고친 운행 목록으로 다시 계산
function driverRecalc() {
  const ss = SpreadsheetApp.getActive();
  const P = drvPlaces_(ss);
  const sh = drvSheet_(ss);
  const res = drvCompute_(sh, P);
  drvWritePlan_(sh, res);
  ss.toast('기사 ' + res.drivers.length + '명 · 차 ' + res.drivers.length + '대로 짰어요.', '기사 일정표', 6);
}

function driverText() {
  const ss = SpreadsheetApp.getActive();
  const P = drvPlaces_(ss);
  scCopyDialog_(drvCompute_(drvSheet_(ss), P).text, '기사님께 보낼 글 · 복사해서 붙여넣기');
}

/* ================= 일정 → 운행 목록 ================= */
function drvFromSchedule_(ss, date, P) {
  const S = scReadSettings_(ss);
  const { groups } = scGroup_(scReadEntries_(ss, date, date)[scFmt_(date)], S);
  const trips = [], skipped = { nocar: [], boat: [], nosite: [] };
  groups.forEach(g => {
    const key = scNorm_(g.label), tag = g.label + ' ' + g.time;
    let site = P.siteOf(g.label);
    if (site === 'NOCAR') { skipped.nocar.push(tag); return; }
    if (site === 'BOAT' || g.kind === 'Boat') { skipped.boat.push(tag); return; }
    if (!site) skipped.nosite.push(tag);
    const picks = {}, order = [];
    g.members.forEach(m => { if (scIsShop_(m.pickup)) return; const p = String(m.pickup).trim(); if (!(p in picks)) { order.push(p); picks[p] = 0; } picks[p]++; });
    const n = g.members.length;
    const course = g.kind === 'Course', night = scIsNightLabel_(g.label);
    trips.push({ shop: P.shops[0], site, kind: course ? '교육' : '펀다', time: drvMin_(g.time), guests: n, guides: g.guides.length || (course ? 1 : Math.ceil(n / 4)),
      pick: order.map(p => p + ' ' + picks[p]).join(', '), dives: night || /^c[\/.]?d$/.test(key) ? 1 : 2, back: NaN,
      team: g.label + (g.guides.length ? ' · ' + g.guides.join('/') : '') });
  });
  return { trips, skipped };
}

function drvWriteTrips_(sh, trips, P) {
  const C = DRV_COLS, max = sh.getMaxRows();
  if (sh.getMaxColumns() < C) sh.insertColumnsAfter(sh.getMaxColumns(), C - sh.getMaxColumns());
  const all = sh.getRange(7, 1, max - 6, C);
  all.breakApart(); all.clearContent(); all.clearFormat(); all.clearDataValidations(); all.clearNote();
  sh.getRange(7, 1).setValue('■ 운행 목록 · 고쳐도 돼요. 피쉬앤프랜즈 팀은 아래 빈 줄에 넣고 [기사 일정 다시 짜기]').setFontWeight('bold').setFontSize(13);
  sh.getRange(DRV.HEAD, 1, 1, C).setValues([DRV_TRIP_HEAD]).setFontWeight('bold').setBackground(SC_COLOR.head).setHorizontalAlignment('center').setWrap(true);
  const n = trips.length + DRV.BLANK;
  const rows = trips.map(t => [t.shop, t.site || '', t.kind || '펀다', drvHM_(t.time), t.guests, t.guides, t.pick, t.dives || 2,
    isNaN(t.back) ? '' : drvHM_(t.back), t.team || '']);
  while (rows.length < n) rows.push(Array(C).fill(''));
  sh.getRange(DRV.FIRST, 4, n, 1).setNumberFormat('@'); sh.getRange(DRV.FIRST, 9, n, 1).setNumberFormat('@');
  sh.getRange(DRV.FIRST, 1, n, C).setValues(rows).setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(DRV.FIRST, 7, n, 1).setHorizontalAlignment('left');
  const list = (col, values) => sh.getRange(DRV.FIRST, col, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(values, true).build());
  list(1, P.shops); list(2, P.sites); list(3, ['펀다', '교육']); list(8, ['1', '2', '3', '4']);
  trips.forEach((t, i) => {
    if (!t.site) sh.getRange(DRV.FIRST + i, 2).setBackground('#F8D7DA');
    if (t.shop !== P.shops[0]) sh.getRange(DRV.FIRST + i, 1).setBackground('#E8E1F5');
  });
  sh.getRange(DRV.FIRST + trips.length, 1, DRV.BLANK, C).setBackground('#FBFBFB');
  sh.getRange(DRV.FIRST, 7).setNote('예: Coffee Corner 3, Tranquilo 2 (차량 설정 탭 장소 이름)');
  sh.getRange(DRV.HEAD, 9).setNote('비워 두면 "사이트 도착 + 깡 수 시간"으로 자동 계산해서 회색 "자동 11:20"처럼 적어요. 시간을 직접 적으면 그 시간에 데리러 가요.');
}

function drvReadTrips_(sh, P) {
  const out = [], C = DRV_COLS;
  const last = sh.getLastRow();
  if (last < DRV.FIRST) return out;
  const v = sh.getRange(DRV.FIRST, 1, last - DRV.FIRST + 1, C).getValues();
  for (let i = 0; i < v.length; i++) {
    const r = v[i];
    if (String(r[0]).indexOf('■') === 0) break;
    if (!r[0] && !r[1] && !r[3]) continue;
    const shop = P.resolve(r[0]), site = P.resolve(r[1]), backTxt = String(r[8] || '');
    out.push({ row: DRV.FIRST + i, shop: P.isShop(shop) ? shop : P.shops[0], site: P.sites.indexOf(site) >= 0 ? site : '', kind: String(r[2]).trim() === '교육' ? '교육' : '펀다',
      time: drvMin_(r[3]), guests: Number(r[4]) || 0, guides: Number(r[5]) || 0, pick: String(r[6] || ''), dives: Math.max(1, Number(r[7]) || 2),
      back: /자동/.test(backTxt) ? NaN : drvMin_(r[8]), team: String(r[9] || '') });
  }
  return out;
}

/* ================= 계산 ================= */
function drvCompute_(sh, P) {
  const num = (a1, d) => { const v = Number(sh.getRange(a1).getValue()); return isNaN(v) || v <= 0 ? d : v; };
  const fun = String(sh.getRange('H2').getValue() || '60, 120, 160').split(/[,\/\s]+/).map(Number).filter(x => x > 0);
  const st = { cars: num('D2', 4), seats: num('F2', 5), factor: num('B3', 1), delay: Math.max(0, Number(sh.getRange('D3').getValue()) || 0),
    guideSeat: sh.getRange('F3').getValue() !== false, load: 10, unload: 8, fun: fun.length ? fun : [60, 120, 160], course: num('H3', 60),
    wash: Math.max(0, Number(sh.getRange('J2').getValue()) || 0), home: sh.getRange('J3').getValue() !== false };
  const date = sh.getRange('B2').getValue();
  const all = drvReadTrips_(sh, P);
  const trips = all.filter(t => t.site && !isNaN(t.time) && t.guests + (st.guideSeat ? t.guides : 0) > 0);
  trips.forEach(t => { t.auto = isNaN(t.back); });
  const res = drvEngine_(trips, st, P);
  res.st = st; res.date = date; res.skipped = all.length - trips.length; res.trips = trips; res.P = P;
  res.text = drvText_(res);
  return res;
}

// 사이트에 내려준 뒤 다시 데리러 갈 때까지 (분)
function drvStay_(t, st) {
  if (t.kind === '교육') return t.dives * st.course;
  const f = st.fun, n = t.dives;
  return n <= f.length ? f[n - 1] : f[f.length - 1] + (n - f.length) * 50;
}

function drvEngine_(trips, st, P) {
  const tt = (a, b) => { const v = P.time(a, b); return v ? Math.max(1, Math.round(v * st.factor)) : 0; };
  const zone = t => P.zone[t.site] || '시내';
  const people = n => n + (n > 1 ? ' people' : ' person'), guests = n => n + (n > 1 ? ' guests' : ' guest');
  const pickList = t => {
    const out = []; let left = t.guests;
    String(t.pick || '').split(/[,，\/]+/).forEach(tok => {
      const m = tok.trim().match(/^(.*?)\s*[:x×]?\s*(\d+)\s*(명|p|pax)?$/i);
      const name = (m ? m[1] : tok).trim(), n = Math.min(m ? Number(m[2]) : 1, left);
      if (name && n > 0) { out.push({ loc: P.resolve(name) || name, n }); left -= n; }
    });
    return out;
  };
  // 한 팀을 차 단위로 · 숙소 픽업 손님을 앞 차부터
  const split = (t, ti) => {
    const S = st.seats, total = t.guests + (st.guideSeat ? t.guides : 0), q = pickList(t), out = [];
    for (let c = 0; c < Math.ceil(total / S); c++) {
      let cap = Math.min(S, total - c * S); const part = { ti, n: cap, picks: {} };
      while (cap > 0 && q.length) { const p = q[0], k = Math.min(cap, p.n); part.picks[p.loc] = (part.picks[p.loc] || 0) + k; p.n -= k; cap -= k; if (!p.n) q.shift(); }
      out.push({ parts: [part], n: part.n });
    }
    return out;
  };
  // 같은 방향 · 20분 안 · 자리 남는 차끼리 합치기
  const loads = dir => {
    const key = L => dir === 'out' ? trips[L.parts[0].ti].time : trips[L.parts[0].ti].back;
    const full = [], part = [];
    trips.forEach((t, ti) => split(t, ti).forEach(L => (L.n < st.seats ? part : full).push(L)));
    part.sort((a, b) => key(a) - key(b) || b.n - a.n);
    const pooled = [];
    part.forEach(L => {
      const z = zone(trips[L.parts[0].ti]), t = key(L);
      const g = pooled.find(G => G.zone === z && G.n + L.n <= st.seats && Math.abs(G.t - t) <= 20);
      if (g) { g.parts.push(...L.parts); g.n += L.n; } else pooled.push({ parts: L.parts.slice(), n: L.n, zone: z, t });
    });
    return full.concat(pooled);
  };
  // 들르는 순서 (가장 짧게 · 7곳까지 다 따져 봐요)
  const best = (items, from, to) => {
    if (items.length <= 1) return items.slice();
    let b = null, bc = Infinity;
    const perm = (arr, done) => {
      if (!arr.length) { let c = 0, loc = from; done.forEach(x => { if (loc) c += tt(loc, x); loc = x; }); if (to) c += tt(loc, to); if (c < bc) { bc = c; b = done.slice(); } return; }
      arr.forEach((x, i) => perm(arr.filter((_, j) => j !== i), done.concat(x)));
    };
    perm(items.slice(0, 7), []);
    return b.concat(items.slice(7));
  };
  const uniq = a => a.filter((x, i) => a.indexOf(x) === i);
  const job = (L, dir) => {
    const parts = L.parts.map(p => Object.assign({}, p, { t: trips[p.ti] }));
    const bases = uniq(parts.map(p => p.t.shop)), sites = uniq(parts.map(p => p.t.site));
    const picks = {}; parts.forEach(p => Object.keys(p.picks).forEach(k => picks[k] = (picks[k] || 0) + p.picks[k]));
    const perSite = s => parts.filter(p => p.t.site === s).reduce((a, p) => a + p.n, 0);
    const tisAt = s => uniq(parts.filter(p => p.t.site === s).map(p => p.ti));
    const steps = []; let t = 0, loc = null;
    const go = (to, what, dwell, notBefore, tis) => { if (loc) t += tt(loc, to); if (notBefore !== undefined) t = Math.max(t, notBefore); steps.push({ t, loc: to, what, tis }); t += dwell; loc = to; };
    if (dir === 'out') {
      t = Math.min(...parts.map(p => p.t.time));   // 팀 시간 = 첫 픽업 (픽업이 없으면 샵 출발)
      const s0 = best(sites, bases[bases.length - 1], null)[0];
      const bo = best(bases, null, s0);
      best(Object.keys(picks), null, bo[0]).forEach(k => go(k, 'Pick up ' + guests(picks[k]), 2));
      bo.forEach(b => go(b, 'Load gear & people', st.load));
      best(sites, loc, null).forEach(s => go(s, 'Drop ' + people(perSite(s)), st.unload, undefined, tisAt(s)));
    } else {
      const so = best(sites, null, bases[0]);
      t = Math.min(...parts.map(p => p.t.back));
      so.forEach(s => go(s, 'Pick up ' + people(perSite(s)), st.unload, Math.min(...parts.filter(p => p.t.site === s).map(p => p.t.back)), tisAt(s)));
      best(bases, loc, null).forEach(b => go(b, 'Unload', 5));
    }
    const pickBy = {}, baseT = {};
    parts.forEach(p => Object.keys(p.picks).forEach(k => { const o = pickBy[p.t.shop] = pickBy[p.t.shop] || {}; o[k] = (o[k] || 0) + p.picks[k]; }));
    steps.forEach(s => { if (P.isShop(s.loc)) baseT[s.loc] = s.t; });
    return { dir, steps, start: steps[0].t, end: t, from: steps[0].loc, to: loc, n: L.n, bases, sites, mixed: bases.length > 1, delay: 0, pickBy, baseT,
      team: parts.map(p => (p.t.shop !== P.shops[0] ? p.t.shop + ' ' : '') + (p.t.team || p.t.site) + ' ' + p.n + 'p').join(' + ') };
  };
  // 내려준 팀은 꼭 다시 데리러 가요: 복귀 = 실제 사이트 도착 + 깡 수 시간 (직접 적은 복귀 시간이 있으면 그 시간)
  const arrive = {}, manual = trips.map(t => !isNaN(t.back));
  const markArrive = j => j.steps.forEach(s => (s.tis || []).forEach(ti => { arrive[ti] = Math.max(arrive[ti] || -1e9, s.t); }));
  const setBacks = () => trips.forEach((t, ti) => { if (!manual[ti]) t.back = (arrive[ti] !== undefined ? arrive[ti] : t.time + 30) + drvStay_(t, st); });
  const outs = loads('out').map(L => job(L, 'out'));
  outs.forEach(markArrive); setBacks();
  let rest = outs.slice(), backs = loads('back');
  // 샵에서 장비 세척 · 플래너 끝나면 숙소까지 (비슷한 시간 · 같은 샵 · 자리 남으면 한 차로)
  const homeJob = (base, picks, ready, team) => {
    const tot = Object.keys(picks).reduce((a, k) => a + picks[k], 0), steps = [];
    let t = ready, loc = base;
    steps.push({ t, loc: base, what: 'Take ' + guests(tot) + ' home (after gear wash & dive log)' }); t += 3;
    best(Object.keys(picks), base, null).forEach(k => { t += tt(loc, k); steps.push({ t, loc: k, what: 'Drop ' + guests(picks[k]) }); t += 2; loc = k; });
    return { dir: 'home', steps, start: ready, end: t, from: base, to: loc, n: tot, bases: [base], sites: [], mixed: false, delay: 0, team, ready, picks };
  };
  const addHome = (base, picks, ready, team) => {
    const n = Object.keys(picks).reduce((a, k) => a + picks[k], 0);
    if (!n) return;
    const h = rest.find(x => x.dir === 'home' && x.bases[0] === base && Math.abs(x.ready - ready) <= 15 && x.n + n <= st.seats);
    if (h) {
      rest.splice(rest.indexOf(h), 1);
      Object.keys(h.picks).forEach(k => picks[k] = (picks[k] || 0) + h.picks[k]);
      ready = Math.max(h.ready, ready); team = h.team + ' + ' + team;
    }
    rest.push(homeJob(base, picks, ready, team));
  };
  // 기사 배정: 늦지 않게 갈 수 있는 기사 중 빈 차 이동이 가장 짧은 사람 · 없으면 기사 추가
  // 다음 일까지 20분 넘게 비면 사이트에서 기다리지 않고 샵으로 돌아가 있어요
  const homeOf = d => P.isShop(d.loc) ? null : (d.home || P.shops[0]);
  const drivers = [], jobs = [], pickedUp = {};
  while (rest.length || backs.length) {
    setBacks();
    const cand = rest.concat(backs.map(L => Object.assign(job(L, 'back'), { L })));
    cand.sort((a, b) => a.start - b.start || b.n - a.n);
    const j = cand[0];
    if (j.L) backs.splice(backs.indexOf(j.L), 1); else rest.splice(rest.indexOf(j), 1);
    let pick = null, bs = Infinity;
    drivers.forEach(d => {
      let via = null, drive = tt(d.loc, j.from); const ready = d.free + drive;
      const hb = homeOf(d);
      if (hb && j.start - (d.free + tt(d.loc, hb) + tt(hb, j.from)) >= 20) { via = hb; drive = tt(d.loc, hb) + tt(hb, j.from); }
      const delay = Math.max(0, ready - j.start);
      if (delay > st.delay) return;
      const score = delay * 10 + drive * 2 + Math.max(0, j.start - ready) * 0.01;
      if (score < bs) { bs = score; pick = { d, via, delay }; }
    });
    if (!pick) { const d = { id: drivers.length + 1, loc: P.shops[0], free: -1e9, items: [] }; drivers.push(d); pick = { d, via: null, delay: 0 }; }
    const { d, via, delay } = pick;
    if (delay) { j.delay = delay; j.steps.forEach(s => s.t += delay); j.start += delay; j.end += delay; if (j.ready !== undefined) j.ready += delay; }
    if (via) { const k = tt(d.loc, via); d.items.push({ dead: true, start: d.free, end: d.free + k, from: d.loc, to: via }); d.loc = via; }
    const dh = tt(d.loc, j.from);
    if (dh && d.loc !== j.from) d.items.push({ dead: true, start: j.start - dh, end: j.start, from: d.loc, to: j.from });
    d.items.push(j); d.loc = j.to; d.free = j.end; d.home = j.bases[0]; j.driver = d.id; jobs.push(j);
    if (j.dir === 'out') markArrive(j);
    else j.steps.forEach(s => (s.tis || []).forEach(ti => { pickedUp[ti] = pickedUp[ti] || []; if (pickedUp[ti].indexOf(s.t + '|' + d.id) < 0) pickedUp[ti].push(s.t + '|' + d.id); }));
    if (j.dir === 'back' && st.home) Object.keys(j.pickBy).forEach(b => addHome(b, Object.assign({}, j.pickBy[b]), (j.baseT[b] || j.end) + 5 + st.wash, j.team.replace(/ \d+p/g, '')));
  }
  drivers.forEach(d => { const hb = homeOf(d); if (hb) d.items.push({ dead: true, start: d.free, end: d.free + tt(d.loc, hb), from: d.loc, to: hb }); });
  // 내려줄 때 "몇 시에 누가 다시 데리러 오는지" 같이 적어요
  outs.forEach(j => j.steps.forEach(s => {
    if (!s.tis) return;
    const back = s.tis.map(ti => pickedUp[ti] || []).reduce((a, x) => a.concat(x), []).map(x => x.split('|').map(Number)).sort((a, b) => a[0] - b[0])[0];
    if (back) s.what += ' · back pick-up ' + drvHM_(back[0]) + (back[1] !== j.driver ? ' (Driver ' + back[1] + ')' : '');
  }));
  // 가장 바쁜 시간 (샵 밖에 나가 있는 차)
  let peak = 0, peakT = 0;
  const all = drivers.reduce((a, d) => a.concat(d.items), []);
  if (all.length) {
    const a = Math.min(...all.map(x => x.start)), b = Math.max(...all.map(x => x.end));
    for (let t = a; t < b; t += 5) {
      const n = drivers.filter(d => d.items.some((x, i) => (x.start <= t && t < x.end) || (d.items[i + 1] && x.end <= t && t < d.items[i + 1].start && !P.isShop(x.to)))).length;
      if (n > peak) { peak = n; peakT = t; }
    }
  }
  return { drivers, jobs, peak, peakT };
}

/* ================= 결과 쓰기 ================= */
function drvWritePlan_(sh, res) {
  const P = res.P;
  // 자동으로 계산한 복귀 시간은 운행 목록에 회색으로 보여 줘요
  (res.trips || []).forEach(t => { if (t.auto && t.row) sh.getRange(t.row, 9).setValue('자동 ' + drvHM_(t.back)).setFontColor('#8A9AA1').setFontStyle('italic'); });
  // "■ 기사 일정" 줄부터 지우고 다시 써요 (없으면 운행 목록 빈 줄 다음)
  const colA = sh.getRange(DRV.FIRST, 1, Math.max(1, sh.getMaxRows() - DRV.FIRST + 1), 1).getValues();
  let start = 0;
  for (let i = 0; i < colA.length; i++) if (String(colA[i][0]).indexOf('■ 기사 일정') === 0) { start = DRV.FIRST + i; break; }
  if (!start) start = Math.max(sh.getLastRow(), DRV.FIRST + drvReadTrips_(sh, P).length + DRV.BLANK - 1) + 2;
  const max = sh.getMaxRows();
  if (max >= start) { const rg = sh.getRange(start, 1, max - start + 1, 8); rg.breakApart(); rg.clearContent(); rg.clearFormat(); rg.clearDataValidations(); }

  const { drivers, st } = res, over = drivers.length > st.cars;
  let r = start;
  sh.getRange(r, 1).setValue('■ 기사 일정 · ' + (res.date instanceof Date ? scFmt_(res.date, 'yyyy-MM-dd (EEE)') : '')).setFontWeight('bold').setFontSize(13);
  r++;
  const late = res.jobs.filter(j => j.delay).length, mixed = res.jobs.filter(j => j.mixed).length;
  const sum = '필요한 차 · 기사 ' + drivers.length + '대 (쓸 수 있는 차 ' + st.cars + '대' + (over ? ' → ' + (drivers.length - st.cars) + '대 모자라요' : '') + ')'
    + (drivers.length ? ' · 가장 바쁜 시간 ' + drvHM_(res.peakT) + ' (차 ' + res.peak + '대)' : '')
    + ' · 운행 ' + res.jobs.length + '번' + (mixed ? ' · 두 샵 같이 탄 차 ' + mixed + '번' : '') + (late ? ' · 늦게 출발 ' + late + '번' : '')
    + (res.skipped ? ' · 사이트나 시간이 비어서 뺀 줄 ' + res.skipped + '개' : '');
  sh.getRange(r, 1, 1, 8).merge().setValue(sum).setWrap(true).setFontWeight('bold')
    .setBackground(over ? '#F8D7DA' : '#D9EAD3').setFontColor(over ? '#9C2A1E' : '#1E5631');
  sh.setRowHeight(r, 36);
  r += 2;
  if (!drivers.length) { sh.getRange(r, 1).setValue('운행이 없어요. 위 목록에 팀을 넣고 [기사 일정 다시 짜기]를 눌러 주세요.'); return; }
  drivers.forEach(d => {
    const first = d.items[0], lastIt = d.items[d.items.length - 1];
    const head = 'Driver ' + d.id + '  ·  ' + drvHM_(first.start) + ' – ' + drvHM_(lastIt.end) + (d.id > st.cars ? '   ⚠️ 차가 모자라요' : '');
    sh.getRange(r, 1, 1, 8).merge().setValue(head).setFontWeight('bold').setFontColor('#FFFFFF')
      .setBackground(d.id > st.cars ? '#C0392B' : '#C46E28');
    r++;
    sh.getRange(r, 1, 1, 8).setValues([['Time', 'Place', 'Task', 'People', 'Team', '', '', '']]).setFontWeight('bold').setBackground(SC_COLOR.head);
    sh.getRange(r, 5, 1, 4).merge();
    r++;
    const rows = [], tint = [];
    d.items.forEach((x, k) => {
      const prev = d.items[k - 1];
      if (prev && x.start - prev.end >= 20) { rows.push([drvHM_(prev.end), prev.to, 'Free until ' + drvHM_(x.start) + ' (' + drvDur_(x.start - prev.end) + ')', '', '', '', '', '']); tint.push('#FFFFFF'); }
      if (x.dead) { rows.push([drvHM_(x.start), x.from + ' → ' + x.to, 'Drive empty (' + (x.end - x.start) + ' min)', '', '', '', '', '']); tint.push('#F3F3F3'); return; }
      x.steps.forEach((s, i) => {
        rows.push([drvHM_(s.t), s.loc, s.what, i ? '' : x.n, i ? '' : ({ out: 'GO · ', back: 'RETURN · ', home: 'HOME · ' }[x.dir]) + x.team + (x.delay ? ' (' + x.delay + ' min late)' : ''), '', '', '']);
        tint.push(x.dir === 'home' ? '#FFF4E5' : x.dir === 'back' ? '#EEF2F3' : x.mixed ? '#DAF0E6' : x.bases[0] !== P.shops[0] ? '#E8E1F5' : '#FFFFFF');
      });
    });
    const rg = sh.getRange(r, 1, rows.length, 8);
    rg.setValues(rows).setVerticalAlignment('middle').setBackgrounds(tint.map(c => Array(8).fill(c)))
      .setBorder(true, true, true, true, null, true, SC_COLOR.line, SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(r, 1, rows.length, 1).setHorizontalAlignment('center').setFontWeight('bold');
    sh.getRange(r, 4, rows.length, 1).setHorizontalAlignment('center');
    sh.getRange(r, 5, rows.length, 4).mergeAcross();
    r += rows.length + 1;
  });
}

function drvText_(res) {
  const { drivers, st } = res;
  const day = res.date instanceof Date ? scFmt_(res.date, 'EEE d MMM') : '';
  if (!drivers.length) return 'No trips' + (day ? ' on ' + day : '') + '.';
  return drivers.map(d => {
    const lines = ['🚐 Driver ' + d.id + (day ? ' · ' + day : '') + (d.id > st.cars ? ' (no car yet!)' : '')];
    d.items.forEach((x, k) => {
      const prev = d.items[k - 1];
      if (prev && x.start - prev.end >= 20) lines.push(drvHM_(prev.end) + '  Free at ' + prev.to + ' until ' + drvHM_(x.start) + ' (' + drvDur_(x.start - prev.end) + ')');
      if (x.dead) { lines.push(drvHM_(x.start) + '  Go to ' + x.to); return; }
      lines.push('— ' + { out: 'GO', back: 'RETURN', home: 'HOME' }[x.dir] + ' · ' + x.n + (x.n > 1 ? ' people' : ' person') + ' · ' + x.team);
      x.steps.forEach(s => lines.push(drvHM_(s.t) + '  ' + s.loc + ': ' + s.what));
    });
    return lines.join('\n');
  }).join('\n\n');
}

/* ================= 작은 도우미 ================= */
function drvMin_(v) {
  if (v instanceof Date) return v.getHours() * 60 + v.getMinutes();
  const m = String(v || '').match(/(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?/i);
  if (!m) return NaN;
  let h = Number(m[1]);
  if (m[3]) h = h % 12 + (/pm/i.test(m[3]) ? 12 : 0);
  return h * 60 + Number(m[2]);
}
function drvDur_(m) { m = Math.round(m); return m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm'; }
function drvHM_(t) {
  if (t === '' || t == null || isNaN(t)) return '';
  t = Math.round(t); const h = Math.floor(t / 60), m = ((t % 60) + 60) % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

var DRV_BUTTONS = {
  drv: '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',
  dload: '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',
  dcalc: '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',
  dtext: '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',
  dset: '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'
};
