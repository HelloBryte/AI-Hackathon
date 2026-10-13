import { html, statusChip, fmtDate, masteryChip } from '../ui.js';

const CHECKS = [
  ['working', 'Working shown clearly'],
  ['accuracy', 'Accurate answers'],
  ['method', 'Right choice of method'],
  ['concepts', 'Grasps the core concepts'],
];

function student(app, id) {
  return app.data.state.students.find((s) => s.id === id);
}

function demoModal(app, s, module) {
  const pts = app.data.syllabus.points.filter((p) => p.module === module);
  const progress = app.data.state.progress[s.id] || {};
  return html`<form class="modal-body" data-form="demo" onsubmit="return false">
    <h2>Demo check: ${s.name}, Module ${module}</h2>
    <p class="muted" style="margin:4px 0 12px">Scenario A, step 4. The student did the Demo without recordings, answers or notes. Tick what you saw. The decision is yours.</p>
    ${CHECKS.map(([k, label]) => html`<label class="check"><input type="checkbox" name="${k}"><span>${label}</span></label>`)}
    <div class="section-title">Decision</div>
    <div class="radio-list">
      <label><input type="radio" name="outcome" value="meets"><span><strong>Meets the standard</strong>: book the Module ${module} Test</span></label>
      <label><input type="radio" name="outcome" value="not_yet"><span><strong>Not yet</strong>: re-watch, correct, extra practice, review again</span></label>
    </div>
    <div class="section-title">If not yet: points to re-watch</div>
    <div class="tag-row">${pts.map((p) => html`<label class="chip" style="cursor:pointer" title="${p.title}"><input type="checkbox" name="pt" value="${p.id}" style="margin:0 4px 0 0">${p.id} ${masteryChip(progress[p.id] || 'not_covered', ' ')}</label>`)}</div>
    <label class="field" style="margin-top:12px">Note<input type="text" name="note" placeholder="Optional"></label>
  </form>
  <div class="modal-foot">
    <button class="btn" data-action="close">Cancel</button>
    <button class="btn btn-primary" data-action="save-demo" data-student="${s.id}" data-module="${module}">Save decision</button>
  </div>`;
}

function sacBlock(app, s, card) {
  if (!card.sacs.length) return '';
  return html`${card.sacs.map((r) => html`<div class="section-title">Scenario B · ${r.sac.title} · ${fmtDate(r.sac.date)} (${r.daysLeft} days)</div>
    <div class="sac-rows">${r.modules.map((m) => html`<div class="sac-row">
      <div class="sac-name"><strong>Module ${m.module}</strong> ${m.name}<br><span class="muted" style="font-size:12px">Test ${m.testStatus.replace(/_/g, ' ')} · ${m.masteredPct}% mastered</span></div>
      ${m.readiness === 'ready' ? html`<span class="chip tone-ok">Ready</span>` : html`<span class="chip tone-warn" title="${m.gaps.map((g) => g.id).join(', ')}">${m.gaps.length} weak points</span>`}
    </div>`)}</div>
    <ul class="list" style="margin-top:6px">${r.plan.map((p) => html`<li>${p}</li>`)}</ul>
    <div class="row" style="margin-top:6px"><button class="btn btn-xs" data-action="sac-answer" data-student="${s.id}">Practice SAC marked (+1)</button><span class="faint" style="font-size:12px">Source: ${r.sac.source}; materials: ${r.sac.materials}</span></div>`)}`;
}

