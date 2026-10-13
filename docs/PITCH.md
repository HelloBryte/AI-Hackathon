# ShiftMate: 3-minute pitch and 2-minute Q&A

**One line:** *Mark once. Reply once. Teach more.* Rules calculate and write the records. Optional AI reads messages and drafts replies from masked record facts. The tutor reviews every proposal.

**Shape:** the problem, then two scenes (one marked paper, one mixed-language message), then the report, the estimated impact and the pilot. About 300 spoken words: roughly 2:50 at a calm pace with the clicks. A Chinese-English version for rehearsal is in [PITCH-zh.md](PITCH-zh.md); stage tips are in [DELIVERY.md](DELIVERY.md).

---

## Cue card (keep this beside the laptop)

| Time | Screen | Click | Key words |
|---|---|---|---|
| 0:00 | **Overview** | (none) | five-hour shift · step 8 typed **three times** · W vs C never used |
| 0:30 | Mark once | left menu **Mark once** → **Fill demo marks** | Exhibit 1 paper · **W: mastery down · C: mastery kept** |
| 1:00 | Mark once | **Didn't know how to start** | blank mid-paper → it **asks**, not guesses · Retest is my call |
| 1:15 | Mark once | **Apply to all three sheets** | three sheets + exam log in one click · note for mum in Chinese |
| 1:35 | WeChat inbox | left menu **WeChat inbox** → **Norton Cheng** | half Chinese, half English · Q&A proposed · **下周四 is a guess, so it stays unticked** |
| 2:05 | Daily report | left menu **Daily report** | counts itself from what I just did |
| 2:15 | Impact | left menu **Impact and safety** | **about 65 minutes a shift, an estimate** · same sheets · AI optional, names masked · offline tonight |
| 2:50 | | | **Mark once. Reply once. Teach more.** |

---

## Before you go on

1. Open `shiftmate.html` (double-click; no install, no internet). Backup: the hosted link on your phone.
2. Click **Reset demo** → **Reset demo** in the dialog. You land on the Overview, at the top.
3. Laptop in **light mode** (the app follows the system theme). Browser full screen, zoom 100%.
4. Close other tabs, turn off notifications. Scroll with the mouse wheel or trackpad only.
5. Everything in the script is reached from the **left menu**, so you never need to scroll to find a button.

---

## The script

### 0:00-0:30 · The problem (Overview)

> Our tutor works a five-hour shift. Before tutoring starts at four, she answers WeChat in English and Chinese, and records marked tests.
>
> The worst step is step 8. Every marked test is typed into three spreadsheets. And the best signal on the paper is never used: W versus C, a real gap versus a careless slip.
>
> ShiftMate fixes that. Rules write the records. AI only drafts messages. The tutor decides.

### 0:30-1:35 · Scene 1: one marked paper (Mark once)

Click **Mark once** in the left menu. Phoenix's Module Test 8A is already open.
> This is Phoenix's Module Test 8A, the same paper as Exhibit 1. I enter the marks once.

Click **Fill demo marks**. Point at the red W chip, then the yellow C chip.
> Question 2 is a W. That point drops a level. Question 7 is a C, a careless slip, so mastery is kept.

Point at "Why was it left blank?".
> Question 8 is blank in the middle of the paper. So it asks me why, instead of guessing.

Click **Didn't know how to start**. Point at "Suggested".
> It suggests practice, then a Retest. That decision is mine.

Click **Apply to all three sheets**.
> One click updates all three sheets and the exam log, and drafts a note for his mum, in Chinese.

### 1:35-2:05 · Scene 2: one mixed-language message (WeChat inbox)

Click **WeChat inbox** in the left menu, then **Norton Cheng**.
> Norton writes half in Chinese, half in English. ShiftMate proposes a Q&A booking. It read "下周四" as the 22nd, but that is a guess, so the box stays unticked and the reply asks him to confirm. Nothing is sent without me.

### 2:05-2:15 · The report

