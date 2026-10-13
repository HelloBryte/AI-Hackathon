import { html } from '../ui.js';
import { totals, SHIFT_MIN, perMessageCost } from '../impact-model.js';

// The shift as the brief lays it out, in minutes from 14:00.
const PHASES = [
  { n: 1, start: 0, end: 15, time: '14:00', label: 'Open systems', steps: 'Step 1', screen: 'Everything on one screen', href: '#/briefing' },
  { n: 2, start: 15, end: 30, time: '14:15', label: 'Review the day', steps: 'Steps 2-5', screen: 'Briefing', href: '#/briefing' },
  { n: 3, start: 30, end: 120, time: '14:30', label: 'Messages, marking, records', steps: 'Steps 6-8', screen: 'WeChat inbox · Mark once', href: '#/marking' },
  { n: 4, start: 120, end: 240, time: '16:00', label: 'Tutoring and Q&A', steps: 'Step 9 (A, B, C)', screen: 'On site', href: '#/onsite' },
  { n: 5, start: 260, end: 270, time: '18:20', label: 'Daily report', steps: 'Phase 5', screen: 'Daily report', href: '#/report' },
];

function timeline() {
  const pct = (m) => `${(m / SHIFT_MIN) * 100}%`;
  return html`<div class="tl" role="img" aria-label="The 14:00 to 19:00 shift in five phases">
    <div class="tl-bar">
      ${PHASES.map((p) => html`<a class="tl-seg tl-p${p.n}" href="${p.href}" style="left:${pct(p.start)};width:${pct(p.end - p.start)}" title="Phase ${p.n}: ${p.label}"><span>${p.n}</span></a>`)}
    </div>
    <div class="tl-ticks">
      ${[0, 60, 120, 180, 240, 300].map((m) => html`<span style="left:${pct(m)}">${14 + m / 60}:00</span>`)}
    </div>
  </div>
  <div class="tl-cards">
    ${PHASES.map((p) => html`<a class="tl-card" href="${p.href}">
      <span class="tl-num tl-p${p.n}">${p.n}</span>
      <span class="mono faint">${p.time} · ${p.steps}</span>
      <strong>${p.label}</strong>
      <span class="tl-screen">${p.screen} →</span>
    </a>`)}
  </div>`;
}

function sheetBox(tag, name, note, tone) {
  return html`<div class="ov-sheet ${tone || ''}"><span class="exhibit-tag">${tag}</span><strong>${name}</strong><small>${note}</small></div>`;
}

function bottleneck() {
  return html`<div class="ov-compare">
    <div class="ov-side">
      <div class="ov-side-head"><span class="chip tone-bad">Today</span><span class="muted">Step 8, for every marked test</span></div>
      <div class="ov-paper">Module Test 8A · 12 questions</div>
      <div class="ov-arrow">typed three times ↓</div>
      <div class="ov-sheets">
        ${sheetBox('Ex 1', 'Marking Sheet', 'one row per question')}
        ${sheetBox('Ex 2', 'Progress Sheet', 're-coloured cell by cell')}
        ${sheetBox('Ex 3', 'Exam Statistics', 'score and band')}
      </div>
      <p class="ov-foot">About 6 minutes a paper. A careless slip and a real gap look the same in the records.</p>
    </div>
    <div class="ov-side ov-new">
      <div class="ov-side-head"><span class="chip tone-ok">With ShiftMate</span><span class="muted">Mark once, confirm once</span></div>
      <div class="ov-paper">✓ W ✓ ✓ ✓ ✓ ✓ C — ✓ ✓ ✓</div>
      <div class="ov-arrow">rules prepare every change, the tutor confirms ↓</div>
      <div class="ov-sheets ov-sheets-4">
        ${sheetBox('Ex 1', 'Marking Sheet', '12 rows', 'ok')}
        ${sheetBox('Ex 2', 'Progress Sheet', 'W down, C kept', 'ok')}
        ${sheetBox('Ex 3', 'Exam Statistics', 'next attempt slot', 'ok')}
        ${sheetBox('Log', 'Exam log', 'times and checks', 'ok')}
      </div>
      <p class="ov-foot">About 1.5 minutes, plus a diagnosis, a suggested next step and a parent note in their language.</p>
    </div>
  </div>`;
}

