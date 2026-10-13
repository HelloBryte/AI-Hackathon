// Runs the Google Sheets add-on (apps-script/*.gs) against an in-memory
// stand-in for SpreadsheetApp, so the pilot code is tested without Google.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.cells = [];
    this.bg = {};
    this.fg = {};
  }

  clear() { this.cells = []; this.bg = {}; this.fg = {}; }
  setFrozenRows() {}
  getLastRow() { return this.cells.length; }
  getLastColumn() { return this.cells.reduce((n, r) => Math.max(n, r.length), 0); }
  appendRow(values) { this.cells.push(values.slice()); }

  getDataRange() {
    return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }

  getRange(row, col, numRows = 1, numCols = 1) {
    const sheet = this;
    const each = (fn) => {
      for (let r = 0; r < numRows; r += 1) for (let c = 0; c < numCols; c += 1) fn(row + r, col + c, r, c);
    };
    const range = {
      getValues() {
        const out = [];
        for (let r = 0; r < numRows; r += 1) {
          const line = [];
          for (let c = 0; c < numCols; c += 1) {
            const v = (sheet.cells[row - 1 + r] || [])[col - 1 + c];
            line.push(v === undefined ? '' : v);
          }
          out.push(line);
        }
        return out;
      },
      getValue() { return range.getValues()[0][0]; },
      setValues(values) {
        each((R, C, r, c) => {
          while (sheet.cells.length < R) sheet.cells.push([]);
          sheet.cells[R - 1][C - 1] = values[r][c];
        });
        return range;
      },
      setValue(v) { return range.setValues([[v]]); },
      setBackground(colour) { each((R, C) => { sheet.bg[`${R},${C}`] = colour; }); return range; },
      setFontColor(colour) { each((R, C) => { sheet.fg[`${R},${C}`] = colour; }); return range; },
      setFontWeight() { return range; },
    };
    return range;
  }
}

function loadAddon() {
  const sheets = {};
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => { sheets[n] = new FakeSheet(n); return sheets[n]; },
  };
  const context = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => ({}) },
    LockService: { getDocumentLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { formatDate: () => '2026-10-13' },
    Session: { getScriptTimeZone: () => 'Australia/Melbourne' },
    HtmlService: {},
  };
  vm.createContext(context);
  const dir = path.join(__dirname, '..', 'apps-script');
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'lib', 'core.js'), 'utf8'), context, { filename: 'Core.gs' });
  vm.runInContext(fs.readFileSync(path.join(dir, 'Code.gs'), 'utf8'), context, { filename: 'Code.gs' });
  return { context, sheets };
}

// Arrays made inside the vm context have a different prototype.
const plain = (x) => JSON.parse(JSON.stringify(x));

const EXHIBIT1 = { 1: 'DONE', 2: 'W', 3: 'DONE', 4: 'DONE', 5: 'DONE', '6a': 'DONE', '6b': 'DONE', 7: 'C', 8: 'BLANK', 9: 'DONE', 10: 'DONE', 11: 'DONE' };

test('Core.gs is an up-to-date copy of lib/core.js', () => {
  const core = fs.readFileSync(path.join(__dirname, '..', 'lib', 'core.js'), 'utf8');
  const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Core.gs'), 'utf8');
  assert.ok(gs.endsWith(core), 'run npm run build:gas');
});

