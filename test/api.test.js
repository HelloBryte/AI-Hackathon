const test = require('node:test');
const assert = require('node:assert/strict');

const { createApi } = require('../lib/api');
const { buildSeed } = require('../lib/seed');
const triage = require('../lib/triage');

const NOW = new Date(2026, 9, 13, 15, 0);

function setup() {
  const store = {
    state: buildSeed(NOW),
    saves: 0,
    save() { this.saves += 1; },
    reset() { this.state = buildSeed(NOW); },
  };
  const handle = createApi({
    store,
    now: () => NOW,
    aiStatus: () => ({ enabled: false, model: null, reason: 'test' }),
    triageFn: async (m, ctx) => ({ ...triage.triageRules(m, ctx), aiError: null }),
  });
  return { store, handle };
}

const PHOENIX = { paperId: 'p1', outcomes: { 1: 'DONE', 2: 'W', 3: 'DONE', 4: 'DONE', 5: 'DONE', '6a': 'DONE', '6b': 'DONE', 7: 'C', 8: 'BLANK', 9: 'DONE', 10: 'DONE', 11: 'DONE' } };

test('mark once writes Exhibits 1, 2, 3 and the exam log together', async () => {
  const { store, handle } = setup();
  const before = store.state.progress.phoenix['8.2'];
  const blocked = await handle('POST', '/api/marking/apply', PHOENIX);
  assert.equal(blocked.status, 400);
  assert.match(blocked.body.error, /Q8/);

  const res = await handle('POST', '/api/marking/apply', { ...PHOENIX, blankResolutions: { 8: 'didnt_know' }, decision: { addQa: true } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const s = store.state;
  const record = s.markingRecords.find((r) => r.studentId === 'phoenix' && r.testId === 'MT8A');
  assert.equal(record.rows.length, 12);
  assert.equal(record.pct, 72.7);
  assert.equal(before, 'partial');
  assert.equal(s.progress.phoenix['8.2'], 'not_understood');
  assert.equal(s.progress.phoenix['8.8.1'], 'partial');
  assert.deepEqual(s.examStats.phoenix[8].attempts.map((a) => [a.slot, a.pct]), [['A', 72.7]]);
  assert.equal(s.examLog.phoenix.slice(-1)[0].paper, 'Module Test 8A');
  assert.ok(!s.pendingPapers.some((p) => p.id === 'p1'));
  assert.ok(s.retests.some((r) => r.studentId === 'phoenix' && r.module === 8 && r.status === 'to_schedule'));
  assert.ok(s.qaQueue.some((q) => q.point === '8.2'));
  assert.match(res.body.parentNote, /Module Test 8A/);
  assert.equal(res.body.parentNoteLang, 'zh');
});

test('a tutor pass below 75% is recorded as *P and moves the student on', async () => {
  const { store, handle } = setup();
  const res = await handle('POST', '/api/marking/apply', {
    ...PHOENIX, blankResolutions: { 8: 'time' }, decision: { action: 'move_on', tutorPass: true },
  });
  assert.equal(res.status, 200);
  assert.equal(store.state.examStats.phoenix[8].attempts[0].tutorPass, true);
  assert.equal(store.state.students.find((x) => x.id === 'phoenix').currentModule, 9);
  assert.ok(store.state.audit.slice(-1)[0].overridden);
});

test('approving a reply applies only the ticked actions', async () => {
  const { store, handle } = setup();
  await handle('POST', '/api/inbox/m1/triage', {});
  const msg = store.state.inbox.find((m) => m.id === 'm1');
  const res = await handle('POST', '/api/inbox/m1/approve', { reply: msg.triage.draft, actions: [0, 2] });
  assert.equal(res.status, 200);
  assert.equal(store.state.timetable.find((t) => t.studentId === 'justin').status, 'leave');
  assert.equal(store.state.teacherNotices.length, 0);
  const again = await handle('POST', '/api/inbox/m1/approve', { reply: 'x', actions: [] });
  assert.equal(again.status, 400);
});

test('the daily report counts the day', async () => {
  const { handle } = setup();
  await handle('POST', '/api/marking/apply', { ...PHOENIX, blankResolutions: { 8: 'didnt_know' } });
  await handle('POST', '/api/inbox/m9/triage', {});
  const m9 = (await handle('GET', '/api/state')).body.state.inbox.find((m) => m.id === 'm9');
  await handle('POST', '/api/inbox/m9/approve', { reply: m9.triage.draft, actions: [0] });
  await handle('POST', '/api/demo/simulate', {});
  const { report } = (await handle('GET', '/api/state')).body.views;
  assert.equal(report.counts.testsMarked, 1);
  assert.equal(report.counts.parentFeedback, 1);
  assert.equal(report.counts.repliesSent, 1);
  assert.ok(report.counts.onSite >= 6);
  assert.ok(report.counts.qaQuestions > 0);
  assert.match(report.text, /Test papers marked: 1/);
  const signed = await handle('POST', '/api/report/signoff', { manager: 'Ms Park' });
  assert.equal(signed.body.signedBy, 'Ms Park');
});

test('Demo check: the tutor decides, and only then is the test booked', async () => {
  const { store, handle } = setup();
  const res = await handle('POST', '/api/demo-review', {
    studentId: 'mickey', module: 7, checks: { working: true, accuracy: true, method: true, concepts: false }, outcome: 'meets',
  });
  assert.equal(res.status, 200);
  assert.ok(store.state.testBookings.some((b) => b.studentId === 'mickey' && b.module === 7));
  assert.ok(store.state.audit.slice(-1)[0].overridden);
});

test('CSV exports keep the exhibit layout and neutralise formulas', async () => {
  const { store, handle } = setup();
  store.state.students[0].name = '=HYPERLINK("x")';
  const x1 = await handle('GET', '/api/export/exhibit1.csv');
  assert.match(x1.csv, /^Student,Test,Date,Attempt,Question,Syllabus point,Outcome/);
  const x3 = await handle('GET', '/api/export/exhibit3.csv');
  assert.match(x3.csv, /Module 1 A/);
  assert.match(x3.csv, /72 \*P/);
  assert.match(x3.csv, /"'=HYPERLINK\(""x""\)"/);
});

test('unknown routes and bad input return clean errors', async () => {
  const { handle } = setup();
  assert.equal((await handle('GET', '/api/nope')).status, 404);
  assert.equal((await handle('POST', '/api/marking/apply', { paperId: 'zzz' })).status, 404);
  assert.equal((await handle('POST', '/api/timetable/t1/checkin', {})).status, 200);
});
