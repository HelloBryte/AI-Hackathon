// Read-only views derived from the state: the shift briefing (steps 2-5),
// student profiles (Exhibits 1-3), the class exam table (Exhibit 3) and the
// daily work report (phase 5). Nothing here mutates state.

const core = require('./core');
const triage = require('./triage');
const { MODULES, POINTS, TESTS } = require('./syllabus');

const POINT_TITLE = Object.fromEntries(POINTS.map((p) => [p.id, p.title]));

function testById(id) {
  return TESTS.find((t) => t.id === id) || null;
}

function moduleName(id) {
  const m = MODULES.find((x) => x.id === id);
  return m ? m.name : `Module ${id}`;
}

function studentById(state, id) {
  return state.students.find((s) => s.id === id) || null;
}

function lessonFor(state, studentId) {
  return state.timetable.find((t) => t.studentId === studentId) || null;
}

function dayDiff(fromISO, toISO) {
  return Math.round((Date.parse(`${toISO.slice(0, 10)}T00:00:00`) - Date.parse(`${fromISO.slice(0, 10)}T00:00:00`)) / 86400000);
}

function dayLabel(iso, todayISO) {
  const d = dayDiff(iso, todayISO);
  if (d === 0) return { en: 'today', zh: '今天' };
  if (d === 1) return { en: 'yesterday', zh: '昨天' };
  return { en: `${d} days ago`, zh: `${d}天前` };
}

function timeOf(iso) {
  return String(iso).slice(11, 16);
}

function pendingPapersFor(state, studentId) {
  return state.pendingPapers
    .filter((p) => !studentId || p.studentId === studentId)
    .map((p) => {
      const t = testById(p.testId);
      const day = dayLabel(p.submittedAt, state.today);
      return {
        ...p,
        testName: t ? t.name : p.testId,
        module: t ? t.module : null,
        kind: t ? t.kind : null,
        questions: t ? t.questions.length : 0,
        submittedDay: day.en,
        submittedDayZh: day.zh,
        student: studentById(state, p.studentId),
      };
    });
}

function sacReadinessFor(state, student) {
  return (student.sacs || []).map((sac) =>
    core.sacReadiness(sac, state.progress[student.id] || {}, state.examStats[student.id] || {}, POINTS, MODULES, state.today));
}

function openQaFor(state, studentId) {
  return state.qaQueue.filter((q) => q.studentId === studentId && q.status !== 'done');
}

/** Everything the triage needs to know about the sender's student. */
function messageContext(state, message) {
  const student = studentById(state, message.studentId);
  return {
    today: state.today,
    student,
    lesson: lessonFor(state, student.id),
    examStats: state.examStats[student.id] || {},
    progressSummary: core.progressSummary(state.progress[student.id] || {}, POINTS),
    moduleName,
    pendingPapers: pendingPapersFor(state, student.id),
    retests: state.retests.filter((r) => r.studentId === student.id),
    sacReadiness: sacReadinessFor(state, student),
    openQa: openQaFor(state, student.id),
    teacherNames: state.teachers.map((t) => t.name),
  };
}

// ---------------------------------------------------------------------------
// Steps 2-5: shift briefing
// ---------------------------------------------------------------------------

