# ShiftMate: 3-minute pitch and 2-minute Q&A

**One line:** *Mark once. Reply once. Teach more.* ShiftMate is a co-pilot for the Learning Support Tutor's 14:00-19:00 shift. Rules keep the records, Claude only drafts the words, and the tutor makes every call.

---

## Before you go on (2 minutes)

1. Open the app: `npm start`, then go to http://localhost:3000. If that fails, double-click `dist/shiftmate.html` (no install, no internet).
2. Click **Reset demo** (top right), so every message and paper is fresh.
3. Browser window about 1440 px wide, zoom 100-110%. Close other tabs.
4. Start on the **Briefing** screen.

---

## The script (3:00)

### 0:00-0:25 · The problem (Problem selection & insight)

> It's 14:15. Our tutor has a 300-minute shift. Before tutoring starts at 16:00 she has to review seven students, answer nine WeChat messages (four of them in Chinese) and mark four tests.
>
> The real bottleneck is **step 8**. Every marked test is typed **three times**: into the Marking Sheet, cell by cell into the Progress Sheet, then into the Exam Statistics. And the most useful signal on the paper, the difference between a **W** and a **C**, is never used.

### 0:25-0:40 · The idea

> ShiftMate follows the brief's five phases. **Rules do the record-keeping, Claude only drafts the wording, and the tutor makes every decision.**

*(Point at the left menu: 14:15 Briefing, 14:30 Inbox, 15:00 Mark once, 16:00 On site, 18:20 Report.)*

### 0:40-2:15 · Live demo (Prototype quality, Creativity)

**Briefing (10 s).** *On screen:* the red alert "Justin Dong: leave request in WeChat, not yet passed to Ms Wang".
> The briefing reads Exhibits 2 and 3 for every student and flags what's waiting, like Justin's leave sitting unread in WeChat.

**Inbox (35 s).** Click **Open message** on Justin's alert.
> His mum wrote in Chinese. The draft is in Chinese, built from the timetable. It proposes marking him on leave and telling Ms Wang. I tick, approve, and it's copied for WeChat.

Click **Approve, apply and copy reply**. Then click **Norton Cheng** (the mixed Chinese-English message).
> Norton writes half in Chinese, half in English. It books the Q&A and records his SAC, and because "下周四" is ambiguous, it asks me to confirm the date. Fees go to the front desk; grades are only ever quoted from the records.

**Mark once (45 s).** Click **Mark once** → Phoenix Hu, **Module Test 8A**.
> This is the exact paper from Exhibit 1. I enter the marks once.

Click **Fill demo marks**.
> Q2 is a **W**: a knowledge gap, so 8.2 goes from partial to *not understood*. Q7 is a **C**: a careless slip, so mastery is **kept**. That's the W-versus-C insight. Q8 is blank in the middle of the paper, so it asks me *why* instead of guessing.

Click **Didn't know how to start**. Scroll to the next step.
> It suggests targeted practice, then a Retest, with its reasons. Passing or retesting is my call.

Click **Apply to all three sheets**.
> One click: Exhibit 1, Exhibit 2, Exhibit 3 and the student's exam log, plus a result note for the parent in Chinese.

**Report (10 s).** Click **Daily report**.
> At 18:20 the report counts itself (papers marked, parent replies, Q&A) and lists the priority follow-ups. The manager signs here.

### 2:15-2:40 · Impact

Click **Impact and safety**.
> Conservatively, **75 minutes a shift**, a quarter of it, goes back to on-site Q&A. That's about **six hours a week**. Every assumption is editable on screen. Claude costs about **2 cents a message**, under $10 a month. Everything else is free.

### 2:40-2:55 · Feasibility and responsible AI

> It uses what the centre already has: the same three sheets (CSV export now, a Google Sheets add-on next) and copy-paste into Work WeChat, so a tutor can pilot it next week. Most students are minors, so names are masked before anything reaches Claude, grades never touch the model, every message and decision is the tutor's, and if the AI is down the rules take over.

### 2:55-3:00 · Close

> **Mark once. Reply once. Teach more.** Thank you.

---

## Q&A prep (2:00): short answers

| Likely question | Answer |
|---|---|
| **What if the AI gets it wrong?** | Four guards. The tutor approves every message. A fact check flags any percentage not in the records. If Claude and the rules disagree, the draft is flagged. One click re-categorises and the rules rebuild the draft. The audit page shows how often the tutor changed a suggestion, and that is our pilot quality metric. |
| **Why not let AI mark the papers?** | Marking handwritten maths is the tutor's judgement, and the brief says partial automation. We automate what happens *after* marking: the triple entry and the analysis. Reading ticks from a photo of the marked paper is the next step. |
| **How do the records connect to Google Sheets?** | Same layout as Exhibits 1-3. Today: CSV export for each exhibit. Pilot week 2: a small Apps Script add-on in their own spreadsheet, using the same rules file, so data never leaves their Google Workspace. |
| **Work WeChat?** | Deliberately copy-paste for the pilot: no integration risk and the tutor stays the sender. Work WeChat has an open API we would look at after the pilot. |
| **Where does 75 minutes come from?** | Task-by-task estimates for seven students, twelve messages and five papers, shown and editable on the Impact screen. Marking time itself isn't counted. Week 1 of the pilot replaces the estimates with stopwatch numbers. |
| **Privacy for minors?** | Grades, mastery and stats are rules-only and never sent to a model. Only the message and the few facts a reply needs are sent, with student, parent and school names masked. Each draft shows exactly what was sent. No chatbot talks to students. There's a switch for fully offline mode. |
| **Cost?** | About $0.02 per drafted message with Claude Opus 5.5, so under $10 a month at 12 messages a shift. Rules mode is $0. It runs on the front-desk PC or inside Google Workspace. |
| **What's new here?** | Using marks the centre already records: W vs C separates knowledge gaps from careless errors, and *where* a blank sits (end of paper vs middle) separates time trouble from not knowing. Drafts can only quote records. The daily report is a by-product of the work, not extra work. |
| **What does the tutor still do?** | Marks the papers, decides blanks, passes Demos, books Retests, approves every message, and gets more time to teach. |
| **Does it handle Chinese?** | Yes, in both modes. The rules recognise Chinese and mixed messages (请假, 网课, 下周四, 预约) and reply in Chinese. Claude adds nuance. Dates read from Chinese are always confirmed. |
| **What if the centre's sheets look different?** | The rules only need question → syllabus point → outcome. Mapping columns is a one-off setup in the add-on. |

---

## Rubric map (for us)

| Criterion (weight) | Where we show it |
|---|---|
| Problem selection & insight (15) | Opening: step 8 triple entry; steps 2-7 and phase 5 each named on screen with their step numbers |
| Creativity (15) | W vs C mastery rule; blank position → time vs knowledge; drafts that can only quote records; report as a by-product |
| Feasibility (20) | Same three sheets, CSV/Sheets add-on, copy-paste WeChat, $0 rules mode, 4-week pilot plan with risks and fallbacks (Impact screen) |
| Prototype quality (20) | Live, end-to-end, on data modelled on Exhibits 1-3; messy cases: blank answer, Chinese and mixed-language messages, ambiguous dates, quick-entry parsing of messy marks |
| Impact (15) | 75 min/shift (25%), editable calculator against the 300-minute shift; benefits to students and parents listed |
| Responsible AI (10) | "Who decides" table, name masking, "what left the centre" panel, fact check, audit trail, offline fallback |
| Pitch (5) | This script, about 2:55 |
