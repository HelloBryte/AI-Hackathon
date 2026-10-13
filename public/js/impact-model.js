// Time-saved model shared by the Overview and Impact pages. Values are
// editable on the Impact page; both pages read the same numbers.

// Per-shift assumptions. Editable on screen so judges can test the claim.
export const ROWS = [
  { id: 'brief', step: '2-4', task: "Review timetable, changes and each expected student's records", unit: 'students', vol: 7, manual: 1.5, withSm: 0.5, how: 'Prep cards built from Exhibits 2-3' },
  { id: 'notify', step: '3', task: 'Pass attendance changes on to teachers', unit: 'changes', vol: 2, manual: 2, withSm: 0.5, how: 'Teacher notice created when the reply is approved' },
  { id: 'wechat', step: '6-7', task: 'Read, look up the records and reply on WeChat', unit: 'messages', vol: 12, manual: 2.5, withSm: 1, how: 'Classified, facts pulled, draft in the sender\'s language' },
  { id: 'records', step: '8', task: 'Enter one marked test into the three sheets', unit: 'papers', vol: 5, manual: 6, withSm: 1.5, how: 'Mark once: Exhibits 1-3 and the exam log together' },
  { id: 'review', step: '9C', task: 'Prepare an exam review (gaps, careless, time)', unit: 'exams', vol: 2, manual: 6, withSm: 2, how: 'W / C / blank and timing diagnosis ready' },
  { id: 'sac', step: '9B', task: 'Check a SAC scope against the progress sheet', unit: 'students', vol: 2, manual: 5, withSm: 1, how: 'SAC readiness per Module' },
  { id: 'report', step: '5', task: 'Compile the daily report', unit: 'report', vol: 1, manual: 10, withSm: 2, how: "Counted from the day's activity" },
];
export const SHIFT_MIN = 300;
export const SHIFTS_PER_WEEK = 5;
// Claude Opus 5.5 list price, USD per million tokens.
export const PRICE = { input: 4, output: 20 };
export const EST_TOKENS = { input: 2000, output: 800 };

export const values = Object.fromEntries(ROWS.map((r) => [r.id, { vol: r.vol, manual: r.manual, withSm: r.withSm }]));

export function totals() {
  let manual = 0;
  let withSm = 0;
  ROWS.forEach((r) => {
    const v = values[r.id];
    manual += v.vol * v.manual;
    withSm += v.vol * v.withSm;
  });
  return { manual, withSm, saved: manual - withSm };
}

export function perMessageCost() {
  return (EST_TOKENS.input * PRICE.input + EST_TOKENS.output * PRICE.output) / 1e6;
}
