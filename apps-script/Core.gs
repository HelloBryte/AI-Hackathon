// GENERATED from lib/core.js by `npm run build:gas`. Edit lib/core.js instead.

/*
 * ShiftMate core rules: marking, mastery, diagnosis.
 *
 * This file is shared by the web prototype (Node) and the Google Sheets pilot
 * (Apps Script, copied to apps-script/Core.gs by `npm run build:gas`). That is
 * why it uses plain function declarations, `var` at the top level, and avoids
 * `?.` / `??`. It does no I/O and calls no AI: every number written to the
 * three record sheets comes from these deterministic rules.
 */

var OUTCOMES = ['DONE', 'W', 'C', 'BLANK'];
var MASTERY_ORDER = ['not_covered', 'not_understood', 'partial', 'mastered'];
var MASTERY_LABEL = {
  mastered: 'Completely mastered',
  partial: 'Partially mastered',
  not_understood: 'Not understood',
  not_covered: 'Not yet covered',
};
// Performance bands from the Exhibit 3 legend.
var PASS_PCT = 75;
var LOW_PCT = 40;
var ATTEMPT_SLOTS = ['A', 'B', 'C', 'D'];

var NEXT_STEPS = {
  move_on: 'Move on to the next Module',
  targeted_practice: 'Targeted practice on the weak points',
  redo_demo: 'Re-watch lessons and redo the Demo before a Retest',
  schedule_retest: 'Targeted practice, then schedule a Retest',
  revise_module: 'Revise the Module, redo the Demo, then Retest',
  next_mock: 'Move on to the next VCAA mock exam',
  escalate_teacher: 'All attempts used: agree a plan with the teacher',
};

var BLANK_REASONS = {
  time: 'Ran out of time',
  didnt_know: "Didn't know how to start",
  skipped: 'Skipped on purpose (strategy)',
};

// ---------------------------------------------------------------------------
// Input normalisation (messy marks)
// ---------------------------------------------------------------------------

/** Map whatever the tutor typed to DONE / W / C / BLANK, or null if unknown. */
function normaliseOutcome(raw) {
  if (raw === null || raw === undefined) return 'BLANK';
  var s = String(raw).trim().toLowerCase().replace(/[\\/]/g, '').replace(/\s+/g, ' ');
  if (s === '' || s === 'blank' || s === 'b' || s === '-' || s === '—' || s === '–' || s === 'na' ||
      s === 'none' || s === 'not attempted' || s === '空' || s === '空白' || s === '未做' || s === '没做') {
    return 'BLANK';
  }
  if (s === 'done' || s === 'd' || s === '✓' || s === '✔' || s === '√' || s === 'v' || s === 'tick' ||
      s === 'correct' || s === 'ok' || s === 'right' || s === 'y' || s === '对' || s === '正确') {
    return 'DONE';
  }
  if (s === 'w' || s === 'wrong' || s === 'x' || s === '✗' || s === '✘' || s === '×' || s === 'incorrect' ||
      s === '错' || s === '错误') {
    return 'W';
  }
  if (s === 'c' || s === 'careless' || s === 'calc' || s === 'slip' || s === '粗心') return 'C';
  return null;
}

function isQuestionLabel(token, test) {
  var t = String(token).toLowerCase();
  return test.questions.some(function (q) { return q.q.toLowerCase() === t; });
}

/**
 * Parse a quick-entry string into outcomes. Accepts three shapes:
 *   compact   "✓x✓✓✓✓✓c-✓✓✓"            one symbol per question, in order
 *   sequence  "DONE W DONE ... blank"     one token per question, in order
 *   labelled  "1 ✓, 2 w, 6a done, 8:-"    question label then mark
 * Unknown tokens are reported, never guessed.
 */
