// State changes. Every function here runs only after the tutor confirms in
// the UI, and each one leaves an activity entry (for the daily report) and,
// where AI or rules made a suggestion, an audit entry (suggestion vs decision).

const core = require('./core');
const { POINTS, TESTS } = require('./syllabus');
const views = require('./views');

class ActionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function nowISO(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function log(state, type, fields, now) {
  state.activity.push({ id: newId('ev'), at: nowISO(now), type, ...fields });
}

function audit(state, fields, now) {
  state.audit.push({ id: newId('au'), at: nowISO(now), ...fields });
}

function requireStudent(state, id) {
  const s = views.studentById(state, id);
  if (!s) throw new ActionError(`Unknown student ${id}`, 404);
  return s;
}

function requireTest(id) {
  const t = TESTS.find((x) => x.id === id);
  if (!t) throw new ActionError(`Unknown test ${id}`, 404);
  return t;
}

// ---------------------------------------------------------------------------
// Step 8: mark once, update three sheets
// ---------------------------------------------------------------------------

function markingInput(state, body) {
  let studentId = body.studentId;
  let testId = body.testId;
  let paper = null;
  if (body.paperId) {
    paper = state.pendingPapers.find((p) => p.id === body.paperId);
    if (!paper) throw new ActionError('That paper has already been marked or does not exist', 404);
    studentId = paper.studentId;
    testId = paper.testId;
  }
  const student = requireStudent(state, studentId);
  const test = requireTest(testId);
  return { student, test, paper };
}

function previewMarking(state, body) {
  const { student, test, paper } = markingInput(state, body);
  const plan = core.planMarking({
    test,
    outcomes: body.outcomes || {},
    partialMarks: body.partialMarks || {},
    timing: body.timing || (paper ? paper.timing : {}),
    blankResolutions: body.blankResolutions || {},
    studentProgress: state.progress[student.id] || {},
    examEntry: test.module ? (state.examStats[student.id] || {})[test.module] : null,
    points: POINTS,
    date: state.today,
  });
  return { student: { id: student.id, name: student.name, currentModule: student.currentModule }, test, plan };
}

const NEXT_STEPS_ZH = {
  move_on: '进入下一个Module',
  targeted_practice: '针对薄弱知识点做专项练习',
  redo_demo: '重看相关课程并重做Demo，然后重考',
  schedule_retest: '先做专项练习，然后安排重考（Retest）',
  revise_module: '复习本Module，重做Demo后再重考',
  next_mock: '进入下一套VCAA模拟考试',
  escalate_teacher: '与老师商定下一步学习计划',
};

function draftResultNote(student, test, plan, decision, lang) {
  const first = student.name.split(' ')[0];
  const weak = plan.suggestion.gapPoints.map((p) => `${p} ${views.POINT_TITLE[p] || ''}`.trim());
  const careless = plan.issues.find((i) => i.code === 'careless');
  const passed = plan.score.pct >= core.PASS_PCT || decision.tutorPass;
  if (lang === 'zh') {
    return [
      `${first}家长您好！${first}的${test.name}已批改：${plan.score.score}/${plan.score.total}（${plan.score.pct}%）${passed ? '，已通过' : ''}。`,
      weak.length ? `需要加强的知识点：${weak.join('、')}。` : '',
      careless ? `有${careless.questions.length}处粗心失分，我们会练习检查的习惯。` : '',
      `下一步：${NEXT_STEPS_ZH[decision.action] || decision.label}。如有问题欢迎随时联系。`,
    ].filter(Boolean).join('');
  }
  return [
    `Hi ${student.parent ? student.parent.name : 'there'}, ${first}'s ${test.name} has been marked: ${plan.score.score}/${plan.score.total} (${plan.score.pct}%)${passed ? ', a pass' : ''}.`,
    weak.length ? ` Points to work on: ${weak.join('; ')}.` : '',
    careless ? ` ${careless.questions.length} mark(s) were lost to careless slips, so we'll practise a checking routine.` : '',
    ` Next step: ${(decision.label || plan.suggestion.label).toLowerCase()}. Happy to chat any time.`,
  ].join('');
}

function applyMarking(state, body, now = new Date()) {
  const { student, test, paper } = markingInput(state, body);
  const { plan } = previewMarking(state, body);
  if (plan.missing.length) {
    throw new ActionError(`Questions not marked yet: ${plan.missing.map((q) => `Q${q}`).join(', ')}`);
  }
  const blanks = plan.blanks.trailing.concat(plan.blanks.isolated);
  const unresolved = blanks.filter((q) => !(body.blankResolutions && body.blankResolutions[q]));
  if (unresolved.length) {
    throw new ActionError(`Confirm why ${unresolved.map((q) => `Q${q}`).join(', ')} ${unresolved.length > 1 ? 'were' : 'was'} left blank`);
  }
  const decision = body.decision || {};
  const action = decision.action || plan.suggestion.action;
  if (!core.NEXT_STEPS[action]) throw new ActionError(`Unknown next step ${action}`);
  const tutorPass = !!decision.tutorPass && plan.score.pct < core.PASS_PCT;
  const label = core.NEXT_STEPS[action];

  // Exhibit 1: the marking sheet record.
  const record = {
    id: newId('mk'),
    studentId: student.id,
    testId: test.id,
    testName: test.name,
    attempt: plan.exhibit3 ? plan.exhibit3.slot : '-',
    date: state.today,
    rows: plan.exhibit1.map((r) => ({ q: r.q, point: r.point, outcome: r.outcome, awarded: r.awarded, max: r.max })),
    score: plan.score.score,
    total: plan.score.total,
    pct: plan.score.pct,
    band: plan.score.band,
    timing: body.timing || (paper ? paper.timing : {}),
    blankResolutions: body.blankResolutions || {},
    issues: plan.issues,
    suggestion: plan.suggestion,
    decision: { action, label, tutorPass, note: decision.note || '' },
    source: 'shiftmate',
  };
  state.markingRecords.push(record);

  // Exhibit 2: the progress sheet.
  const progress = state.progress[student.id] || (state.progress[student.id] = {});
  plan.exhibit2.changes.forEach((c) => { progress[c.point] = c.after; });

  // Exhibit 3: the exam statistics sheet (Module Tests only).
  if (plan.exhibit3) {
    if (!plan.exhibit3.slot) throw new ActionError('All four attempt slots (A-D) are already used for this Module');
    const stats = state.examStats[student.id] || (state.examStats[student.id] = {});
    const entry = stats[test.module] || (stats[test.module] = { attempts: [] });
    entry.attempts.push({ slot: plan.exhibit3.slot, pct: plan.score.pct, date: state.today, tutorPass });
  }

  // Scenario C, step 5: the student's exam log.
  const examLog = state.examLog[student.id] || (state.examLog[student.id] = []);
  examLog.push({ ...plan.examLog, date: state.today });

  if (paper) state.pendingPapers = state.pendingPapers.filter((p) => p.id !== paper.id);

  // Follow-through on the tutor's decision.
  const passed = plan.score.pct >= core.PASS_PCT || tutorPass;
  if (test.kind === 'module') {
    state.retests.filter((r) => r.studentId === student.id && r.module === test.module && r.status !== 'done')
      .forEach((r) => { r.status = passed ? 'done' : r.status; });
    if (!passed && ['schedule_retest', 'redo_demo', 'revise_module', 'escalate_teacher'].includes(action)) {
      state.retests.push({
        id: newId('rt'), studentId: student.id, module: test.module, testName: `Module Test ${test.module}`,
        status: 'to_schedule', reason: label, createdAt: nowISO(now),
      });
    }
    if (passed && action === 'move_on' && student.currentModule === test.module) {
      student.currentModule = test.module + 1;
    }
    (state.testBookings || []).filter((b) => b.studentId === student.id && b.module === test.module && b.status === 'booked')
      .forEach((b) => { b.status = 'done'; });
  }
  if (decision.addQa && plan.suggestion.gapPoints.length) {
    plan.suggestion.gapPoints.forEach((p) => {
      state.qaQueue.push({
        id: newId('qa'), studentId: student.id, topic: `${p} ${views.POINT_TITLE[p] || ''} (from ${test.name})`.trim(),
        point: p, source: 'exam review', status: 'open', createdAt: nowISO(now),
      });
    });
  }

  log(state, 'test_marked', { studentId: student.id, testName: test.name, pct: plan.score.pct }, now);
  audit(state, {
    feature: 'marking',
    studentId: student.id,
    subject: test.name,
    suggested: plan.suggestion.action,
    decided: action,
    overridden: plan.suggestion.action !== action || tutorPass,
    detail: tutorPass ? `Tutor pass at ${plan.score.pct}%` : '',
  }, now);

  const lang = student.parent && student.parent.lang === 'zh' ? 'zh' : 'en';
  return {
    record,
    summary: {
      exhibit1Rows: record.rows.length,
      exhibit2Changed: plan.exhibit2.changes.filter((c) => c.changed).length,
      exhibit3: plan.exhibit3 ? `Module ${test.module}, attempt ${plan.exhibit3.slot}: ${plan.score.pct}%` : null,
      examLog: true,
    },
    parentNote: draftResultNote(student, test, plan, { action, label, tutorPass }, lang),
    parentNoteLang: lang,
  };
}

// ---------------------------------------------------------------------------
// Steps 6-7: WeChat
// ---------------------------------------------------------------------------

function requireMessage(state, id) {
  const m = state.inbox.find((x) => x.id === id);
  if (!m) throw new ActionError(`Unknown message ${id}`, 404);
  return m;
}

function storeTriage(state, id, result) {
  const m = requireMessage(state, id);
  m.triage = result;
  if (m.status === 'new') m.status = 'triaged';
  if (result.usage) {
    state.aiUsage = state.aiUsage || { calls: 0, input: 0, output: 0 };
    state.aiUsage.calls += 1;
    state.aiUsage.input += result.usage.input;
    state.aiUsage.output += result.usage.output;
  }
  return m;
}

function applyMessageAction(state, m, a, now) {
  switch (a.type) {
    case 'set_attendance': {
      const t = state.timetable.find((x) => x.id === a.timetableId);
      if (!t) return;
      if (a.status) t.status = a.status;
      if (a.mode) t.mode = a.mode;
      break;
    }
    case 'notify_teacher':
      state.teacherNotices.push({ id: newId('tn'), at: nowISO(now), teacher: a.teacher, studentId: m.studentId, text: a.text });
      break;
    case 'book_qa':
      state.qaQueue.push({
        id: newId('qa'), studentId: m.studentId, topic: a.topic, point: a.point || null,
        source: 'wechat', status: 'open', createdAt: nowISO(now), messageId: m.id,
      });
      break;
    case 'record_sac': {
      const s = views.studentById(state, m.studentId);
      s.sacs.push({ id: newId('sac'), title: a.title, date: a.date, modules: a.modules, source: 'student (WeChat)', materials: 'Ask the student to bring school materials' });
      break;
    }
    case 'flag_demo_review':
      state.demoReviews.push({ id: newId('dr'), studentId: m.studentId, module: a.module, status: 'requested', at: nowISO(now) });
      break;
    case 'handover':
      state.handovers.push({
        id: newId('ho'), at: nowISO(now), to: a.to, studentId: m.studentId, messageId: m.id,
        summary: m.triage ? m.triage.summary : m.text, original: m.text, status: 'open',
      });
      break;
    case 'log_parent_feedback':
      log(state, 'parent_feedback', { studentId: m.studentId, messageId: m.id }, now);
      break;
    default:
      throw new ActionError(`Unknown action ${a.type}`);
  }
}

function approveMessage(state, id, body, now = new Date()) {
  const m = requireMessage(state, id);
  if (m.status === 'sent') throw new ActionError('This message has already been answered');
  if (!m.triage) throw new ActionError('Triage the message first');
  const reply = String(body.reply || '').trim();
  if (!reply) throw new ActionError('The reply is empty');
  const accepted = Array.isArray(body.actions) ? body.actions : [];
  const actions = m.triage.actions.filter((a, i) => accepted.includes(i));
  actions.forEach((a) => applyMessageAction(state, m, a, now));

  m.status = 'sent';
  m.reply = reply;
  m.sentAt = nowISO(now);
  m.appliedActions = actions.map((a) => a.label);
  log(state, 'message_sent', { studentId: m.studentId, relation: m.relation, messageId: m.id }, now);
  audit(state, {
    feature: 'wechat',
    studentId: m.studentId,
    subject: `Message ${m.id}`,
    mode: m.triage.mode,
    suggested: m.triage.primary,
    decided: m.triage.primary,
    edited: reply !== m.triage.draft,
    overridden: reply !== m.triage.draft || actions.length !== m.triage.actions.length,
    detail: `${actions.length}/${m.triage.actions.length} actions accepted${reply !== m.triage.draft ? ', reply edited' : ''}`,
  }, now);
  return m;
}

// ---------------------------------------------------------------------------
// Phase 4: on site
// ---------------------------------------------------------------------------

function checkIn(state, timetableId, now = new Date()) {
  const t = state.timetable.find((x) => x.id === timetableId);
  if (!t) throw new ActionError('Unknown lesson', 404);
  if (t.status === 'leave') throw new ActionError('This student is on leave today');
  t.status = 'on_site';
  log(state, 'checkin', { studentId: t.studentId }, now);
  return t;
}

function logQa(state, body, now = new Date()) {
  requireStudent(state, body.studentId);
  const count = Math.max(1, Math.min(50, Number(body.count) || 1));
  log(state, 'qa_helped', { studentId: body.studentId, count, topic: body.topic || '' }, now);
  if (body.qaId) {
    const q = state.qaQueue.find((x) => x.id === body.qaId);
    if (q) {
      q.status = 'done';
      q.doneAt = nowISO(now);
    }
  }
  return { ok: true };
}

const DEMO_CHECKS = ['working', 'accuracy', 'method', 'concepts'];

function demoReview(state, body, now = new Date()) {
  const s = requireStudent(state, body.studentId);
  const module = Number(body.module) || s.currentModule;
  const checks = body.checks || {};
  const outcome = body.outcome;
  if (!['meets', 'not_yet'].includes(outcome)) throw new ActionError('Choose whether the Demo meets the standard');
  const failed = DEMO_CHECKS.filter((c) => !checks[c]);
  const review = state.demoReviews.find((d) => d.studentId === s.id && d.module === module && d.status === 'requested')
    || { id: newId('dr'), studentId: s.id, module, at: nowISO(now) };
  if (!state.demoReviews.includes(review)) state.demoReviews.push(review);
  review.status = outcome;
  review.checks = checks;
  review.note = body.note || '';
  review.reviewedAt = nowISO(now);

  if (outcome === 'meets') {
    state.testBookings = state.testBookings || [];
    state.testBookings.push({ id: newId('tb'), studentId: s.id, module, status: 'booked', date: state.today });
  } else {
    (body.points || []).forEach((p) => {
      state.qaQueue.push({
        id: newId('qa'), studentId: s.id, topic: `Re-watch and redo: ${p} ${views.POINT_TITLE[p] || ''}`.trim(),
        point: p, source: 'demo review', status: 'open', createdAt: nowISO(now),
      });
    });
  }
  log(state, 'demo_review', { studentId: s.id, module, outcome }, now);
  audit(state, {
    feature: 'demo',
    studentId: s.id,
    subject: `Module ${module} Demo`,
    suggested: failed.length ? 'not_yet' : 'meets',
    decided: outcome,
    overridden: (failed.length ? 'not_yet' : 'meets') !== outcome,
    detail: failed.length ? `Unticked: ${failed.join(', ')}` : 'All four checks ticked',
  }, now);
  return review;
}

function recordSacAnswer(state, body, now = new Date()) {
  requireStudent(state, body.studentId);
  const kind = body.kind === 'SAC' ? 'SAC' : 'Practice SAC';
  log(state, 'sac_answer', { studentId: body.studentId, kind, note: body.note || '' }, now);
  return { ok: true };
}

function resolveRetest(state, id, body) {
  const r = state.retests.find((x) => x.id === id);
  if (!r) throw new ActionError('Unknown retest', 404);
  r.status = 'scheduled';
  r.date = body.date || null;
  return r;
}

function closeHandover(state, id) {
  const h = state.handovers.find((x) => x.id === id);
  if (!h) throw new ActionError('Unknown handover', 404);
  h.status = 'closed';
  return h;
}

// ---------------------------------------------------------------------------
// Phase 5: sign-off
// ---------------------------------------------------------------------------

function signOff(state, body, now = new Date()) {
  const manager = String(body.manager || '').trim();
  if (!manager) throw new ActionError('Enter the manager\'s name');
  const report = views.buildDailyReport(state);
  state.report = { signedBy: manager, signedAt: nowISO(now), text: body.text || report.text, counts: report.counts };
  return state.report;
}

// Demo helper for the pitch: plays out 16:00-18:00 so the report has data.
function simulateAfternoon(state, now = new Date()) {
  const topics = {
    phoenix: ['Area between curves', 3], david: ['VCAA 2023 Q9b: optimisation', 2], norton: ['Stationary points', 2],
    william: ['Chain rule', 4], mickey: ["Newton's method", 1],
  };
  state.timetable.forEach((t) => {
    if (t.status === 'expected' && t.mode === 'in_person') checkIn(state, t.id, now);
  });
  state.timetable.forEach((t) => {
    if (t.status !== 'on_site' && t.mode !== 'online') return;
    const tp = topics[t.studentId];
    if (tp) logQa(state, { studentId: t.studentId, count: tp[1], topic: tp[0] }, now);
  });
  recordSacAnswer(state, { studentId: 'phoenix', kind: 'Practice SAC', note: 'Calculus application practice SAC marked' }, now);
  return { ok: true };
}

module.exports = {
  ActionError,
  nowISO,
  previewMarking,
  applyMarking,
  draftResultNote,
  storeTriage,
  approveMessage,
  checkIn,
  logQa,
  demoReview,
  recordSacAnswer,
  resolveRetest,
  closeHandover,
  signOff,
  simulateAfternoon,
  DEMO_CHECKS,
};
