# ShiftMate for Google Sheets (pilot add-on)

The same "mark once" rules as the web prototype, running inside the centre's own Google Sheet. No AI, no external service: data never leaves the spreadsheet.

## Install (about 10 minutes)

1. Open a **copy** of the centre's records spreadsheet (or a blank Google Sheet to try it).
2. **Extensions → Apps Script**.
3. Create three files and paste in the contents from this folder:
   - `Code.gs`
   - `Core.gs` (generated from `lib/core.js`; run `npm run build:gas` after changing the rules)
   - `Sidebar.html` (in Apps Script: **+ → HTML**, name it `Sidebar`)
4. Save, reload the spreadsheet, and a **ShiftMate** menu appears.
5. **ShiftMate → Set up demo tabs** creates sample tabs. Then **ShiftMate → Mark a test** opens the sidebar.

Google asks for permission the first time: the script only reads and writes this spreadsheet.

## Tabs it uses

| Tab | Exhibit | Layout |
|---|---|---|
| `Tests` | | TestID, Name, Kind (`module`/`vcaa`), Module, Time limit, Question, Point, Marks: one row per question |
| `Marking Sheet` | 1 | Date, Student, Test, Attempt, Question, Point, Outcome (DONE / W / C / \Blank\), Marks, Out of |
| `Progress` | 2 | Point, Module, Title, then one column per student: Mastered / Partial / Not understood / Not covered, coloured as in the exhibit |
| `Exam Stats` | 3 | Student, Class, then M1 A, M1 B, M1 C, M1 D, M2 A ... coloured by band (Pass 75%+, Mid 40-75%, Low under 40%); `*P` marks a tutor pass |
| `Exam Log` | Scenario C step 5 | Date, Student, Paper, Start, End 1st pass, End 2nd pass, Checks, Score % |

To use the centre's existing tabs instead, rename them to match, or change the names in `TABS` at the top of `Code.gs`.

## What the tutor sees

Pick the student and test, tap ✓ / W / C / — for each question, enter the times, and press **Preview changes**. The sidebar shows the score, every Progress cell that will change, the problems the paper shows, and a suggested next step. Blank answers must be explained first (ran out of time, didn't know, skipped). **Apply to all tabs** writes everything in one step, under a document lock so two tutors can't collide.

Tested in `test/apps-script.test.js` against an in-memory spreadsheet.