function studentCard(state, studentId) {
  const s = studentById(state, studentId);
  const progress = state.progress[studentId] || {};
  const stats = state.examStats[studentId] || {};
  const cm = s.currentModule;
  const currentModule = core.progressSummary(progress, POINTS.filter((p) => p.module === cm));
  const overall = core.progressSummary(progress, POINTS);

  const incomplete = [];
  Object.keys(stats).map(Number).sort((a, b) => a - b).forEach((mod) => {
    const entry = stats[mod];
    const status = core.moduleStatus(entry);
    const last = entry.attempts.length ? entry.attempts[entry.attempts.length - 1] : null;
    if (status === 'retest_due' || status === 'attempts_used') {
      incomplete.push({ module: mod, status, text: `Module ${mod} Test not passed (last ${last.pct}%)` });
    } else if (status === 'not_attempted' && mod < cm) {
      incomplete.push({ module: mod, status: 'not_submitted', text: `Module ${mod} Test not submitted` });
    }
  });
  pendingPapersFor(state, studentId).forEach((p) => {
    incomplete.push({ module: p.module, status: 'awaiting_marking', text: `${p.testName} awaiting marking (sat ${p.submittedDay})` });
  });
  (state.testBookings || []).filter((b) => b.studentId === studentId && b.status === 'booked').forEach((b) => {
    incomplete.push({ module: b.module, status: 'test_booked', text: `Module ${b.module} Test booked (Demo passed ${b.date})` });
  });

  const sacs = sacReadinessFor(state, s).filter((r) => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 28);

  const recent = state.markingRecords
    .filter((r) => r.studentId === studentId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 2);
  const wrong = [];
  const careless = [];
  recent.forEach((r) => {
    r.rows.forEach((row) => {
      const item = { point: row.point, title: POINT_TITLE[row.point] || '', test: r.testName, q: row.q };
      if (row.outcome === 'W' && !wrong.some((w) => w.point === row.point)) wrong.push(item);
      if (row.outcome === 'C') careless.push(item);
    });
  });

  const openQa = openQaFor(state, studentId);
  const demoRequests = (state.demoReviews || []).filter((d) => d.studentId === studentId && d.status === 'requested');

  const scenarios = [];
  const urgentSac = sacs.find((r) => r.daysLeft <= 14);
  if (urgentSac) scenarios.push({ code: 'B', label: 'SAC preparation', priority: !urgentSac.ready && urgentSac.daysLeft <= 7 });
  if (pendingPapersFor(state, studentId).length || recent.some((r) => r.date === state.today)) {
    scenarios.push({ code: 'C', label: 'Exam review', priority: false });
  }
  if (cm <= MODULES.length) scenarios.push({ code: 'A', label: `Module ${cm} study${demoRequests.length ? ' + Demo check' : ''}`, priority: demoRequests.length > 0 });

  const talkingPoints = [];
  if (urgentSac) talkingPoints.push(`Confirm ${urgentSac.sac.title} date (${urgentSac.sac.date}), topics and school materials`);
  if (wrong.length) talkingPoints.push(`Check ${wrong.slice(0, 3).map((w) => w.point).join(', ')} from recent tests`);
  if (careless.length >= 2) talkingPoints.push(`${careless.length} careless errors in the last two tests: talk about a checking routine`);
  openQa.forEach((q) => talkingPoints.push(`Unresolved question: ${q.topic}`));

  return {
    student: { id: s.id, name: s.name, classId: s.classId, teacher: s.teacher, school: s.school },
    currentModule: { id: cm, name: moduleName(cm), ...currentModule },
    overall,
    incomplete,
    sacs,
    recentMistakes: wrong,
    careless,
    openQa,
    demoRequests,
    scenarios,
    talkingPoints,
  };
}

const ATTENDANCE_INTENTS = ['leave', 'switch_online', 'reschedule'];

function buildBriefing(state) {
  const lessons = state.timetable
    .slice()
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    .map((t) => ({ ...t, card: studentCard(state, t.studentId) }));

  const alerts = [];
  state.inbox.forEach((m) => {
    if (m.status === 'sent') return;
    const intents = m.triage ? m.triage.intents : triage.detectIntents(m.text, m.relation);
    if (!ATTENDANCE_INTENTS.includes(intents[0])) return;
    const s = studentById(state, m.studentId);
    const lesson = lessonFor(state, m.studentId);
    if (!lesson) return;
    alerts.push({
      kind: 'attendance', level: 'high', messageId: m.id, studentId: m.studentId,
      text: `${s.name}: ${triage.INTENT_LABELS[intents[0]].toLowerCase()} in WeChat at ${timeOf(m.receivedAt)}. Not yet confirmed or passed to ${lesson.teacher}.`,
    });
  });
  lessons.forEach((l) => {
    l.card.sacs.forEach((r) => {
      if (!r.ready && r.daysLeft <= 7) {
        alerts.push({
          kind: 'sac', level: 'medium', studentId: l.studentId,
          text: `${l.card.student.name}: ${r.sac.title} in ${r.daysLeft} days; Module ${r.modules.filter((m) => m.readiness !== 'ready').map((m) => m.module).join(', ')} not yet secure.`,
        });
      }
    });
  });
  const unanswered = state.inbox.filter((m) => m.status !== 'sent').length;
  if (unanswered) alerts.push({ kind: 'inbox', level: 'low', text: `${unanswered} WeChat message(s) waiting in the inbox.` });
  if (state.pendingPapers.length) alerts.push({ kind: 'marking', level: 'low', text: `${state.pendingPapers.length} submitted paper(s) waiting to be marked.` });

  const count = (fn) => state.timetable.filter(fn).length;
  return {
    date: state.today,
    counts: {
      lessons: state.timetable.length,
      onSite: count((t) => t.status === 'on_site'),
      expectedInPerson: count((t) => t.status === 'expected' && t.mode === 'in_person'),
      online: count((t) => t.mode === 'online' && t.status !== 'leave'),
      leave: count((t) => t.status === 'leave'),
    },
    lessons,
    alerts,
    teacherNotices: state.teacherNotices,
  };
}