export function render(app) {
  const t = totals();
  const inbox = app.data.state.inbox;
  const chinese = inbox.filter((m) => m.lang !== 'en').length;
  const cents = Math.round(perMessageCost() * 100);
  return html`
    <section class="ov-hero">
      <div class="kicker">AIPS Hackathon · Automating the Learning Support Tutor's Workday · Team Ethan</div>
      <h1 class="ov-title">Mark once. Reply once. <span>Teach more.</span></h1>
      <p class="ov-lead">ShiftMate is a co-pilot for the Learning Support Tutor's 14:00-19:00 shift. Rules keep the three record sheets, Claude drafts the WeChat replies, and the tutor makes every call about a student.</p>
      <div class="row" style="margin-top:18px;gap:10px">
        <a class="btn btn-primary" href="#/briefing">Start the shift at 14:15</a>
        <a class="btn" href="#/marking">Go to Mark once</a>
        <a class="btn btn-ghost" href="#/impact">Why it is safe</a>
      </div>
    </section>

    <div class="ov-stats">
      <div class="ov-stat"><span class="ov-num">${Math.round(t.saved)} min</span><span>returned to students every shift (${Math.round((t.saved / SHIFT_MIN) * 100)}% of it)</span></div>
      <div class="ov-stat"><span class="ov-num">3 → 1</span><span>one marking entry fills all three record sheets</span></div>
      <div class="ov-stat"><span class="ov-num">${chinese} of ${inbox.length}</span><span>of today's WeChat messages are in Chinese, and get replies in Chinese</span></div>
      <div class="ov-stat"><span class="ov-num">$0</span><span>offline; about ${cents}¢ per reply when Claude drafts</span></div>
    </div>

    <section class="ov-section">
      <h2>The bottleneck: step 8</h2>
      <p class="muted ov-sub">The brief's own example. One marking result, entered by hand into three spreadsheets.</p>
      ${bottleneck()}
    </section>

    <section class="ov-section">
      <h2>Using what the centre already records</h2>
      <div class="ov-rules">
        <div class="ov-rule"><span class="ov-mark oc-W">W</span><div><strong>Wrong: a knowledge gap</strong><p>The point drops a level on the Progress Sheet and joins the Q&A list.</p></div></div>
        <div class="ov-rule"><span class="ov-mark oc-C">C</span><div><strong>Careless: not a gap</strong><p>Mastery is kept. Repeated slips flag a checking habit instead.</p></div></div>
        <div class="ov-rule"><span class="ov-mark oc-BLANK">—</span><div><strong>Blank: where it sits matters</strong><p>Blanks after the last answer suggest time trouble. Mid-paper blanks go to the tutor to decide.</p></div></div>
      </div>
    </section>

    <section class="ov-section">
      <h2>The whole shift, phase by phase</h2>
      <p class="muted ov-sub">Each screen matches a numbered part of the brief. Click a phase to open it.</p>
      ${timeline()}
    </section>

    <section class="ov-section">
      <h2>Who does what</h2>
      <div class="ov-roles">
        <div class="ov-role"><span class="chip">Rules</span><strong>Keep the records</strong><p>Scores, mastery colours, attempt slots, SAC readiness and the daily counts. Fixed, auditable, no AI.</p></div>
        <div class="ov-role"><span class="chip tone-info">Claude</span><strong>Draft the words</strong><p>WeChat replies in the sender's language, quoting only the records. Names are masked before anything is sent.</p></div>
        <div class="ov-role"><span class="chip tone-ok">Tutor</span><strong>Make every call</strong><p>Why a question was blank, pass or Retest, passing a Demo, and every message that goes out.</p></div>
      </div>
    </section>`;
}
