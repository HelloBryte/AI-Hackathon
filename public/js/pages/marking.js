import { html, masteryChip, bandBadge, outcome, fmtDate, plural } from '../ui.js';

const OUTCOMES = [
  { o: 'DONE', label: '✓', key: 'd', title: 'DONE: correct' },
  { o: 'W', label: 'W', key: 'w', title: 'W: wrong (knowledge gap)' },
  { o: 'C', label: 'C', key: 'c', title: 'C: careless error' },
  { o: 'BLANK', label: '—', key: 'b', title: 'Blank: not attempted' },
];
const KEY_TO_OUTCOME = { d: 'DONE', v: 'DONE', '1': 'DONE', w: 'W', x: 'W', c: 'C', b: 'BLANK', '-': 'BLANK', '0': 'BLANK' };
const SEVERITY_TONE = { high: 'bad', medium: 'warn', low: 'info' };

let local = fresh(null);

function fresh(paper) {
  return {
    paperId: paper ? paper.id : null,
    outcomes: {},
    partial: {},
    timing: paper ? { ...paper.timing } : {},
    blanks: {},
    action: null,
    tutorPass: false,
    addQa: true,
    note: '',
    focusIdx: 0,
    quick: '',
    quickInfo: null,
    preview: null,
    seq: 0,
    result: null,
  };
}

export function resetLocal() {
  local = fresh(null);
}

function papers(app) {
  return app.data.views.pendingPapers;
}

function currentPaper(app) {
  return papers(app).find((p) => p.id === local.paperId) || null;
}

function testOf(app, paper) {
  return app.data.syllabus.tests.find((t) => t.id === paper.testId);
}

