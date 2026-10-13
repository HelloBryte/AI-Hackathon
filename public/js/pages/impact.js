import { html, timeOf } from '../ui.js';

// Per-shift assumptions. Editable on screen so judges can test the claim.
const ROWS = [
  { id: 'brief', step: '2-4', task: "Review timetable, changes and each expected student's records", unit: 'students', vol: 7, manual: 1.5, withSm: 0.5, how: 'Prep cards built from Exhibits 2-3' },
  { id: 'notify', step: '3', task: 'Pass attendance changes on to teachers', unit: 'changes', vol: 2, manual: 2, withSm: 0.5, how: 'Teacher notice created when the reply is approved' },
  { id: 'wechat', step: '6-7', task: 'Read, look up the records and reply on WeChat', unit: 'messages', vol: 12, manual: 2.5, withSm: 1, how: 'Classified, facts pulled, draft in the sender\'s language' },
  { id: 'records', step: '8', task: 'Enter one marked test into the three sheets', unit: 'papers', vol: 5, manual: 6, withSm: 1.5, how: 'Mark once: Exhibits 1-3 and the exam log together' },
  { id: 'review', step: '9C', task: 'Prepare an exam review (gaps, careless, time)', unit: 'exams', vol: 2, manual: 6, withSm: 2, how: 'W / C / blank and timing diagnosis ready' },
  { id: 'sac', step: '9B', task: 'Check a SAC scope against the progress sheet', unit: 'students', vol: 2, manual: 5, withSm: 1, how: 'SAC readiness per Module' },
  { id: 'report', step: '5', task: 'Compile the daily report', unit: 'report', vol: 1, manual: 10, withSm: 2, how: "Counted from the day's activity" },
];
const SHIFT_MIN = 300;
const SHIFTS_PER_WEEK = 5;
// Claude Opus 5.5 list price, USD per million tokens.
const PRICE = { input: 4, output: 20 };
const EST_TOKENS = { input: 2000, output: 800 };

const values = Object.fromEntries(ROWS.map((r) => [r.id, { vol: r.vol, manual: r.manual, withSm: r.withSm }]));

function totals() {
  let manual = 0;
  let withSm = 0;
  ROWS.forEach((r) => {
    const v = values[r.id];
    manual += v.vol * v.manual;
    withSm += v.vol * v.withSm;
  });
  return { manual, withSm, saved: manual - withSm };
}

function money(x) {
  return `$${x < 1 ? x.toFixed(3) : x.toFixed(2)}`;
}

function calculator() {
  const t = totals();
  return html`<table class="impact-table">
    <thead><tr><th>Step</th><th>Task</th><th class="num">Per shift</th><th class="num">By hand (min each)</th><th class="num">With ShiftMate</th><th class="num">Saved</th></tr></thead>
    <tbody>${ROWS.map((r) => {
      const v = values[r.id];
      return html`<tr>
        <td class="mono">${r.step}</td>
        <td>${r.task}<br><span class="faint" style="font-size:12px">${r.how}</span></td>
        <td class="num"><input type="number" min="0" step="1" value="${v.vol}" data-action="val" data-id="${r.id}" data-k="vol" aria-label="${r.unit} per shift"> <span class="faint" style="font-size:11px">${r.unit}</span></td>
        <td class="num"><input type="number" min="0" step="0.5" value="${v.manual}" data-action="val" data-id="${r.id}" data-k="manual" aria-label="Minutes by hand"></td>
        <td class="num"><input type="number" min="0" step="0.5" value="${v.withSm}" data-action="val" data-id="${r.id}" data-k="withSm" aria-label="Minutes with ShiftMate"></td>
        <td class="num"><strong>${Math.round(v.vol * (v.manual - v.withSm))}</strong> min</td>
      </tr>`;
    })}
      <tr><td></td><td><strong>Total per shift</strong></td><td></td><td class="num"><strong>${Math.round(t.manual)}</strong> min</td><td class="num"><strong>${Math.round(t.withSm)}</strong> min</td><td class="num"><strong>${Math.round(t.saved)}</strong> min</td></tr>
    </tbody>
  </table>`;
}

function headline() {
  const t = totals();
  const savedPct = (t.saved / SHIFT_MIN) * 100;
  const manualPct = (t.manual / SHIFT_MIN) * 100;
  return html`<div class="row" style="gap:24px;align-items:flex-end">
    <div><div class="big-number">${Math.round(t.saved)} min</div><div class="muted">returned per 14:00-19:00 shift</div></div>
    <div><div class="big-number">${Math.round(savedPct)}%</div><div class="muted">of the shift</div></div>
    <div><div class="big-number">${((t.saved * SHIFTS_PER_WEEK) / 60).toFixed(1)} h</div><div class="muted">per week (${SHIFTS_PER_WEEK} shifts)</div></div>
  </div>
  <div class="meter" style="margin-top:14px" role="img" aria-label="Admin time before and after">
    <span class="m-not_understood" style="width:${Math.min(100, manualPct - savedPct)}%" title="Admin time that remains"></span>
    <span class="m-mastered" style="width:${Math.min(100, savedPct)}%" title="Time returned to tutoring"></span>
  </div>
  <div class="legend" style="margin-top:6px"><span><i class="m-not_understood"></i>Admin left (${Math.round(t.withSm)} min)</span><span><i class="m-mastered"></i>Returned to on-site Q&A (${Math.round(t.saved)} min)</span><span><i class="b-none"></i>Rest of the 300-minute shift</span></div>`;
}