// ---------------------------------------------------------------------------
// Exhibits
// ---------------------------------------------------------------------------

function examStatsTable(state) {
  let maxModule = 8;
  Object.values(state.examStats).forEach((stats) => {
    Object.keys(stats).forEach((m) => { if (stats[m].attempts.length) maxModule = Math.max(maxModule, Number(m)); });
  });
  const modules = [];
  for (let m = 1; m <= maxModule; m += 1) modules.push(m);
  const classes = [];
  state.students.forEach((s) => {
    let c = classes.find((x) => x.classId === s.classId);
    if (!c) {
      c = { classId: s.classId, classTime: s.classTime, rows: [] };
      classes.push(c);
    }
    const stats = state.examStats[s.id] || {};
    c.rows.push({
      student: { id: s.id, name: s.name, currentModule: s.currentModule },
      cells: modules.map((m) => {
        const entry = stats[m];
        const attempts = core.ATTEMPT_SLOTS.map((slot, i) => {
          const a = entry && entry.attempts[i];
          return a ? { slot, pct: a.pct, band: core.band(a.pct), tutorPass: !!a.tutorPass, date: a.date } : { slot, pct: null, band: null };
        });
        let status = core.moduleStatus(entry);
        if (status === 'not_attempted' && m < s.currentModule && entry) status = 'not_submitted';
        return { module: m, attempts, status };
      }),
    });
  });
  return { modules, classes };
}