function parseQuickEntry(text, test) {
  var result = { outcomes: {}, unknown: [], missing: [], mode: 'sequence' };
  var src = String(text || '').trim();
  if (!src) {
    result.missing = test.questions.map(function (q) { return q.q; });
    return result;
  }
  var tokens = src.split(/[\s,;]+/).filter(function (t) { return t.length > 0; });

  var labelled = tokens.some(function (t) { return /^\d+[a-z]?[:=)]/i.test(t); }) || isQuestionLabel(tokens[0], test);

  if (labelled) {
    result.mode = 'labelled';
    var expanded = [];
    tokens.forEach(function (t) {
      var m = /^(\d+[a-z]?)[:=)](.*)$/i.exec(t);
      if (m) {
        expanded.push(m[1]);
        if (m[2] !== '') expanded.push(m[2]);
        else expanded.push('');
      } else {
        expanded.push(t);
      }
    });
    var i = 0;
    while (i < expanded.length) {
      var label = expanded[i];
      if (!isQuestionLabel(label, test)) {
        result.unknown.push(label);
        i += 1;
        continue;
      }
      var value = i + 1 < expanded.length ? expanded[i + 1] : '';
      if (value !== '' && isQuestionLabel(value, test) && normaliseOutcome(value) === null) {
        // "1 2:x": a label with no mark. Report it rather than guess.
        result.unknown.push(label + ' (no mark)');
        i += 1;
        continue;
      }
      i += 2;
      var outcome = normaliseOutcome(value);
      var key = test.questions.filter(function (q) { return q.q.toLowerCase() === label.toLowerCase(); })[0].q;
      if (outcome === null) result.unknown.push(label + ' ' + value);
      else result.outcomes[key] = outcome;
    }
  } else {
    var marks = tokens;
    if (tokens.length === 1 && normaliseOutcome(tokens[0]) === null) {
      result.mode = 'compact';
      marks = Array.from(tokens[0]);
    }
    test.questions.forEach(function (q, idx) {
      if (idx >= marks.length) return;
      var outcome = normaliseOutcome(marks[idx]);
      if (outcome === null) result.unknown.push(q.q + ' ' + marks[idx]);
      else result.outcomes[q.q] = outcome;
    });
    if (marks.length > test.questions.length) {
      result.unknown.push('extra marks: ' + marks.slice(test.questions.length).join(' '));
    }
  }
  result.missing = test.questions
    .filter(function (q) { return !(q.q in result.outcomes); })
    .map(function (q) { return q.q; });
  return result;
}

// ---------------------------------------------------------------------------
// Scoring (Exhibit 1 + Exhibit 3 bands)
// ---------------------------------------------------------------------------

function band(pct) {
  if (pct === null || pct === undefined) return 'not_submitted';
  if (pct >= PASS_PCT) return 'pass';
  if (pct >= LOW_PCT) return 'mid';
  return 'low';
}

function round1(x) {
  return Math.round(x * 10) / 10;
}

/**
 * Score a marked paper. A question earns full marks when DONE and zero
 * otherwise, unless the tutor entered a partial mark (e.g. method marks on a
 * careless error).
 */
function scorePaper(test, outcomes, partialMarks) {
  partialMarks = partialMarks || {};
  var rows = [];
  var score = 0;
  var total = 0;
  test.questions.forEach(function (q) {
    var outcome = outcomes[q.q] || 'BLANK';
    var awarded = outcome === 'DONE' ? q.marks : 0;
    var pm = partialMarks[q.q];
    if (pm !== undefined && pm !== null && pm !== '' && !isNaN(Number(pm))) {
      awarded = Math.max(0, Math.min(q.marks, Number(pm)));
    }
    score += awarded;
    total += q.marks;
    rows.push({ q: q.q, point: q.point, outcome: outcome, awarded: awarded, max: q.marks });
  });
  var pct = total ? round1((score / total) * 100) : 0;
  return { rows: rows, score: score, total: total, pct: pct, band: band(pct) };
}

/** Blanks after the last attempted question look like time trouble; blanks in the middle do not. */
function analyseBlanks(test, outcomes) {
  var labels = test.questions.map(function (q) { return q.q; });
  var lastAttempted = -1;
  labels.forEach(function (label, i) {
    if ((outcomes[label] || 'BLANK') !== 'BLANK') lastAttempted = i;
  });
  var trailing = [];
  var isolated = [];
  labels.forEach(function (label, i) {
    if ((outcomes[label] || 'BLANK') !== 'BLANK') return;
    if (i > lastAttempted) trailing.push(label);
    else isolated.push(label);
  });
  var suggestions = {};
  trailing.forEach(function (label) { suggestions[label] = 'time'; });
  isolated.forEach(function (label) { suggestions[label] = 'didnt_know'; });
  return { trailing: trailing, isolated: isolated, suggestions: suggestions };
}

// ---------------------------------------------------------------------------
// Mastery (Exhibit 2)
// ---------------------------------------------------------------------------

function masteryRank(m) {
  var i = MASTERY_ORDER.indexOf(m);
  return i < 0 ? 0 : i;
}

