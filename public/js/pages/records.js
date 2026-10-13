import { html, outcome, bandBadge, fmtDate, MASTERY_SHORT } from '../ui.js';

const cache = { id: null, profile: null, version: null };

function legend() {
  return html`<div class="legend">
    <span><i class="m-mastered"></i>Completely mastered</span>
    <span><i class="m-partial"></i>Partially mastered</span>
    <span><i class="m-not_understood"></i>Not understood</span>
    <span><i class="m-not_covered"></i>Not yet covered</span>
    <span><i style="outline:2px solid var(--focus);outline-offset:-2px"></i>Updated today</span>
  </div>`;
}

function exhibit2(p, freshPoints) {
  const s = p.summary;
  return html`<section class="card">
    <div class="card-head">
      <div><h2><span class="exhibit-tag">Exhibit 2</span> Progress Sheet: ${p.student.name}</h2>
      <div class="card-sub">Mathematical Methods Units 3&4 · currently Module ${p.student.currentModule}</div></div>
    </div>
    <div class="stats" style="margin-bottom:12px">
      <div class="card stat"><div class="num">${s.total}</div><div class="lbl">Total core points</div></div>
      <div class="card stat"><div class="num">${s.covered}</div><div class="lbl">Covered points · ${s.coveredPct}%</div></div>
      <div class="card stat"><div class="num">${s.understood}</div><div class="lbl">Content understood · ${s.understoodPct}%</div></div>
      <div class="card stat"><div class="num">${s.mastered}</div><div class="lbl">Mastered in all points · ${s.masteredPct}%</div></div>
      <div class="card stat"><div class="num">${s.masteredOfCoveredPct}%</div><div class="lbl">Mastered in covered points</div></div>
    </div>
    <div class="heat">
      ${p.modules.map((m) => html`<div class="heat-row">
        <div class="mod"><strong>${m.id}.</strong> ${m.name}</div>
        <div class="heat-cells">${m.points.map((pt) => html`<span class="heat-cell m-${pt.mastery}" title="${pt.id} ${pt.title}: ${MASTERY_SHORT[pt.mastery]}" style="${freshPoints.has(pt.id) ? 'outline:2px solid var(--focus);outline-offset:1px' : ''}">${pt.id}</span>`)}</div>
      </div>`)}
    </div>
    <div style="margin-top:12px">${legend()}</div>
  </section>`;
}

function exhibit3(app, studentId) {
  const t = app.data.views.examTable;
  const slots = ['A', 'B', 'C', 'D'];
  return html`<section class="card">
    <div class="card-head"><h2><span class="exhibit-tag">Exhibit 3</span> Student Exam Statistics</h2>
      <div class="legend"><span><i class="b-pass"></i>Pass 75-100%</span><span><i class="b-mid"></i>Mid 40-75%</span><span><i class="b-low"></i>Low 0-40%</span><span>*P tutor pass</span></div>
    </div>
    <div class="table-wrap">
      <table class="x3">
        <thead>
          <tr><th class="name">Student</th>${t.modules.map((m) => html`<th colspan="4">Module ${m}</th>`)}</tr>
          <tr><th class="name"></th>${t.modules.map(() => slots.map((s) => html`<th class="faint">${s}</th>`))}</tr>
        </thead>
        <tbody>
          ${t.classes.map((c) => html`
            <tr class="cls"><td colspan="${1 + t.modules.length * 4}">${c.classId} · ${c.classTime}</td></tr>
            ${c.rows.map((r) => html`<tr style="${r.student.id === studentId ? 'outline:2px solid var(--focus);outline-offset:-2px' : ''}">
              <td class="name"><a href="#/records/${r.student.id}">${r.student.name}</a></td>
              ${r.cells.map((cell) => cell.attempts.map((a) => (a.pct === null
                ? html`<td class="faint" style="${cell.status === 'not_submitted' && a.slot === 'A' ? 'background:var(--warn-bg)' : ''}" title="${cell.status === 'not_submitted' && a.slot === 'A' ? 'Not submitted' : ''}">${a.slot}</td>`
                : html`<td class="att b-${a.band}" title="${a.pct}% on ${a.date}">${Math.round(a.pct)}${a.tutorPass ? '*P' : ''}</td>`)))}
            </tr>`)}`)}
        </tbody>
      </table>
    </div>
  </section>`;
}