function studentProfile(state, studentId) {
  const s = studentById(state, studentId);
  if (!s) return null;
  const progress = state.progress[studentId] || {};
  const log = (state.examLog[studentId] || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map((e) => ({
    ...e,
    firstPassMin: core.minutesBetween(e.start, e.end1),
    checkMin: e.end2 ? core.minutesBetween(e.end1, e.end2) : 0,
  }));
  return {
    student: s,
    card: studentCard(state, studentId),
    summary: core.progressSummary(progress, POINTS),
    modules: MODULES.map((m) => {
      const pts = POINTS.filter((p) => p.module === m.id);
      return {
        id: m.id,
        name: m.name,
        summary: core.progressSummary(progress, pts),
        points: pts.map((p) => ({ id: p.id, title: p.title, mastery: progress[p.id] || 'not_covered' })),
      };
    }),
    examStats: examStatsTable(state).classes
      .flatMap((c) => c.rows)
      .find((r) => r.student.id === studentId),
    markingRecords: state.markingRecords
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((r) => ({ ...r, rows: r.rows.map((row) => ({ ...row, title: POINT_TITLE[row.point] || '' })) })),
    examLog: log,
    sacs: sacReadinessFor(state, s),
    qa: state.qaQueue.filter((q) => q.studentId === studentId),
    messages: state.inbox.filter((m) => m.studentId === studentId),
  };
}

// ---------------------------------------------------------------------------
// Phase 5: daily work report
// ---------------------------------------------------------------------------

function buildDailyReport(state) {
  const today = state.today;
  const ev = state.activity.filter((a) => String(a.at).slice(0, 10) === today);
  const uniq = (xs) => [...new Set(xs)];
  const name = (id) => (studentById(state, id) || { name: id }).name;

  const onSite = uniq(ev.filter((e) => e.type === 'checkin').map((e) => e.studentId));
  const qa = ev.filter((e) => e.type === 'qa_helped');
  const qaStudents = uniq(qa.map((e) => e.studentId));
  const qaQuestions = qa.reduce((n, e) => n + (Number(e.count) || 0), 0);
  const marked = ev.filter((e) => e.type === 'test_marked');
  const sac = ev.filter((e) => e.type === 'sac_answer');
  const parentFeedback = ev.filter((e) => e.type === 'parent_feedback');
  const replies = ev.filter((e) => e.type === 'message_sent');
  const demos = ev.filter((e) => e.type === 'demo_review');

  const followUps = [];
  state.retests.filter((r) => r.status === 'to_schedule').forEach((r) => {
    followUps.push({ level: 'high', studentId: r.studentId, text: `${name(r.studentId)}: schedule Module ${r.module} Retest (${r.reason})` });
  });
  state.students.forEach((s) => {
    sacReadinessFor(state, s).forEach((r) => {
      if (r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 7 && !r.ready) {
        followUps.push({ level: 'high', studentId: s.id, text: `${s.name}: ${r.sac.title} in ${r.daysLeft} days, Module ${r.modules.filter((m) => m.readiness !== 'ready').map((m) => m.module).join(', ')} not yet secure` });
      }
    });
  });
  const unanswered = state.inbox.filter((m) => m.status !== 'sent');
  if (unanswered.length) {
    const parents = unanswered.filter((m) => m.relation === 'parent').length;
    followUps.push({
      level: parents ? 'high' : 'medium',
      text: `${unanswered.length} WeChat message(s) not answered${parents ? ` (${parents} from parents)` : ''}: ${unanswered.map((m) => `${name(m.studentId)}${m.relation === 'parent' ? ' (parent)' : ''} ${timeOf(m.receivedAt)}`).join(', ')}`,
    });
  }
  state.handovers.filter((h) => h.status === 'open').forEach((h) => {
    followUps.push({ level: 'medium', studentId: h.studentId, text: `${name(h.studentId)}: handed over to ${h.to}: ${h.summary}` });
  });
  state.qaQueue.filter((q) => q.status !== 'done').forEach((q) => {
    followUps.push({ level: 'low', studentId: q.studentId, text: `${name(q.studentId)}: Q&A still open on ${q.topic}` });
  });
  (state.testBookings || []).filter((b) => b.status === 'booked').forEach((b) => {
    followUps.push({ level: 'low', studentId: b.studentId, text: `${name(b.studentId)}: Module ${b.module} Test booked after Demo check` });
  });
  if (state.pendingPapers.length) {
    followUps.push({
      level: 'medium',
      text: `${state.pendingPapers.length} paper(s) still to be marked: ${state.pendingPapers.map((p) => {
        const t = testById(p.testId);
        return `${name(p.studentId)} ${t ? t.name : p.testId}`;
      }).join('; ')}`,
    });
  }
  const order = { high: 0, medium: 1, low: 2 };
  followUps.sort((a, b) => order[a.level] - order[b.level]);

  const counts = {
    onSite: onSite.length,
    qaStudents: qaStudents.length,
    qaQuestions,
    testsMarked: marked.length,
    sacAnswers: sac.length,
    parentFeedback: parentFeedback.length,
    repliesSent: replies.length,
    demoReviews: demos.length,
  };

  const lines = [
    `Daily work report - ${state.settings.centre} - ${today}`,
    `${state.settings.tutor}, shift ${state.settings.shift.start}-${state.settings.shift.end}`,
    '',
    `- Students studying on site: ${counts.onSite}${onSite.length ? ` (${onSite.map(name).join(', ')})` : ''}`,
    `- Q&A: ${counts.qaStudents} student(s) helped, about ${counts.qaQuestions} question(s)`,
    `- Test papers marked: ${counts.testsMarked}${marked.length ? ` (${marked.map((e) => `${name(e.studentId)} ${e.testName} ${e.pct}%`).join('; ')})` : ''}`,
    `- SAC / Practice SAC answers completed: ${counts.sacAnswers}`,
    `- Parent feedback messages completed: ${counts.parentFeedback} (WeChat replies approved in total: ${counts.repliesSent})`,
    `- Demo checks: ${counts.demoReviews}`,
    '- Priority follow-up:',
    ...(followUps.length
      ? followUps.filter((f) => f.level !== 'low').map((f, i) => `  ${i + 1}. ${f.text}`)
      : ['  None']),
  ];
  const zhLines = [
    `每日工作报告 - ${today}`,
    `值班时间 ${state.settings.shift.start}-${state.settings.shift.end}`,
    '',
    `- 今日在中心学习的学生：${counts.onSite}人`,
    `- 答疑：${counts.qaStudents}名学生，约${counts.qaQuestions}道题`,
    `- 批改试卷：${counts.testsMarked}份`,
    `- 完成SAC / Practice SAC答案：${counts.sacAnswers}份`,
    `- 完成家长反馈：${counts.parentFeedback}条（共审批微信回复${counts.repliesSent}条）`,
    `- Demo检查：${counts.demoReviews}次`,
    `- 需重点跟进：${followUps.filter((f) => f.level !== 'low').length}项（详见英文版）`,
  ];

  return {
    date: today,
    counts,
    followUps,
    text: lines.join('\n'),
    textZh: zhLines.join('\n'),
    signedOff: state.report,
  };
}

module.exports = {
  POINT_TITLE,
  testById,
  moduleName,
  studentById,
  lessonFor,
  dayLabel,
  timeOf,
  pendingPapersFor,
  sacReadinessFor,
  messageContext,
  studentCard,
  buildBriefing,
  examStatsTable,
  studentProfile,
  buildDailyReport,
};
