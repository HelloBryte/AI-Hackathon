import { html, timeOf } from '../ui.js';

let lang = 'en';
const LEVEL_TONE = { high: 'bad', medium: 'warn', low: 'info' };

export function render(app) {
  const r = app.data.views.report;
  const c = r.counts;
  const stat = (num, lbl, sub) => html`<div class="card stat"><div class="num">${num}</div><div class="lbl">${lbl}</div>${sub ? html`<div class="faint" style="font-size:11.5px">${sub}</div>` : ''}</div>`;
  const signed = r.signedOff;
  return html`
    <div class="page-head">
      <div>
        <div class="kicker">18:20-18:30 · Phase 5</div>
        <h1>Daily work report</h1>
        <p>Every figure the manager asks for is counted from what happened in ShiftMate today: check-ins, Q&A logs, marked papers, approved replies. The follow-up list is built from open Retests, close SACs, unanswered messages and handovers.</p>
      </div>
      <div class="page-actions">
        <a class="btn" href="#/onsite">Log on-site work</a>
      </div>
    </div>
    <div class="stats">
      ${stat(c.onSite, 'Students on site')}
      ${stat(c.qaStudents, 'Students helped in Q&A', `~${c.qaQuestions} questions`)}
      ${stat(c.testsMarked, 'Test papers marked')}
      ${stat(c.sacAnswers, 'SAC / Practice SAC answers')}
      ${stat(c.parentFeedback, 'Parent feedback completed', `${c.repliesSent} WeChat ${c.repliesSent === 1 ? 'reply' : 'replies'} approved`)}
      ${stat(c.demoReviews, 'Demo checks')}
    </div>
    <div class="grid grid-2">
      <section class="card">
        <div class="card-head"><h2>Priority follow-up</h2><span class="card-sub">${r.followUps.length} item(s)</span></div>
        ${r.followUps.length ? r.followUps.map((f) => html`<div class="callout tone-${LEVEL_TONE[f.level]}"><span class="dot ${LEVEL_TONE[f.level]}" style="margin-top:6px"></span><div>${f.text}</div></div>`) : html`<p class="muted">Nothing outstanding.</p>`}
      </section>
      <section class="card">
        <div class="card-head">
          <h2>Report for the manager</h2>
          <div class="seg">
            <button data-action="lang" data-lang="en" class="${lang === 'en' ? 'on-DONE' : ''}">EN</button>
            <button data-action="lang" data-lang="zh" class="${lang === 'zh' ? 'on-DONE' : ''}">中文</button>
          </div>
        </div>
        <div class="report-text" id="report-text">${signed && lang === 'en' ? signed.text : (lang === 'zh' ? r.textZh : r.text)}</div>
        <div class="row" style="margin-top:12px">
          <button class="btn" data-action="copy">Copy</button>
          <span class="spacer"></span>
          ${signed
            ? html`<div class="stamp"><span>Signed off · ${signed.signedBy}</span><small>${timeOf(signed.signedAt)}</small></div>`
            : html`<input type="text" id="manager" value="${app.data.state.settings.manager}" style="width:160px" aria-label="Manager name">
               <button class="btn btn-primary" data-action="sign">Manager sign-off</button>`}
        </div>
      </section>
    </div>`;
}

export async function on(type, action, el, event, app) {
  if (type !== 'click') return;
  if (action === 'lang') {
    lang = el.dataset.lang;
    app.refresh();
  } else if (action === 'copy') {
    const text = document.getElementById('report-text').textContent;
    app.toast((await app.copy(text)) ? 'Report copied' : 'Select the text and copy it');
  } else if (action === 'sign') {
    const manager = document.getElementById('manager').value;
    if (await app.run(() => app.api.post('/api/report/signoff', { manager }), `Signed off by ${manager}`)) app.refresh();
  }
}
