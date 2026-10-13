const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../lib/core');
const { TESTS, POINTS } = require('../lib/syllabus');

const MT8A = TESTS.find((t) => t.id === 'MT8A');
const MT6B = TESTS.find((t) => t.id === 'MT6B');
const VCAA = TESTS.find((t) => t.id === 'VCAA23E1');

// Exhibit 1: Module Test 8A as marked in the brief.
const EXHIBIT1 = {
  1: 'DONE', 2: 'W', 3: 'DONE', 4: 'DONE', 5: 'DONE', '6a': 'DONE', '6b': 'DONE', 7: 'C', 8: 'BLANK', 9: 'DONE', 10: 'DONE', 11: 'DONE',
};

test('normaliseOutcome reads messy marks and rejects unknown ones', () => {
  assert.equal(core.normaliseOutcome('✓'), 'DONE');
  assert.equal(core.normaliseOutcome(' done '), 'DONE');
  assert.equal(core.normaliseOutcome('x'), 'W');
  assert.equal(core.normaliseOutcome('C'), 'C');
  assert.equal(core.normaliseOutcome('\\Blank\\'), 'BLANK');
  assert.equal(core.normaliseOutcome('-'), 'BLANK');
  assert.equal(core.normaliseOutcome('空'), 'BLANK');
  assert.equal(core.normaliseOutcome('maybe'), null);
});

test('parseQuickEntry handles compact, sequence and labelled input', () => {
  const compact = core.parseQuickEntry('✓x✓✓✓✓✓c-✓✓✓', MT8A);
  assert.equal(compact.mode, 'compact');
  assert.deepEqual(compact.missing, []);
  assert.equal(compact.outcomes['2'], 'W');
  assert.equal(compact.outcomes['8'], 'BLANK');

  const seq = core.parseQuickEntry('✓ w ✓ ✓ ✓ ✓ ✓ c blank ✓ ✓ ✓', MT8A);
  assert.equal(seq.mode, 'sequence');
  assert.deepEqual(seq.outcomes, Object.fromEntries(Object.entries(EXHIBIT1).map(([k, v]) => [String(k), v])));

  const labelled = core.parseQuickEntry('1 ✓, 2 x, 6A done, 8:-, 7=c', MT8A);
  assert.equal(labelled.mode, 'labelled');
  assert.equal(labelled.outcomes['6a'], 'DONE');
  assert.equal(labelled.outcomes['8'], 'BLANK');
  assert.equal(labelled.outcomes['7'], 'C');
  assert.ok(labelled.missing.includes('3'));

  const bad = core.parseQuickEntry('1 ✓, 2 ?', MT8A);
  assert.deepEqual(bad.unknown, ['2 ?']);
});

test('scores the Exhibit 1 paper and bands it as in Exhibit 3', () => {
  const s = core.scorePaper(MT8A, EXHIBIT1);
  assert.equal(s.total, 33);
  assert.equal(s.score, 24);
  assert.equal(s.pct, 72.7);
  assert.equal(s.band, 'mid');
  const withMethodMarks = core.scorePaper(MT8A, EXHIBIT1, { 7: 2 });
  assert.equal(withMethodMarks.score, 26);
  assert.equal(withMethodMarks.band, 'pass');
  assert.equal(core.band(39.9), 'low');
});

test('blank position: trailing means time, mid-paper means not known', () => {
  const b = core.analyseBlanks(MT6B, core.parseQuickEntry('✓✓✓✓x✓c✓--', MT6B).outcomes);
  assert.deepEqual(b.trailing, ['8', '9']);
  assert.deepEqual(b.isolated, []);
  assert.equal(b.suggestions['8'], 'time');
  const mid = core.analyseBlanks(MT8A, EXHIBIT1);
  assert.deepEqual(mid.isolated, ['8']);
  assert.equal(mid.suggestions['8'], 'didnt_know');
});

test('W is a knowledge gap, C keeps mastery', () => {
  const progress = { 8.2: 'mastered', '8.8.1': 'mastered', '8.8.2': 'partial' };
  const changes = core.proposeMasteryUpdates(MT8A, EXHIBIT1, progress, { 8: 'time' });
  const byPoint = Object.fromEntries(changes.map((c) => [c.point, c]));
  assert.equal(byPoint['8.2'].after, 'partial');
  assert.equal(byPoint['8.8.1'].after, 'mastered');
  assert.equal(byPoint['8.8.2'].after, 'partial');
  assert.equal(byPoint['8.9.2'].after, 'mastered');

  const fromScratch = core.proposeMasteryUpdates(MT8A, EXHIBIT1, {}, { 8: 'didnt_know' });
  const p = Object.fromEntries(fromScratch.map((c) => [c.point, c]));
  assert.equal(p['8.2'].after, 'not_understood');
  assert.equal(p['8.8.1'].after, 'partial');
  assert.equal(p['8.8.2'].after, 'not_understood');
});