/**
 * Propose Progress Sheet changes from one marked paper. The key rule from the
 * brief: a W is a knowledge gap, a C is not. Blanks need the tutor's call
 * (ran out of time vs didn't know), so they are flagged until resolved.
 */
function proposeMasteryUpdates(test, outcomes, studentProgress, blankResolutions, pointTitles) {
  blankResolutions = blankResolutions || {};
  pointTitles = pointTitles || {};
  var blanks = analyseBlanks(test, outcomes);
  var byPoint = {};
  var order = [];

  test.questions.forEach(function (q) {
    var outcome = outcomes[q.q] || 'BLANK';
    var before = studentProgress[q.point] || 'not_covered';
    var after;
    var kind;
    var reason;
    var needsTutor = false;
    if (outcome === 'DONE') {
      after = 'mastered';
      kind = 'correct';
      reason = 'Answered correctly';
    } else if (outcome === 'C') {
      after = masteryRank(before) >= masteryRank('partial') ? before : 'partial';
      kind = 'careless';
      reason = 'Careless error: method understood, so not treated as a knowledge gap';
    } else if (outcome === 'W') {
      after = before === 'mastered' ? 'partial' : 'not_understood';
      kind = 'gap';
      reason = before === 'mastered'
        ? 'Wrong on a point previously mastered: down one level'
        : 'Wrong method or concept: knowledge gap';
    } else {
      var resolution = blankResolutions[q.q];
      if (!resolution) {
        resolution = blanks.suggestions[q.q];
        needsTutor = true;
      }
      if (resolution === 'didnt_know') {
        after = 'not_understood';
        kind = 'gap';
        reason = 'Left blank: did not know how to start';
      } else {
        after = before;
        kind = resolution === 'time' ? 'time' : 'strategy';
        reason = resolution === 'time'
          ? 'Left blank: ran out of time (no evidence either way)'
          : 'Left blank on purpose: answering strategy, no mastery change';
      }
      if (needsTutor) reason += ' (suggested; tutor to confirm)';
    }
    if (!byPoint[q.point]) {
      byPoint[q.point] = {
        point: q.point,
        title: pointTitles[q.point] || '',
        before: before,
        after: after,
        evidence: [],
        needsTutor: false,
      };
      order.push(q.point);
    } else if (masteryRank(after) < masteryRank(byPoint[q.point].after)) {
      byPoint[q.point].after = after;
    }
    byPoint[q.point].evidence.push({ q: q.q, outcome: outcome, kind: kind, reason: reason });
    if (needsTutor) byPoint[q.point].needsTutor = true;
  });

  return order.map(function (p) {
    var c = byPoint[p];
    c.changed = c.before !== c.after;
    return c;
  });
}

function progressSummary(studentProgress, points) {
  var counts = { mastered: 0, partial: 0, not_understood: 0, not_covered: 0 };
  points.forEach(function (p) {
    var m = studentProgress[p.id] || 'not_covered';
    counts[m] += 1;
  });
  var total = points.length;
  var covered = total - counts.not_covered;
  var understood = counts.mastered + counts.partial;
  function pct(n, d) { return d ? round1((n / d) * 100) : 0; }
  return {
    total: total,
    counts: counts,
    covered: covered,
    coveredPct: pct(covered, total),
    understood: understood,
    understoodPct: pct(understood, total),
    mastered: counts.mastered,
    masteredPct: pct(counts.mastered, total),
    masteredOfCoveredPct: pct(counts.mastered, covered),
  };
}

// ---------------------------------------------------------------------------
// Exam statistics (Exhibit 3)
// ---------------------------------------------------------------------------

/** entry = { attempts: [{ slot, pct, date, tutorPass }] } */
function moduleStatus(entry) {
  if (!entry || !entry.attempts || entry.attempts.length === 0) return 'not_attempted';
  var passed = entry.attempts.some(function (a) { return a.pct >= PASS_PCT || a.tutorPass; });
  if (passed) return 'passed';
  if (entry.attempts.length >= ATTEMPT_SLOTS.length) return 'attempts_used';
  return 'retest_due';
}

function nextAttemptSlot(entry) {
  var used = entry && entry.attempts ? entry.attempts.length : 0;
  return used < ATTEMPT_SLOTS.length ? ATTEMPT_SLOTS[used] : null;
}

// ---------------------------------------------------------------------------
// Diagnosis (Scenario C, step 2) and next step (Scenario C, step 4)
// ---------------------------------------------------------------------------