function costCard(app) {
  const u = app.data.state.aiUsage || { calls: 0, input: 0, output: 0 };
  const spent = (u.input * PRICE.input + u.output * PRICE.output) / 1e6;
  const perMsg = (EST_TOKENS.input * PRICE.input + EST_TOKENS.output * PRICE.output) / 1e6;
  const monthly = perMsg * values.wechat.vol * SHIFTS_PER_WEEK * 4.33;
  return html`<section class="card">
    <h2>Running cost</h2>
    <table style="margin-top:8px">
      <tbody>
        <tr><td>Claude per message (about ${EST_TOKENS.input} in / ${EST_TOKENS.output} out tokens, Opus 5.5)</td><td class="num"><strong>${money(perMsg)}</strong></td></tr>
        <tr><td>Per month at ${values.wechat.vol} messages a shift</td><td class="num"><strong>${money(monthly)}</strong></td></tr>
        <tr><td>Marking, records, briefing, report (rules, no AI)</td><td class="num"><strong>$0</strong></td></tr>
        <tr><td>Hosting: Google Apps Script inside the centre's Workspace, or this app on the front-desk PC</td><td class="num"><strong>$0</strong></td></tr>
        <tr><td>This demo so far: ${u.calls} Claude call(s)</td><td class="num">${money(spent)}</td></tr>
      </tbody>
    </table>
    <p class="card-sub" style="margin-top:8px">Offline rules mode costs nothing and is the fallback when the API is down.</p>
  </section>`;
}

const DECISIONS = [
  ['Marks for each question', 'Nothing: it only records what the tutor marked', 'Marks the paper'],
  ['Why a question was left blank', 'Suggests (blank at the end usually means time)', 'Confirms before anything is saved'],
  ['Mastery colours (Exhibit 2)', 'Applies one fixed rule: W is a gap, C is not', 'Reviews the before/after list, then applies'],
  ['Move on, Retest, redo the Demo', 'Suggests, with its reasons', 'Decides; can pass on judgement (*P)'],
  ['Passing a Demo', 'Shows the four-point checklist', 'Decides; only then is the test booked'],
  ['Messages to students and parents', 'Drafts in their language from the records', 'Edits, approves and sends from Work WeChat'],
  ['Leave, online switch, bookings', 'Proposes the changes', 'Ticks which ones to apply'],
  ['Fees, invoices, complaints', 'Routes to the front desk', 'Not the tutor\'s call'],
];

function auditLabel(app, code) {
  const c = app.data.constants;
  return c.nextSteps[code] || c.intentLabels[code] || { meets: 'Meets standard', not_yet: 'Not yet' }[code] || code;
}

