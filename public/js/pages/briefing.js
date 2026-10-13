import { html, masteryBar, statusChip, fmtDate, timeOf } from '../ui.js';

const LEVEL_TONE = { high: 'bad', medium: 'warn', low: 'info' };

function alertsCard(briefing) {
  if (!briefing.alerts.length) return '';
  return html`<section class="card" style="margin-bottom:14px">
    <div class="card-head"><h2>Before the first lesson</h2><span class="card-sub">Step 3: changes to confirm and pass on</span></div>
    ${briefing.alerts.map((a) => html`<div class="callout tone-${LEVEL_TONE[a.level]}">
      <span class="dot ${LEVEL_TONE[a.level]}" style="margin-top:6px"></span>
      <div class="spacer">${a.text}</div>
      ${a.messageId ? html`<a class="btn btn-xs" href="#/inbox/${a.messageId}">Open message</a>` : ''}
      ${a.kind === 'marking' ? html`<a class="btn btn-xs" href="#/marking">Mark now</a>` : ''}
      ${a.kind === 'inbox' ? html`<a class="btn btn-xs" href="#/inbox">Open inbox</a>` : ''}
    </div>`)}
  </section>`;
}

function noticesCard(briefing, app) {
  if (!briefing.teacherNotices.length) return '';
  const name = (id) => (app.data.state.students.find((s) => s.id === id) || {}).name;
  return html`<section class="card" style="margin-bottom:14px">
    <div class="card-head"><h2>Passed on to teachers</h2><span class="card-sub">Step 3</span></div>
    <ul class="list">${briefing.teacherNotices.map((n) => html`<li><strong>${n.teacher}</strong> · ${timeOf(n.at)} · ${n.text} <span class="faint">(${name(n.studentId)})</span></li>`)}</ul>
  </section>`;
}

function lessonCard(l) {
  const c = l.card;
  return html`<article class="card lesson-card ${l.status === 'leave' ? 'is-leave' : ''}">
    <div class="who">
      <div>
        <div class="time">${l.start}-${l.end} · ${l.mode === 'online' ? 'Zoom' : l.room} · ${l.teacher}</div>
        <div class="name">${c.student.name}</div>
        <div class="card-sub">${c.student.classId} · ${c.student.school}</div>
      </div>
      <div class="row">${statusChip(l.status, l.mode)}</div>
    </div>
    <div class="tag-row" style="margin:10px 0 4px">
      ${c.scenarios.map((s) => html`<span class="chip ${s.priority ? 'tone-warn' : 'tone-info'}" title="Scenario ${s.code} in the brief">${s.code} · ${s.label}</span>`)}
    </div>

    <div class="section-title">Module ${c.currentModule.id}: ${c.currentModule.name}</div>
    ${masteryBar(c.currentModule)}
    <div class="card-sub" style="margin-top:4px">${c.currentModule.masteredPct}% of this Module mastered · whole course ${c.overall.coveredPct}% covered</div>

    ${c.incomplete.length ? html`<div class="section-title">Incomplete tests</div>
      <ul class="list">${c.incomplete.map((i) => html`<li>${i.text}</li>`)}</ul>` : ''}

    ${c.sacs.length ? html`<div class="section-title">Upcoming SAC</div>
      ${c.sacs.map((r) => html`<div>
        ${r.sac.title} · <strong>${fmtDate(r.sac.date)}</strong> (${r.daysLeft} days)
        ${r.ready ? html`<span class="chip tone-ok">Ready</span>` : html`<span class="chip tone-warn">Gaps</span>`}
        <div class="card-sub">${r.plan[0]}</div>
      </div>`)}` : ''}

    ${c.recentMistakes.length || c.careless.length ? html`<div class="section-title">Recent mistakes</div>
      <div class="tag-row">
        ${c.recentMistakes.map((w) => html`<span class="chip tone-bad" title="${w.title} (${w.test}, Q${w.q})">W ${w.point}</span>`)}
        ${c.careless.length ? html`<span class="chip tone-warn" title="${c.careless.map((x) => `${x.point} (${x.test})`).join(', ')}">${c.careless.length} careless (C)</span>` : ''}
      </div>` : ''}

    ${c.talkingPoints.length ? html`<div class="section-title">Ask about today (step 5)</div>
      <ul class="list">${c.talkingPoints.map((t) => html`<li>${t}</li>`)}</ul>` : ''}

    <div class="row" style="margin-top:12px">
      ${l.status === 'expected' && l.mode === 'in_person' ? html`<button class="btn btn-sm" data-action="checkin" data-id="${l.id}">Check in</button>` : ''}
      <a class="btn btn-sm btn-ghost" href="#/records/${c.student.id}">Open records</a>
    </div>
  </article>`;
}

export function render(app) {
  const { briefing } = app.data.views;
  const { state } = app.data;
  const c = briefing.counts;
  const waiting = state.inbox.filter((m) => m.status !== 'sent').length;
  const stat = (num, lbl) => html`<div class="card stat"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`;
  return html`
    <div class="page-head">
      <div>
        <div class="kicker">14:15-14:30 · Phase 2 · Steps 2-5</div>
        <h1>Shift briefing</h1>
        <p>Today's timetable, attendance changes still sitting in WeChat, and a prep card for every student, read from the Progress Sheet (Exhibit 2) and Exam Statistics (Exhibit 3). Built automatically, so the tutor no longer opens each record by hand.</p>
      </div>
    </div>
    <div class="stats">
      ${stat(c.lessons, 'Lessons today')}
      ${stat(c.onSite, 'On site now')}
      ${stat(c.expectedInPerson, 'Expected in person')}
      ${stat(c.online, 'Online')}
      ${stat(c.leave, 'On leave')}
      ${stat(waiting, 'WeChat waiting')}
      ${stat(state.pendingPapers.length, 'Papers to mark')}
    </div>
    ${alertsCard(briefing)}
    ${noticesCard(briefing, app)}
    <div class="cards">${briefing.lessons.map((l) => lessonCard(l))}</div>`;
}

export async function on(type, action, el, event, app) {
  if (type !== 'click') return;
  if (action === 'checkin') {
    const ok = await app.run(() => app.api.post(`/api/timetable/${el.dataset.id}/checkin`), 'Checked in');
    if (ok) app.refresh();
  }
}
