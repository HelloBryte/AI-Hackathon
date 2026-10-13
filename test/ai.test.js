const test = require('node:test');
const assert = require('node:assert/strict');

const ai = require('../lib/ai');
const views = require('../lib/views');
const { buildSeed } = require('../lib/seed');

const NOW = new Date(2026, 9, 13, 14, 15);

function setup(id) {
  const state = buildSeed(NOW);
  const message = state.inbox.find((m) => m.id === id);
  return { state, message, ctx: views.messageContext(state, message) };
}

function fakeClient(output, extra = {}) {
  const calls = [];
  return {
    calls,
    beta: {
      messages: {
        create: async (params) => {
          calls.push(params);
          if (extra.throws) throw extra.throws;
          return {
            model: params.model,
            stop_reason: extra.stopReason || 'end_turn',
            content: [{ type: 'text', text: JSON.stringify(output) }],
            usage: { input_tokens: 1500, output_tokens: 300 },
          };
        },
      },
    },
  };
}

const CLAUDE_OUT = {
  language: 'zh',
  intents: ['leave', 'feedback'],
  primary_intent: 'leave',
  summary: '[STUDENT] has a fever and will miss today\'s lesson',
  module: 0,
  topic: '',
  date_mentioned: '2026-10-13',
  confidence: 0.95,
  needs_tutor: [],
  draft_reply: '[STUDENT]家长您好！收到，今天16:00的课已请假，已转告Ms Wang。祝[STUDENT]早日康复！',
  tutor_hint: '',
};

test('names are masked before sending and restored in the draft', async () => {
  const { message, ctx } = setup('m1');
  const client = fakeClient(CLAUDE_OUT);
  const t = await ai.triageMessage(message, ctx, { client });
  const sent = client.calls[0].messages[0].content;
  assert.ok(!/Justin/.test(sent), 'student name leaked');
  assert.ok(!/Dong/.test(sent), 'surname leaked');
  assert.match(sent, /\[STUDENT\]今天有点发烧/);
  assert.equal(t.mode, 'claude');
  assert.match(t.draft, /^Justin家长您好/);
  assert.equal(t.summary, "Justin has a fever and will miss today's lesson");
  assert.deepEqual(t.actions.map((a) => a.type), ['set_attendance', 'notify_teacher', 'log_parent_feedback']);
  assert.deepEqual(t.usage, { input: 1500, output: 300 });
});

test('request uses structured output, low effort and refusal fallbacks', async () => {
  const { message, ctx } = setup('m1');
  const client = fakeClient(CLAUDE_OUT);
  await ai.triageMessage(message, ctx, { client, model: 'claude-opus-5-5' });
  const p = client.calls[0];
  assert.equal(p.model, 'claude-opus-5-5');
  assert.equal(p.output_config.effort, 'low');
  assert.equal(p.output_config.format.type, 'json_schema');
  assert.equal(p.fallbacks, 'default');
  assert.deepEqual(p.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(p.thinking, undefined);
});

test('an invented percentage is flagged and a disagreement is surfaced', async () => {
  const { message, ctx } = setup('m3');
  const client = fakeClient({
    ...CLAUDE_OUT, language: 'en', intents: ['feedback'], primary_intent: 'feedback',
    draft_reply: 'Hi [STUDENT], you got 93% so you passed!', date_mentioned: '',
  });
  const t = await ai.triageMessage(message, ctx, { client });
  assert.deepEqual(t.factWarnings, ['93% is not in the student\'s records']);
  assert.ok(t.needsTutor.some((n) => n.includes('Rules classifier')));
});

test('API errors and refusals fall back to the rules engine', async () => {
  const { message, ctx } = setup('m2');
  const failing = fakeClient(CLAUDE_OUT, { throws: new Error('socket hang up') });
  const t1 = await ai.triageMessage(message, ctx, { client: failing });
  assert.equal(t1.mode, 'rules');
  assert.equal(t1.aiError, 'socket hang up');
  assert.equal(t1.primary, 'switch_online');

  const refusing = fakeClient(CLAUDE_OUT, { stopReason: 'refusal' });
  const t2 = await ai.triageMessage(message, ctx, { client: refusing });
  assert.equal(t2.mode, 'rules');
  assert.match(t2.aiError, /declined/);
});

test('no client means rules mode with nothing sent', async () => {
  const { message, ctx } = setup('m4');
  const t = await ai.triageMessage(message, ctx, { client: null });
  assert.equal(t.mode, 'rules');
  assert.equal(t.sentToAI, null);
});
