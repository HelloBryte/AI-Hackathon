/**
 * ShiftMate for Google Sheets: the pilot add-on.
 *
 * One marking entry in the sidebar writes the centre's own tabs:
 *   Marking Sheet (Exhibit 1), Progress (Exhibit 2), Exam Stats (Exhibit 3)
 *   and Exam Log (Scenario C, step 5).
 * The rules live in Core.gs, the same file the web prototype uses
 * (copied by `npm run build:gas`). No AI runs here, and no data leaves
 * the spreadsheet.
 */

var TABS = {
  tests: 'Tests',
  marking: 'Marking Sheet',
  progress: 'Progress',
  stats: 'Exam Stats',
  log: 'Exam Log',
};

var MASTERY_TEXT = {
  mastered: 'Mastered',
  partial: 'Partial',
  not_understood: 'Not understood',
  not_covered: 'Not covered',
};
var MASTERY_COLOUR = {
  mastered: ['#2e9d5b', '#ffffff'],
  partial: ['#f0c548', '#1d2330'],
  not_understood: ['#e06666', '#ffffff'],
  not_covered: ['#2f3542', '#c9cfda'],
};
var BAND_COLOUR = { pass: '#36a862', mid: '#f3c94e', low: '#e05555' };
var MODULE_COLUMNS = 12;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ShiftMate')
    .addItem('Mark a test', 'showSidebar')
    .addSeparator()
    .addItem('Set up demo tabs', 'setupDemo')
    .addToUi();
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('ShiftMate: mark once');
  SpreadsheetApp.getUi().showSidebar(html);
}

// ---------------------------------------------------------------------------
// Reading the tabs
// ---------------------------------------------------------------------------

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Missing tab "' + name + '". Run ShiftMate > Set up demo tabs, or rename your tab.');
  return sh;
}

function masteryKey_(text) {
  var t = String(text || '').trim().toLowerCase();
  for (var k in MASTERY_TEXT) {
    if (MASTERY_TEXT[k].toLowerCase() === t || k === t) return k;
  }
  return 'not_covered';
}

/** Tests tab: TestID | Name | Kind | Module | Time limit | Question | Point | Marks */
function readTests_() {
  var rows = sheet_(TABS.tests).getDataRange().getValues().slice(1);
  var tests = {};
  rows.forEach(function (r) {
    if (!r[0]) return;
    var id = String(r[0]);
    if (!tests[id]) {
      tests[id] = {
        id: id, name: String(r[1]), kind: String(r[2] || 'module'),
        module: r[3] === '' ? null : Number(r[3]), timeLimitMin: Number(r[4]) || null, questions: [],
      };
    }
    tests[id].questions.push({ q: String(r[5]), point: String(r[6]), marks: Number(r[7]) || 0 });
  });
  return tests;
}

/** Progress tab: Point | Module | Title | <student> | <student> ... */
function readProgress_(student) {
  var values = sheet_(TABS.progress).getDataRange().getValues();
  var col = values[0].indexOf(student);
  if (col < 0) throw new Error('No column for "' + student + '" in the Progress tab');
  var progress = {};
  var points = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][0]) continue;
    var id = String(values[i][0]);
    progress[id] = masteryKey_(values[i][col]);
    points.push({ id: id, module: Number(values[i][1]), title: String(values[i][2]), row: i + 1 });
  }
  return { progress: progress, points: points, col: col + 1 };
}

/** Exam Stats tab: Student | Class | M1 A | M1 B | M1 C | M1 D | M2 A ... */
function statsCell_(module, slotIndex) {
  return 3 + (module - 1) * 4 + slotIndex;
}

function readExamEntry_(student, module) {
  var values = sheet_(TABS.stats).getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] !== student) continue;
    var attempts = [];
    for (var s = 0; s < 4; s++) {
      var v = values[i][statsCell_(module, s) - 1];
      if (v === '' || v === null || v === undefined) break;
      var text = String(v);
      attempts.push({ slot: 'ABCD'[s], pct: parseFloat(text), tutorPass: text.indexOf('*P') >= 0 });
    }
    return { row: i + 1, entry: { attempts: attempts } };
  }
  return { row: null, entry: { attempts: [] } };
}

function getSetup() {
  var header = sheet_(TABS.progress).getDataRange().getValues()[0];
  var tests = readTests_();
  return {
    students: header.slice(3).filter(function (h) { return h; }),
    tests: Object.keys(tests).map(function (id) {
      return { id: id, name: tests[id].name, questions: tests[id].questions };
    }),
  };
}

