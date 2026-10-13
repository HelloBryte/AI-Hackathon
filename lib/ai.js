// Claude drafts the wording of WeChat replies. Everything else stays in code:
// facts come from the records (triage.buildFacts), side effects come from
// triage.planActions, and the tutor approves before anything is sent.
//
// Privacy: student, parent and school names are swapped for placeholders
// before the message leaves the centre, and swapped back in the draft.
// If there is no API key, the SDK is missing, or the call fails, the rules
// engine in lib/triage.js answers instead and the UI says so.

const triage = require('./triage');

let AnthropicSDK = null;
try {
  AnthropicSDK = require('@anthropic-ai/sdk');
} catch (err) {
  AnthropicSDK = null;
}

const DEFAULT_MODEL = 'claude-opus-5-5';
// Models that accept server-side refusal fallbacks (fallbacks: "default").
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);
const INTENTS = Object.keys(triage.INTENT_LABELS);

function config() {
  return {
    model: process.env.SHIFTMATE_MODEL || DEFAULT_MODEL,
    mode: (process.env.SHIFTMATE_AI || 'auto').toLowerCase(),
  };
}

let cachedClient;

function getClient() {
  if (cachedClient !== undefined) return cachedClient;
  const { mode } = config();
  const hasCredentials = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (mode === 'off' || !AnthropicSDK || (!hasCredentials && mode !== 'on')) {
    cachedClient = null;
    return cachedClient;
  }
  const Anthropic = AnthropicSDK.default || AnthropicSDK;
  try {
    cachedClient = new Anthropic({ timeout: 45000, maxRetries: 1 });
  } catch (err) {
    cachedClient = null;
  }
  return cachedClient;
}

function status() {
  const client = getClient();
  const { model, mode } = config();
  let reason = '';
  if (!client) {
    if (mode === 'off') reason = 'AI switched off (SHIFTMATE_AI=off)';
    else if (!AnthropicSDK) reason = 'Anthropic SDK not installed (run npm install)';
    else reason = 'No ANTHROPIC_API_KEY set';
  }
  return { enabled: !!client, model: client ? model : null, reason };
}

// ---------------------------------------------------------------------------
// Pseudonymisation
// ---------------------------------------------------------------------------

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAliases(ctx) {
  const s = ctx.student;
  const parts = s.name.split(' ');
  const aliases = [[s.name, '[STUDENT]'], [parts[0], '[STUDENT]']];
  if (parts.length > 1 && parts.slice(1).join(' ').length > 1) aliases.push([parts.slice(1).join(' '), '[SURNAME]']);
  if (s.parent && s.parent.name) aliases.push([s.parent.name, '[PARENT]']);
  if (s.school) aliases.push([s.school, '[SCHOOL]']);
  if (s.chineseName) aliases.push([s.chineseName, '[STUDENT]']);
  return aliases.sort((a, b) => b[0].length - a[0].length);
}

function pseudonymise(text, aliases) {
  let out = String(text || '');
  for (const [real, token] of aliases) {
    // Latin names match as whole words; Chinese text has no spaces, so
    // "Justin今天" must still match "Justin".
    const latin = /^[\x20-\x7e]+$/.test(real);
    const re = latin
      ? new RegExp(`(?<![A-Za-z])${escapeRe(real)}(?![A-Za-z])`, 'gi')
      : new RegExp(escapeRe(real), 'g');
    out = out.replace(re, token);
  }
  return out;
}

function reidentify(text, ctx) {
  const s = ctx.student;
  const parts = s.name.split(' ');
  return String(text || '')
    .replace(/\[STUDENT\]/g, parts[0])
    .replace(/\[SURNAME\]/g, parts.slice(1).join(' '))
    .replace(/\[PARENT\]/g, s.parent ? s.parent.name : 'there')
    .replace(/\[SCHOOL\]/g, s.school || 'school');
}