function studentPanel(app, l) {
  const s = student(app, l.studentId);
  const card = l.card;
  const qa = app.data.state.qaQueue.filter((q) => q.studentId === s.id && q.status !== 'done');
  const demoReq = card.demoRequests.length > 0;
  const lastRecord = app.data.state.markingRecords
    .filter((r) => r.studentId === s.id && r.source === 'shiftmate')
    .slice(-1)[0];
  return html`<article class="card">
    <div class="card-head">
      <div>
        <h2>${s.name}</h2>
        <div class="card-sub">${l.start}-${l.end} · ${l.mode === 'online' ? 'Zoom' : l.room} · ${l.teacher} · Module ${card.currentModule.id}</div>
      </div>
      <div class="row">${statusChip(l.status, l.mode)}
        ${l.status === 'expected' && l.mode === 'in_person' ? html`<button class="btn btn-xs" data-action="checkin" data-id="${l.id}">Check in</button>` : ''}
      </div>
    </div>

    <div class="section-title">Scenario A · Module ${card.currentModule.id} study</div>
    <div class="row">
      <button class="btn btn-sm ${demoReq ? 'btn-accent' : ''}" data-action="demo" data-student="${s.id}" data-module="${card.currentModule.id}">${demoReq ? 'Demo waiting: check it' : 'Check a Demo'}</button>
      <span class="muted" style="font-size:12.5px">${card.currentModule.masteredPct}% of Module ${card.currentModule.id} mastered</span>
    </div>

    ${sacBlock(app, s, card)}

    ${lastRecord ? html`<div class="section-title">Scenario C · review ${lastRecord.testName} (${lastRecord.pct}%)</div>
      <ul class="list">${lastRecord.issues.map((i) => html`<li><strong>${i.label}</strong>: ${i.detail}</li>`)}</ul>
      <div class="card-sub" style="margin-top:4px">Decision: ${lastRecord.decision.label}</div>` : ''}

    <div class="section-title">Q&A</div>
    ${qa.length ? html`<ul class="list">${qa.map((q) => html`<li>
      ${q.topic} <span class="faint">(${q.source})</span>
      <button class="btn btn-xs" data-action="qa-done" data-student="${s.id}" data-id="${q.id}" data-topic="${q.topic}">Answered</button>
    </li>`)}</ul>` : html`<p class="muted">No open questions.</p>`}
    <div class="row" style="margin-top:8px">
      <input type="number" min="1" max="20" value="1" style="width:70px" aria-label="Number of questions" data-qa-count="${s.id}">
      <button class="btn btn-xs" data-action="qa-log" data-student="${s.id}">Log Q&A questions</button>
    </div>
  </article>`;
}

export function render(app) {
  const { briefing } = app.data.views;
  const lessons = briefing.lessons.filter((l) => l.status !== 'leave');
  const onLeave = briefing.lessons.filter((l) => l.status === 'leave');
  return html`
    <div class="page-head">
      <div>
        <div class="kicker">16:00-18:00 · Phase 4 · Step 9</div>
        <h1>On site</h1>
        <p>The three tutoring scenarios with the records beside them: Demo checks (A), SAC readiness against the Progress Sheet (B) and exam reviews from the W / C / time analysis (C). Every pass, booking and Retest stays the tutor's decision; ShiftMate only counts and records.</p>
      </div>
      <div class="page-actions">
        <button class="btn" data-action="simulate" title="For the demo: checks everyone in and logs typical Q&A">Demo: play 16:00-18:00</button>
      </div>
    </div>
    ${onLeave.length ? html`<div class="callout tone-info" style="margin-bottom:14px">On leave today: ${onLeave.map((l) => l.card.student.name).join(', ')} (teacher told).</div>` : ''}
    <div class="cards">${lessons.map((l) => studentPanel(app, l))}</div>`;
}

export async function on(type, action, el, event, app) {
  if (type !== 'click') return;
  if (action === 'checkin') {
    if (await app.run(() => app.api.post(`/api/timetable/${el.dataset.id}/checkin`), 'Checked in')) app.refresh();
  } else if (action === 'simulate') {
    if (await app.run(() => app.api.post('/api/demo/simulate'), 'Played 16:00-18:00: check-ins and Q&A logged')) app.refresh();
  } else if (action === 'sac-answer') {
    if (await app.run(() => app.api.post('/api/sac-answer', { studentId: el.dataset.student, kind: 'Practice SAC' }), 'Practice SAC recorded')) app.refresh();
  } else if (action === 'qa-done') {
    if (await app.run(() => app.api.post('/api/qa/log', { studentId: el.dataset.student, count: 1, qaId: el.dataset.id, topic: el.dataset.topic }), 'Q&A logged')) app.refresh();
  } else if (action === 'qa-log') {
    const input = document.querySelector(`[data-qa-count="${el.dataset.student}"]`);
    const count = Number(input && input.value) || 1;
    if (await app.run(() => app.api.post('/api/qa/log', { studentId: el.dataset.student, count }), `${count} Q&A question(s) logged`)) app.refresh();
  } else if (action === 'demo') {
    const s = student(app, el.dataset.student);
    const module = Number(el.dataset.module);
    app.openModal(demoModal(app, s, module), {
      'save-demo': async (btn, modal) => {
        const form = modal.querySelector('form');
        const fd = new FormData(form);
        const checks = Object.fromEntries(CHECKS.map(([k]) => [k, fd.get(k) === 'on']));
        const body = {
          studentId: s.id, module, checks, outcome: fd.get('outcome'), points: fd.getAll('pt'), note: fd.get('note') || '',
        };
        if (!body.outcome) {
          app.toast('Choose "Meets the standard" or "Not yet"', 'bad');
          return;
        }
        const ok = await app.run(() => app.api.post('/api/demo-review', body),
          body.outcome === 'meets' ? `Module ${module} Test booked for ${s.name}` : 'Recorded: re-watch list added to Q&A');
        if (ok) {
          app.closeModal();
          app.refresh();
        }
      },
    });
  }
}
