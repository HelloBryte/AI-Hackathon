// The JSON API as a plain function, so the same routes serve the Node server
// (server.js) and the single-file browser build (static/local-api.js).
//
// store: { state, save(), reset() }

const { MODULES, POINTS, TESTS } = require('./syllabus');
const { isoDate } = require('./seed');
const core = require('./core');
const views = require('./views');
const actions = require('./actions');
const ai = require('./ai');
const triage = require('./triage');
const csv = require('./csv');

function fullState(store, aiStatus) {
  const state = store.state;
  return {
    state,
    views: {
      briefing: views.buildBriefing(state),
      report: views.buildDailyReport(state),
      examTable: views.examStatsTable(state),
      pendingPapers: views.pendingPapersFor(state),
    },
    ai: aiStatus,
    syllabus: { modules: MODULES, points: POINTS, tests: TESTS },
    constants: {
      masteryLabel: core.MASTERY_LABEL,
      nextSteps: core.NEXT_STEPS,
      blankReasons: core.BLANK_REASONS,
      intentLabels: triage.INTENT_LABELS,
      routes: triage.ROUTES,
      passPct: core.PASS_PCT,
      lowPct: core.LOW_PCT,
    },
  };
}

function createApi({ store, triageFn = ai.triageMessage, aiStatus = ai.status, now = () => new Date() }) {
  const routes = [];
  const route = (method, pattern, handler) => routes.push({ method, pattern, handler });
  const saved = (fn) => (m, body) => {
    const out = fn(m, body);
    store.save();
    return out;
  };

  route('GET', /^\/api\/status$/, () => ({ ok: true, ai: aiStatus(), today: store.state.today }));
  route('GET', /^\/api\/state$/, () => fullState(store, aiStatus()));
  route('GET', /^\/api\/students\/([\w-]+)$/, (m) => {
    const p = views.studentProfile(store.state, m[1]);
    if (!p) throw new actions.ActionError('Unknown student', 404);
    return p;
  });

  route('POST', /^\/api\/marking\/preview$/, (m, body) => actions.previewMarking(store.state, body));
  route('POST', /^\/api\/marking\/parse$/, (m, body) => {
    const test = TESTS.find((t) => t.id === body.testId);
    if (!test) throw new actions.ActionError('Unknown test', 404);
    return core.parseQuickEntry(body.text, test);
  });
  route('POST', /^\/api\/marking\/apply$/, saved((m, body) => actions.applyMarking(store.state, body, now())));

  route('POST', /^\/api\/inbox\/([\w-]+)\/triage$/, async (m, body) => {
    const msg = store.state.inbox.find((x) => x.id === m[1]);
    if (!msg) throw new actions.ActionError('Unknown message', 404);
    const ctx = views.messageContext(store.state, msg);
    const result = body.intent
      ? { ...triage.triageRules(msg, ctx, { forceIntent: body.intent }), aiError: null }
      : await triageFn(msg, ctx, { forceRules: !!body.forceRules });
    actions.storeTriage(store.state, msg.id, result);
    store.save();
    return msg;
  });
  route('POST', /^\/api\/inbox\/([\w-]+)\/approve$/, saved((m, body) => actions.approveMessage(store.state, m[1], body, now())));

  route('POST', /^\/api\/timetable\/([\w-]+)\/checkin$/, saved((m) => actions.checkIn(store.state, m[1], now())));
  route('POST', /^\/api\/qa\/log$/, saved((m, body) => actions.logQa(store.state, body, now())));
  route('POST', /^\/api\/demo-review$/, saved((m, body) => actions.demoReview(store.state, body, now())));
  route('POST', /^\/api\/sac-answer$/, saved((m, body) => actions.recordSacAnswer(store.state, body, now())));
  route('POST', /^\/api\/retests\/([\w-]+)\/schedule$/, saved((m, body) => actions.resolveRetest(store.state, m[1], body)));
  route('POST', /^\/api\/handovers\/([\w-]+)\/close$/, saved((m) => actions.closeHandover(store.state, m[1])));
  route('POST', /^\/api\/report\/signoff$/, saved((m, body) => actions.signOff(store.state, body, now())));
  route('POST', /^\/api\/demo\/simulate$/, saved(() => actions.simulateAfternoon(store.state, now())));
  route('POST', /^\/api\/reset$/, () => {
    store.reset();
    return { ok: true };
  });

  const exportsBySheet = { exhibit1: csv.exhibit1, exhibit2: csv.exhibit2, exhibit3: csv.exhibit3 };

  /** Returns { status, body } for JSON, or { status, csv, filename } for exports. */
  return async function handle(method, pathname, body = {}) {
    try {
      // Demo data is relative to today: reseed when the date changes.
      if (store.state.today !== isoDate(now())) store.reset();

      const exp = /^\/api\/export\/(exhibit[123])\.csv$/.exec(pathname);
      if (exp && method === 'GET') {
        return { status: 200, csv: exportsBySheet[exp[1]](store.state), filename: `${exp[1]}-${store.state.today}.csv` };
      }
      for (const r of routes) {
        if (r.method !== method) continue;
        const m = r.pattern.exec(pathname);
        if (!m) continue;
        return { status: 200, body: await r.handler(m, body) };
      }
      return { status: 404, body: { error: 'Not found' } };
    } catch (err) {
      const status = err instanceof actions.ActionError ? err.status : 500;
      if (status === 500 && typeof console !== 'undefined') console.error(err);
      return { status, body: { error: status === 500 ? 'Internal error' : err.message } };
    }
  };
}

module.exports = { createApi, fullState };
