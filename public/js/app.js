import { html, fmtDate } from './ui.js';
import * as overview from './pages/overview.js';
import * as briefing from './pages/briefing.js';
import * as inbox from './pages/inbox.js';
import * as marking from './pages/marking.js';
import * as onsite from './pages/onsite.js';
import * as report from './pages/report.js';
import * as records from './pages/records.js';
import * as impact from './pages/impact.js';

const PAGES = { overview, briefing, inbox, marking, onsite, report, records, impact };

const NAV = [
  {
    group: 'Start here',
    items: [
      { id: 'overview', time: 'Idea', label: 'Overview', sub: 'The problem and the idea' },
    ],
  },
  {
    group: 'Your shift',
    items: [
      { id: 'briefing', time: '14:15', label: 'Briefing', sub: 'Steps 2-5: who, what, changes' },
      { id: 'inbox', time: '14:30', label: 'WeChat inbox', sub: 'Steps 6-7: triage and draft', badge: (d) => d.state.inbox.filter((m) => m.status !== 'sent').length },
      { id: 'marking', time: '15:00', label: 'Mark once', sub: 'Step 8: one entry, three sheets', badge: (d) => d.state.pendingPapers.length },
      { id: 'onsite', time: '16:00', label: 'On site', sub: 'Step 9: Q&A, Demo, SAC, exams' },
      { id: 'report', time: '18:20', label: 'Daily report', sub: 'Phase 5: manager sign-off' },
    ],
  },
  {
    group: 'Records and case',
    items: [
      { id: 'records', time: 'Ex 1-3', label: 'Student records', sub: 'Marking, progress, exam stats' },
      { id: 'impact', time: 'Why', label: 'Impact and safety', sub: 'Time saved, who decides' },
    ],
  },
];

async function request(method, url, body) {
  // Single-file build: the API runs inside the page (static/local-api.js).
  if (window.SHIFTMATE_LOCAL_API) {
    const out = await window.SHIFTMATE_LOCAL_API(method, url, body);
    if (out.status !== 200) throw new Error((out.body && out.body.error) || `Request failed (${out.status})`);
    return out.body;
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const modal = document.getElementById('modal');

const app = {
  data: null,
  route: { page: 'overview', params: [] },
  api: {
    get: (url) => request('GET', url),
    post: (url, body) => request('POST', url, body || {}),
  },
  async refresh({ keepScroll = true } = {}) {
    const y = window.scrollY;
    this.data = await this.api.get('/api/state');
    renderChrome();
    renderPage();
    if (keepScroll) window.scrollTo(0, y);
  },
  navigate(hash) {
    if (location.hash === hash) renderPage();
    else location.hash = hash;
  },
  toast(message, tone = '') {
    const el = document.createElement('div');
    el.className = `toast ${tone}`;
    el.textContent = message;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), tone === 'bad' ? 6000 : 3800);
  },
  async run(fn, okMessage) {
    try {
      const out = await fn();
      if (okMessage) this.toast(okMessage);
      return out;
    } catch (err) {
      this.toast(err.message, 'bad');
      return null;
    }
  },
  openModal(content, handlers = {}) {
    modal.innerHTML = String(content);
    modal.handlers = handlers;
    modal.showModal();
  },
  closeModal() {
    modal.close();
    modal.innerHTML = '';
    modal.handlers = null;
  },
  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      return false;
    }
  },
};
window.shiftmate = app;

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const page = PAGES[parts[0]] ? parts[0] : 'overview';
  return { page, params: parts.slice(1) };
}

function renderChrome() {
  const d = app.data;
  const pill = document.getElementById('ai-pill');
  if (d.ai.enabled) {
    pill.className = 'pill tone-ok';
    pill.textContent = `Claude drafts: ${d.ai.model}`;
    pill.title = 'WeChat replies are drafted by Claude with names masked. Records use rules only.';
  } else {
    pill.className = 'pill tone-warn';
    pill.textContent = 'Offline mode';
    pill.title = `${d.ai.reason}. Drafts come from the built-in rules engine; nothing leaves this computer.`;
  }
  document.getElementById('shift-label').textContent =
    `Learning Support Tutor · ${fmtDate(d.state.today)} · ${d.state.settings.shift.start}-${d.state.settings.shift.end}`;

  nav.innerHTML = String(html`${NAV.map((g) => html`
    <div class="nav-group">
      <div class="nav-title">${g.group}</div>
      ${g.items.map((it) => {
        const n = it.badge ? it.badge(d) : 0;
        return html`<a class="nav-item ${app.route.page === it.id ? 'active' : ''}" href="#/${it.id}" ${app.route.page === it.id ? html`aria-current="page"` : ''}>
          <span class="nav-time">${it.time}</span>
          <span class="nav-label"><strong>${it.label}</strong><small>${it.sub}</small></span>
          ${n ? html`<span class="nav-badge">${n}</span>` : html`<span></span>`}
        </a>`;
      })}
    </div>`)}`);
}

function renderPage() {
  if (!app.data) return;
  const page = PAGES[app.route.page];
  main.innerHTML = String(page.render(app, app.route.params));
  if (page.mount) page.mount(main, app, app.route.params);
}

function onRoute() {
  const prev = app.route.page;
  app.route = parseRoute();
  if (!app.data) return;
  renderChrome();
  renderPage();
  if (prev !== app.route.page) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}

function delegate(type) {
  main.addEventListener(type, (event) => {
    const page = PAGES[app.route.page];
    if (!page.on) return;
    const el = event.target.closest('[data-action]');
    if (type === 'click' && !el) return;
    page.on(type, el ? el.dataset.action : null, el || event.target, event, app);
  });
}
['click', 'input', 'change', 'keydown', 'submit'].forEach(delegate);

modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    app.closeModal();
    return;
  }
  const el = event.target.closest('[data-action]');
  if (!el || !modal.handlers) return;
  const fn = modal.handlers[el.dataset.action];
  if (fn) fn(el, modal, event);
  else if (el.dataset.action === 'close') app.closeModal();
});
modal.addEventListener('close', () => { modal.handlers = null; });

// Confirmation lives in the page: embedded viewers block window.confirm().
document.querySelector('[data-global="reset"]').addEventListener('click', () => {
  app.openModal(html`<div class="modal-body">
      <h2>Start the shift again?</h2>
      <p class="muted" style="margin-top:6px">All messages, marked papers and logs go back to 14:15 this afternoon.</p>
    </div>
    <div class="modal-foot">
      <button class="btn" data-action="close">Cancel</button>
      <button class="btn btn-primary" data-action="confirm-reset">Reset demo</button>
    </div>`, {
    'confirm-reset': async () => {
      app.closeModal();
      await app.run(() => app.api.post('/api/reset'), 'Demo data reset');
      marking.resetLocal();
      inbox.resetLocal();
      app.navigate('#/overview');
      await app.refresh({ keepScroll: false });
    },
  });
});

window.addEventListener('hashchange', onRoute);

(async function start() {
  app.route = parseRoute();
  try {
    await app.refresh({ keepScroll: false });
  } catch (err) {
    main.innerHTML = String(html`<div class="card"><h2>Could not load ShiftMate</h2><p class="muted">${err.message}. Is the server running (npm start)?</p></div>`);
  }
}());
