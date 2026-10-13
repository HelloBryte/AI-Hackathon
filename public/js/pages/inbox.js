import { html, langChip, timeOf } from '../ui.js';

// Local UI state survives re-renders but not page reloads.
const local = { busy: new Set(), drafts: {}, checks: {} };

export function resetLocal() {
  local.busy.clear();
  local.drafts = {};
  local.checks = {};
}

const URGENCY = { today: ['Today', 'tone-bad'], soon: ['Soon', 'tone-warn'], low: ['Low', ''] };
const STATUS = { new: ['New', 'tone-info'], triaged: ['Draft ready', 'tone-warn'], sent: ['Sent', 'tone-ok'] };

function senderName(app, m) {
  const s = app.data.state.students.find((x) => x.id === m.studentId);
  if (!s) return m.studentId;
  return m.relation === 'parent' ? `${s.parent.name} (${s.name}'s ${s.parent.relation})` : s.name;
}

function selectedId(app, params) {
  const inbox = app.data.state.inbox;
  if (params[0] && inbox.some((m) => m.id === params[0])) return params[0];
  const next = inbox.find((m) => m.status !== 'sent');
  return next ? next.id : (inbox[0] && inbox[0].id);
}

function listItem(app, m, active) {
  const [label, tone] = STATUS[m.status] || [m.status, ''];
  const urgent = m.triage && m.triage.urgency === 'today' && m.status !== 'sent';
  return html`<button class="msg-item ${active ? 'active' : ''} ${m.status === 'sent' ? 'is-sent' : ''}" data-action="select" data-id="${m.id}">
    <div class="meta">
      <strong>${senderName(app, m)}</strong>
      <span class="faint mono">${timeOf(m.receivedAt)}</span>
    </div>
    <div class="preview">${m.text}</div>
    <div class="row" style="margin-top:6px">
      <span class="chip ${tone}">${label}</span>
      ${langChip(m.lang)}
      ${local.busy.has(m.id) ? html`<span class="spinner" aria-label="Drafting"></span>` : ''}
      ${urgent ? html`<span class="chip tone-bad">Today</span>` : ''}
    </div>
  </button>`;
}

function actionList(m) {
  const t = m.triage;
  if (!t.actions.length) return html`<p class="muted">No records change. The reply is the whole job.</p>`;
  const checks = local.checks[m.id] || new Set(t.actions.map((a, i) => i));
  local.checks[m.id] = checks;
  return html`${t.actions.map((a, i) => html`<label class="check">
    <input type="checkbox" data-action="toggle-action" data-index="${i}" ${checks.has(i) ? html`checked` : ''}>
    <span>${a.label}</span>
  </label>`)}`;
}