function toMinutes(hhmm) {
  if (!hhmm) return null;
  var m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutesBetween(a, b) {
  var x = toMinutes(a);
  var y = toMinutes(b);
  if (x === null || y === null) return null;
  return y >= x ? y - x : y + 24 * 60 - x;
}

function listLabel(labels) {
  return labels.map(function (l) { return 'Q' + l; }).join(', ');
}

/**
 * Turn the W / C / blank pattern plus exam timing into the problem list the
 * brief asks the tutor to review with the student.
 */
function diagnose(test, outcomes, timing, masteryChanges, blankResolutions) {
  timing = timing || {};
  blankResolutions = blankResolutions || {};
  var issues = [];
  var blanks = analyseBlanks(test, outcomes);
  var before = {};
  masteryChanges.forEach(function (c) { before[c.point] = c.before; });

  var gapQs = [];
  var methodQs = [];
  var carelessQs = [];
  test.questions.forEach(function (q) {
    var o = outcomes[q.q] || 'BLANK';
    var resolution = blankResolutions[q.q] || blanks.suggestions[q.q];
    if (o === 'W') {
      if (masteryRank(before[q.point]) >= masteryRank('partial')) methodQs.push(q);
      else gapQs.push(q);
    } else if (o === 'BLANK' && resolution === 'didnt_know') {
      gapQs.push(q);
    } else if (o === 'C') {
      carelessQs.push(q);
    }
  });
  function pointsOf(qs) {
    var seen = {};
    return qs.map(function (q) { return q.point; }).filter(function (p) {
      if (seen[p]) return false;
      seen[p] = true;
      return true;
    });
  }

  if (gapQs.length) {
    issues.push({
      code: 'knowledge_gap', label: 'Gaps in knowledge', severity: gapQs.length >= 3 ? 'high' : 'medium',
      questions: gapQs.map(function (q) { return q.q; }), points: pointsOf(gapQs),
      detail: listLabel(gapQs.map(function (q) { return q.q; })) + ' wrong or blank on points not yet secure',
    });
  }
  if (methodQs.length) {
    issues.push({
      code: 'method', label: 'Unfamiliar with solution methods', severity: 'medium',
      questions: methodQs.map(function (q) { return q.q; }), points: pointsOf(methodQs),
      detail: listLabel(methodQs.map(function (q) { return q.q; })) + ' wrong on points the student had shown before: method not yet reliable under test conditions',
    });
  }
  if (carelessQs.length) {
    issues.push({
      code: 'careless', label: 'Carelessness or calculation errors', severity: carelessQs.length >= 2 ? 'high' : 'low',
      questions: carelessQs.map(function (q) { return q.q; }), points: pointsOf(carelessQs),
      detail: carelessQs.length + ' careless error' + (carelessQs.length > 1 ? 's' : '') + ' (' +
        listLabel(carelessQs.map(function (q) { return q.q; })) + '). Mastery kept: these are accuracy, not understanding',
    });
  }

  var firstPass = minutesBetween(timing.start, timing.end1);
  var overTime = firstPass !== null && test.timeLimitMin && firstPass > test.timeLimitMin;
  var trailingTime = blanks.trailing.filter(function (l) {
    return (blankResolutions[l] || blanks.suggestions[l]) === 'time';
  });
  if (trailingTime.length || overTime) {
    var parts = [];
    if (trailingTime.length) parts.push(listLabel(trailingTime) + ' left blank at the end');
    if (overTime) parts.push('first pass took ' + firstPass + ' min against a ' + test.timeLimitMin + ' min limit');
    issues.push({
      code: 'time', label: 'Poor time allocation', severity: trailingTime.length >= 2 ? 'high' : 'medium',
      questions: trailingTime, points: [], detail: parts.join('; '),
    });
  }

  var checks = timing.checks === undefined || timing.checks === null || timing.checks === '' ? null : Number(timing.checks);
  var noSecondPass = !timing.end2 || minutesBetween(timing.end1, timing.end2) === 0;
  if ((checks === 0 || (checks === null && noSecondPass && timing.end1)) && test.questions.length) {
    issues.push({
      code: 'checking', label: 'Failure to check answers', severity: carelessQs.length ? 'high' : 'low',
      questions: [], points: [],
      detail: carelessQs.length
        ? 'No checking pass, and ' + carelessQs.length + ' careless error(s) that a check could have caught'
        : 'No checking pass recorded',
    });
  }

  var skipped = blanks.isolated.filter(function (l) { return (blankResolutions[l] || blanks.suggestions[l]) === 'skipped'; });
  if (skipped.length) {
    issues.push({
      code: 'strategy', label: 'Answering strategy under exam conditions', severity: 'medium',
      questions: skipped, points: [],
      detail: listLabel(skipped) + ' skipped and never returned to',
    });
  }
  return issues;
}

function suggestNextStep(test, score, issues, examEntry) {
  var gapPoints = [];
  issues.forEach(function (i) {
    if (i.code === 'knowledge_gap' || i.code === 'method') {
      i.points.forEach(function (p) { if (gapPoints.indexOf(p) < 0) gapPoints.push(p); });
    }
  });
  var careless = issues.filter(function (i) { return i.code === 'careless'; })[0];
  var reasons = [];
  var action;
  var retestNeeded = false;

  if (test.kind === 'vcaa') {
    if (score.pct >= PASS_PCT && gapPoints.length <= 1) {
      action = 'next_mock';
      reasons.push(score.pct + '% with at most one weak point');
    } else {
      action = 'targeted_practice';
      reasons.push(score.pct + '%: practise ' + (gapPoints.join(', ') || 'the lost-mark questions') + ' before the next mock');
    }
  } else if (score.pct >= PASS_PCT) {
    action = 'move_on';
    reasons.push(score.pct + '% is in the Pass band (' + PASS_PCT + '%+)');
    if (gapPoints.length) reasons.push('Add targeted practice on ' + gapPoints.join(', '));
  } else {
    retestNeeded = true;
    var slotsUsed = examEntry && examEntry.attempts ? examEntry.attempts.length : 0;
    if (slotsUsed + 1 >= ATTEMPT_SLOTS.length) {
      action = 'escalate_teacher';
      reasons.push('This was the last attempt slot (' + ATTEMPT_SLOTS[ATTEMPT_SLOTS.length - 1] + ')');
    } else if (score.pct < LOW_PCT) {
      action = 'revise_module';
      reasons.push(score.pct + '% is in the Low band (under ' + LOW_PCT + '%)');
    } else if (gapPoints.length > 3) {
      action = 'redo_demo';
      reasons.push(gapPoints.length + ' weak points: the Module needs another pass, not a quick fix');
    } else {
      action = 'schedule_retest';
      reasons.push(score.pct + '% is in the Mid band; gaps are concentrated in ' + (gapPoints.join(', ') || 'a few questions'));
    }
  }
  if (careless && careless.questions.length >= 2) {
    reasons.push('Build a checking routine: ' + careless.questions.length + ' careless errors this paper');
  }
  return { action: action, label: NEXT_STEPS[action], reasons: reasons, retestNeeded: retestNeeded, gapPoints: gapPoints };
}

// ---------------------------------------------------------------------------
// One entry -> three sheets
// ---------------------------------------------------------------------------

/**
 * Build everything one marked paper changes, without writing anything.
 * The caller shows this to the tutor, who confirms before it is applied.
 *
 * input: { test, outcomes, partialMarks, timing, blankResolutions,
 *          studentProgress, examEntry, points, date }
 */
function planMarking(input) {
  var test = input.test;
  var outcomes = {};
  test.questions.forEach(function (q) {
    var o = input.outcomes ? input.outcomes[q.q] : undefined;
    if (o !== undefined && o !== null && o !== '') {
      var n = normaliseOutcome(o);
      if (n) outcomes[q.q] = n;
    }
  });
  var missing = test.questions.filter(function (q) { return !(q.q in outcomes); }).map(function (q) { return q.q; });
  var marked = {};
  test.questions.forEach(function (q) { marked[q.q] = outcomes[q.q] || 'BLANK'; });

  var titles = {};
  (input.points || []).forEach(function (p) { titles[p.id] = p.title; });

  var score = scorePaper(test, marked, input.partialMarks);
  var blanks = analyseBlanks(test, marked);
  var progress = input.studentProgress || {};
  var changes = proposeMasteryUpdates(test, marked, progress, input.blankResolutions, titles);
  var issues = diagnose(test, marked, input.timing, changes, input.blankResolutions);
  var suggestion = suggestNextStep(test, score, issues, input.examEntry);

  var progressAfter = Object.assign({}, progress);
  changes.forEach(function (c) { progressAfter[c.point] = c.after; });

  var exhibit3 = null;
  if (test.kind === 'module') {
    var slot = nextAttemptSlot(input.examEntry);
    exhibit3 = {
      module: test.module,
      slot: slot,
      pct: score.pct,
      band: score.band,
      statusBefore: moduleStatus(input.examEntry),
    };
  }

  var timing = input.timing || {};
  return {
    testId: test.id,
    testName: test.name,
    missing: missing,
    exhibit1: score.rows,
    score: { score: score.score, total: score.total, pct: score.pct, band: score.band },
    blanks: blanks,
    exhibit2: {
      changes: changes,
      summaryBefore: input.points ? progressSummary(progress, input.points) : null,
      summaryAfter: input.points ? progressSummary(progressAfter, input.points) : null,
    },
    exhibit3: exhibit3,
    examLog: {
      date: input.date || null,
      paper: test.name,
      start: timing.start || '',
      end1: timing.end1 || '',
      end2: timing.end2 || '',
      checks: timing.checks === undefined ? '' : timing.checks,
      score: score.score,
      total: score.total,
      pct: score.pct,
    },
    issues: issues,
    suggestion: suggestion,
    unresolvedBlanks: blanks.trailing.concat(blanks.isolated).filter(function (l) {
      return !(input.blankResolutions && input.blankResolutions[l]);
    }),
  };
}

// ---------------------------------------------------------------------------
// SAC readiness (Scenario B, step 2)
// ---------------------------------------------------------------------------

function sacReadiness(sac, studentProgress, examStats, points, modules, todayISO) {
  var rows = sac.modules.map(function (mid) {
    var mod = modules.filter(function (m) { return m.id === mid; })[0];
    var pts = points.filter(function (p) { return p.module === mid; });
    var s = progressSummary(studentProgress, pts);
    var status = moduleStatus(examStats ? examStats[mid] : null);
    var gaps = pts.filter(function (p) {
      var m = studentProgress[p.id] || 'not_covered';
      return m === 'not_understood' || m === 'partial' || m === 'not_covered';
    }).map(function (p) { return { id: p.id, title: p.title, mastery: studentProgress[p.id] || 'not_covered' }; });
    var readiness;
    if (status === 'passed' && s.masteredPct >= 70) readiness = 'ready';
    else if (s.covered === 0) readiness = 'not_started';
    else readiness = 'in_progress';
    return {
      module: mid, name: mod ? mod.name : 'Module ' + mid, testStatus: status,
      masteredPct: s.masteredPct, coveredPct: s.coveredPct, readiness: readiness, gaps: gaps,
    };
  });
  var daysLeft = null;
  if (sac.date && todayISO) {
    daysLeft = Math.round((Date.parse(sac.date) - Date.parse(todayISO)) / 86400000);
  }
  var notReady = rows.filter(function (r) { return r.readiness !== 'ready'; });
  var plan = [];
  if (notReady.length) {
    notReady.forEach(function (r) {
      plan.push('Cover Module ' + r.module + ' (' + r.name + ') first: ' +
        (r.testStatus === 'passed' ? 'test passed but ' + r.gaps.length + ' points still weak' : 'Module Test ' + r.testStatus.replace('_', ' ')));
    });
    plan.push('Then a Practice SAC to rehearse the format');
  } else {
    plan.push('Underlying Modules are complete: set a Practice SAC now');
  }
  return { sac: sac, daysLeft: daysLeft, modules: rows, ready: notReady.length === 0, plan: plan };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OUTCOMES: OUTCOMES,
    MASTERY_ORDER: MASTERY_ORDER,
    MASTERY_LABEL: MASTERY_LABEL,
    PASS_PCT: PASS_PCT,
    LOW_PCT: LOW_PCT,
    ATTEMPT_SLOTS: ATTEMPT_SLOTS,
    NEXT_STEPS: NEXT_STEPS,
    BLANK_REASONS: BLANK_REASONS,
    normaliseOutcome: normaliseOutcome,
    parseQuickEntry: parseQuickEntry,
    band: band,
    scorePaper: scorePaper,
    analyseBlanks: analyseBlanks,
    masteryRank: masteryRank,
    proposeMasteryUpdates: proposeMasteryUpdates,
    progressSummary: progressSummary,
    moduleStatus: moduleStatus,
    nextAttemptSlot: nextAttemptSlot,
    minutesBetween: minutesBetween,
    diagnose: diagnose,
    suggestNextStep: suggestNextStep,
    planMarking: planMarking,
    sacReadiness: sacReadiness,
  };
}