// ---------------------------------------------------------------------------
// Preview and apply
// ---------------------------------------------------------------------------

function plan_(payload) {
  var test = readTests_()[payload.testId];
  if (!test) throw new Error('Unknown test ' + payload.testId);
  var prog = readProgress_(payload.student);
  var stats = test.kind === 'module' ? readExamEntry_(payload.student, test.module) : { row: null, entry: null };
  var plan = planMarking({
    test: test,
    outcomes: payload.outcomes || {},
    partialMarks: payload.partialMarks || {},
    timing: payload.timing || {},
    blankResolutions: payload.blankResolutions || {},
    studentProgress: prog.progress,
    examEntry: stats.entry,
    points: prog.points,
  });
  return { test: test, prog: prog, stats: stats, plan: plan };
}

function previewMarking(payload) {
  return plan_(payload).plan;
}

// The first header cells each tab must have. Checked before any write, so a
// renamed or re-ordered column stops the add-on instead of corrupting data.
var REQUIRED_HEADERS = {};
REQUIRED_HEADERS[TABS.tests] = ['TestID', 'Name', 'Kind', 'Module', 'Time limit', 'Question', 'Point', 'Marks'];
REQUIRED_HEADERS[TABS.marking] = ['Date', 'Student', 'Test', 'Attempt', 'Question', 'Point', 'Outcome'];
REQUIRED_HEADERS[TABS.progress] = ['Point', 'Module', 'Title'];
REQUIRED_HEADERS[TABS.stats] = ['Student', 'Class', 'M1 A'];
REQUIRED_HEADERS[TABS.log] = ['Date', 'Student', 'Paper'];

function checkSchema_() {
  Object.keys(REQUIRED_HEADERS).forEach(function (name) {
    var header = sheet_(name).getRange(1, 1, 1, REQUIRED_HEADERS[name].length).getValues()[0];
    REQUIRED_HEADERS[name].forEach(function (want, i) {
      if (String(header[i]).trim().toLowerCase().indexOf(want.toLowerCase()) !== 0) {
        throw new Error('Tab "' + name + '", column ' + (i + 1) + ' should be "' + want + '" but is "' + header[i] + '". Nothing was written.');
      }
    });
  });
}

function applyMarking(payload) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    // 1. Every check first. Nothing is written until all of them pass.
    checkSchema_();
    var p = plan_(payload);
    var plan = p.plan;
    if (plan.missing.length) throw new Error('Not marked yet: Q' + plan.missing.join(', Q'));
    if (plan.unresolvedBlanks.length) throw new Error('Say why Q' + plan.unresolvedBlanks.join(', Q') + ' was left blank');
    if (plan.exhibit3 && !plan.exhibit3.slot) throw new Error('Attempts A-D are all used for this Module. Nothing was written.');
    if (plan.exhibit3 && !p.stats.row) throw new Error('No row for "' + payload.student + '" in the Exam Stats tab. Nothing was written.');
    var rowOf = {};
    p.prog.points.forEach(function (pt) { rowOf[pt.id] = pt.row; });
    var missingPoints = plan.exhibit2.changes.filter(function (c) { return !rowOf[c.point]; }).map(function (c) { return c.point; });
    if (missingPoints.length) throw new Error('Points missing from the Progress tab: ' + missingPoints.join(', ') + '. Nothing was written.');
    var marking = sheet_(TABS.marking);
    var progress = sheet_(TABS.progress);
    var stats = sheet_(TABS.stats);
    var log = sheet_(TABS.log);
    var decision = payload.decision || {};
    var tutorPass = !!decision.tutorPass && plan.score.pct < PASS_PCT;
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // 2. Exhibit 1
    plan.exhibit1.forEach(function (r) {
      marking.appendRow([today, payload.student, p.test.name, plan.exhibit3 ? plan.exhibit3.slot : '-', r.q, r.point,
        r.outcome === 'BLANK' ? '\\Blank\\' : r.outcome, r.awarded, r.max]);
    });

    // 3. Exhibit 2
    plan.exhibit2.changes.forEach(function (c) {
      var cell = progress.getRange(rowOf[c.point], p.prog.col);
      cell.setValue(MASTERY_TEXT[c.after]);
      cell.setBackground(MASTERY_COLOUR[c.after][0]);
      cell.setFontColor(MASTERY_COLOUR[c.after][1]);
    });

    // 4. Exhibit 3 (Module Tests only)
    if (plan.exhibit3) {
      var cell3 = stats.getRange(p.stats.row, statsCell_(p.test.module, 'ABCD'.indexOf(plan.exhibit3.slot)));
      cell3.setValue(plan.score.pct + (tutorPass ? ' *P' : ''));
      cell3.setBackground(BAND_COLOUR[plan.score.band]);
    }

    // 5. Exam log (Scenario C, step 5)
    var t = payload.timing || {};
    log.appendRow([today, payload.student, p.test.name, t.start || '', t.end1 || '', t.end2 || '',
      t.checks === undefined ? '' : t.checks, plan.score.pct]);

    return {
      score: plan.score,
      exhibit1Rows: plan.exhibit1.length,
      exhibit2Changed: plan.exhibit2.changes.filter(function (c) { return c.changed; }).length,
      exhibit3: plan.exhibit3 ? 'Module ' + p.test.module + ' attempt ' + plan.exhibit3.slot : null,
      suggestion: plan.suggestion,
      issues: plan.issues,
    };
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Demo tabs (modelled on Exhibits 1-3)
// ---------------------------------------------------------------------------