function exhibit1(p) {
  if (!p.markingRecords.length) return '';
  return html`<section class="card">
    <div class="card-head"><h2><span class="exhibit-tag">Exhibit 1</span> Marking Sheets</h2><span class="card-sub">DONE = correct · W = wrong · C = careless · \\Blank\\ = not attempted</span></div>
    ${p.markingRecords.map((r, i) => html`<details ${i === 0 ? html`open` : ''} style="margin-bottom:8px">
      <summary>${r.testName} · ${fmtDate(r.date)} · ${bandBadge(r.band || (r.pct >= 75 ? 'pass' : r.pct >= 40 ? 'mid' : 'low'), `${r.pct}%`)} ${r.source === 'shiftmate' ? html`<span class="chip tone-info">via ShiftMate</span>` : ''}</summary>
      <div class="table-wrap" style="max-width:560px">
        <table>
          <thead><tr><th>Question</th><th>Point</th><th>Outcome</th>${r.rows[0] && r.rows[0].max !== undefined ? html`<th class="num">Marks</th>` : ''}</tr></thead>
          <tbody>${r.rows.map((row) => html`<tr>
            <td>${row.q}</td><td><span class="mono">${row.point}</span> <span class="faint" style="font-size:12px">${row.title}</span></td><td>${outcome(row.outcome)}</td>
            ${row.max !== undefined ? html`<td class="num">${row.awarded}/${row.max}</td>` : ''}
          </tr>`)}</tbody>
        </table>
      </div>
      ${r.decision ? html`<p class="card-sub" style="margin-top:6px">Tutor decision: ${r.decision.label}${r.decision.tutorPass ? ' (tutor pass *P)' : ''}</p>` : ''}
    </details>`)}
  </section>`;
}

