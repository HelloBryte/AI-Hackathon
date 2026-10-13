// ShiftMate web prototype: zero-framework Node HTTP server.
//   npm start                 -> http://localhost:3000
//   ANTHROPIC_API_KEY=... npm start   -> Claude drafts WeChat replies
//   SHIFTMATE_AI=off npm start        -> force the offline rules engine

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { Store } = require('./lib/store');
const { isoDate } = require('./lib/seed');
const { MODULES, POINTS, TESTS } = require('./lib/syllabus');
const core = require('./lib/core');
const views = require('./lib/views');
const actions = require('./lib/actions');
const ai = require('./lib/ai');
const triage = require('./lib/triage');
const csv = require('./lib/csv');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(new actions.ActionError('Request too large', 413));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(new actions.ActionError('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

function fullState(store) {
  const state = store.state;
  return {
    state,
    views: {
      briefing: views.buildBriefing(state),
      report: views.buildDailyReport(state),
      examTable: views.examStatsTable(state),
      pendingPapers: views.pendingPapersFor(state),
    },
    ai: ai.status(),
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

function createApp({ store, triageFn = ai.triageMessage, now = () => new Date() }) {
  const routes = [];
  const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

  route('GET', /^\/api\/status$/, () => ({ ok: true, ai: ai.status(), today: store.state.today }));
  route('GET', /^\/api\/state$/, () => fullState(store));
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
  route('POST', /^\/api\/marking\/apply$/, (m, body) => {
    const result = actions.applyMarking(store.state, body, now());
    store.save();
    return result;
  });

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
  route('POST', /^\/api\/inbox\/([\w-]+)\/approve$/, (m, body) => {
    const msg = actions.approveMessage(store.state, m[1], body, now());
    store.save();
    return msg;
  });

  route('POST', /^\/api\/timetable\/([\w-]+)\/checkin$/, (m) => {
    const t = actions.checkIn(store.state, m[1], now());
    store.save();
    return t;
  });
  route('POST', /^\/api\/qa\/log$/, (m, body) => {
    const r = actions.logQa(store.state, body, now());
    store.save();
    return r;
  });
  route('POST', /^\/api\/demo-review$/, (m, body) => {
    const r = actions.demoReview(store.state, body, now());
    store.save();
    return r;
  });
  route('POST', /^\/api\/sac-answer$/, (m, body) => {
    const r = actions.recordSacAnswer(store.state, body, now());
    store.save();
    return r;
  });
  route('POST', /^\/api\/retests\/([\w-]+)\/schedule$/, (m, body) => {
    const r = actions.resolveRetest(store.state, m[1], body);
    store.save();
    return r;
  });
  route('POST', /^\/api\/handovers\/([\w-]+)\/close$/, (m) => {
    const r = actions.closeHandover(store.state, m[1]);
    store.save();
    return r;
  });
  route('POST', /^\/api\/report\/signoff$/, (m, body) => {
    const r = actions.signOff(store.state, body, now());
    store.save();
    return r;
  });
  route('POST', /^\/api\/demo\/simulate$/, () => {
    const r = actions.simulateAfternoon(store.state, now());
    store.save();
    return r;
  });
  route('POST', /^\/api\/reset$/, () => {
    store.reset();
    return { ok: true };
  });

  const exports = { exhibit1: csv.exhibit1, exhibit2: csv.exhibit2, exhibit3: csv.exhibit3 };

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    try {
      if (store.state.today !== isoDate(now())) store.reset();

      const exp = /^\/api\/export\/(exhibit[123])\.csv$/.exec(pathname);
      if (exp && req.method === 'GET') {
        const body = exports[exp[1]](store.state);
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${exp[1]}-${store.state.today}.csv"`,
        });
        res.end(`﻿${body}`);
        return;
      }

      if (pathname.startsWith('/api/')) {
        for (const r of routes) {
          if (r.method !== req.method) continue;
          const m = r.pattern.exec(pathname);
          if (!m) continue;
          const body = req.method === 'POST' ? await readBody(req) : {};
          const result = await r.handler(m, body);
          sendJson(res, 200, result);
          return;
        }
        sendJson(res, 404, { error: 'Not found' });
        return;
      }
      if (req.method !== 'GET') {
        res.writeHead(405);
        res.end();
        return;
      }
      serveStatic(req, res, pathname);
    } catch (err) {
      const status = err instanceof actions.ActionError ? err.status : 500;
      if (status === 500) console.error(err);
      sendJson(res, status, { error: status === 500 ? 'Internal error' : err.message });
    }
  };
}

if (require.main === module) {
  const store = new Store(process.env.SHIFTMATE_DATA || path.join(__dirname, 'data', 'state.json'));
  store.load();
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  http.createServer(createApp({ store })).listen(port, host, () => {
    const st = ai.status();
    console.log(`ShiftMate running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(st.enabled ? `AI drafts: Claude (${st.model})` : `AI drafts: offline rules engine (${st.reason})`);
  });
}

module.exports = { createApp, fullState };