function triagePanel(app, m) {
  const t = m.triage;
  const c = app.data.constants;
  const [ulabel, utone] = URGENCY[t.urgency] || [t.urgency, ''];
  const draft = local.drafts[m.id] !== undefined ? local.drafts[m.id] : t.draft;
  const replyLang = t.replyLanguage === 'zh' ? '中文' : 'English';
  const engine = t.mode === 'claude' ? `Claude (${t.model})` : 'Rules engine (offline)';
  return html`
    <div class="section-title">${t.mode === 'claude' ? 'What Claude read' : 'What the rules engine read'}</div>
    <p style="font-size:15px"><strong>${t.summary}</strong></p>
    <div class="row" style="margin-top:8px">
      ${t.intents.map((i, idx) => html`<span class="chip ${idx === 0 ? 'tone-dark' : ''}">${c.intentLabels[i] || i}</span>`)}
      <span class="chip ${utone}">Urgency: ${ulabel}</span>
      <span class="conf">Confidence <span class="bar"><span style="width:${Math.round(t.confidence * 100)}%"></span></span> ${Math.round(t.confidence * 100)}%</span>
    </div>
    <div class="row" style="margin-top:8px">
      <span class="muted">Route:</span> <strong>${c.routes[t.route] || t.route}</strong>
      <span class="spacer"></span>
      <label class="row muted" style="gap:6px">Wrong category?
        <select data-action="recategorise" style="width:auto">
          <option value="">Choose...</option>
          ${Object.entries(c.intentLabels).map(([k, v]) => html`<option value="${k}">${v}</option>`)}
        </select>
      </label>
    </div>
    ${t.recategorisedByTutor ? html`<div class="callout tone-info" style="margin-top:10px">Re-categorised by you. Draft rebuilt by the rules engine.</div>` : ''}
    ${t.aiError ? html`<div class="callout tone-info" style="margin-top:10px"><span class="icon">i</span><div>Claude was not used: ${t.aiError}. Drafted by the offline rules engine instead.</div></div>` : ''}
    ${t.needsTutor.length ? html`<div style="margin-top:10px">${t.needsTutor.map((n) => html`<div class="callout tone-warn"><span class="icon">!</span><div>${n}</div></div>`)}</div>` : ''}

    <div class="grid grid-2" style="margin-top:14px">
      <div>
        <div class="row-between"><div class="section-title" style="margin:0">Draft reply · ${replyLang}</div><span class="faint" style="font-size:12px">${engine}</span></div>
        <textarea data-action="edit-draft" rows="7" style="margin-top:6px" aria-label="Draft reply">${draft}</textarea>
        ${t.factWarnings.length ? t.factWarnings.map((w) => html`<div class="callout tone-bad" style="margin-top:6px"><span class="icon">!</span><div>Fact check: ${w}. Edit before sending.</div></div>`) : html`<div class="faint" style="font-size:12px;margin-top:4px">Fact check passed: every percentage in the draft is in the records.</div>`}
      </div>
      <div>
        <div class="section-title" style="margin-top:0">Facts from the records</div>
        <ul class="list" style="font-size:13px">${t.facts.en.map((f) => html`<li>${f}</li>`)}</ul>
        ${t.tutorHint ? html`<div class="section-title">For you, not sent</div><div class="callout tone-info"><div>${t.tutorHint}</div></div>` : ''}
      </div>
    </div>

    <div class="section-title">When you approve</div>
    ${actionList(m)}

    <details style="margin-top:10px">
      <summary>Privacy: what left the centre for this draft</summary>
      ${t.sentToAI
        ? html`<p class="muted" style="margin-bottom:6px">Names, parent and school replaced by placeholders before sending. Real names are put back only on this screen.</p><div class="sent-to-ai">${t.sentToAI}</div>`
        : html`<p class="muted">Nothing. This draft was made by the offline rules engine on this computer.</p>`}
    </details>

    <div class="row" style="margin-top:16px">
      <button class="btn btn-primary" data-action="approve">Approve, apply and copy reply</button>
      <button class="btn" data-action="redraft">Redraft</button>
      ${t.mode === 'claude' ? html`<button class="btn btn-ghost" data-action="redraft-rules">Redraft with rules only</button>` : ''}
    </div>`;
}

function detail(app, m) {
  if (!m) return html`<div class="card"><p class="muted">No messages.</p></div>`;
  const s = app.data.state.students.find((x) => x.id === m.studentId);
  const busy = local.busy.has(m.id);
  return html`<section class="card">
    <div class="card-head">
      <div>
        <h2>${senderName(app, m)}</h2>
        <div class="card-sub">${m.channel} · ${timeOf(m.receivedAt)} · ${m.relation === 'parent' ? 'Parent' : 'Student'} · ${s.classId}</div>
      </div>
      <div class="row">${langChip(m.lang)}<a class="btn btn-xs btn-ghost" href="#/records/${s.id}">Records</a></div>
    </div>
    <div class="bubble" lang="${m.lang === 'en' ? 'en' : 'zh'}">${m.text}</div>
    ${m.status === 'sent' ? html`
      <div class="section-title">Your reply · sent ${timeOf(m.sentAt)}</div>
      <div class="bubble out">${m.reply}</div>
      ${m.appliedActions && m.appliedActions.length ? html`<div class="section-title">Applied</div><ul class="list">${m.appliedActions.map((a) => html`<li>${a}</li>`)}</ul>` : ''}
    ` : busy ? html`<div class="row" style="margin-top:16px"><span class="spinner"></span><span class="muted">${app.data.ai.enabled ? 'Claude is reading the message and the records...' : 'Reading the message and the records...'}</span></div>`
      : m.triage ? triagePanel(app, m)
        : html`<div class="row" style="margin-top:16px"><button class="btn btn-primary" data-action="triage">Draft a reply</button></div>`}
  </section>`;
}