function chart(log) {
  if (log.length < 2) return '';
  const W = 560;
  const H = 190;
  const pad = { l: 36, r: 40, t: 14, b: 34 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i) => pad.l + (iw * i) / (log.length - 1);
  const ys = (v) => pad.t + ih - (ih * v) / 100;
  const maxMin = Math.max(60, ...log.map((e) => e.firstPassMin || 0));
  const yt = (v) => pad.t + ih - (ih * v) / maxMin;
  const scorePath = log.map((e, i) => `${i ? 'L' : 'M'}${x(i)},${ys(e.pct)}`).join(' ');
  const timeLog = log.filter((e) => e.firstPassMin !== null);
  const timePath = log.map((e, i) => (e.firstPassMin === null ? '' : `${i && timeLog.indexOf(e) ? 'L' : 'M'}${x(i)},${yt(e.firstPassMin)}`)).join(' ');
  return html`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Score and first-pass time over time">
    ${[0, 25, 50, 75, 100].map((v) => html`<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${ys(v)}" y2="${ys(v)}"></line><text x="${pad.l - 6}" y="${ys(v) + 4}" text-anchor="end">${v}%</text>`)}
    <text x="${W - pad.r + 6}" y="${pad.t + 4}">${maxMin}m</text>
    <text x="${W - pad.r + 6}" y="${pad.t + ih + 4}">0m</text>
    <path class="line-time" d="${timePath}"></path>
    <path class="line-score" d="${scorePath}"></path>
    ${log.map((e, i) => html`<circle class="pt-score" cx="${x(i)}" cy="${ys(e.pct)}" r="4"><title>${e.paper}: ${e.pct}%</title></circle>
      ${e.firstPassMin !== null ? html`<circle class="pt-time" cx="${x(i)}" cy="${yt(e.firstPassMin)}" r="3.5"><title>${e.paper}: first pass ${e.firstPassMin} min</title></circle>` : ''}
      <text x="${x(i)}" y="${H - 12}" text-anchor="middle">${fmtDate(e.date)}</text>`)}
  </svg>
  <div class="legend"><span><i style="background:var(--brand)"></i>Score %</span><span><i style="background:var(--accent)"></i>First pass, minutes</span></div>`;
}

function examLog(p) {
  if (!p.examLog.length) return '';
  return html`<section class="card">
    <div class="card-head"><h2><span class="exhibit-tag">Log</span> Exam log (Scenario C, step 5)</h2><span class="card-sub">Score and time, so the student sees the trend</span></div>
    ${chart(p.examLog)}
    <div class="table-wrap" style="margin-top:10px">
      <table>
        <thead><tr><th>Date</th><th>Paper</th><th>Start</th><th>1st pass</th><th>2nd pass</th><th class="num">Checks</th><th class="num">Score</th></tr></thead>
        <tbody>${p.examLog.slice().reverse().map((e) => html`<tr>
          <td>${fmtDate(e.date)}</td><td>${e.paper}</td><td class="mono">${e.start}</td>
          <td class="mono">${e.end1}${e.firstPassMin !== null ? html` <span class="faint">(${e.firstPassMin}m)</span>` : ''}</td>
          <td class="mono">${e.end2 || '-'}</td><td class="num">${e.checks}</td><td class="num"><strong>${e.pct}%</strong></td>
        </tr>`)}</tbody>
      </table>
    </div>
  </section>`;
}

function body(app, p) {
  const today = app.data.state.today;
  const fresh = new Set();
  p.markingRecords.filter((r) => r.date === today && r.source === 'shiftmate').forEach((r) => r.rows.forEach((row) => fresh.add(row.point)));
  return html`
    ${exhibit2(p, fresh)}
    <div style="height:14px"></div>
    ${exhibit3(app, p.student.id)}
    <div class="grid grid-2" style="margin-top:14px;align-items:start">
      <div>${exhibit1(p)}</div>
      <div>${examLog(p)}</div>
    </div>`;
}

export function render(app, params) {
  const students = app.data.state.students;
  const id = params[0] && students.some((s) => s.id === params[0]) ? params[0] : students[0].id;
  const ready = cache.id === id && cache.version === app.data;
  return html`
    <div class="page-head">
      <div>
        <div class="kicker">Exhibits 1-3 · records the tutor maintains</div>
        <h1>Student records</h1>
        <p>The three sheets from the brief, kept in the same shape so the centre recognises them. Everything here is written by the rules engine after the tutor confirms; export to CSV to paste into the existing Google Sheets.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-sm" data-action="export" data-sheet="exhibit1">Exhibit 1 CSV</button>
        <button class="btn btn-sm" data-action="export" data-sheet="exhibit2">Exhibit 2 CSV</button>
        <button class="btn btn-sm" data-action="export" data-sheet="exhibit3">Exhibit 3 CSV</button>
      </div>
    </div>
    <nav class="student-tabs" aria-label="Students">
      ${students.map((s) => html`<a href="#/records/${s.id}" class="${s.id === id ? 'active' : ''}">${s.name}</a>`)}
    </nav>
    <div id="rec-body" data-id="${id}">${ready ? body(app, cache.profile) : html`<div class="row"><span class="spinner"></span><span class="muted">Loading records...</span></div>`}</div>`;
}

export async function mount(root, app, params) {
  const el = document.getElementById('rec-body');
  const id = el.dataset.id;
  if (cache.id === id && cache.version === app.data) return;
  try {
    const profile = await app.api.get(`/api/students/${id}`);
    cache.id = id;
    cache.profile = profile;
    cache.version = app.data;
    const now = document.getElementById('rec-body');
    if (now && now.dataset.id === id) now.innerHTML = String(body(app, profile));
  } catch (err) {
    app.toast(err.message, 'bad');
  }
}

function download(name, text) {
  const blob = new Blob([`\ufeff${text}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

export async function on(type, action, el, event, app) {
  if (type !== 'click' || action !== 'export') return;
  const url = `/api/export/${el.dataset.sheet}.csv`;
  if (!window.SHIFTMATE_LOCAL_API) {
    window.location.href = url;
    return;
  }
  // Browser build: show the CSV so it can be copied straight into Google Sheets.
  const out = await window.SHIFTMATE_LOCAL_API('GET', url);
  app.openModal(html`<div class="modal-body">
      <h2>${out.filename}</h2>
      <p class="muted" style="margin:4px 0 10px">Copy and paste into the matching tab of the centre's Google Sheet.</p>
      <textarea id="csv-text" rows="12" class="mono" readonly>${out.csv}</textarea>
    </div>
    <div class="modal-foot">
      <button class="btn" data-action="close">Close</button>
      ${window.location.protocol === 'file:' ? html`<button class="btn" data-action="download">Download</button>` : ''}
      <button class="btn btn-primary" data-action="copy-csv">Copy</button>
    </div>`, {
    'copy-csv': async (btn, modal) => {
      const ta = modal.querySelector('#csv-text');
      const ok = await app.copy(out.csv);
      if (!ok) ta.select();
      app.toast(ok ? 'CSV copied' : 'Press Ctrl+C to copy the selected text');
    },
    download: () => download(out.filename, out.csv),
  });
}