test('the add-on marks once and writes all four tabs', () => {
  const { context, sheets } = loadAddon();
  context.setupDemo();
  const setup = context.getSetup();
  assert.deepEqual(plain(setup.students), ['Phoenix Hu', 'Justin Dong', 'William Wu']);
  assert.equal(setup.tests[0].questions.length, 12);

  const payload = { student: 'Phoenix Hu', testId: 'MT8A', outcomes: EXHIBIT1, timing: { start: '16:05', end1: '16:52', end2: '16:58', checks: 1 } };
  assert.throws(() => context.applyMarking(payload), /Q8 was left blank/);

  const preview = context.previewMarking(payload);
  assert.equal(preview.score.pct, 72.7);

  const out = context.applyMarking({ ...payload, blankResolutions: { 8: 'didnt_know' } });
  assert.equal(out.exhibit1Rows, 12);
  assert.equal(out.exhibit3, 'Module 8 attempt A');

  const marking = sheets['Marking Sheet'].cells;
  assert.equal(marking.length, 13);
  assert.deepEqual(plain(marking[2].slice(4, 7)), ['2', '8.2', 'W']);
  assert.equal(marking[9][6], '\\Blank\\');

  const progress = sheets.Progress;
  const row82 = progress.cells.findIndex((r) => r[0] === '8.2') + 1;
  assert.equal(progress.cells[row82 - 1][3], 'Not understood');
  assert.equal(progress.bg[`${row82},4`], '#e06666');
  assert.equal(progress.cells[row82 - 1][4], 'Partial', 'other students untouched');

  const stats = sheets['Exam Stats'];
  const m8a = 3 + 7 * 4;
  assert.equal(stats.cells[1][m8a - 1], '72.7');
  assert.equal(stats.bg[`2,${m8a}`], '#f3c94e');

  assert.deepEqual(plain(sheets['Exam Log'].cells[1]), ['2026-10-13', 'Phoenix Hu', 'Module Test 8A', '16:05', '16:52', '16:58', 1, 72.7]);
});

test('a retest goes into the next attempt slot, with *P for a tutor pass', () => {
  const { context, sheets } = loadAddon();
  context.setupDemo();
  const payload = { student: 'Justin Dong', testId: 'MT8A', outcomes: EXHIBIT1, blankResolutions: { 8: 'time' } };
  context.applyMarking(payload);
  context.applyMarking({ ...payload, decision: { tutorPass: true } });
  const m8 = 3 + 7 * 4;
  assert.equal(sheets['Exam Stats'].cells[2][m8 - 1], '72.7');
  assert.equal(sheets['Exam Stats'].cells[2][m8], '72.7 *P');
});

test('the add-on checks everything before writing anything', () => {
  const { context, sheets } = loadAddon();
  context.setupDemo();
  const payload = { student: 'Phoenix Hu', testId: 'MT8A', outcomes: EXHIBIT1, blankResolutions: { 8: 'time' } };

  // No row for the student in Exam Stats: refused, and no tab changes.
  sheets['Exam Stats'].cells.splice(1, 1);
  const snapshot = () => JSON.stringify(['Marking Sheet', 'Progress', 'Exam Log'].map((n) => sheets[n].cells));
  const before = snapshot();
  assert.throws(() => context.applyMarking(payload), /No row for "Phoenix Hu".*Nothing was written/);
  assert.equal(snapshot(), before);

  // A renamed column: refused before any write.
  const fresh = loadAddon();
  fresh.context.setupDemo();
  fresh.sheets['Marking Sheet'].cells[0][6] = 'Result';
  const rows = fresh.sheets['Marking Sheet'].cells.length;
  assert.throws(() => fresh.context.applyMarking(payload), /column 7 should be "Outcome"/);
  assert.equal(fresh.sheets['Marking Sheet'].cells.length, rows);
});

test('swapped attempt headers and a stale preview are refused before writing', () => {
  const { context, sheets } = loadAddon();
  context.setupDemo();
  const payload = { student: 'Phoenix Hu', testId: 'MT8A', outcomes: EXHIBIT1, blankResolutions: { 8: 'time' } };
  const header = sheets['Exam Stats'].cells[0];
  const a = header.indexOf('M8 A');
  [header[a], header[a + 1]] = [header[a + 1], header[a]];
  const rows = sheets['Marking Sheet'].cells.length;
  assert.throws(() => context.applyMarking(payload), /should be headed "M8 A" but is "M8 B"/);
  assert.equal(sheets['Marking Sheet'].cells.length, rows);

  const other = loadAddon();
  other.context.setupDemo();
  assert.throws(() => other.context.applyMarking({ ...payload, student: 'Justin Dong', previewed: { student: 'Phoenix Hu', testId: 'MT8A' } }), /preview on screen is for Phoenix Hu/);
  assert.equal(other.sheets['Marking Sheet'].cells.length, 1);
});
