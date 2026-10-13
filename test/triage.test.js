const test = require('node:test');
const assert = require('node:assert/strict');

const triage = require('../lib/triage');
const views = require('../lib/views');
const { buildSeed } = require('../lib/seed');

// Tuesday 13 October 2026, the hackathon day.
const NOW = new Date(2026, 9, 13, 14, 15);

function fresh() {
  return buildSeed(NOW);
}

function run(state, id, opts) {
  const m = state.inbox.find((x) => x.id === id);
  return triage.triageRules(m, views.messageContext(state, m), opts);
}

test('every seeded message gets the expected primary intent', () => {
  const state = fresh();
  const expected = {
    m1: 'leave', m2: 'switch_online', m3: 'test_status', m4: 'academic_question', m5: 'progress_request',
    m6: 'qa_booking', m7: 'admin', m8: 'demo_check', m9: 'feedback',
  };
  for (const [id, intent] of Object.entries(expected)) {
    assert.equal(run(state, id).primary, intent, id);
  }
});

test('Chinese leave request: Chinese draft, leave + teacher actions', () => {
  const t = run(fresh(), 'm1');
  assert.equal(t.replyLanguage, 'zh');
  assert.match(t.draft, /请假/);
  assert.match(t.draft, /Ms Wang/);
  assert.deepEqual(t.actions.map((a) => a.type), ['set_attendance', 'notify_teacher', 'log_parent_feedback']);
  assert.equal(t.urgency, 'today');
});

test('mixed-language SAC message: books Q&A, records SAC, asks to confirm 下周四', () => {
  const t = run(fresh(), 'm6');
  assert.equal(t.entities.date, '2026-10-22');
  assert.equal(t.entities.topic, 'Differentiation');
  const sac = t.actions.find((a) => a.type === 'record_sac');
  assert.deepEqual(sac.modules, [6, 7]);
  assert.ok(t.needsTutor.some((n) => n.includes('下周四')));
});

test('test status is answered only from the records', () => {
  const t = run(fresh(), 'm3');
  assert.match(t.draft, /39%/);
  assert.match(t.draft, /Module Test 6B/);
  assert.deepEqual(t.factWarnings, []);
});

test('thanks that mentions 积分 is feedback, not a maths question', () => {
  const t = run(fresh(), 'm9');
  assert.deepEqual(t.intents, ['feedback']);
  assert.match(t.draft, /积分清楚多了/);
});

test('fees go to the front desk', () => {
  const t = run(fresh(), 'm7');
  assert.equal(t.route, 'handover_admin');
  assert.ok(t.actions.some((a) => a.type === 'handover'));
});

test('the tutor can re-categorise a message', () => {
  const t = run(fresh(), 'm8', { forceIntent: 'qa_booking' });
  assert.equal(t.primary, 'qa_booking');
  assert.ok(t.recategorisedByTutor);
  assert.ok(t.actions.some((a) => a.type === 'book_qa'));
});

test('language and date helpers', () => {
  assert.equal(triage.detectLanguage('hi can I come online'), 'en');
  assert.equal(triage.detectLanguage('老师 我下周四有SAC 考differentiation 可以book一个Q&A吗'), 'mixed');
  assert.equal(triage.detectLanguage('Justin今天请假', ['Justin']), 'zh');
  assert.equal(triage.parseDate('明天可以吗', '2026-10-13').iso, '2026-10-14');
  assert.equal(triage.parseDate('see you this Thursday', '2026-10-13').iso, '2026-10-15');
  assert.equal(triage.parseDate('I sat the test last month', '2026-10-13'), null);
});

test('fact check flags numbers that are not in the records', () => {
  const facts = { en: ['Module 6 Test attempt A: 39% (Low band)'], zh: [] };
  assert.deepEqual(triage.checkDraftFacts('You got 39% last time', facts), []);
  assert.deepEqual(triage.checkDraftFacts('You got 93 % last time', facts), ['93% is not in the student\'s records']);
});
