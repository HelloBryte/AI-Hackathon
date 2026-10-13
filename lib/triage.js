// Steps 6-7: triage Work WeChat messages from students and parents.
//
// This module is the offline fallback when no Claude API key is configured,
// and it also owns the parts that must never come from a model:
//   - facts quoted to students/parents (read straight from the records)
//   - the actions a reply implies (timetable change, Q&A booking, handover)
// The Claude path (lib/ai.js) reuses buildFacts() and planActions() so the
// model only ever writes wording, never grades or bookings.

const PASS_PCT = 75;

const INTENT_LABELS = {
  leave: 'Leave request',
  switch_online: 'Switch to online',
  reschedule: 'Reschedule',
  qa_booking: 'Q&A booking',
  demo_check: 'Demo / test readiness',
  test_status: 'Test status',
  homework_status: 'Homework status',
  progress_request: 'Progress update request',
  academic_question: 'Maths question',
  sac_info: 'SAC information',
  admin: 'Fees / admin',
  feedback: 'Feedback',
  other: 'Other',
};

// Highest first: the primary intent decides the route.
const PRECEDENCE = [
  'admin', 'leave', 'switch_online', 'reschedule', 'demo_check', 'qa_booking', 'progress_request',
  'test_status', 'academic_question', 'homework_status', 'sac_info', 'feedback', 'other',
];

const ROUTES = {
  update_timetable: 'Update today\'s timetable and tell the teacher',
  answer_from_records: 'Answer from the records',
  book_qa: 'Book a Q&A session',
  qa_session: 'Hold for Q&A (in-depth maths)',
  tutor_decision: 'Tutor judgement needed',
  progress_update: 'Progress update to parent (review wording)',
  handover_admin: 'Hand over to front desk / manager',
  acknowledge: 'Acknowledge and log',
  tutor_review: 'Tutor to review',
};

const ROUTE_FOR_INTENT = {
  leave: 'update_timetable',
  switch_online: 'update_timetable',
  reschedule: 'update_timetable',
  qa_booking: 'book_qa',
  demo_check: 'tutor_decision',
  test_status: 'answer_from_records',
  homework_status: 'answer_from_records',
  progress_request: 'progress_update',
  academic_question: 'qa_session',
  sac_info: 'book_qa',
  admin: 'handover_admin',
  feedback: 'acknowledge',
  other: 'tutor_review',
};

const INTENT_PATTERNS = {
  admin: [
    /\b(invoice|receipt|fees?|payment|refund|discount|enrol(l)?(ment)?|tuition|price|pricing|billing)\b/i,
    /学费|费用|发票|收据|退费|退款|优惠|折扣|缴费|报名费|价格/,
  ],
  leave: [
    /\b(sick|unwell|fever|absent|can'?t (come|make it|attend)|cannot (come|attend|make it)|won'?t (be able to )?(come|make it|attend)|miss (today|the lesson|class))\b/i,
    /请假|生病|发烧|不舒服|来不了|不能来|缺课|病了/,
  ],
  switch_online: [
    /\b(online|zoom|remote(ly)?|from home|video call)\b/i,
    /网课|线上|视频上课|在家上/,
  ],
  reschedule: [
    /\b(reschedul\w*|another (time|day)|move (my|the) (lesson|class|session)|change (my|the) (time|lesson|class)|swap (my|the) (lesson|class))\b/i,
    /改时间|调课|换时间|改到|改天|推迟|换到/,
  ],
  qa_booking: [
    /\b(book|booking|appointment|consult(ation)?|extra (session|help))\b|q\s*&\s*a|q and a/i,
    /预约|答疑|约一个|约个时间|补课/,
  ],
  demo_check: [
    /\bdemo\b|\b(sit|do|take) the (module )?test\b|\bready for the (module )?test\b/i,
    /可以考|能考|做完.{0,6}demo/i,
  ],
  test_status: [
    /\b(pass(ed)?|fail(ed)?|results?|marks?|marked|score|retest|re-test|resit)\b/i,
    /成绩|分数|通过|及格|补考|重考|考得/,
  ],
  homework_status: [
    /\b(homework|assignment|worksheet)\b/i,
    /作业/,
  ],
  progress_request: [
    /\bhow (is|has) (he|she|my (son|daughter)|\w+) (doing|going|progressing|been)\b|\bprogress\b|\bupdate on\b/i,
    /学习情况|学习进度|进度|表现|最近怎么样|学得怎么样/,
  ],
  sac_info: [
    /\bsac\b/i,
  ],
  feedback: [
    /\b(thank(s| you)?|appreciate|great job|feedback|complain\w*|concern(ed)?|worried|unhappy)\b/i,
    /谢谢|感谢|反馈|建议|担心|投诉|不满意/,
  ],
};

