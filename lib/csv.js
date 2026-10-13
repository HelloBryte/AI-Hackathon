// CSV exports in the column layout of Exhibits 1-3, so the records can be
// pasted or imported into the centre's existing Google Sheets.

const core = require('./core');
const { POINTS } = require('./syllabus');
const views = require('./views');

function cell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formulas in free text (CSV injection).
  const safe = /^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(rows) {
  return `${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

const OUTCOME_LABEL = { DONE: 'DONE', W: 'W', C: 'C', BLANK: '\\Blank\\' };

function exhibit1(state) {
  const rows = [['Student', 'Test', 'Date', 'Attempt', 'Question', 'Syllabus point', 'Outcome', 'Marks', 'Out of']];
  state.markingRecords.forEach((r) => {
    const s = views.studentById(state, r.studentId);
    r.rows.forEach((row) => {
      rows.push([s ? s.name : r.studentId, r.testName, r.date, r.attempt, row.q, row.point,
        OUTCOME_LABEL[row.outcome] || row.outcome, row.awarded === undefined ? '' : row.awarded, row.max === undefined ? '' : row.max]);
    });
  });
  return toCsv(rows);
}

function exhibit2(state) {
  const rows = [['Student', 'Module', 'Point', 'Title', 'Mastery']];
  state.students.forEach((s) => {
    const progress = state.progress[s.id] || {};
    POINTS.forEach((p) => {
      rows.push([s.name, p.module, p.id, p.title, core.MASTERY_LABEL[progress[p.id] || 'not_covered']]);
    });
  });
  return toCsv(rows);
}

function exhibit3(state) {
  const table = views.examStatsTable(state);
  const header = ['Class', 'Student'];
  table.modules.forEach((m) => core.ATTEMPT_SLOTS.forEach((slot) => header.push(`Module ${m} ${slot}`)));
  const rows = [header];
  table.classes.forEach((c) => {
    c.rows.forEach((r) => {
      const line = [c.classId, r.student.name];
      r.cells.forEach((cellData) => cellData.attempts.forEach((a) => {
        line.push(a.pct === null ? '' : `${a.pct}${a.tutorPass ? ' *P' : ''}`);
      }));
      rows.push(line);
    });
  });
  return toCsv(rows);
}

module.exports = { toCsv, exhibit1, exhibit2, exhibit3 };
