/**
 * 이론교육 발송 리스트 — 일정(스케줄) 코드와 같이 써요 (Apps Script에 "이론교육"이라는 이름으로 새 파일 하나 더 만들어 붙여 넣어요)
 * 회원이 "첫 교육"(생애 첫 자격증 과정)을 시작하면, 그 교육 시작일 3주 전까지 이론 교육을 보내줘야 해요.
 * buildSchedule()을 누를 때마다(= 홈에서 "스케줄 만들기") 일정 탭을 훑어서, 아직 이 탭에 없는 "첫 교육" 예정자를 자동으로 한 줄씩 추가해요.
 *
 * 이론교육 탭에서 직접 적는 건(노란색) 발송완료 체크 · 메모 — 나머지(회원번호 · 이름 · 과정 · 교육 시작일 · 발송 기한)는 자동으로 채워져요
 * 발송완료를 체크하면 발송일이 오늘 날짜로 자동 기록돼요(체크 해제하면 발송일도 같이 지워져요) — members.gs의 onEdit()이 불러요
 *
 * 이론교육이 필요한 과정은 오픈워터 · 어드밴스드뿐이에요(THEORY_COURSES) — 세미 오픈워터 · EFR · 레스큐 · DMT · IDC · 스페셜티 · 트레이닝 · Check Diving은 리스트에 안 올라가요
 * 이미 시작일이 지난 교육은 훑지 않아요 — 앞으로 할 교육만 챙기는 용도예요. 한 번 "발송완료" 체크된 줄은 다시 훑어도 안 건드려요.
 *
 * 처음 한 번: setupTheorySheet 실행 (setupSchedule 안에서도 같이 실행돼요)
 * 수동으로 다시 훑고 싶으면: refreshTheoryList 실행 (평소엔 "스케줄 만들기" 누를 때마다 자동으로 같이 돌아요)
 */
var THEORY = '이론교육';
var THEORY_HEAD = ['회원번호', '이름', '과정', '교육 시작일', '발송 기한', '발송완료', '발송일', '메모'];
var THEORY_SEND_DAYS = 21;   // 교육 시작일 몇 일 전까지 이론을 보내야 하는지
var THEORY_COURSES = new Set(['Open Water', 'Advanced Open Water']);   // 이론교육이 필요한 과정은 오픈워터 · 어드밴스드뿐이에요 (나머지 과정 — 세미 오픈워터 · EFR · 레스큐 · DMT · IDC · 스페셜티 · 트레이닝 · Check Diving — 는 리스트에 아예 안 올라가요)
var THEORY_COLOR = { input: '#FFF2CC', auto: '#EFEFEF' };
var THEORY_ROWS = 500;   // 조건부 서식을 미리 깔아두는 줄 수(넉넉하게) — 이것보다 더 늘어나면 setupTheorySheet을 한 번 더 실행해주세요
var THEORY_DUE_COLOR = '#F4CCCC';   // 발송 기한 전날 · 당일 · 지난 뒤로 계속 — 빨간 줄

/* ================= 처음 한 번 ================= */
function setupTheorySheet() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(THEORY);
  if (!sh) sh = ss.insertSheet(THEORY);
  sh.getRange(1, 1, 1, THEORY_HEAD.length).setValues([THEORY_HEAD]).setFontWeight('bold').setBackground(THEORY_COLOR.auto);
  sh.getRange(1, 6, 1, 2).setBackground(THEORY_COLOR.input);   // 발송완료 · 발송일(자동이지만 체크랑 바로 붙어 있어서 같이 노란 줄로) · 메모만 손이 닿는 칸
  sh.getRange(1, 8).setBackground(THEORY_COLOR.input);
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, THEORY_HEAD.length, 110);
  sh.setColumnWidth(2, 100); sh.setColumnWidth(3, 160); sh.setColumnWidth(8, 240);
  if (sh.getMaxRows() < THEORY_ROWS + 1) sh.insertRowsAfter(sh.getMaxRows(), THEORY_ROWS + 1 - sh.getMaxRows());
  const n = Math.max(sh.getLastRow() - 1, 0);
  if (n > 0) {
    sh.getRange(2, 4, n, 1).setNumberFormat('yyyy-mm-dd');
    sh.getRange(2, 5, n, 1).setNumberFormat('yyyy-mm-dd');
    sh.getRange(2, 7, n, 1).setNumberFormat('yyyy-mm-dd');
  }
  theorySetupConditionalFormat_(sh);
  say_('이론교육 탭을 만들었어요. "스케줄 만들기"를 누를 때마다 첫 교육 시작하는 회원이 자동으로 여기 추가돼요 — 발송완료만 체크해주면 돼요.');
  return sh;
}

