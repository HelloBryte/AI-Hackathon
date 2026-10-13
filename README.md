# ShiftMate

**Mark once. Reply once. Teach more.**

ShiftMate is a working prototype for the AIPS Hackathon case *Automating the Learning Support Tutor's Workday*. It is a co-pilot for the tutor's 14:00-19:00 shift: rules keep the three record sheets, Claude only drafts the wording of WeChat replies, and the tutor makes every judgement call.

**Case materials** (in [`docs/case/`](docs/case/)): the [case brief (PDF)](docs/case/AI_Hackathon_Brief_-_Learning_Support_Tutor_Daily_Log_EN.pdf), the [judging rubric (PDF)](docs/case/AIPS_Hackathon_Judging_Rubric.pdf), and the [event schedule](docs/case/event-schedule.jpg). [`docs/case/README.md`](docs/case/README.md) summarises all three, including the rubric table. The pitch script is in [`docs/PITCH.md`](docs/PITCH.md).

![Overview: Mark once. Reply once. Teach more.](docs/screenshots/overview.png)

| Mark once (step 8) | WeChat inbox (steps 6-7) |
|---|---|
| ![One marking entry previews all three sheets, separating W from C](docs/screenshots/mark-once.png) | ![A mixed Chinese-English message turned into a Q&A booking and a SAC date to confirm](docs/screenshots/wechat-inbox.png) |
| **Student records (Exhibits 1-3)** | **Daily report (phase 5)** |
| ![Progress heat-map and exam statistics in the exhibits' layout](docs/screenshots/records.png) | ![Report counted from the day's work, with priority follow-ups](docs/screenshots/daily-report.png) |

| Shift phase | Brief steps | What ShiftMate does |
|---|---|---|
| 14:15 Briefing | 2-5 | Timetable, attendance changes still sitting in WeChat, and a prep card per student built from Exhibits 2-3 (incomplete tests, SAC readiness, recent W and C mistakes, unresolved questions) |
| 14:30 WeChat inbox | 6-7 | Classifies each message (English, Chinese or mixed), pulls the facts from the records, drafts a reply in the sender's language, and proposes actions (mark leave, tell the teacher, book Q&A, record a SAC, hand over fees). The tutor approves. |
| 15:00 Mark once | 8 | One entry per question writes the **Marking Sheet (Ex. 1)**, re-colours the **Progress Sheet (Ex. 2)**, fills the **Exam Statistics (Ex. 3)** and the student's exam log. A W is a knowledge gap; a C is not. Blanks get the tutor's call. |
| 16:00 On site | 9 (A, B, C) | Demo checklist (tutor decides), SAC readiness against the progress sheet, exam review from the W / C / time analysis, Q&A log |
| 18:20 Daily report | Phase 5 | Every figure the manager asks for, counted from the day's work, plus a priority follow-up list and sign-off |
| Impact and safety | (rubric) | Editable time-saved calculator, cost, "who decides" table, privacy, failure modes, audit trail |

## Run it

### Option A: no install (for the pitch)

Double-click **`dist/shiftmate.html`**. The whole prototype runs in the browser, offline, with the demo data saved in that browser. **Reset demo** (top right) starts the shift again.

### Option B: Node server (full version, optional Claude)

Needs Node 18+.

```bash
npm install
npm start                 # http://localhost:3000
```

To have Claude draft the WeChat replies (names are masked before sending):

```bash
# macOS / Linux
ANTHROPIC_API_KEY=sk-ant-... npm start
# Windows PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-..."; npm start
```

| Setting | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | unset | Turns on Claude drafts. Without it the offline rules engine drafts everything. |
| `SHIFTMATE_MODEL` | `claude-opus-5-5` | Model used for drafts |
| `SHIFTMATE_AI` | `auto` | `off` forces rules only |
| `PORT` / `HOST` | `3000` / `127.0.0.1` | Server address |

If the API is down or a request is declined, the draft falls back to the rules engine and the screen says so.

### Other commands

```bash
npm test                  # unit and API tests (node:test)
npm run build:static      # rebuild dist/shiftmate.html
npm run build:gas         # copy the shared rules into the Google Sheets add-on
```

## Design choices

- **Rules for records, AI for words.** Grades, mastery colours, attempt slots and the daily counts come from `lib/core.js`, a plain rules file with no AI. A number written to a sheet must be right and auditable.
- **Use what the centre already records.** W vs C separates knowledge gaps from careless slips. *Where* a blank sits (after the last answered question, or in the middle) separates time trouble from not knowing. The suggestion is shown; the tutor decides.
- **Drafts are built on record facts.** Facts are built in code (`lib/triage.js`) and handed to Claude. A simple check flags any percentage in a draft that is not in the records; the rest of the wording is checked by the tutor, and approval stops if a reply promises an action the tutor unticked.
- **Privacy for minors.** Rules calculate and write records; optional AI interprets messages and drafts replies using masked record facts; the tutor reviews every proposal. When AI drafting is on, the message and the few record facts a reply may need (for example a test score) are sent with student, parent and school names replaced by placeholders (`lib/ai.js`), and each draft shows exactly what was sent. No chatbot talks to students.
- **Fits current tools.** Same three sheets (CSV export per exhibit; Apps Script add-on in `apps-script/`), copy-paste into Work WeChat, and $0 offline mode.

## Project layout

```
lib/core.js       marking, mastery, diagnosis, SAC readiness (shared with Apps Script)
lib/triage.js     WeChat triage rules (EN/中文), facts, actions, reply templates
lib/ai.js         Claude drafting with name masking and rules fallback
lib/views.js      briefing, student records, Exhibit 3 table, daily report
lib/actions.js    state changes after the tutor confirms
lib/api.js        JSON API shared by server.js and the single-file build
lib/seed.js       demo data modelled on Exhibits 1-3
public/           the web app (no framework)
static/           entry point for dist/shiftmate.html
apps-script/      Google Sheets add-on for the pilot
docs/PITCH.md     3-minute script, demo click path and Q&A prep
docs/SUBMISSION.md  submission email template
docs/case/        case brief, judging rubric and event schedule
docs/screenshots/ the screenshots in this README
```

## Known limits

- **Not yet run live:** Claude drafting (tested with a stand-in API client) and the Google Sheets add-on (tested against an in-memory spreadsheet). Both are the first checks of a pilot.
- **Time saved is an estimate:** ~65 minutes a shift from the demo day's volumes and our per-task estimates, editable on the Impact screen.
- **Demo data resets each day:** the prototype reseeds when the date changes. In a pilot the centre's Google Sheets are the system of record.
- **WeChat is copy-paste:** "Approved" means the tutor approved and copied the reply; the tutor still sends it from Work WeChat.

All student records in the demo are invented; names follow the brief's sample sheets.