// Maths questions need both a question shape and maths content, or explicit
// notation, so "积分清楚多了" (thanks, integration is clearer) is not a question.
const MATH_NOTATION = /[a-z]\s*=\s*[-\w(]|\^|dy\/dx|∫|\b(sin|cos|tan|ln|log)\s*\(/i;
const QUESTION_EN = /\b(how (do|does|can|to|would|should) (you|u|i|we|one)|why (do|does|is)|what('s| is) the (answer|method))\b|\?/i;
const MATH_WORDS_EN = /\b(integra\w*|antideriv\w*|derivativ\w*|differentiat\w*|area|tangent|stationary|equation|solve|probabilit\w*|binomial|normal|function|graph|gradient)\b/i;
const QUESTION_ZH = /(怎么|如何|不会|为什么|求).{0,12}(做|算|求|解|积分|求导|面积|方程|图像)|这道题|这题|那道题/;

const TOPIC_KEYWORDS = [
  { re: /area between|between (the )?(two )?curves|曲线之间|两条曲线/i, point: '8.8.1', module: 8, topic: 'Area between curves' },
  { re: /chain rule|链式/i, point: '6.4.1', module: 6, topic: 'Chain rule' },
  { re: /product rule/i, point: '6.4.2', module: 6, topic: 'Product rule' },
  { re: /quotient rule/i, point: '6.4.3', module: 6, topic: 'Quotient rule' },
  { re: /newton/i, point: '7.8', module: 7, topic: "Newton's method" },
  { re: /stationary|turning point|驻点|极值/i, point: '7.3', module: 7, topic: 'Stationary points' },
  { re: /tangent|切线/i, point: '7.1', module: 7, topic: 'Tangents and normals' },
  { re: /optimi[sz]|最大值|最小值/i, point: '7.7', module: 7, topic: 'Optimisation' },
  { re: /antideriv|integra|积分/i, point: null, module: 8, topic: 'Integration' },
  { re: /differentiat|derivativ|求导|微分|导数/i, point: null, module: 6, topic: 'Differentiation' },
  { re: /binomial|二项/i, point: null, module: 10, topic: 'Binomial distribution' },
  { re: /normal distribution|正态/i, point: null, module: 11, topic: 'Normal distribution' },
  { re: /probabilit|概率/i, point: null, module: 9, topic: 'Probability' },
  { re: /\blog|exponential|指数|对数/i, point: null, module: 4, topic: 'Exponentials and logarithms' },
  { re: /\b(sin|cos|tan)\b|trig|circular|三角/i, point: null, module: 5, topic: 'Circular functions' },
  { re: /transformation|dilation|translation|变换/i, point: null, module: 3, topic: 'Transformations' },
  { re: /polynomial|cubic|quartic|多项式/i, point: null, module: 2, topic: 'Polynomials' },
];

// Suggested explanations for the tutor (never sent automatically).
const TUTOR_HINTS = {
  '8.8.1': 'Area between curves = integral of (upper - lower) between the intersection points. For y=2x and y=x^2: they meet at x=0 and x=2, and 2x >= x^2 on [0,2], so A = ∫0..2 (2x - x^2) dx = 4/3. A negative answer means the subtraction is the wrong way round.',
  '6.4.1': 'Chain rule: d/dx f(g(x)) = f\'(g(x)) g\'(x). Have the student name the inner function first, e.g. y = sin(3x^2): inner u = 3x^2, so dy/dx = cos(3x^2) * 6x.',
  '7.8': "Newton's method: x_{n+1} = x_n - f(x_n)/f'(x_n). Pick x0 near the root from a sketch, never where f'(x0) = 0.",
};

const KNOWN_TOKENS = new Set(['sac', 'q&a', 'qa', 'vcaa', 'ms', 'mr', 'mrs', 'dr', 'module', 'demo', 'test', 'ok']);

function detectLanguage(text, knownNames = []) {
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  if (cjk === 0) return 'en';
  const names = new Set(knownNames.map((n) => n.toLowerCase()));
  const words = (text.match(/[A-Za-z][A-Za-z&]+/g) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => !names.has(w) && !KNOWN_TOKENS.has(w));
  return words.length >= 2 ? 'mixed' : 'zh';
}

function detectIntents(text, relation) {
  const found = [];
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some((re) => re.test(text))) found.push(intent);
  }
  const academic = MATH_NOTATION.test(text) ||
    (QUESTION_EN.test(text) && MATH_WORDS_EN.test(text)) ||
    QUESTION_ZH.test(text);
  if (academic && relation !== 'parent') found.push('academic_question');

  let intents = found;
  // A booking already covers the maths question; "online" in a fees message
  // is not an attendance change.
  if (intents.includes('qa_booking')) intents = intents.filter((i) => i !== 'academic_question');
  if (intents.includes('admin')) intents = intents.filter((i) => !['switch_online', 'reschedule'].includes(i));
  // "Can I do the test?" is about readiness, not a result.
  if (intents.includes('demo_check')) intents = intents.filter((i) => i !== 'test_status');
  // Parents asking about progress usually mention results too.
  if (intents.includes('progress_request')) intents = intents.filter((i) => i !== 'test_status');
  if (intents.length === 0) intents = ['other'];
  intents.sort((a, b) => PRECEDENCE.indexOf(a) - PRECEDENCE.indexOf(b));
  return intents;
}

function isoOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const ZH_WEEKDAY = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
const EN_WEEKDAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

// Weeks start on Monday. "下周四" / "next Thursday" = Thursday of next week.
function weekdayDate(today, weekday, nextWeek) {
  const dow = (today.getDay() + 6) % 7;
  const target = (weekday + 6) % 7;
  const d = new Date(today);
  if (nextWeek) d.setDate(d.getDate() - dow + 7 + target);
  else d.setDate(d.getDate() + ((target - dow + 7) % 7));
  return d;
}

function parseDate(text, todayISO) {
  const today = new Date(`${todayISO}T00:00:00`);
  const plus = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };
  if (/今天|今晚|\btoday\b|\btonight\b|this afternoon/i.test(text)) return { iso: todayISO, phrase: 'today' };
  if (/明天|\btomorrow\b/i.test(text)) return { iso: isoOf(plus(1)), phrase: 'tomorrow' };
  if (/后天/.test(text)) return { iso: isoOf(plus(2)), phrase: '后天' };
  let m = /(下|这|本)?(?:个)?(?:周|星期|礼拜)([一二三四五六日天])/.exec(text);
  if (m) {
    return { iso: isoOf(weekdayDate(today, ZH_WEEKDAY[m[2]], m[1] === '下')), phrase: m[0], needsConfirm: true };
  }
  // Full names only: "sat the test" or "month" must not read as a date.
  m = /\b(next|this)?\s*(sunday|monday|tuesday|tues|wednesday|weds|thursday|thurs|friday|saturday)\b/i.exec(text);
  if (m) {
    const wd = EN_WEEKDAY[m[2].toLowerCase().slice(0, 3)];
    return { iso: isoOf(weekdayDate(today, wd, (m[1] || '').toLowerCase() === 'next')), phrase: m[0].trim(), needsConfirm: true };
  }
  return null;
}

function extractEntities(text, todayISO) {
  const entities = { module: null, date: null, datePhrase: null, dateNeedsConfirm: false, topic: null, point: null };
  const mm = /module\s*(\d{1,2})|\bm(\d{1,2})\b|模块\s*(\d{1,2})|第\s*(\d{1,2})\s*(?:单元|模块)/i.exec(text);
  if (mm) entities.module = Number(mm[1] || mm[2] || mm[3] || mm[4]);
  const date = parseDate(text, todayISO);
  if (date) {
    entities.date = date.iso;
    entities.datePhrase = date.phrase;
    entities.dateNeedsConfirm = !!date.needsConfirm;
  }
  for (const k of TOPIC_KEYWORDS) {
    if (k.re.test(text)) {
      entities.topic = k.topic;
      entities.point = k.point;
      if (!entities.module) entities.module = k.module;
      break;
    }
  }
  return entities;
}

// ---------------------------------------------------------------------------
// Facts: read from the records, in both languages
// ---------------------------------------------------------------------------

const BAND_EN = { pass: 'Pass band', mid: 'Mid band', low: 'Low band' };
const BAND_ZH = { pass: '通过', mid: '中等', low: '偏低' };

function bandOf(pct) {
  if (pct >= PASS_PCT) return 'pass';
  if (pct >= 40) return 'mid';
  return 'low';
}

function attemptFacts(moduleId, entry) {
  const en = [];
  const zh = [];
  (entry && entry.attempts ? entry.attempts : []).forEach((a, i) => {
    const b = bandOf(a.pct);
    const tp = a.tutorPass ? ', passed on tutor judgement' : '';
    en.push(`Module ${moduleId} Test attempt ${a.slot}: ${a.pct}% (${BAND_EN[b]}${tp})`);
    zh.push(`Module ${moduleId}测试第${i + 1}次：${a.pct}%（${BAND_ZH[b]}${a.tutorPass ? '，老师评定通过' : ''}）`);
  });
  return { en, zh };
}

function isPassed(entry) {
  return !!(entry && entry.attempts && entry.attempts.some((a) => a.pct >= PASS_PCT || a.tutorPass));
}

/**
 * ctx: { student, lesson, examStats, progressSummary, moduleName(id),
 *        pendingPapers, retests, sacReadiness[], openQa[], today }
 */
function buildFacts(ctx, intents, entities) {
  const en = [];
  const zh = [];
  const s = ctx.student;
  const add = (e, z) => { en.push(e); zh.push(z); };

  if (ctx.lesson) {
    const mode = ctx.lesson.mode === 'online' ? 'online' : `in person, ${ctx.lesson.room}`;
    add(`Today's lesson: ${ctx.lesson.start}-${ctx.lesson.end} with ${ctx.lesson.teacher} (${mode})`,
      `今天的课：${ctx.lesson.start}-${ctx.lesson.end}，${ctx.lesson.teacher}（${ctx.lesson.mode === 'online' ? '线上' : `线下，${ctx.lesson.room}`}）`);
  } else {
    add('No lesson booked today', '今天没有排课');
  }

  if (intents.includes('test_status') || intents.includes('demo_check') || intents.includes('homework_status')) {
    let mod = entities.module;
    if (!mod) {
      // Latest module that is not passed, else the latest attempted.
      const mods = Object.keys(ctx.examStats || {}).map(Number).sort((a, b) => b - a);
      mod = mods.find((m) => !isPassed(ctx.examStats[m])) || mods[0] || s.currentModule;
    }
    const entry = (ctx.examStats || {})[mod];
    const af = attemptFacts(mod, entry);
    en.push(...af.en);
    zh.push(...af.zh);
    if (!entry || !entry.attempts || entry.attempts.length === 0) {
      add(`Module ${mod} Test: not sat yet`, `Module ${mod}测试：还没有考`);
    } else if (isPassed(entry)) {
      add(`Module ${mod}: passed`, `Module ${mod}：已通过`);
    } else {
      add(`Module ${mod}: not passed yet (pass mark ${PASS_PCT}%)`, `Module ${mod}：还没有达到${PASS_PCT}%的通过线`);
    }
    const pending = (ctx.pendingPapers || []).filter((p) => p.module === mod);
    pending.forEach((p) => add(`${p.testName} submitted ${p.submittedDay}; marking today`, `${p.testName}已于${p.submittedDayZh}提交，今天批改`));
    const retest = (ctx.retests || []).find((r) => r.module === mod && r.status !== 'done');
    if (retest) {
      if (retest.date) add(`Retest booked for ${retest.date}`, `重考安排在${retest.date}`);
      else add('Retest to be scheduled by the tutor', '重考时间待老师安排');
    }
    if (intents.includes('demo_check')) {
      add(`Module Test is booked only after the tutor checks the Demo (working, accuracy, method, concepts)`,
        '老师检查Demo（步骤、准确率、方法、概念）达标后才安排Module Test');
    }
  }

  if (intents.includes('progress_request')) {
    const ps = ctx.progressSummary;
    add(`Currently studying Module ${s.currentModule} (${ctx.moduleName(s.currentModule)})`,
      `目前在学习Module ${s.currentModule}（${ctx.moduleName(s.currentModule)}）`);
    if (ps) {
      add(`Course coverage ${ps.coveredPct}%; ${ps.masteredOfCoveredPct}% of covered points fully mastered`,
        `课程进度${ps.coveredPct}%，已学内容中${ps.masteredOfCoveredPct}%完全掌握`);
    }
    const mods = Object.keys(ctx.examStats || {}).map(Number).sort((a, b) => b - a).slice(0, 2);
    mods.forEach((m) => {
      const af = attemptFacts(m, ctx.examStats[m]);
      en.push(...af.en);
      zh.push(...af.zh);
    });
    for (let m = 1; m < s.currentModule; m += 1) {
      const e = (ctx.examStats || {})[m];
      if (e && (!e.attempts || e.attempts.length === 0)) add(`Module ${m} Test not submitted yet`, `Module ${m}测试还没有提交`);
    }
  }

  (ctx.sacReadiness || []).forEach((r) => {
    if (r.daysLeft === null || r.daysLeft < 0 || r.daysLeft > 21) return;
    const weak = r.modules.filter((m) => m.readiness !== 'ready').map((m) => m.module);
    add(`${r.sac.title} on ${r.sac.date} (${r.daysLeft} days): ${weak.length ? `Module ${weak.join(', ')} not yet secure` : 'underlying Modules complete'}`,
      `${r.sac.title}在${r.sac.date}（还有${r.daysLeft}天）：${weak.length ? `Module ${weak.join('、')}还需加强` : '相关Module已完成'}`);
  });

  if (intents.includes('progress_request') && ctx.openQa && ctx.openQa.length) {
    add(`${ctx.openQa.length} open Q&A item(s): ${ctx.openQa.map((q) => q.topic).join('; ')}`,
      `${ctx.openQa.length}个待答疑问题：${ctx.openQa.map((q) => q.topic).join('；')}`);
  }
  return { en, zh };
}

// ---------------------------------------------------------------------------
// Actions: what approving the reply will change
// ---------------------------------------------------------------------------

function planActions(intents, entities, ctx, message) {
  const actions = [];
  const s = ctx.student;
  const lesson = ctx.lesson;
  const today = ctx.today;
  const lessonToday = lesson && (!entities.date || entities.date === today);
  const primary = intents[0];

  if (primary === 'leave' && lessonToday) {
    actions.push({ type: 'set_attendance', timetableId: lesson.id, status: 'leave', label: `Mark ${s.name} on leave for ${lesson.start}` });
    actions.push({ type: 'notify_teacher', teacher: lesson.teacher, label: `Tell ${lesson.teacher}: ${s.name} on leave today (${lesson.start})`, text: `${s.name} is on leave today (${lesson.start}-${lesson.end}). Reason given by ${message.relation}.` });
  }
  if (primary === 'switch_online' && lessonToday) {
    actions.push({ type: 'set_attendance', timetableId: lesson.id, status: 'expected', mode: 'online', label: `Switch ${s.name}'s ${lesson.start} lesson to online` });
    actions.push({ type: 'notify_teacher', teacher: lesson.teacher, label: `Tell ${lesson.teacher}: ${s.name} joins online today`, text: `${s.name} will join today's ${lesson.start} lesson online. Please share the Zoom link.` });
  }
  if (primary === 'reschedule' && lesson) {
    actions.push({ type: 'notify_teacher', teacher: lesson.teacher, label: `Ask ${lesson.teacher} about moving ${s.name}'s lesson`, text: `${s.name} asked to reschedule the ${lesson.start} lesson${entities.datePhrase ? ` (${entities.datePhrase})` : ''}.` });
  }
  if (intents.includes('qa_booking') || intents.includes('academic_question')) {
    actions.push({
      type: 'book_qa', studentId: s.id, topic: entities.topic || 'Question from WeChat', point: entities.point,
      label: `Add Q&A: ${s.name} - ${entities.topic || 'question from WeChat'}${entities.point ? ` (${entities.point})` : ''}`,
    });
  }
  if (intents.includes('sac_info') && entities.date && entities.date !== today) {
    const modules = entities.topic === 'Differentiation' ? [6, 7] : entities.module ? [entities.module] : [];
    actions.push({
      type: 'record_sac', studentId: s.id, date: entities.date, modules, title: `SAC: ${entities.topic || 'topic to confirm'}`,
      label: `Record SAC on ${entities.date}${modules.length ? ` (Modules ${modules.join(', ')})` : ''}${entities.dateNeedsConfirm ? ' - date read from "' + entities.datePhrase + '", confirm' : ''}`,
    });
  }
  if (primary === 'demo_check') {
    actions.push({ type: 'flag_demo_review', studentId: s.id, module: entities.module || s.currentModule, label: `Add Demo check for Module ${entities.module || s.currentModule} to the on-site list` });
  }
  if (primary === 'admin') {
    actions.push({ type: 'handover', to: 'Front desk / manager', studentId: s.id, label: 'Hand over to front desk / manager with a summary' });
  }
  if (message.relation === 'parent' && (primary === 'feedback' || primary === 'progress_request' || primary === 'leave' || primary === 'admin')) {
    actions.push({ type: 'log_parent_feedback', label: 'Count as parent feedback completed (daily report)' });
  }
  return actions;
}

function needsTutorReasons(intents, entities, message, confidence) {
  const reasons = [];
  if (intents[0] === 'progress_request') reasons.push('Parent update about a minor: check wording and facts before sending');
  if (intents[0] === 'demo_check') reasons.push('Passing a Demo is the tutor\'s call: check it on site before booking the test');
  if (intents[0] === 'academic_question') reasons.push('Maths content: decide whether to answer now or in Q&A');
  if (intents[0] === 'other') reasons.push('Could not classify confidently');
  if (entities.dateNeedsConfirm) reasons.push(`Date "${entities.datePhrase}" read as ${entities.date}: confirm`);
  if (confidence < 0.6 && intents[0] !== 'other') reasons.push('Low confidence classification');
  return reasons;
}

// ---------------------------------------------------------------------------
// Reply drafts (rules mode)
// ---------------------------------------------------------------------------

function firstName(name) {
  return String(name || '').split(' ')[0];
}

function draftReply(intents, entities, ctx, message, facts, lang) {
  const s = ctx.student;
  const first = firstName(s.name);
  const lesson = ctx.lesson;
  const start = lesson ? lesson.start : '';
  const teacher = lesson ? lesson.teacher : s.teacher;
  const isParent = message.relation === 'parent';
  const primary = intents[0];
  const zh = lang !== 'en';
  const parentName = s.parent ? s.parent.name : 'there';
  const topic = entities.topic;

  if (zh) {
    const hello = isParent ? `${first}家长您好！` : `${first}你好！`;
    switch (primary) {
      case 'leave':
        return isParent
          ? `${hello}收到，已为${first}今天${start}的课请假，并已转告${teacher}。祝${first}早日康复！`
          : `收到${first}，今天${start}的课已帮你请假，也告诉${teacher}了。好好休息！`;
      case 'switch_online':
        return `没问题${first}！今天${start}和${teacher}的课已改为线上，上课前会把Zoom链接发给你。`;
      case 'reschedule':
        return `${hello}收到，我和${teacher}确认一下调课时间，稍后回复。`;
      case 'demo_check':
        return `${first}，Module ${entities.module || s.currentModule}的Demo完成了，很棒！今天${start ? `${start}` : '来中心'}的时候带上，我先检查一下你的步骤和方法，达到要求就马上安排Module Test。`;
      case 'qa_booking': {
        const sac = intents.includes('sac_info') && entities.date ? `，SAC在${entities.date}我也记下了` : '';
        return `好的${first}！已经帮你登记了${topic || ''}的Q&A${sac}。我今天会和你确认具体时间。`;
      }
      case 'test_status':
      case 'homework_status':
        return `${hello}${facts.zh.filter((f) => !f.startsWith('今天')).join('；')}。${lesson ? `今天${start}上课时我们一起看一下。` : ''}`;
      case 'progress_request':
        return `${hello}谢谢您的关心。${facts.zh.filter((f) => !f.startsWith('今天')).join('；')}。接下来我们会先把薄弱的内容补上，再安排练习。${lesson ? `今天${start}的课我们也会重点关注。` : ''}如需要，也可以安排一次单独答疑。`;
      case 'academic_question':
        return `好问题${first}！已经记下来了，${lesson ? `今天${start}上课时` : '下次上课时'}我们一起把这道题过一遍。`;
      case 'admin':
        return `${hello}谢谢您的消息。发票和费用相关的问题由前台负责，我已经转给他们，今天会有人回复您。`;
      case 'feedback':
        return isParent
          ? `谢谢您的反馈！很高兴听到${first}${topic ? `觉得${topic === 'Integration' ? '积分' : topic}` : ''}清楚多了，我们会继续加油！`
          : `谢谢${first}！继续加油！`;
      default:
        return '收到，稍后回复您。';
    }
  }

  const hello = isParent ? `Hi ${parentName},` : `Hi ${first},`;
  switch (primary) {
    case 'leave':
      return isParent
        ? `${hello} thanks for letting us know. I've recorded ${first}'s leave for today's ${start} lesson and passed it on to ${teacher}. Hope ${first} feels better soon!`
        : `Thanks for letting me know, ${first}. I've marked you on leave for today's ${start} lesson and told ${teacher}. Hope you feel better!`;
    case 'switch_online':
      return `No problem, ${first}! I've switched today's ${start} lesson with ${teacher} to online. You'll get the Zoom link before class.`;
    case 'reschedule':
      return `${hello} thanks, I'll check with ${teacher} about moving the ${start} lesson and confirm shortly.`;
    case 'demo_check':
      return `Great work finishing the Module ${entities.module || s.currentModule} Demo, ${first}! Bring it to your ${start || 'next'} session${start ? ' today' : ''}: I'll check your working first, and if it meets the standard we'll book the Module Test straight away.`;
    case 'qa_booking': {
      const sac = intents.includes('sac_info') && entities.date ? ` I've also noted your SAC on ${entities.date}.` : '';
      return `Sure, ${first}! I've added a Q&A on ${topic || 'your question'}.${sac} I'll confirm a time with you today.`;
    }
    case 'test_status':
    case 'homework_status':
      return `${hello} ${facts.en.filter((f) => !f.startsWith("Today's")).join('. ')}.${lesson ? ` Let's go through it at your ${start} lesson today.` : ''}`;
    case 'progress_request':
      return `${hello} thanks for checking in. ${facts.en.filter((f) => !f.startsWith("Today's")).join('. ')}. Next we'll close the weak points first, then set practice.${lesson ? ` We'll focus on this in today's ${start} lesson.` : ''} Happy to arrange a separate Q&A if helpful.`;
    case 'academic_question':
      return `Good question, ${first}! I've added it to your Q&A list and we'll work through it together ${lesson ? `at today's ${start} lesson` : 'at your next lesson'}.`;
    case 'admin':
      return `${hello} thanks for your message. Invoices and fees are handled by our front desk, so I've passed this on and they'll get back to you today.`;
    case 'feedback':
      return isParent
        ? `Thank you so much for the kind words! It's great to hear ${first} is finding ${topic ? topic.toLowerCase() : 'things'} clearer. We'll keep it up.`
        : `Thanks, ${first}! Keep it up.`;
    default:
      return `Thanks for your message${isParent ? '' : `, ${first}`}. I'll get back to you shortly.`;
  }
}

function englishSummary(intents, entities, ctx, message) {
  const s = ctx.student;
  const who = message.relation === 'parent' ? `${s.name}'s ${s.parent ? s.parent.relation : 'parent'}` : s.name;
  const parts = intents.filter((i) => i !== 'other').map((i) => INTENT_LABELS[i].toLowerCase());
  const extra = [];
  if (entities.topic) extra.push(entities.topic);
  if (entities.module) extra.push(`Module ${entities.module}`);
  if (entities.date) extra.push(entities.date);
  return `${who}: ${parts.join(' + ') || 'unclassified message'}${extra.length ? ` (${extra.join(', ')})` : ''}`;
}

/** Find percentages in a draft that do not appear in the facts. */
function checkDraftFacts(draft, facts) {
  const factText = [...(facts.en || []), ...(facts.zh || [])].join(' ');
  const known = new Set((factText.match(/\d+(\.\d+)?%/g) || []));
  const used = draft.match(/\d+(\.\d+)?\s*%/g) || [];
  return used
    .map((u) => u.replace(/\s+/g, ''))
    .filter((u) => !known.has(u))
    .map((u) => `${u} is not in the student's records`);
}

function urgencyOf(primary, entities, ctx) {
  if (['leave', 'switch_online', 'reschedule'].includes(primary) && ctx.lesson) return 'today';
  if (primary === 'demo_check' && ctx.lesson) return 'today';
  if (['progress_request', 'test_status', 'qa_booking', 'academic_question'].includes(primary)) return 'soon';
  return 'low';
}

function triageRules(message, ctx, opts = {}) {
  const names = [ctx.student.name, ...ctx.student.name.split(' '), ...(ctx.teacherNames || []).flatMap((n) => n.split(' '))];
  const language = message.lang || detectLanguage(message.text, names);
  let intents = detectIntents(message.text, message.relation);
  // The tutor re-categorised the message: their category goes first.
  if (opts.forceIntent && INTENT_LABELS[opts.forceIntent]) {
    intents = [opts.forceIntent, ...intents.filter((i) => i !== opts.forceIntent && i !== 'other')];
  }
  const entities = extractEntities(message.text, ctx.today);
  const facts = buildFacts(ctx, intents, entities);
  let confidence = intents[0] === 'other' ? 0.3 : intents.length > 2 ? 0.65 : 0.8;
  if (opts.forceIntent) confidence = 1;
  const replyLanguage = language === 'en' ? 'en' : 'zh';
  const draft = draftReply(intents, entities, ctx, message, facts, replyLanguage);
  const primary = intents[0];
  return {
    mode: 'rules',
    model: null,
    language,
    replyLanguage,
    intents,
    primary,
    route: ROUTE_FOR_INTENT[primary],
    urgency: urgencyOf(primary, entities, ctx),
    confidence,
    summary: englishSummary(intents, entities, ctx, message),
    entities,
    facts,
    actions: planActions(intents, entities, ctx, message),
    needsTutor: needsTutorReasons(intents, entities, message, confidence),
    draft,
    tutorHint: entities.point && TUTOR_HINTS[entities.point] ? TUTOR_HINTS[entities.point] : '',
    factWarnings: checkDraftFacts(draft, facts),
    sentToAI: null,
    recategorisedByTutor: !!opts.forceIntent,
  };
}

module.exports = {
  INTENT_LABELS,
  ROUTES,
  ROUTE_FOR_INTENT,
  PRECEDENCE,
  TUTOR_HINTS,
  detectLanguage,
  detectIntents,
  extractEntities,
  parseDate,
  buildFacts,
  planActions,
  needsTutorReasons,
  draftReply,
  englishSummary,
  checkDraftFacts,
  urgencyOf,
  triageRules,
};