// ---------------------------------------------------------------------------
// Prompt and output schema
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You help the Learning Support Tutor at a mathematics tutoring centre in Melbourne handle Work WeChat messages from VCE Mathematical Methods students (most are minors) and their parents. You prepare a draft; the tutor reads, edits and sends it. You never send anything and never make decisions about students.

Classify the message with these intents: ${INTENTS.map((i) => `${i} (${triage.INTENT_LABELS[i]})`).join(', ')}. List every intent that applies, most important first, and set primary_intent to the first one.

Write draft_reply:
- In the sender's language. For a Chinese or mixed Chinese/English message, reply in Chinese and keep the course words the sender used in English (Module, SAC, Demo, Q&A, maths terms). For an English message, reply in English.
- Short and warm, WeChat style: 1-3 sentences, up to 5 for a parent asking about progress.
- Quote marks, dates, percentages, bookings and lesson times only from the FACTS block. Never invent or estimate them. If something needed is missing, say the tutor will confirm.
- Names are replaced by placeholders such as [STUDENT], [SURNAME], [PARENT] and [SCHOOL]. Use the placeholders exactly as written; never guess real names.
- Do not teach maths in the reply. For a maths question, acknowledge it and say it will be covered in the lesson or a Q&A session, and put a short, correct worked explanation for the tutor in tutor_hint. Otherwise tutor_hint is an empty string.
- Fees, invoices, refunds, enrolment and complaints are outside the tutor's authority: say the message has been passed to the front desk.
- Passing a Demo, scheduling a Retest and judging progress are the tutor's decisions: do not promise outcomes.

