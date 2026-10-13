# ShiftMate: 3-minute pitch and 2-minute Q&A

**One line:** *Mark once. Reply once. Teach more.* ShiftMate is a co-pilot for the Learning Support Tutor's 14:00-19:00 shift. Rules keep the records, AI drafts the words, and the tutor makes every call.

**Target:** 2:50 spoken, so a stumble still finishes on time.

---

## Cue card (keep this beside the laptop)

| Time | Screen | Click | Say (key words) |
|---|---|---|---|
| 0:00 | **Overview** | (none) | 300-minute shift · step 8 typed **three times** · W vs C never used |
| 0:30 | Overview | **Start the shift at 14:15** | Briefing reads Exhibits 2-3 · Justin's leave still sitting in WeChat |
| 0:40 | Inbox | **Open message** (Justin) → **Approve** | Chinese in, Chinese out · mark leave + tell Ms Wang |
| 1:00 | Inbox | **Norton Cheng** | half Chinese, half English · books Q&A · records SAC · **asks me to confirm 下周四** |
| 1:15 | Mark once | **Mark once** → **Fill demo marks** | Exhibit 1 paper · **W = gap, mastery down · C = slip, mastery kept** |
| 1:40 | Mark once | **Didn't know how to start** | blank mid-paper → it **asks**, doesn't guess · suggests Retest, my call |
| 1:55 | Mark once | **Apply to all three sheets** | Ex 1, 2, 3 + exam log in one click · parent note in Chinese |
| 2:10 | Daily report | **Daily report** | counts itself · manager signs |
| 2:20 | Impact | **Impact and safety** | **75 min a shift, 25%** · 2¢ a reply · $0 offline |
| 2:35 | Impact | (scroll to Who decides) | same sheets, Sheets add-on, copy-paste WeChat · names masked · tutor decides |
| 2:50 | | | **Mark once. Reply once. Teach more.** |

---

## Before you go on

1. Open the app on your laptop: double-click **`dist/shiftmate.html`** (no install, no internet). Backup: the hosted link on your phone, or `npm start` → http://localhost:3000.
2. Click **Reset demo** (top right) → **Reset demo** in the dialog. You land on the Overview.
3. Browser full screen (F11 on Windows, Ctrl+Cmd+F on Mac), zoom 100%. If the projector is 1280×720 or smaller, zoom to 90%.
4. Close other tabs and turn off notifications.
5. Rehearse twice with a timer. If you're over 3:00, cut the Daily report (saves 10 s).

---

## The script

### 0:00-0:30 · The problem (Problem selection & insight)

*Screen: Overview, scroll to "The bottleneck: step 8".*

> It's 14:15. Our tutor has a 300-minute shift. Before tutoring starts at 16:00 she has seven students to review, nine WeChat messages to answer (four of them in Chinese) and four tests to mark.
>
> The bottleneck is **step 8**. Every marked test is typed **three times**: into the Marking Sheet, cell by cell into the Progress Sheet, then the Exam Statistics. And the most useful signal on the paper, **W versus C**, a real gap versus a careless slip, never gets used.
>
> ShiftMate fixes that. **Rules keep the records, AI drafts the words, and the tutor makes every call.**

### 0:30-1:15 · Briefing and WeChat (Prototype quality, the Mandarin messy case)

Click **Start the shift at 14:15**.
> At 14:15 the briefing has already read every student's records, and flagged that Justin's leave is still sitting in WeChat.

Click **Open message** on Justin's alert.
> His mum wrote in Chinese. The reply is drafted in Chinese from the timetable, and it proposes marking him on leave and telling Ms Wang. I approve, and it's copied for WeChat.

Click **Approve, apply and copy reply**, then **Norton Cheng**.
> Norton writes half in Chinese, half in English. It books his Q&A and records his SAC, and because "下周四" could be misread, it asks me to confirm the date. Fees go to the front desk, and grades are only ever quoted from the records.

### 1:15-2:10 · Mark once (Creativity, Problem selection)

Click **Mark once**. Phoenix's Module Test 8A is already selected.
> This is the exact paper from Exhibit 1. I enter the marks once.

Click **Fill demo marks**. Point at the coloured chips.
> Question 2 is a **W**: a knowledge gap, so 8.2 drops a level. Question 7 is a **C**: a careless slip, so mastery is **kept**. Question 8 is blank in the middle of the paper, so instead of guessing, it asks me why.

Click **Didn't know how to start**.
> It suggests targeted practice, then a Retest, with its reasons. That decision stays mine.

Click **Apply to all three sheets**.
> One click: Exhibits 1, 2 and 3 and the exam log, plus a result note for his mum in Chinese.

### 2:10-2:20 · Daily report

Click **Daily report**.
> At 18:20 the report counts itself (papers marked, parent replies, Q&A) and lists what needs follow-up. The manager signs here.