function auditCard(app) {
  const a = app.data.state.audit.slice().reverse();
  const name = (id) => (app.data.state.students.find((s) => s.id === id) || {}).name || '';
  const n = a.length;
  const changed = a.filter((x) => x.overridden).length;
  return html`<section class="card">
    <div class="card-head"><h2>Audit trail: suggestion vs decision</h2><span class="card-sub">${n ? `${changed} of ${n} changed by the tutor` : 'Fills as you work'}</span></div>
    ${n ? html`<div class="table-wrap"><table>
      <thead><tr><th>Time</th><th>Area</th><th>About</th><th>Suggested</th><th>Decided</th><th>Tutor changed it?</th></tr></thead>
      <tbody>${a.map((x) => html`<tr>
        <td class="mono">${timeOf(x.at)}</td><td>${x.feature}${x.mode ? html` <span class="faint">(${x.mode})</span>` : ''}</td><td>${name(x.studentId)} · ${x.subject}</td>
        <td>${auditLabel(app, x.suggested)}</td><td>${auditLabel(app, x.decided)}</td>
        <td>${x.overridden ? html`<span class="chip tone-warn">Yes</span>` : html`<span class="chip">No</span>`} <span class="faint" style="font-size:12px">${x.detail}</span></td>
      </tr>`)}</tbody>
    </table></div>` : html`<p class="muted">Approve a reply or mark a paper to see entries. The override rate is the pilot's quality measure.</p>`}
  </section>`;
}

export function render(app) {
  return html`
    <div class="page-head">
      <div>
        <div class="kicker">Impact, feasibility and responsible AI</div>
        <h1>Why this, and why it is safe</h1>
        <p>The tutor's non-tutoring work (phases 2, 3 and 5) is mostly looking things up, re-typing the same result and writing the same kinds of message. ShiftMate removes the re-typing and drafts the writing, and leaves every judgement about a student with the tutor.</p>
      </div>
    </div>

    <section class="card">
      <div class="card-head"><h2>Time returned to students</h2><span class="card-sub">Edit any number: the totals update</span></div>
      <div id="impact-head">${headline()}</div>
      <div class="table-wrap" style="margin-top:16px" id="impact-table">${calculator()}</div>
      <p class="card-sub" style="margin-top:8px">Basis: volumes match today's demo data (7 lessons, 9 messages by 14:30, 4 papers waiting); minutes per task are our estimates for a typical weekday, deliberately conservative. Marking the paper itself is unchanged and not counted. Week 1 of the pilot replaces these estimates with timed measurements.</p>
    </section>

    <div class="grid grid-2" style="margin-top:14px;align-items:start">
      <section class="card">
        <h2>Who gets what</h2>
        <ul class="list" style="margin-top:8px">
          <li><strong>Students:</strong> ~${Math.round(totals().saved)} more minutes of on-site Q&A a shift; feedback that separates knowledge gaps from careless slips; SAC gaps spotted a week ahead.</li>
          <li><strong>Parents:</strong> replies in minutes, in Chinese or English, quoting the real records.</li>
          <li><strong>Tutor:</strong> no triple entry; one place for the day; the report writes itself.</li>
          <li><strong>Manager:</strong> consistent daily figures and a follow-up list; an audit trail of every AI suggestion.</li>
        </ul>
      </section>
      ${costCard(app)}
    </div>

    <section class="card" style="margin-top:14px">
      <h2>Who decides</h2>
      <div class="table-wrap" style="margin-top:8px"><table>
        <thead><tr><th>Decision</th><th>ShiftMate</th><th>Tutor</th></tr></thead>
        <tbody>${DECISIONS.map((d) => html`<tr><td><strong>${d[0]}</strong></td><td>${d[1]}</td><td>${d[2]}</td></tr>`)}</tbody>
      </table></div>
    </section>

    <div class="grid grid-2" style="margin-top:14px;align-items:start">
      <section class="card">
        <h2>Student data (most are minors)</h2>
        <ul class="list" style="margin-top:8px">
          <li>Grades, mastery and statistics never go to an AI model: they come from fixed rules over the tutor's marks.</li>
          <li>Only the WeChat message and the few facts a reply needs are sent, with student, parent and school names replaced by placeholders. Each draft shows exactly what was sent.</li>
          <li>Records stay in the centre's own Google Workspace (pilot) or on the centre's PC (this demo).</li>
          <li>No chatbot talks to students. Every message out is the tutor's.</li>
          <li>One switch (SHIFTMATE_AI=off) runs everything offline.</li>
        </ul>
      </section>
      <section class="card">
        <h2>When the AI is wrong</h2>
        <ul class="list" style="margin-top:8px">
          <li><strong>Wrong category:</strong> the tutor re-categorises in one click; the rules rebuild the draft and actions.</li>
          <li><strong>A made-up number:</strong> the fact check flags any percentage in a draft that is not in the records.</li>
          <li><strong>AI and rules disagree:</strong> the draft is flagged for a closer look.</li>
          <li><strong>A date read wrongly</strong> ("下周四"): shown as a date to confirm, never silently saved.</li>
          <li><strong>API down or request declined:</strong> drafts fall back to the rules engine and the screen says so.</li>
        </ul>
      </section>
    </div>

    <section class="card" style="margin-top:14px">
      <h2>Pilot plan: four weeks, current tools</h2>
      <div class="grid grid-2" style="margin-top:8px">
        <ul class="list">
          <li><strong>Week 1:</strong> one tutor uses the briefing, inbox drafts and mark-once screen; CSV export pasted into the existing sheets.</li>
          <li><strong>Week 2:</strong> the Google Sheets add-on (Apps Script, in this repo) writes the three tabs directly.</li>
          <li><strong>Weeks 3-4:</strong> measure minutes per task and the override rate; the manager decides go or no-go.</li>
        </ul>
        <ul class="list">
          <li><strong>Risk:</strong> Work WeChat cannot be auto-sent here. <strong>Fallback:</strong> copy and paste by design; WeCom API later.</li>
          <li><strong>Risk:</strong> each centre's sheets differ. <strong>Fallback:</strong> column mapping in the add-on, CSV export.</li>
          <li><strong>Risk:</strong> API cost or outage. <strong>Fallback:</strong> rules mode, $0.</li>
        </ul>
      </div>
    </section>

    <div style="margin-top:14px">${auditCard(app)}</div>`;
}

export function on(type, action, el) {
  if (type !== 'input' || action !== 'val') return;
  const v = Number(el.value);
  if (!Number.isFinite(v) || v < 0) return;
  values[el.dataset.id][el.dataset.k] = v;
  document.getElementById('impact-head').innerHTML = String(headline());
  // Update only the totals cells so the focused input keeps focus.
  const table = document.getElementById('impact-table');
  const fresh = document.createElement('div');
  fresh.innerHTML = String(calculator());
  const rows = table.querySelectorAll('tbody tr');
  fresh.querySelectorAll('tbody tr').forEach((tr, i) => {
    const last = tr.lastElementChild;
    if (rows[i]) rows[i].lastElementChild.innerHTML = last.innerHTML;
    if (i === ROWS.length) rows[i].innerHTML = tr.innerHTML;
  });
}