test('unresolved blanks are flagged for the tutor', () => {
  const changes = core.proposeMasteryUpdates(MT8A, EXHIBIT1, {}, {});
  assert.ok(changes.find((c) => c.point === '8.8.2').needsTutor);
});

test('a point tested twice takes the weaker outcome', () => {
  const outcomes = Object.fromEntries(MT6B.questions.map((q) => [q.q, 'DONE']));
  outcomes['8'] = 'W';
  const changes = core.proposeMasteryUpdates(MT6B, outcomes, { 6.6: 'partial' }, {});
  const c = changes.find((x) => x.point === '6.6');
  assert.equal(c.after, 'not_understood');
  assert.equal(c.evidence.length, 2);
});

test('diagnosis separates gaps, methods, careless, time and checking', () => {
  const outcomes = core.parseQuickEntry('✓✓✓✓x✓c✓--', MT6B).outcomes;
  const timing = { start: '16:35', end1: '17:24', end2: '', checks: 0 };
  const changes = core.proposeMasteryUpdates(MT6B, outcomes, {}, { 8: 'time', 9: 'time' });
  const issues = core.diagnose(MT6B, outcomes, timing, changes, { 8: 'time', 9: 'time' });
  const codes = issues.map((i) => i.code);
  assert.deepEqual(codes, ['knowledge_gap', 'careless', 'time', 'checking']);
  assert.match(issues.find((i) => i.code === 'time').detail, /49 min against a 45 min limit/);
});

test('next step: pass moves on, mid-band retests, low band revises, last slot escalates', () => {
  const plan = (pct, attempts = 0) => core.suggestNextStep(MT8A, { pct }, [], { attempts: new Array(attempts).fill({ pct: 20 }) });
  assert.equal(plan(80).action, 'move_on');
  assert.equal(plan(60).action, 'schedule_retest');
  assert.equal(plan(30).action, 'revise_module');
  assert.equal(plan(60, 3).action, 'escalate_teacher');
  assert.equal(core.suggestNextStep(VCAA, { pct: 80 }, [], null).action, 'next_mock');
});

test('planMarking builds all three sheet updates for one paper', () => {
  const plan = core.planMarking({
    test: MT8A, outcomes: EXHIBIT1, timing: { start: '16:05', end1: '16:52', end2: '16:58', checks: 1 },
    blankResolutions: { 8: 'didnt_know' }, studentProgress: {}, examEntry: { attempts: [] }, points: POINTS,
  });
  assert.equal(plan.exhibit1.length, 12);
  assert.equal(plan.exhibit3.slot, 'A');
  assert.equal(plan.exhibit3.band, 'mid');
  assert.equal(plan.examLog.pct, 72.7);
  assert.deepEqual(plan.unresolvedBlanks, []);
  assert.ok(plan.exhibit2.summaryAfter.covered > plan.exhibit2.summaryBefore.covered);
});

test('progressSummary matches the Exhibit 2 definitions', () => {
  const s = core.progressSummary({ 1.1: 'mastered', 1.2: 'partial', 1.3: 'not_understood' }, POINTS.slice(0, 4));
  assert.equal(s.total, 4);
  assert.equal(s.covered, 3);
  assert.equal(s.understood, 2);
  assert.equal(s.mastered, 1);
  assert.equal(s.masteredOfCoveredPct, 33.3);
});

test('moduleStatus honours tutor passes and attempt limits', () => {
  assert.equal(core.moduleStatus({ attempts: [{ pct: 72, tutorPass: true }] }), 'passed');
  assert.equal(core.moduleStatus({ attempts: [{ pct: 50 }] }), 'retest_due');
  assert.equal(core.moduleStatus({ attempts: [{ pct: 1 }, { pct: 2 }, { pct: 3 }, { pct: 4 }] }), 'attempts_used');
  assert.equal(core.nextAttemptSlot({ attempts: [{}, {}] }), 'C');
});