// 발송 기한 전날 · 당일 · 지난 뒤로 계속 빨간 줄 — 발송완료 체크된 줄은 안 칠해요. TODAY() 기준이라 매일 저절로 다시 계산돼요(스크립트 다시 안 돌려도 돼요)
function theorySetupConditionalFormat_(sh) {
  const range = sh.getRange(2, 1, THEORY_ROWS, THEORY_HEAD.length);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2<>"", NOT($F2), TODAY()>=$E2-1)')
    .setBackground(THEORY_DUE_COLOR)
    .setRanges([range])
    .build();
  sh.setConditionalFormatRules([rule]);
}

/* ================= 자동 갱신 (schedule.gs의 buildSchedule()에서 불러요) ================= */

function theoryRefresh_(ss) {
  const sh = ss.getSheetByName(THEORY) || setupTheorySheet();
  // 이론교육이 필요 없는 과정(THEORY_COURSES에 없는 것)으로 전에 잘못 들어가 있던 줄은 지워요 — 밑에서부터 지워야 줄 번호가 안 밀려요
  {
    const last0 = sh.getLastRow();
    if (last0 > 1) {
      const types = sh.getRange(2, 3, last0 - 1, 1).getValues();
      for (let i = types.length - 1; i >= 0; i--) {
        const t = String(types[i][0] || '').trim();
        if (t && !THEORY_COURSES.has(t)) sh.deleteRow(i + 2);
      }
    }
  }
  // scRawRows_()는 일정 탭을 한 실행(스케줄 만들기 한 번) 안에서는 캐시해뒀다가 재사용해요(schedule.gs) —
  // buildSchedule()이 이미 그 날 일정을 읽을 때 한 번 읽어두니까, 여기서 또 시트를 다시 읽지는 않아요
  const vals = scRawRows_(ss);
  if (!vals.length) return;
  const todayKey = scFmt_(new Date());
  // 종류(E열)에 "AOW"처럼 약어로 적혀 있어도 정식 이름("Advanced Open Water")으로 맞춰요 —
  // 안 그러면 스케줄표엔 정상으로 보여도 여기선 글자가 안 맞아서 리스트에서 통째로 빠져버려요
  // OW · AOW 약어는 먼저 직접 확정해버려요 — 설정 탭에 "AOW"가 동의어가 아니라 그 자체로(엉뚱하게) 등록돼 있어도 안전하게
  const S = scReadSettings_(ss);
  const resolveType_ = t => {
    const raw = String(t || '').trim();
    if (THEORY_COURSES.has(raw)) return raw;
    const norm = scNorm_(raw);
    if (norm === 'aow' || norm === 'advanced' || norm === 'advancedopenwater') return 'Advanced Open Water';
    if (norm === 'ow' || norm === 'openwater') return 'Open Water';
    const info = S.labels[norm];
    return info ? info.name : raw;
  };

  // 한 번 훑으면서: (1) 회원번호별 "앞으로 할, 이론이 필요한 교육" 중 가장 빠른 날짜(= 후보) (2) 회원번호별 "이론이 필요한 교육" 날짜를 전부(과거 포함) 모아요
  // — 교육은 하루짜리가 아니라서(OW면 4일 등) 같은 과정이 날짜만 다르게 여러 줄로 들어있는 게 정상이라, "날짜가 여러 개"가 아니라
  //   "후보보다 먼저인 날짜가 있는지"로 첫 교육인지를 가려요 (안 그러면 여러 날짜짜리 과정이 전부 "첫 교육 아님"으로 잘못 걸러져요)
  const candidates = {}, allDates = {};
  vals.forEach(r => {
    const date = r[0], code = String(r[1] || '').trim(), name = String(r[2] || '').trim(), cat = String(r[3] || '').trim();
    const type = resolveType_(String(r[4] || '').trim());
    if (!code || !(date instanceof Date) || cat !== '교육' || !THEORY_COURSES.has(type)) return;
    (allDates[code] = allDates[code] || []).push(date);
    if (scFmt_(date) < todayKey) return;   // 이미 지난 교육은 후보가 될 수 없어요(앞으로 할 교육만 챙겨요) — allDates에는 위에서 이미 넣었어요
    const cur = candidates[code];
    if (!cur || date < cur.date) candidates[code] = { code, name, type, date };
  });
  // 후보 날짜보다 "진짜로 더 이른" 교육 날짜가 하나라도 있으면(과거든, 더 이른 미래 예약이든) 첫 교육이 아니에요
  Object.keys(candidates).forEach(code => {
    const c = candidates[code];
    if (allDates[code].some(d => d.getTime() < c.date.getTime())) delete candidates[code];
  });
  if (!Object.keys(candidates).length) return;

  const last = sh.getLastRow();
  const existing = last > 1 ? sh.getRange(2, 1, last - 1, THEORY_HEAD.length).getValues() : [];
  const rowByCode = {};
  existing.forEach((r, i) => { const code = String(r[0] || '').trim(); if (code) rowByCode[code] = i + 2; });

  let added = 0, updated = 0;
  Object.keys(candidates).forEach(code => {
    const c = candidates[code];
    const sendBy = new Date(c.date.getTime() - THEORY_SEND_DAYS * 864e5);
    const row = rowByCode[code];
    if (!row) {
      const newRow = sh.getLastRow() + 1;
      sh.getRange(newRow, 1, 1, THEORY_HEAD.length).setValues([[code, c.name, c.type, c.date, sendBy, false, '', '']]);
      sh.getRange(newRow, 4).setNumberFormat('yyyy-mm-dd'); sh.getRange(newRow, 5).setNumberFormat('yyyy-mm-dd'); sh.getRange(newRow, 7).setNumberFormat('yyyy-mm-dd');
      sh.getRange(newRow, 6).insertCheckboxes();
      rowByCode[code] = newRow;
      added++;
    } else {
      const done = existing[row - 2][5] === true;
      if (done) return;   // 이미 발송완료 체크된 줄은 안 건드려요
      const oldDate = existing[row - 2][3];
      if (!(oldDate instanceof Date) || scFmt_(oldDate) !== scFmt_(c.date) || String(existing[row - 2][2] || '').trim() !== c.type) {
        sh.getRange(row, 2, 1, 3).setValues([[c.name, c.type, c.date]]);
        sh.getRange(row, 5).setValue(sendBy);
        updated++;
      }
    }
  });
  if (added || updated) {
    // 안 보낸 사람(발송완료 체크 안 된 줄)이 위로, 그 중에서도 발송 기한이 빠른 사람이 위로 오게 정렬해요 — 전부 값만 있어서(수식 없음) 정렬해도 안전해요
    const nn = sh.getLastRow() - 1;
    if (nn > 1) sh.getRange(2, 1, nn, THEORY_HEAD.length).sort([{ column: 6, ascending: true }, { column: 5, ascending: true }]);
    SpreadsheetApp.getActive().toast((added ? added + '명 새로 추가' : '') + (added && updated ? ' · ' : '') + (updated ? updated + '명 날짜 갱신' : ''), '이론교육 리스트', 8);
  }
}

// Apps Script 실행 목록에 뜨게 밑줄 없는 이름으로 하나 — 평소엔 안 눌러도 돼요("스케줄 만들기" 누를 때마다 자동으로 돌아서요), 바로 확인하고 싶을 때만
function refreshTheoryList() {
  theoryRefresh_(SpreadsheetApp.getActive());
  SpreadsheetApp.getActive().getSheetByName(THEORY).activate();
}

/* ================= 발송완료 체크 → 발송일 자동 기록 (members.gs의 onEdit()이 불러요) ================= */
function theoryOnDoneEdit_(sh, row, newVal) {
  const cell = sh.getRange(row, 7);
  if (String(newVal).toUpperCase() === 'TRUE') { if (!cell.getValue()) cell.setValue(new Date()).setNumberFormat('yyyy-mm-dd'); }
  else cell.clearContent();
}
