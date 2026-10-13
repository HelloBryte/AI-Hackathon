# ShiftMate: 3-minute pitch and 2-minute Q&A

**One line:** *Mark once. Reply once. Teach more.* Rules write the records. Optional AI reads messages and drafts replies from masked record facts. The tutor decides.

**Shape:** short, simple sentences. About 260 spoken words: roughly 2:45 at a slow, calm pace, including the clicks. Chinese-English version for rehearsal: [PITCH-zh.md](PITCH-zh.md). Stage tips: [DELIVERY.md](DELIVERY.md).

---

## Cue card (keep this beside the laptop)

| Time | Screen | Click | Key words |
|---|---|---|---|
| 0:00 | **Overview** | (none) | Hi, I'm Ethan · maths centre · five hours · 9 messages, 4 tests · **step 8: three spreadsheets** · W and C get lost · **the tutor decides** |
| 0:40 | Mark once | left menu **Mark once** → **Fill demo marks** | Exhibit 1 test · **W goes down · C stays** · blank → asks me |
| 1:10 | Mark once | **Didn't know how to start** → **Apply to all three sheets** | I decide · three sheets · note in Chinese |
| 1:30 | WeChat inbox | left menu **WeChat inbox** → **Norton Cheng** → **Approve, apply and copy reply** | Chinese + English · Q&A · **下周四 is a guess, unticked** · I approve |
| 2:00 | Daily report | left menu **Daily report** | counts my work by itself |
| 2:10 | Impact | left menu **Impact and safety** | **about 65 minutes, an estimate** · same sheets · AI optional, names hidden · offline |
| 2:40 | | | **Mark once. Reply once. Teach more.** |

---

## Before you go on

1. Open `shiftmate.html` (double-click). Laptop in **light mode**, browser full screen, zoom 100%.
2. Click **Reset demo** → **Reset demo**. You are on the Overview, at the top.
3. Close other tabs, turn off notifications. Every click in the script is in the **left menu** or on screen, so you never need to scroll to find it.

---

## The script

### 0:00-0:40 · The problem (Overview)

> Hi, I'm Ethan. Our case is the Learning Support Tutor at a maths tutoring centre in Melbourne.
>
> Our tutor works five hours a day, from two to seven. Before tutoring starts at four, she has nine WeChat messages, in English and Chinese, and four marked tests to record.
>
> The slowest step is step 8. Every marked test is typed into three spreadsheets. When she retypes, the difference between W and C gets lost: a real gap, or a careless slip.
>
> So we built ShiftMate. Rules write the records. AI reads messages and drafts replies. The tutor decides.
>
> Let me be the tutor.

### 0:40-1:30 · Scene 1: one test (Mark once)

Click **Mark once** in the left menu. Click **Fill demo marks**.
> This is the Exhibit 1 test. I enter the marks once.

Point at the red **W** chip, then the yellow **C** chip, then "Why was it left blank?".
> Question 2 is W, so that topic goes down. Question 7 is C, a careless slip, so it stays. Question 8 is blank, so it asks me why.

Click **Didn't know how to start**.
> It suggests a next step. I decide.

Click **Apply to all three sheets**.
> One click updates all three sheets, and writes a note for his mum, in Chinese.

### 1:30-2:00 · Scene 2: one message (WeChat inbox)

Click **WeChat inbox** in the left menu, then **Norton Cheng**. Point at the yellow line about 下周四.
> Norton mixes Chinese and English. It suggests a Q&A booking. "下周四" is only a guess, so the date stays unticked, and the reply asks him to check.

Click **Approve, apply and copy reply**.
> I approve, and paste it into WeChat.

### 2:00-2:10 · The report

Click **Daily report**.
> The daily report counts my work by itself.

### 2:10-2:40 · Impact

Click **Impact and safety**. Point at "~65 min".
> We estimate it saves about 65 minutes per shift. You can change every number here.
>
> It uses the same three sheets, and copy and paste into WeChat. AI is optional, and student names are hidden. Tonight it runs offline, so it does not need Wi-Fi.

### 2:40 · Close

> Mark once. Reply once. Teach more. Thank you.

---

## If something goes wrong

| Problem | Do this |
|---|---|
| A screen looks wrong | **Reset demo**, then jump to your step with the left menu. |
| The reset dialog appears again | Press Esc. |
| Laptop or projector fails | Open https://hellobryte.github.io/AI-Hackathon/dist/shiftmate.html on another laptop or a tablet in landscape. |
| Running long | Skip the Daily report. |

---

## Q&A prep (2:00)

Repeat the question. Answer in one or two sentences. Then stop.

| Likely question | Answer |
|---|---|
| **Where is the AI?** | AI reads WeChat messages and drafts replies. It is built on the Claude API and tested with a stand-in, not yet live. Tonight we run offline on purpose; the offline engine handles English and Chinese itself. |
| **What does the AI see?** | The message, plus a short fact sheet from that student's record: today's lesson, recent test results, progress and any SAC soon. Student, parent and school names are replaced first. |
| **What if the AI is wrong?** | The tutor approves every reply. A check flags any percentage that is not in the records. A keyword check stops approval when the reply still mentions an action the tutor unticked. Guessed dates start unticked. |
| **Why not let AI mark the papers?** | Marking handwritten maths is the tutor's judgement. We automate what comes after: typing it three times, and the analysis. |
| **Does it work with their spreadsheets?** | Exhibits 1 and 3 export in the same columns; Exhibit 2 exports one row per point. The Google Sheets add-on uses tabs modelled on the exhibits and checks the layout before writing. It has not run in a real Google Sheet yet. |
| **Work WeChat?** | Copy and paste for the pilot. "Approved" means the tutor approved and copied it; the tutor still sends it. |
| **Where does 65 minutes come from?** | Today's volumes times our estimate for each task, on the Impact screen. It includes admin and some lesson preparation. Week 1 of a pilot would time the real tasks. |
| **Cost?** | Offline is free. With AI on, about 2 US cents a reply, under 5 US dollars a month at 9 messages a shift. |
| **Privacy for minors?** | Rules write every record; no AI writes a grade. No chatbot talks to students. Names are replaced before any AI call. |
| **What's new?** | W and C already exist on the marking sheet. We carry them into the progress sheet: W is a gap, C is a slip. Where a blank sits tells time trouble from not knowing. |
| **What does the tutor still do?** | Marks papers, explains blanks, passes Demos, books Retests, and approves every message. |
| **What next?** | Run the add-on in the centre's real sheets, test AI drafts on real messages, and time each task. |

---

## Rubric map

| Criterion (weight) | Where we show it |
|---|---|
| Problem selection & insight (15) | Opening: step 8 typed three times, W and C lost; screens labelled with the brief's step numbers |
| Creativity (15) | W vs C carried into the Progress Sheet; blank position; the report as a by-product |
| Feasibility (20) | Same three sheets, CSV export, Sheets add-on, copy-paste WeChat, offline mode, pilot plan with risks (Impact screen) |
| Prototype quality (20) | Live demo on data modelled on Exhibits 1-3; messy cases: a blank answer, a mixed Chinese-English message, a guessed date |
| Impact (15) | ~65 min a shift on an editable calculator (an estimate); benefits to students and parents |
| Responsible AI (10) | Tutor approves everything; guessed dates unticked; reply-vs-action check; names masked; offline fallback |
| Pitch (5) | This script, about 2:45 |
