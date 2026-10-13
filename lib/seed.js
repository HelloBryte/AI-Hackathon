// Demo dataset modelled on Exhibits 1-3 of the brief. Dates are relative to
// "today" so the demo always looks current. Student names come from the
// brief's sample sheets; all records are invented.

const { MODULES, POINTS, TESTS } = require('./syllabus');

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function at(base, dayOffset, hhmm) {
  return `${isoDate(addDays(base, dayOffset))}T${hhmm}:00`;
}

// Next given weekday (0 = Sunday) strictly after base, plus extra weeks.
function nextWeekday(base, weekday, extraWeeks = 0) {
  const d = new Date(base);
  const diff = ((weekday - d.getDay() + 7) % 7) || 7;
  return addDays(d, diff + extraWeeks * 7);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const STUDENTS = [
  {
    id: 'phoenix', name: 'Phoenix Hu', classId: 'MA4021-1E', classTime: 'Mon 16:30-18:30',
    year: 12, school: 'Box Hill High School', currentModule: 8, teacher: 'Ms Wang',
    parent: { name: 'Ms Hu', relation: 'mother', lang: 'zh' },
  },
  {
    id: 'justin', name: 'Justin Dong', classId: 'MA4021-1E', classTime: 'Mon 16:30-18:30',
    year: 12, school: 'Balwyn High School', currentModule: 6, teacher: 'Ms Wang',
    parent: { name: 'Mrs Dong', relation: 'mother', lang: 'zh' },
  },
  {
    id: 'william', name: 'William Wu', classId: 'MA4021-1E', classTime: 'Mon 16:30-18:30',
    year: 12, school: 'Glen Waverley Secondary College', currentModule: 7, teacher: 'Ms Wang',
    parent: { name: 'Mr Wu', relation: 'father', lang: 'en' },
  },
  {
    id: 'annie', name: 'Annie Xie', classId: 'MA4021-2', classTime: 'Sat 10:00-12:00',
    year: 12, school: 'Camberwell High School', currentModule: 7, teacher: 'Mr Chen',
    parent: { name: 'Mr Xie', relation: 'father', lang: 'zh' },
  },
  {
    id: 'david', name: 'David Zhu', classId: 'MA4021-2', classTime: 'Sat 10:00-12:00',
    year: 12, school: 'Melbourne High School', currentModule: 10, teacher: 'Mr Chen',
    parent: { name: 'Mrs Zhu', relation: 'mother', lang: 'en' },
  },
  {
    id: 'norton', name: 'Norton Cheng', classId: 'MA4021-2', classTime: 'Sat 10:00-12:00',
    year: 12, school: 'Doncaster Secondary College', currentModule: 7, teacher: 'Mr Chen',
    parent: { name: 'Mrs Cheng', relation: 'mother', lang: 'zh' },
  },
  {
    id: 'mickey', name: 'Mickey Lin', classId: 'MA4021-2', classTime: 'Sat 10:00-12:00',
    year: 12, school: 'Mac.Robertson Girls\' High School', currentModule: 7, teacher: 'Dr Li',
    parent: { name: 'Mrs Lin', relation: 'mother', lang: 'en' },
  },
];

// Exhibit 3: Module Test percentages by attempt (A, B, C, D). An object with
// tutorPass marks the "72*P" style entries where the tutor passed a student
// below 75% on judgement.
const EXAM_HISTORY = {
  phoenix: { 1: [86], 2: [50, 78], 3: [68, 80], 4: [81], 5: [77], 6: [79], 7: [83] },
  justin: { 1: [78], 2: [32, 61, 77], 3: [{ pct: 73, tutorPass: true }], 4: [91], 5: [70] },
  william: { 1: [88], 2: [80], 3: [76], 4: [79], 5: [82], 6: [39] },
  annie: { 1: [68, 84], 2: [33, { pct: 72, tutorPass: true }], 3: [51, 79], 4: [81], 5: [], 6: [53, 85] },
  david: { 1: [92], 2: [88], 3: [95], 4: [90], 5: [86], 6: [93], 7: [89], 8: [91], 9: [87] },
  norton: { 1: [78], 2: [76], 3: [84], 4: [80], 5: [85], 6: [82] },
  mickey: { 1: [82], 2: [79], 3: [66, 81], 4: [77], 5: [80], 6: [75] },
};

// Phoenix's Module 8 before Module Test 8A is marked (the Exhibit 1 paper).
const PROGRESS_OVERRIDES = {
  phoenix: {
    '8.1': 'mastered', '8.2': 'partial', '8.3': 'mastered', '8.4': 'partial', '8.5': 'mastered',
    '8.6.1': 'mastered', '8.6.2': 'partial', '8.7.1': 'mastered', '8.7.2': 'partial',
    '8.8.1': 'partial', '8.8.2': 'not_understood', '8.9.1': 'partial', '8.9.2': 'not_covered', '8.9.3': 'partial',
    '7.7': 'partial',
  },
  justin: { '5.4': 'not_understood', '5.6': 'not_understood', '5.3.1': 'partial', '6.4.1': 'not_understood' },
  william: {
    '6.2': 'not_understood', '6.4.1': 'not_understood', '6.4.2': 'not_understood', '6.4.3': 'not_covered',
    '6.5': 'not_understood', '6.6': 'partial', '6.7': 'not_covered',
  },
  norton: { '7.1': 'mastered', '7.2': 'partial', '7.3': 'partial', '7.4': 'not_understood' },
  mickey: { '7.8': 'not_understood', '7.7': 'partial' },
};

function buildProgress(student) {
  const rand = mulberry32(hash(student.id));
  const history = EXAM_HISTORY[student.id] || {};
  const progress = {};
  for (const m of MODULES) {
    const pts = m.points.map(([id]) => id);
    const attempts = history[m.id] || [];
    const passed = attempts.some((a) => (typeof a === 'number' ? a : a.pct) >= 75 || (a && a.tutorPass));
    pts.forEach((id, i) => {
      const r = rand();
      let v;
      if (m.id < student.currentModule) {
        if (passed) v = r < 0.8 ? 'mastered' : r < 0.95 ? 'partial' : 'not_understood';
        else v = r < 0.45 ? 'mastered' : r < 0.75 ? 'partial' : 'not_understood';
      } else if (m.id === student.currentModule) {
        const pos = i / pts.length;
        if (pos < 0.4) v = r < 0.6 ? 'mastered' : 'partial';
        else if (pos < 0.7) v = r < 0.6 ? 'partial' : 'not_understood';
        else v = 'not_covered';
      } else {
        v = 'not_covered';
      }
      progress[id] = v;
    });
  }
  Object.assign(progress, PROGRESS_OVERRIDES[student.id] || {});
  return progress;
}

function buildExamStats(student, today) {
  const stats = {};
  const history = EXAM_HISTORY[student.id] || {};
  for (const [mod, attempts] of Object.entries(history)) {
    const moduleId = Number(mod);
    const weeksAgo = (student.currentModule - moduleId) * 2;
    stats[moduleId] = {
      attempts: attempts.map((a, i) => {
        const pct = typeof a === 'number' ? a : a.pct;
        return {
          slot: 'ABCD'[i],
          pct,
          date: isoDate(addDays(today, -weeksAgo * 7 + i * 5)),
          tutorPass: typeof a === 'object' && !!a.tutorPass,
        };
      }),
    };
  }
  return stats;
}

// Earlier marked papers (Exhibit 1 records) so the briefing can show recent
// mistakes. Rows are stored inline because older paper versions are not in
// the TESTS list.
function buildMarkingHistory(today) {
  const rec = (id, studentId, testName, daysAgo, rows, pct) => ({
    id, studentId, testName, testId: null, attempt: 'A', date: isoDate(addDays(today, -daysAgo)),
    rows: rows.map(([q, point, outcome]) => ({ q, point, outcome })), pct, source: 'history',
  });
  return [
    rec('h1', 'justin', 'Module Test 5A', 9, [
      ['1', '5.1', 'DONE'], ['2', '5.2', 'DONE'], ['3', '5.3.1', 'C'], ['4', '5.3.2', 'DONE'],
      ['5', '5.4', 'W'], ['6', '5.5', 'DONE'], ['7', '5.6', 'W'], ['8', '5.7', 'DONE'],
    ], 70),
    rec('h2', 'william', 'Module Test 6A', 12, [
      ['1', '6.1', 'DONE'], ['2', '6.2', 'W'], ['3', '6.3', 'DONE'], ['4a', '6.4.1', 'W'], ['4b', '6.4.2', 'W'],
      ['5', '6.4.3', 'BLANK'], ['6', '6.5', 'W'], ['7', '6.6', 'C'], ['8', '6.6', 'BLANK'], ['9', '6.7', 'BLANK'],
    ], 39),
    rec('h3', 'phoenix', 'Module Test 7A', 15, [
      ['1', '7.1', 'DONE'], ['2', '7.2', 'DONE'], ['3', '7.3', 'DONE'], ['4', '7.4', 'C'], ['5a', '7.5.1', 'DONE'],
      ['5b', '7.5.2', 'DONE'], ['6', '7.6', 'DONE'], ['7', '7.7', 'W'], ['8', '7.8', 'DONE'], ['9', '7.9', 'DONE'],
    ], 83),
    rec('h4', 'annie', 'Module Test 6B', 6, [
      ['1', '6.1', 'DONE'], ['2', '6.2', 'DONE'], ['3', '6.3', 'DONE'], ['4a', '6.4.1', 'C'], ['4b', '6.4.2', 'DONE'],
      ['5', '6.4.3', 'DONE'], ['6', '6.5', 'DONE'], ['7', '6.6', 'C'], ['8', '6.6', 'DONE'], ['9', '6.7', 'DONE'],
    ], 85),
    rec('h5', 'norton', 'Module Test 6A', 18, [
      ['1', '6.1', 'DONE'], ['2', '6.2', 'DONE'], ['3', '6.3', 'C'], ['4a', '6.4.1', 'DONE'], ['4b', '6.4.2', 'DONE'],
      ['5', '6.4.3', 'W'], ['6', '6.5', 'DONE'], ['7', '6.6', 'DONE'], ['8', '6.6', 'C'], ['9', '6.7', 'DONE'],
    ], 82),
    rec('h6', 'mickey', 'Module Test 6A', 20, [
      ['1', '6.1', 'DONE'], ['2', '6.2', 'DONE'], ['3', '6.3', 'DONE'], ['4a', '6.4.1', 'DONE'], ['4b', '6.4.2', 'W'],
      ['5', '6.4.3', 'DONE'], ['6', '6.5', 'C'], ['7', '6.6', 'DONE'], ['8', '6.6', 'W'], ['9', '6.7', 'DONE'],
    ], 75),
    rec('h7', 'david', 'VCAA 2022 Exam 1 (mock)', 7, [
      ['1', '6.4.2', 'DONE'], ['2', '8.5', 'DONE'], ['3', '4.4', 'DONE'], ['4', '5.4', 'C'], ['5', '9.4', 'DONE'],
      ['6', '7.1', 'DONE'], ['7', '1.5.2', 'W'], ['8', '8.8.1', 'DONE'], ['9', '11.2', 'DONE'],
    ], 81),
  ];
}

// Scenario C, step 5: the student's own exam log.
function buildExamLog(today) {
  const d = (n) => isoDate(addDays(today, -n));
  return {
    david: [
      { date: d(35), paper: 'VCAA 2019 Exam 1', start: '10:00', end1: '11:02', end2: '11:05', checks: 1, pct: 62 },
      { date: d(28), paper: 'VCAA 2020 Exam 1', start: '10:00', end1: '10:58', end2: '11:00', checks: 1, pct: 66 },
      { date: d(21), paper: 'VCAA 2021 Exam 1', start: '10:00', end1: '10:55', end2: '11:00', checks: 2, pct: 74 },
      { date: d(7), paper: 'VCAA 2022 Exam 1', start: '10:00', end1: '10:51', end2: '11:00', checks: 2, pct: 81 },
    ],
    phoenix: [
      { date: d(29), paper: 'Module Test 6A', start: '16:40', end1: '17:22', end2: '17:27', checks: 1, pct: 79 },
      { date: d(15), paper: 'Module Test 7A', start: '16:35', end1: '17:21', end2: '17:25', checks: 1, pct: 83 },
    ],
    william: [
      { date: d(12), paper: 'Module Test 6A', start: '16:35', end1: '17:25', end2: '', checks: 0, pct: 39 },
    ],
    justin: [
      { date: d(9), paper: 'Module Test 5A', start: '16:40', end1: '17:20', end2: '17:24', checks: 1, pct: 70 },
    ],
  };
}

function buildInbox(today) {
  const t = (hhmm) => at(today, 0, hhmm);
  const msg = (id, time, studentId, relation, lang, text) => ({
    id, receivedAt: t(time), studentId, relation, lang, text, channel: 'Work WeChat', status: 'new',
  });
  return [
    msg('m1', '11:42', 'justin', 'parent', 'zh',
      '老师您好，Justin今天有点发烧，下午的课想请假一次，麻烦您跟Ms Wang说一声，谢谢！'),
    msg('m2', '12:15', 'annie', 'student', 'en',
      "hi can i do today's lesson online instead? my mum can't drive me today 🙏"),
    msg('m3', '12:31', 'william', 'student', 'en',
      "did i pass the module 6 test?? and when's my retest"),
    msg('m4', '13:05', 'phoenix', 'student', 'en',
      'how do u find the area between y=x^2 and y=2x? i keep getting a negative answer'),
    msg('m5', '13:20', 'annie', 'parent', 'zh',
      '老师好，Annie这次学校的SAC成绩不太理想，想了解一下她最近在中心的学习情况和接下来的安排，谢谢。'),
    msg('m6', '13:48', 'norton', 'student', 'mixed',
      '老师 我下周四有SAC 考differentiation 可以book一个Q&A吗'),
    msg('m7', '13:55', 'david', 'parent', 'en',
      'Hi, could you please send me the invoice for Term 4? Also is there a sibling discount if his brother joins next year?'),
    msg('m8', '14:02', 'mickey', 'student', 'en',
      'I finished the module 7 demo questions, can I sit the test today?'),
    msg('m9', '14:10', 'phoenix', 'parent', 'zh',
      '谢谢老师上周的反馈，Phoenix说现在积分清楚多了。'),
  ];
}

function buildSeed(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = isoDate(today);
  const students = STUDENTS.map((s) => ({
    ...s,
    sacs: [],
  }));
  const byId = Object.fromEntries(students.map((s) => [s.id, s]));
  byId.phoenix.sacs.push({
    id: 'sac-phoenix-2', title: 'SAC 2: Calculus application task', date: isoDate(addDays(today, 6)),
    modules: [6, 7, 8], source: 'school', materials: 'Task outline shared on Google Classroom',
  });
  byId.annie.sacs.push({
    id: 'sac-annie-2', title: 'SAC 2: Calculus application task', date: isoDate(addDays(today, 13)),
    modules: [6, 7], source: 'school', materials: 'Not yet received',
  });
  byId.david.sacs.push({
    id: 'sac-david-3', title: 'SAC 3: Probability modelling task', date: isoDate(addDays(today, 20)),
    modules: [9, 10], source: 'school', materials: 'Practice SAC from centre bank',
  });

  const progress = {};
  const examStats = {};
  for (const s of students) {
    progress[s.id] = buildProgress(s);
    examStats[s.id] = buildExamStats(s, today);
  }

  return {
    version: 1,
    seededAt: now.toISOString(),
    today: todayISO,
    settings: {
      centre: 'Maths Tutoring Centre',
      tutor: 'Learning Support Tutor',
      manager: 'Ms Park',
      shift: { start: '14:00', end: '19:00' },
      course: 'Mathematical Methods Units 3&4',
    },
    teachers: [
      { name: 'Ms Wang', classes: ['MA4021-1E'] },
      { name: 'Mr Chen', classes: ['MA4021-2'] },
      { name: 'Dr Li', classes: [] },
    ],
    students,
    progress,
    examStats,
    markingRecords: buildMarkingHistory(today),
    examLog: buildExamLog(today),
    pendingPapers: [
      {
        id: 'p1', studentId: 'phoenix', testId: 'MT8A', submittedAt: at(today, -1, '16:58'),
        timing: { start: '16:05', end1: '16:52', end2: '16:58', checks: 1 },
        sampleMarks: '✓ w ✓ ✓ ✓ ✓ ✓ c blank ✓ ✓ ✓',
      },
      {
        id: 'p2', studentId: 'william', testId: 'MT6B', submittedAt: at(today, -1, '17:24'),
        timing: { start: '16:35', end1: '17:24', end2: '', checks: 0 },
        sampleMarks: '✓✓✓✓x✓c✓--',
      },
      {
        id: 'p3', studentId: 'justin', testId: 'MT5B', submittedAt: at(today, -3, '16:55'),
        timing: { start: '16:10', end1: '16:48', end2: '16:55', checks: 1 },
        sampleMarks: '1 ✓, 2 ✓, 3 ✓, 4 ✓, 5 ✓, 6 ✓, 7 w, 8 ✓',
      },
      {
        id: 'p4', studentId: 'david', testId: 'VCAA23E1', submittedAt: at(today, -2, '11:00'),
        timing: { start: '10:00', end1: '10:49', end2: '11:00', checks: 2 },
        sampleMarks: 'DONE DONE DONE C DONE DONE W DONE DONE DONE DONE blank',
      },
    ],
    timetable: [
      { id: 't1', studentId: 'mickey', teacher: 'Dr Li', start: '14:30', end: '16:00', room: 'Room 1', mode: 'in_person', status: 'on_site', focus: 'Module 7 study and Demo' },
      { id: 't2', studentId: 'phoenix', teacher: 'Ms Wang', start: '16:00', end: '18:00', room: 'Room 2', mode: 'in_person', status: 'expected', focus: 'Module 8 and SAC 2 prep' },
      { id: 't3', studentId: 'justin', teacher: 'Ms Wang', start: '16:00', end: '18:00', room: 'Room 2', mode: 'in_person', status: 'expected', focus: 'Module 6 study' },
      { id: 't4', studentId: 'william', teacher: 'Ms Wang', start: '16:30', end: '18:30', room: 'Room 2', mode: 'in_person', status: 'expected', focus: 'Module 6 Retest review' },
      { id: 't5', studentId: 'annie', teacher: 'Mr Chen', start: '16:00', end: '17:30', room: 'Room 3', mode: 'in_person', status: 'expected', focus: 'Module 7 study' },
      { id: 't6', studentId: 'david', teacher: 'Mr Chen', start: '16:00', end: '18:00', room: 'Study room', mode: 'in_person', status: 'expected', focus: 'VCAA mock review' },
      { id: 't7', studentId: 'norton', teacher: 'Mr Chen', start: '17:00', end: '18:30', room: 'Room 3', mode: 'in_person', status: 'expected', focus: 'Module 7 study' },
    ],
    inbox: buildInbox(today),
    qaQueue: [
      { id: 'qa1', studentId: 'justin', topic: 'Chain rule with circular functions', point: '6.4.1', source: 'on-site', status: 'open', createdAt: at(today, -3, '17:10') },
      { id: 'qa2', studentId: 'mickey', topic: "Newton's method: choosing the starting value", point: '7.8', source: 'on-site', status: 'open', createdAt: at(today, -2, '15:20') },
    ],
    handovers: [],
    teacherNotices: [],
    retests: [
      { id: 'r1', studentId: 'annie', module: 5, testName: 'Module Test 5', status: 'to_schedule', reason: 'Not submitted', createdAt: at(today, -5, '12:00') },
    ],
    demoReviews: [],
    testBookings: [],
    activity: [
      { id: 'ev-seed-1', at: at(today, 0, '14:20'), type: 'checkin', studentId: 'mickey' },
    ],
    audit: [],
    report: null,
  };
}

module.exports = { buildSeed, isoDate, addDays, nextWeekday, STUDENTS, POINTS, TESTS, MODULES };