Click **Daily report**.
> At six-twenty, the daily report counts itself from the work I just did.

### 2:15-2:50 · Impact, feasibility and responsible AI

Click **Impact and safety**. Point at "~65 min".
> We estimate about 65 minutes back per shift, using today's volumes. Every number here can be changed.
>
> It works with the centre's own tools: the same three sheets, a Google Sheets add-on, and copy-paste into WeChat. AI is optional, and it only sees record facts with student names masked. Tonight it runs fully offline, so the demo cannot fail.

### 2:50 · Close

> Mark once. Reply once. Teach more. Thank you.

---

## If something goes wrong

| Problem | Do this |
|---|---|
| Laptop or projector fails | Open the hosted link on another device or your phone. Same demo. |
| A screen looks wrong | **Reset demo**, then go straight to the step you're on with the left menu. |
| The reset dialog appears again | Press Esc. |
| Running long | Skip the Daily report. Go from the inbox straight to Impact. |
| A judge asks for the code | `lib/core.js` (marking rules), `lib/triage.js` (WeChat), `apps-script/` (Sheets add-on). |

---

## Q&A prep (2:00)

Repeat the question, answer in one or two sentences, then stop.

| Likely question | Answer |
|---|---|
| **Where is the AI?** | The AI only drafts WeChat replies. It is built on the Claude API with name masking and tested with a stand-in, not yet live. Tonight we run offline on purpose, and the offline engine handles English and Chinese by itself. |
| **What does the AI see?** | The message and the few record facts a reply may need, like a test score, with student, parent and school names replaced first. Each draft shows exactly what was sent. |
| **What if the AI is wrong?** | The tutor approves every reply. A check flags any percentage that isn't in the records. Approval stops if a reply promises something the tutor unticked. Dates read from Chinese must be ticked by hand. |
| **Why not let AI mark the papers?** | Marking handwritten maths is the tutor's judgement. We automate what comes after: the triple entry and the analysis. |
| **Does it work with their spreadsheets?** | Same layout as Exhibits 1-3. CSV export works today. The Google Sheets add-on is in the repo; it checks the tab layout and writes nothing if it differs. It hasn't been run in a real Google Sheet yet. |
| **Work WeChat?** | Copy and paste for the pilot. "Approved" means the tutor approved and copied it. The tutor stays the sender. |
| **Where does 65 minutes come from?** | Today's volumes times our per-task estimates, on the Impact screen. It is an estimate. Week 1 of a pilot would time the real tasks. |
| **Cost?** | Offline mode is free. With AI on, about 2 US cents a reply, under 5 US dollars a month at 9 messages a shift. |
| **Privacy for minors?** | Rules write every record; no AI writes a grade. No chatbot talks to students. Names are masked before any AI call. |
| **What's new?** | It uses marks the centre already records. W versus C separates gaps from slips. Where a blank sits separates time trouble from not knowing. |
| **What does the tutor still do?** | Marks papers, explains blanks, passes Demos, books Retests, and approves every message. |
| **What would you build next?** | Run the add-on in the centre's real sheets, test live AI drafts on real messages, and time each task for the pilot. |

---

## Rubric map

| Criterion (weight) | Where we show it |
|---|---|
| Problem selection & insight (15) | Opening: step 8 typed three times; screens labelled with the brief's step numbers |
| Creativity (15) | W vs C rule; blank position; the report as a by-product |
| Feasibility (20) | Same three sheets, CSV export, Sheets add-on, copy-paste WeChat, offline mode, pilot plan with risks (Impact screen) |
| Prototype quality (20) | Live demo on data modelled on Exhibits 1-3; messy cases: a blank answer, a mixed Chinese-English message, a guessed date |
| Impact (15) | ~65 min a shift on an editable calculator (an estimate); benefits to students and parents |
| Responsible AI (10) | Tutor approves everything; guessed dates unticked; reply-vs-action check; names masked; offline fallback |
| Pitch (5) | This script, about 2:50 |