function resetTab_(ss, name, header) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

function setupDemo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var students = ['Phoenix Hu', 'Justin Dong', 'William Wu'];

  var tests = resetTab_(ss, TABS.tests, ['TestID', 'Name', 'Kind', 'Module', 'Time limit (min)', 'Question', 'Point', 'Marks']);
  var mt8a = [['1', '8.1', 2], ['2', '8.2', 2], ['3', '8.4', 3], ['4', '8.5', 2], ['5', '8.6.2', 3], ['6a', '8.7.1', 2],
    ['6b', '8.7.2', 2], ['7', '8.8.1', 3], ['8', '8.8.2', 4], ['9', '8.9.1', 3], ['10', '8.9.2', 3], ['11', '8.9.3', 4]];
  tests.getRange(2, 1, mt8a.length, 8).setValues(mt8a.map(function (q) {
    return ['MT8A', 'Module Test 8A', 'module', 8, 50, q[0], q[1], q[2]];
  }));

  var points = [
    ['8.1', 'Antiderivatives of polynomials'], ['8.2', 'Antiderivatives of exponential and circular functions'],
    ['8.3', 'Antiderivatives of 1/(ax+b)'], ['8.4', 'Integration by recognition'], ['8.5', 'Definite integrals'],
    ['8.6.1', 'Fundamental theorem of calculus'], ['8.6.2', 'Properties of definite integrals'],
    ['8.7.1', 'Area under a curve'], ['8.7.2', 'Signed area'], ['8.8.1', 'Area between two curves'],
    ['8.8.2', 'Area between curves: finding intersections'], ['8.9.1', 'Average value of a function'],
    ['8.9.2', 'Trapezium rule approximation'], ['8.9.3', 'Kinematics applications'],
  ];
  var progress = resetTab_(ss, TABS.progress, ['Point', 'Module', 'Title'].concat(students));
  var start = ['mastered', 'partial', 'mastered', 'partial', 'mastered', 'mastered', 'partial', 'mastered', 'partial',
    'partial', 'not_understood', 'partial', 'not_covered', 'partial'];
  progress.getRange(2, 1, points.length, 3 + students.length).setValues(points.map(function (p, i) {
    return [p[0], 8, p[1]].concat(students.map(function () { return MASTERY_TEXT[start[i]]; }));
  }));
  points.forEach(function (p, i) {
    var colours = MASTERY_COLOUR[start[i]];
    progress.getRange(i + 2, 4, 1, students.length).setBackground(colours[0]).setFontColor(colours[1]);
  });

  var header = ['Student', 'Class'];
  for (var m = 1; m <= MODULE_COLUMNS; m++) ['A', 'B', 'C', 'D'].forEach(function (s) { header.push('M' + m + ' ' + s); });
  var stats = resetTab_(ss, TABS.stats, header);
  stats.getRange(2, 1, students.length, 2).setValues(students.map(function (s) { return [s, 'MA4021-1E']; }));

  resetTab_(ss, TABS.marking, ['Date', 'Student', 'Test', 'Attempt', 'Question', 'Point', 'Outcome', 'Marks', 'Out of']);
  resetTab_(ss, TABS.log, ['Date', 'Student', 'Paper', 'Start', 'End 1st pass', 'End 2nd pass', 'Checks', 'Score %']);
  return 'Demo tabs ready';
}