Also return summary (one English line for the tutor), module (integer, 0 if none), topic (short English maths topic or empty string), date_mentioned (YYYY-MM-DD if the message names a day, resolved against TODAY, else empty string), confidence (0 to 1) and needs_tutor (short English reasons the tutor should look closely; empty array if routine).`;

const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    language: { type: 'string', enum: ['en', 'zh', 'mixed'] },
    intents: { type: 'array', items: { type: 'string', enum: INTENTS } },
    primary_intent: { type: 'string', enum: INTENTS },
    summary: { type: 'string' },
    module: { type: 'integer' },
    topic: { type: 'string' },
    date_mentioned: { type: 'string' },
    confidence: { type: 'number' },
    needs_tutor: { type: 'array', items: { type: 'string' } },
    draft_reply: { type: 'string' },
    tutor_hint: { type: 'string' },
  },
  required: ['language', 'intents', 'primary_intent', 'summary', 'module', 'topic', 'date_mentioned',
    'confidence', 'needs_tutor', 'draft_reply', 'tutor_hint'],
  additionalProperties: false,
};

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildUserContent(message, ctx, facts, aliases) {
  const weekday = WEEKDAY[new Date(`${ctx.today}T00:00:00`).getDay()];
  const sender = message.relation === 'parent' ? 'a parent of [STUDENT]' : 'the student [STUDENT]';
  return [
    `TODAY: ${ctx.today} (${weekday})`,
    `SENDER: ${sender}`,
    'MESSAGE:',
    '"""',
    pseudonymise(message.text, aliases),
    '"""',
    'FACTS from the centre\'s records (the only facts you may quote):',
    ...facts.map((f) => `- ${pseudonymise(f, aliases)}`),
  ].join('\n');
}

function describeError(err) {
  const Anthropic = AnthropicSDK ? (AnthropicSDK.default || AnthropicSDK) : null;
  if (Anthropic && err instanceof Anthropic.AuthenticationError) return 'API key rejected';
  if (Anthropic && err instanceof Anthropic.RateLimitError) return 'Rate limited';
  if (Anthropic && err instanceof Anthropic.APIConnectionError) return 'Could not reach the Claude API';
  if (Anthropic && err instanceof Anthropic.APIError) return `Claude API error ${err.status}`;
  return err && err.message ? err.message : String(err);
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function mergeClaudeOutput(out, rules, message, ctx, factSheet, userContent, response) {
  const listed = (Array.isArray(out.intents) ? out.intents : []).filter((i) => INTENTS.includes(i));
  const primary = INTENTS.includes(out.primary_intent) ? out.primary_intent : (listed[0] || 'other');
  const intents = [primary, ...listed.filter((i) => i !== primary)];

  // Dates and modules found by the rules win: they are deterministic.
  const entities = { ...rules.entities };
  if (!entities.module && Number(out.module) > 0) entities.module = Number(out.module);
  if (!entities.topic && out.topic) entities.topic = out.topic;
  if (!entities.date && /^\d{4}-\d{2}-\d{2}$/.test(out.date_mentioned || '')) {
    entities.date = out.date_mentioned;
    entities.datePhrase = out.date_mentioned;
    entities.dateNeedsConfirm = true;
  }

  const draft = reidentify(out.draft_reply, ctx);
  const confidence = clamp01(out.confidence);
  const needsTutor = [
    ...(Array.isArray(out.needs_tutor) ? out.needs_tutor : []),
    ...triage.needsTutorReasons(intents, entities, message, confidence),
  ];
  if (rules.primary !== primary && rules.primary !== 'other') {
    needsTutor.push(`Rules classifier read this as "${triage.INTENT_LABELS[rules.primary]}": check the category`);
  }
  const language = ['en', 'zh', 'mixed'].includes(out.language) ? out.language : rules.language;

  return {
    mode: 'claude',
    model: response.model || config().model,
    language,
    replyLanguage: language === 'en' ? 'en' : 'zh',
    intents,
    primary,
    route: triage.ROUTE_FOR_INTENT[primary],
    urgency: triage.urgencyOf(primary, entities, ctx),
    confidence,
    summary: reidentify(out.summary, ctx),
    entities,
    facts: factSheet,
    actions: triage.planActions(intents, entities, ctx, message),
    needsTutor: [...new Set(needsTutor)],
    draft,
    tutorHint: reidentify(out.tutor_hint || '', ctx),
    factWarnings: triage.checkDraftFacts(draft, factSheet),
    sentToAI: userContent,
    usage: response.usage
      ? { input: response.usage.input_tokens || 0, output: response.usage.output_tokens || 0 }
      : null,
    rulesPrimary: rules.primary,
  };
}

/**
 * Triage one message. Uses Claude when available and falls back to the
 * rules engine (with the reason recorded) on any failure.
 */
async function triageMessage(message, ctx, opts = {}) {
  const rules = triage.triageRules(message, ctx);
  const client = opts.client !== undefined ? opts.client : getClient();
  if (!client || opts.forceRules) return { ...rules, aiError: null };

  const aliases = buildAliases(ctx);
  // Give the model the full fact sheet, not just what the rules guessed.
  const factSheet = triage.buildFacts(ctx, ['test_status', 'progress_request'], rules.entities);
  const userContent = buildUserContent(message, ctx, factSheet.en, aliases);
  const model = opts.model || config().model;

  const params = {
    model,
    max_tokens: 4096,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userContent }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: TRIAGE_SCHEMA } },
  };
  if (FALLBACK_MODELS.has(model)) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  try {
    const response = await client.beta.messages.create(params);
    if (response.stop_reason === 'refusal') throw new Error('Claude declined to draft this message');
    if (response.stop_reason === 'max_tokens') throw new Error('Claude response was cut off');
    const text = (response.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const out = JSON.parse(text);
    return { ...mergeClaudeOutput(out, rules, message, ctx, factSheet, userContent, response), aiError: null };
  } catch (err) {
    return { ...rules, aiError: describeError(err), sentToAI: userContent };
  }
}

module.exports = {
  DEFAULT_MODEL,
  SYSTEM_PROMPT,
  TRIAGE_SCHEMA,
  status,
  getClient,
  buildAliases,
  pseudonymise,
  reidentify,
  buildUserContent,
  mergeClaudeOutput,
  triageMessage,
};