export function render(app, params) {
  const { inbox } = app.data.state;
  const id = selectedId(app, params);
  const current = inbox.find((m) => m.id === id);
  const newCount = inbox.filter((m) => m.status === 'new').length;
  const open = inbox.filter((m) => m.status !== 'sent').length;
  return html`
    <div class="page-head">
      <div>
        <div class="kicker">14:30-16:00 · Phase 3A · Steps 6-7</div>
        <h1>WeChat inbox</h1>
        <p>Every message is classified, matched to the student's records and given a draft reply in the sender's language. Simple status questions are answered from the records; maths, fees and judgement calls are routed. Nothing is sent until you approve it.</p>
      </div>
      <div class="page-actions">
        <button class="btn" data-action="triage-all" ${newCount ? '' : html`disabled`}>Draft all new (${newCount})</button>
      </div>
    </div>
    <div class="inbox">
      <div class="card msg-list">
        <div class="row-between" style="padding:6px 8px 8px"><strong>${open} open</strong><span class="faint">${inbox.length} today</span></div>
        ${inbox.map((m) => listItem(app, m, m.id === id))}
      </div>
      <div id="inbox-detail" data-id="${id}">${detail(app, current)}</div>
    </div>`;
}

async function triage(app, id, body = {}) {
  local.busy.add(id);
  delete local.drafts[id];
  delete local.checks[id];
  if (app.route.page === 'inbox') app.navigate(`#/inbox/${id}`);
  try {
    await app.api.post(`/api/inbox/${id}/triage`, body);
  } catch (err) {
    app.toast(err.message, 'bad');
  } finally {
    local.busy.delete(id);
  }
  await app.refresh();
}

export function mount(root, app, params) {
  const id = selectedId(app, params);
  const m = app.data.state.inbox.find((x) => x.id === id);
  if (m && !m.triage && m.status !== 'sent' && !local.busy.has(id)) triage(app, id);
}

export async function on(type, action, el, event, app) {
  const detailEl = document.getElementById('inbox-detail');
  const id = detailEl ? detailEl.dataset.id : null;

  if (type === 'input' && action === 'edit-draft') {
    local.drafts[id] = el.value;
    return;
  }
  if (type === 'change' && action === 'toggle-action') {
    const set = local.checks[id] || new Set();
    const i = Number(el.dataset.index);
    if (el.checked) set.add(i);
    else set.delete(i);
    local.checks[id] = set;
    return;
  }
  if (type === 'change' && action === 'recategorise' && el.value) {
    await triage(app, id, { intent: el.value });
    return;
  }
  if (type !== 'click') return;

  if (action === 'select') {
    app.navigate(`#/inbox/${el.dataset.id}`);
  } else if (action === 'triage' || action === 'redraft') {
    await triage(app, id);
  } else if (action === 'redraft-rules') {
    await triage(app, id, { forceRules: true });
  } else if (action === 'triage-all') {
    const ids = app.data.state.inbox.filter((m) => m.status === 'new').map((m) => m.id);
    ids.forEach((x) => local.busy.add(x));
    app.refresh();
    for (const x of ids) {
      try {
        await app.api.post(`/api/inbox/${x}/triage`, {});
      } catch (err) {
        app.toast(err.message, 'bad');
      }
      local.busy.delete(x);
    }
    await app.refresh();
    app.toast(`${ids.length} drafts ready for review`);
  } else if (action === 'approve') {
    const m = app.data.state.inbox.find((x) => x.id === id);
    const reply = local.drafts[id] !== undefined ? local.drafts[id] : m.triage.draft;
    const checks = local.checks[id] || new Set(m.triage.actions.map((a, i) => i));
    const out = await app.run(() => app.api.post(`/api/inbox/${id}/approve`, { reply, actions: [...checks] }));
    if (!out) return;
    const copied = await app.copy(reply);
    app.toast(copied ? 'Reply copied: paste it into Work WeChat' : 'Approved. Copy the reply into Work WeChat');
    delete local.drafts[id];
    delete local.checks[id];
    await app.refresh();
    const next = app.data.state.inbox.find((x) => x.status !== 'sent');
    if (next) app.navigate(`#/inbox/${next.id}`);
  }
}