### 2:20-2:50 · Impact, feasibility, responsible AI

Click **Impact and safety**.
> Our estimate is **75 minutes a shift**, a quarter of it, back to on-site Q&A. That's about six hours a week, and every assumption is editable here. AI drafting costs about **2 cents a reply**, and offline it's free.
>
> It fits what the centre already uses: the same three sheets, a Google Sheets add-on that's already in our repo, and copy-paste into Work WeChat. A tutor could pilot it next week. Most students are minors, so grades never touch an AI model, names are masked before any AI call, and every message and decision is the tutor's. If the AI is down, the offline engine takes over, which is what you've just seen.

### 2:50 · Close

> **Mark once. Reply once. Teach more.** Thank you.

---

## If something goes wrong

| Problem | Do this |
|---|---|
| Laptop or projector fails | Open the hosted link on another device or your phone. Same demo. |
| A screen looks wrong or stale | **Reset demo** and jump straight to the step you're on (left menu). |
| You click the wrong message or paper | Use the left menu or the paper cards. Every step works in any order. |
| Running long | Skip the Daily report. Go from Mark once straight to Impact. |
| A judge asks to see the code | Repo → `lib/core.js` (the marking rules), `lib/triage.js` (WeChat), `apps-script/` (Sheets add-on). |

---

## Q&A prep (2:00)

Answer in one or two sentences, then stop.

| Likely question | Answer |
|---|---|
| **Where's the AI?** | AI drafts the WeChat replies: language is the one job where a model genuinely helps. It is built on the Claude API with name masking, and unit-tested. Tonight we run the offline engine on purpose so the demo can't fail. The records use rules, because a grade must be exactly right. |
| **What if the AI gets it wrong?** | The tutor approves every message. A fact check flags any percentage that isn't in the records. If AI and rules disagree, it says so. One click re-categorises. And the audit trail shows how often the tutor changed a suggestion, which is our quality measure. |
| **Why not let AI mark the papers?** | Marking handwritten maths is the tutor's judgement, and the brief asks for partial automation. We automate everything after the marking: the triple entry and the analysis. Reading ticks from a photo of the marked paper is the next step. |
| **How does it connect to their spreadsheets?** | Same layout as Exhibits 1-3. Today: CSV export per exhibit. Pilot week 2: the Google Sheets add-on in our repo, using the same rules file, so data never leaves their Google Workspace. |
| **Work WeChat?** | Copy-paste for the pilot: no integration risk, and the tutor stays the sender. Work WeChat has an open API we'd look at after the pilot. |
| **Where does 75 minutes come from?** | Task-by-task estimates, shown and editable on the Impact screen. Marking time itself isn't counted. Week 1 of the pilot replaces the estimates with stopwatch numbers. |
| **Privacy for minors?** | Grades, mastery and stats are rules-only and never sent to a model. Only the message and the few facts a reply needs go out, with names masked, and each draft shows exactly what was sent. No chatbot talks to students. |
| **Cost?** | About 2 cents per AI-drafted reply, so under $10 a month at 12 messages a shift. Offline mode is $0. It runs on the front-desk PC or inside Google Workspace. |
| **What's new here?** | It uses marks the centre already records. W vs C separates gaps from careless slips, and where a blank sits (end of paper or middle) separates time trouble from not knowing. Drafts can only quote the records. And the daily report is a by-product of the work. |
| **What does the tutor still do?** | Marks the papers, decides blanks, passes Demos, books Retests, approves every message, and gets more time to teach. |
| **Does it handle Chinese?** | Yes, offline too. It recognises Chinese and mixed messages (请假, 网课, 下周四, 预约) and replies in Chinese. Dates read from Chinese are always confirmed. |
| **What if a centre's sheets look different?** | The rules only need question → syllabus point → outcome. Mapping columns is a one-off setup in the add-on. |

---

## Rubric map

| Criterion (weight) | Where we show it |
|---|---|
| Problem selection & insight (15) | Overview: step 8 triple entry, Today vs With ShiftMate; every screen labelled with its brief step numbers |
| Creativity (15) | W vs C mastery rule; blank position → time vs knowledge; drafts that can only quote records; report as a by-product |
| Feasibility (20) | Same three sheets, CSV export, Google Sheets add-on in the repo, copy-paste WeChat, $0 offline mode, 4-week pilot plan with risks and fallbacks |
| Prototype quality (20) | Live and end to end on data modelled on Exhibits 1-3; messy cases: blank answer, Chinese and mixed-language messages, ambiguous date, messy mark entry |
| Impact (15) | 75 min/shift (25%) on an editable calculator against the 300-minute shift; benefits to students and parents listed |
| Responsible AI (10) | Who-decides table, name masking, "what left the centre" panel, fact check, audit trail, offline fallback |
| Pitch (5) | This script at about 2:50 |