function pointTitle(app, id) {
  const p = app.data.syllabus.points.find((x) => x.id === id);
  return p ? p.title : '';
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function paperList(app) {
  const list = papers(app);
  const markedToday = app.data.state.markingRecords.filter((r) => r.source === 'shiftmate' && r.date === app.data.state.today);
  const name = (id) => (app.data.state.students.find((s) => s.id === id) || {}).name;
  return html`<div class="paper-strip" aria-label="Submitted papers">
    ${list.map((p) => html`<button class="paper-item ${p.id === local.paperId ? 'active' : ''}" data-action="pick" data-id="${p.id}">
      <strong>${p.student.name}</strong>
      <div>${p.testName}</div>
      <div class="card-sub">${plural(p.questions, 'question')} · sat ${p.submittedDay}</div>
    </button>`)}
    ${markedToday.map((r) => html`<div class="paper-item done">
      <strong>${name(r.studentId)}</strong>
      <div>${r.testName}</div>
      <div class="card-sub">Marked ${bandBadge(r.band, `${r.pct}%`)}</div>
    </div>`)}
    ${list.length ? '' : html`<div class="paper-item done"><strong>All marked</strong><div class="card-sub">No papers waiting</div></div>`}
  </div>`;
}

function padTable(app, paper, test) {
  return html`<table class="pad-table">
    <thead><tr><th>Q</th><th>Syllabus point</th><th class="num">Marks</th><th>Outcome</th><th title="Optional: award part marks, e.g. method marks on a careless error">Part</th></tr></thead>
    <tbody>
      ${test.questions.map((q, i) => {
        const o = local.outcomes[q.q];
        return html`<tr class="${i === local.focusIdx ? 'focused' : ''}" data-action="focus-row" data-idx="${i}">
          <td><strong>${q.q}</strong></td>
          <td class="pt" title="${q.point} ${pointTitle(app, q.point)}"><span class="mono">${q.point}</span> <span class="muted" style="font-size:12px">${pointTitle(app, q.point)}</span></td>
          <td class="num">${q.marks}</td>
          <td><div class="seg" role="group" aria-label="Outcome for question ${q.q}">
            ${OUTCOMES.map((x) => html`<button type="button" class="${o === x.o ? `on-${x.o}` : ''}" title="${x.title} (key ${x.key})" aria-pressed="${o === x.o}" data-action="set" data-q="${q.q}" data-o="${x.o}">${x.label}</button>`)}
          </div></td>
          <td><input class="pm" type="number" min="0" max="${q.marks}" step="1" placeholder="-" value="${local.partial[q.q] === undefined ? '' : local.partial[q.q]}" data-action="partial" data-q="${q.q}" aria-label="Part marks for question ${q.q}"></td>
        </tr>`;
      })}
    </tbody>
  </table>`;
}

function pad(app) {
  const paper = currentPaper(app);
  if (!paper) {
    return local.result
      ? html`<section class="card"><h2>Paper recorded</h2><p class="muted" style="margin-top:6px">${local.result.record.testName} is now in all three sheets. Pick the next paper above, or press "Mark next paper".</p></section>`
      : html`<section class="card"><h2>Choose a paper</h2><p class="muted" style="margin-top:6px">Pick a submitted test above to start marking.</p></section>`;
  }
  const test = testOf(app, paper);
  const marked = test.questions.filter((q) => local.outcomes[q.q]).length;
  const qi = local.quickInfo;
  return html`<section class="card" id="mk-pad">
    <div class="card-head">
      <div>
        <h2>${paper.student.name} · ${test.name}</h2>
        <div class="card-sub">${test.kind === 'module' ? `Module ${test.module} · ` : 'VCAA practice exam · '}${test.timeLimitMin} min · sat ${paper.submittedDay}</div>
      </div>
      <span class="chip ${marked === test.questions.length ? 'tone-ok' : ''}">${marked}/${test.questions.length} marked</span>
    </div>

    <label class="field">Quick entry: type or paste the marks as you read the paper
      <div class="row" style="flex-wrap:nowrap">
        <input type="text" data-action="quick" value="${local.quick}" placeholder="e.g.  ✓ w ✓ ✓ c -   or   1 ✓, 2 x, 6a done, 8 blank" autocomplete="off">
        <button class="btn btn-sm" data-action="quick-apply">Read</button>
      </div>
    </label>
    ${qi ? html`<div class="callout ${qi.unknown.length || qi.missing.length ? 'tone-warn' : 'tone-ok'}" style="margin-top:6px">
      <div>Read ${Object.keys(qi.outcomes).length} mark(s) (${qi.mode} format).
        ${qi.unknown.length ? html` Could not read: <strong>${qi.unknown.join(', ')}</strong>.` : ''}
        ${qi.missing.length ? html` Still to mark: Q${qi.missing.join(', Q')}.` : ''}</div>
    </div>` : ''}
    <div class="row" style="margin:8px 0 10px">
      <button class="btn btn-xs btn-ghost" data-action="sample" title="Fills the marks the tutor wrote on this demo paper">Fill demo marks</button>
      <button class="btn btn-xs btn-ghost" data-action="clear">Clear</button>
      <span class="spacer"></span>
      <span class="faint" style="font-size:12px">Keys: <span class="kbd">D</span> ✓ <span class="kbd">W</span> wrong <span class="kbd">C</span> careless <span class="kbd">B</span> blank <span class="kbd">↑↓</span></span>
    </div>
    <div style="overflow-x:auto">${padTable(app, paper, test)}</div>

    <div class="section-title">Exam timing (Scenario C, step 5)</div>
    <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
      <label class="field">Start<input type="text" inputmode="numeric" placeholder="16:05" data-action="timing" data-k="start" value="${local.timing.start || ''}"></label>
      <label class="field">End, 1st pass<input type="text" inputmode="numeric" placeholder="16:52" data-action="timing" data-k="end1" value="${local.timing.end1 || ''}"></label>
      <label class="field">End, 2nd pass<input type="text" inputmode="numeric" placeholder="16:58" data-action="timing" data-k="end2" value="${local.timing.end2 || ''}"></label>
      <label class="field">Checks<input type="number" min="0" max="9" data-action="timing" data-k="checks" value="${local.timing.checks === undefined ? '' : local.timing.checks}"></label>
    </div>
  </section>`;
}

function diffRow(app, c) {
  const title = c.title || pointTitle(app, c.point);
  return html`<div class="diff-row ${c.changed ? '' : 'unchanged'}">
    <span class="mono">${c.point}</span>
    <span class="dr-title" title="${title}">${title}</span>
    <span class="dr-chips">${masteryChip(c.before)}<span class="arrow">→</span>${masteryChip(c.after)}</span>
    <span class="dr-reason">${c.evidence.map((e) => `Q${e.q}: ${e.reason}`).join(' · ')}</span>
  </div>`;
}

function exhibitBlocks(app, plan, test, heat) {
  // Show the rows that carry the W / C / blank story; fold the routine ones.
  const notable = plan.exhibit2.changes.filter((c) => c.evidence.some((e) => e.outcome !== 'DONE'));
  const routine = plan.exhibit2.changes.filter((c) => !notable.includes(c));
  const routineChanged = routine.filter((c) => c.changed);
  const changedCount = plan.exhibit2.changes.filter((c) => c.changed).length;
  const sb = plan.exhibit2.summaryBefore;
  const sa = plan.exhibit2.summaryAfter;
  return html`
    <div class="section-title">What will be written</div>
    <div class="card" style="box-shadow:none;padding:12px">
      <div class="row-between"><strong><span class="exhibit-tag">Exhibit 1</span> Marking Sheet</strong><span class="card-sub">${plan.exhibit1.length} rows</span></div>
      <div class="tag-row" style="margin-top:8px">
        ${plan.exhibit1.map((r) => html`<span class="chip" title="${r.point} ${pointTitle(app, r.point)}">Q${r.q} ${outcome(r.outcome)}</span>`)}
      </div>
    </div>
    <div class="card" style="box-shadow:none;padding:12px;margin-top:8px">
      <div class="row-between"><strong><span class="exhibit-tag">Exhibit 2</span> Progress Sheet</strong><span class="card-sub">${plural(changedCount, 'point')} change</span></div>
      ${miniHeat(heat)}
      <div style="margin-top:8px">
        ${notable.map((c) => diffRow(app, c))}
        ${routine.length ? html`<details><summary>${routineChanged.length ? `${plural(routineChanged.length, 'more point')} answered correctly → Mastered` : `${plural(routine.length, 'point')} answered correctly`}${routine.length > routineChanged.length && routineChanged.length ? `, ${routine.length - routineChanged.length} already mastered` : ''}</summary>
          ${routine.map((c) => diffRow(app, c))}
        </details>` : ''}
      </div>
      ${sb && sa ? html`<div class="card-sub" style="margin-top:6px">Mastered in covered points: ${sb.masteredOfCoveredPct}% → <strong>${sa.masteredOfCoveredPct}%</strong> · course covered ${sb.coveredPct}% → ${sa.coveredPct}%</div>` : ''}
    </div>
    <div class="card" style="box-shadow:none;padding:12px;margin-top:8px">
      <div class="row-between"><strong><span class="exhibit-tag">Exhibit 3</span> Exam Statistics</strong></div>
      ${plan.exhibit3
        ? html`<p style="margin-top:6px">Module ${plan.exhibit3.module}, attempt <strong>${plan.exhibit3.slot || 'none left'}</strong>: ${bandBadge(plan.exhibit3.band, `${plan.exhibit3.pct}%${local.tutorPass && plan.exhibit3.pct < app.data.constants.passPct ? ' *P' : ''}`)} <span class="faint">(was: ${plan.exhibit3.statusBefore.replace('_', ' ')})</span></p>`
        : html`<p class="muted" style="margin-top:6px">VCAA practice exams are not Module Tests, so Exhibit 3 is unchanged.</p>`}
    </div>
    <div class="card" style="box-shadow:none;padding:12px;margin-top:8px">
      <div class="row-between"><strong><span class="exhibit-tag">Log</span> Student exam log</strong></div>
      <p style="margin-top:6px" class="mono">${plan.examLog.paper} · ${plan.examLog.start || '--:--'} → ${plan.examLog.end1 || '--:--'} → ${plan.examLog.end2 || '--:--'} · ${plan.examLog.checks === '' ? '?' : plan.examLog.checks} check(s) · ${plan.examLog.pct}%</p>
    </div>`;
}

function decisionBlock(app, plan, test) {
  const steps = app.data.constants.nextSteps;
  const options = test.kind === 'vcaa'
    ? ['next_mock', 'targeted_practice']
    : ['move_on', 'schedule_retest', 'redo_demo', 'revise_module', 'escalate_teacher'];
  const chosen = local.action || plan.suggestion.action;
  const below = plan.score.pct < app.data.constants.passPct;
  return html`
    <div class="section-title">Next step (Scenario C, step 4): your call</div>
    <div class="callout tone-info"><div><strong>Suggested: ${plan.suggestion.label}</strong><ul class="list" style="margin-top:4px">${plan.suggestion.reasons.map((r) => html`<li>${r}</li>`)}</ul></div></div>
    <div class="radio-list" style="margin-top:8px">
      ${options.map((a) => html`<label class="${a === plan.suggestion.action ? 'suggested' : ''}">
        <input type="radio" name="next" value="${a}" data-action="decide" ${chosen === a ? html`checked` : ''}>
        <span>${steps[a]} ${a === plan.suggestion.action ? html`<span class="chip tone-info">Suggested</span>` : ''}</span>
      </label>`)}
    </div>
    ${test.kind === 'module' && below ? html`<label class="check"><input type="checkbox" data-action="tutor-pass" ${local.tutorPass ? html`checked` : ''}>
      <span>Pass on tutor judgement (recorded as <strong>${plan.score.pct}% *P</strong> in Exhibit 3)</span></label>` : ''}
    ${plan.suggestion.gapPoints.length ? html`<label class="check"><input type="checkbox" data-action="add-qa" ${local.addQa ? html`checked` : ''}>
      <span>Add ${plan.suggestion.gapPoints.join(', ')} to the Q&A list for the exam review</span></label>` : ''}`;
}

function summaryStrip(plan) {
  const n = (o) => plan.exhibit1.filter((r) => r.outcome === o).length;
  const w = n('W');
  const c = n('C');
  const b = n('BLANK');
  return html`<div class="mk-strip">
    <span class="chip tone-ok">✓ ${n('DONE')} correct</span>
    ${w ? html`<span class="chip tone-bad">W ${w} wrong: knowledge gap, mastery down</span>` : ''}
    ${c ? html`<span class="chip tone-warn">C ${c} careless: mastery kept</span>` : ''}
    ${b ? html`<span class="chip">— ${b} blank: your call</span>` : ''}
  </div>`;
}

function miniHeat(heat) {
  if (!heat || !heat.length) return '';
  const cols = `grid-template-columns:repeat(${heat.length},minmax(0,1fr))`;
  const first = heat[0].id;
  const last = heat[heat.length - 1].id;
  return html`<div class="mini-heat" role="img" aria-label="Progress Sheet before and after">
    <div class="mh-row"><span></span><div class="row-between"><span class="mh-id">${first}</span><span class="faint" style="font-size:11px">every point in the Module · outlined = changed</span><span class="mh-id">${last}</span></div></div>
    <div class="mh-row"><span class="mh-label">Before</span><div class="mh-cells" style="${cols}">${heat.map((h) => html`<span class="mh-cell m-${h.before}" title="${h.id} ${h.title}: ${h.before.replace('_', ' ')}"></span>`)}</div></div>
    <div class="mh-row"><span class="mh-label">After</span><div class="mh-cells" style="${cols}">${heat.map((h) => html`<span class="mh-cell m-${h.after} ${h.before !== h.after ? 'changed' : ''}" title="${h.id} ${h.title}: ${h.after.replace('_', ' ')}"></span>`)}</div></div>
  </div>`;
}

function previewPanel(app) {
  const paper = currentPaper(app);
  if (local.result) return resultPanel(app);
  if (!paper) {
    return html`<section class="card"><h2>One entry, three sheets</h2>
      <p class="muted" style="margin-top:6px">Today the same marking result is typed into the Marking Sheet, re-coloured cell by cell in the Progress Sheet and entered again in the Exam Statistics. Here the tutor marks once and ShiftMate prepares all three updates for one confirmation.</p></section>`;
  }
  const test = testOf(app, paper);
  const pv = local.preview;
  const marked = test.questions.filter((q) => local.outcomes[q.q]).length;
  if (marked < test.questions.length) {
    return html`<section class="card">
      <h2>What will change</h2>
      <p class="muted" style="margin-top:6px">${test.questions.length - marked} question(s) to go. The preview of all three sheets appears when every question has a mark.</p>
      <div class="bar" style="margin-top:12px;height:10px"><span class="m-mastered" style="width:${(marked / test.questions.length) * 100}%"></span></div>
    </section>`;
  }
  if (!pv) return html`<section class="card"><div class="row"><span class="spinner"></span><span class="muted">Working out the changes...</span></div></section>`;
  const plan = pv.plan;
  const blanks = plan.blanks.trailing.concat(plan.blanks.isolated);
  const unresolved = blanks.filter((q) => !local.blanks[q]);
  const reasons = app.data.constants.blankReasons;
  return html`<section class="card">
    <div class="card-head">
      <div class="score-big"><span class="num">${plan.score.score} / ${plan.score.total}</span><span style="font-size:18px;font-weight:700">${plan.score.pct}%</span></div>
      ${bandBadge(plan.score.band)}
    </div>
    ${summaryStrip(plan)}

    ${blanks.length ? html`<div class="section-title">Why was it left blank? (needs you)</div>
      ${blanks.map((q) => {
        const where = plan.blanks.trailing.includes(q) ? 'at the end of the paper' : 'mid-paper, later questions answered';
        const sug = plan.blanks.suggestions[q];
        return html`<div style="margin-bottom:8px"><div><strong>Q${q}</strong> <span class="muted">(${where})</span></div>
          <div class="row" style="margin-top:4px">${Object.entries(reasons).map(([k, v]) => html`<label class="chip ${local.blanks[q] === k ? 'tone-dark' : ''}" style="cursor:pointer">
            <input type="radio" name="blank-${q}" value="${k}" data-action="blank" data-q="${q}" ${local.blanks[q] === k ? html`checked` : ''} style="display:none">${v}${sug === k ? ' · suggested' : ''}</label>`)}</div>
        </div>`;
      })}` : ''}

    ${plan.issues.length ? html`<div class="section-title">What the paper shows (Scenario C, step 2)</div>
      ${plan.issues.map((i) => html`<div class="callout tone-${SEVERITY_TONE[i.severity]}"><span class="dot ${SEVERITY_TONE[i.severity]}" style="margin-top:6px"></span><div><strong>${i.label}</strong><br><span style="font-size:12.5px">${i.detail}</span></div></div>`)}`
      : html`<div class="callout tone-ok" style="margin-top:8px">Clean paper: no gaps, careless errors or timing problems.</div>`}

    ${decisionBlock(app, plan, test)}
    ${exhibitBlocks(app, plan, test, pv.heat)}

    <div class="row sticky-actions">
      <button class="btn btn-primary" data-action="apply" ${unresolved.length ? html`disabled title="Say why each blank was left first"` : ''}>Apply to all three sheets</button>
      <span class="muted" style="font-size:12.5px">${unresolved.length ? `Answer the blank question${unresolved.length > 1 ? 's' : ''} above first.` : 'By hand: about 6 minutes across three spreadsheets.'}</span>
    </div>
  </section>`;
}

function resultPanel(app) {
  const r = local.result;
  return html`<section class="card">
    <div class="card-head"><h2>Written to all three sheets</h2><span class="chip tone-ok">Done</span></div>
    <ul class="list">
      <li><span class="exhibit-tag">Exhibit 1</span> ${r.summary.exhibit1Rows} rows added to the Marking Sheet</li>
      <li><span class="exhibit-tag">Exhibit 2</span> ${plural(r.summary.exhibit2Changed, 'point')} re-coloured in the Progress Sheet</li>
      <li><span class="exhibit-tag">Exhibit 3</span> ${r.summary.exhibit3 || 'Not a Module Test: no change'}</li>
      <li><span class="exhibit-tag">Log</span> Exam log entry added</li>
      <li>Decision recorded: <strong>${r.record.decision.label}</strong>${r.record.decision.tutorPass ? ' (tutor pass)' : ''}</li>
    </ul>
    <div class="section-title">Result note for the parent (${r.parentNoteLang === 'zh' ? '中文' : 'English'}) · you send it</div>
    <textarea id="parent-note" rows="5">${r.parentNote}</textarea>
    <div class="row" style="margin-top:10px">
      <button class="btn" data-action="copy-note">Copy note</button>
      <button class="btn btn-primary" data-action="next">Mark next paper</button>
      <a class="btn btn-ghost" href="#/records/${r.record.studentId}">Open records</a>
    </div>
  </section>`;
}

export function render(app, params) {
  if (params[0] && params[0] !== local.paperId && papers(app).some((p) => p.id === params[0])) {
    local = fresh(papers(app).find((p) => p.id === params[0]));
  }
  if (!local.result && local.paperId && !currentPaper(app)) local = fresh(null);
  if (!local.paperId && !local.result && papers(app).length) local = fresh(papers(app)[0]);
  return html`
    <div class="page-head">
      <div>
        <div class="kicker">14:30-16:00 · Phase 3B · Step 8</div>
        <h1>Mark once</h1>
        <p>Mark each question once. ShiftMate writes the Marking Sheet, re-colours the Progress Sheet, fills the Exam Statistics and the exam log, and separates knowledge gaps (W) from careless errors (C). All rules, no AI: you confirm every change.</p>
      </div>
    </div>
    ${paperList(app)}
    <div class="marking">
      <div id="mk-pad-wrap">${pad(app)}</div>
      <div class="mk-preview" id="mk-preview">${previewPanel(app)}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------------

function rerenderPad(app) {
  const wrap = document.getElementById('mk-pad-wrap');
  if (wrap) wrap.innerHTML = String(pad(app));
}

function rerenderPreview(app) {
  const el = document.getElementById('mk-preview');
  if (el) el.innerHTML = String(previewPanel(app));
}

function requestBody() {
  return {
    paperId: local.paperId,
    outcomes: local.outcomes,
    partialMarks: local.partial,
    timing: local.timing,
    blankResolutions: local.blanks,
  };
}

let timer = null;
function schedulePreview(app) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const paper = currentPaper(app);
    if (!paper) return;
    const test = testOf(app, paper);
    if (test.questions.some((q) => !local.outcomes[q.q])) {
      local.preview = null;
      rerenderPreview(app);
      return;
    }
    const seq = ++local.seq;
    try {
      const pv = await app.api.post('/api/marking/preview', requestBody());
      if (seq !== local.seq) return;
      local.preview = pv;
      if (!local.action) local.action = null;
      rerenderPreview(app);
    } catch (err) {
      app.toast(err.message, 'bad');
    }
  }, 120);
}

export function mount(root, app) {
  schedulePreview(app);
}

function setOutcome(app, q, o) {
  local.outcomes[q] = o;
  if (o !== 'BLANK') delete local.blanks[q];
  local.result = null;
}

async function readQuick(app) {
  const paper = currentPaper(app);
  if (!paper) return;
  const info = await app.run(() => app.api.post('/api/marking/parse', { testId: paper.testId, text: local.quick }));
  if (!info) return;
  local.quickInfo = info;
  Object.entries(info.outcomes).forEach(([q, o]) => setOutcome(app, q, o));
  rerenderPad(app);
  schedulePreview(app);
}

export async function on(type, action, el, event, app) {
  const paper = currentPaper(app);

  if (type === 'keydown') {
    const tag = event.target.tagName;
    if (event.target.dataset.action === 'quick' && event.key === 'Enter') {
      event.preventDefault();
      await readQuick(app);
      return;
    }
    if (!paper || local.result || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const test = testOf(app, paper);
    const key = event.key.toLowerCase();
    if (key === 'arrowdown' || key === 'j') {
      local.focusIdx = Math.min(test.questions.length - 1, local.focusIdx + 1);
    } else if (key === 'arrowup' || key === 'k') {
      local.focusIdx = Math.max(0, local.focusIdx - 1);
    } else if (KEY_TO_OUTCOME[key]) {
      setOutcome(app, test.questions[local.focusIdx].q, KEY_TO_OUTCOME[key]);
      local.focusIdx = Math.min(test.questions.length - 1, local.focusIdx + 1);
      schedulePreview(app);
    } else {
      return;
    }
    event.preventDefault();
    rerenderPad(app);
    return;
  }

  if (type === 'input') {
    if (action === 'quick') local.quick = el.value;
    if (action === 'partial') {
      if (el.value === '') delete local.partial[el.dataset.q];
      else local.partial[el.dataset.q] = Number(el.value);
      schedulePreview(app);
    }
    if (action === 'timing') {
      local.timing[el.dataset.k] = el.dataset.k === 'checks' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      schedulePreview(app);
    }
    return;
  }

  if (type === 'change') {
    if (action === 'blank') {
      local.blanks[el.dataset.q] = el.value;
      schedulePreview(app);
    } else if (action === 'decide') {
      local.action = el.value;
      rerenderPreview(app);
    } else if (action === 'tutor-pass') {
      local.tutorPass = el.checked;
      rerenderPreview(app);
    } else if (action === 'add-qa') {
      local.addQa = el.checked;
    }
    return;
  }

  if (type !== 'click') return;

  if (action === 'pick') {
    local = fresh(papers(app).find((p) => p.id === el.dataset.id));
    app.navigate(`#/marking/${el.dataset.id}`);
  } else if (action === 'set') {
    const test = testOf(app, paper);
    setOutcome(app, el.dataset.q, el.dataset.o);
    local.focusIdx = Math.min(test.questions.length - 1, test.questions.findIndex((q) => q.q === el.dataset.q) + 1);
    rerenderPad(app);
    schedulePreview(app);
  } else if (action === 'focus-row') {
    if (event.target.closest('button, input')) return;
    local.focusIdx = Number(el.dataset.idx);
    rerenderPad(app);
  } else if (action === 'quick-apply') {
    await readQuick(app);
  } else if (action === 'sample') {
    local.quick = paper.sampleMarks || '';
    await readQuick(app);
  } else if (action === 'clear') {
    local = fresh(paper);
    rerenderPad(app);
    rerenderPreview(app);
  } else if (action === 'apply') {
    const plan = local.preview && local.preview.plan;
    const body = {
      ...requestBody(),
      decision: { action: local.action || plan.suggestion.action, tutorPass: local.tutorPass, addQa: local.addQa, note: local.note },
    };
    const result = await app.run(() => app.api.post('/api/marking/apply', body));
    if (!result) return;
    local.result = result;
    local.paperId = null;
    app.toast('Exhibits 1, 2 and 3 updated in one step');
    await app.refresh();
  } else if (action === 'copy-note') {
    const text = document.getElementById('parent-note').value;
    app.toast((await app.copy(text)) ? 'Note copied for WeChat' : 'Select the text and copy it');
  } else if (action === 'next') {
    local = fresh(papers(app)[0] || null);
    app.navigate(local.paperId ? `#/marking/${local.paperId}` : '#/marking');
    if (!local.paperId) app.refresh();
  }
}
