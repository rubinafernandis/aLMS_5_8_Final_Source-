# What's new in 5.7.1

Fixes from the seeded persona focus groups (full reports in `alms-focus-groups/`).

## Learners see the adaptive guidance
- **How to improve** on My Dashboard: up to three actions from your own scores, each with "Why it matters". It never repeats your next step.
- **What's Next follows the evidence:** a revision your instructor asked for comes first, then a topic below 60%, then one revision of weak applied work, then the lesson you started (named in the reason: "Then continue Day 7"). Only one revision is ever routed; after that you carry on.
- A revision waiting for review is no longer recommended again.
- When a lesson is longer than your daily plan, the next step says you can do one part today and your place is saved.

## Honest forecasts
- An early estimate shows only its range ("~ 27 to 65%, Early estimate"), in neutral color, in the header, on the dashboard and on the instructor's Cohort. The chance of passing says "Too early" until the evidence is solid.
- The dashboard shows **Comprehension** and **Mastery** by name, and says so plainly when you know the ideas well but your applied work scores lower. The full Comprehension and Mastery panel is on My Progress.

## No false alarms for new learners
- A learner who has just joined is not told "you have not studied in 7 days" and is not flagged to the instructor. "Has not started studying (joined N days ago)" appears from day 3; weekly habit signals from day 7.

## Accessibility (WCAG 2.2 AA)
- "Skip to main content" as the first Tab stop.
- Text contrast fixed everywhere it failed: purple, blue and pink brand shades darkened slightly; scores printed as text use a darker shade of their color; upcoming lessons in Steps to Completion are no longer faded. axe-core: 0 violations on 11 learner and instructor screens.
- Progress rings are no longer announced as unnamed images.

## Uploaded files are private
- Lesson videos, rubrics, study plans and learners' attachments now need a sign-in. A file link shared outside the LMS shows "Sign in to open this file."
- Each file is checked for the person asking: learners open files of courses they have paid for, joined free, or been given, plus published cover images, the navigation video and their own uploads. Instructors open everything. A learner who has not paid cannot watch a paid course's video, even with the exact link.
- This uses an HttpOnly cookie scoped to `/uploads`, set when you sign in and cleared when you sign out, so videos, images and PDFs keep working exactly as before.

## Clearer wording
- Instructors now see **Projected grade** on Cohort, the same term learners see.
- In Steps to Completion, **You are here** marks the lesson you have open; your planned next lesson reads **Up next** when they differ (for example, while revising an earlier activity).

## For the team
- `tests/staging/`: a seeded staging site with the seven focus-group accounts and stand-in AI and payment services, so every session can be re-run.
- 8 new adaptivity tests and 4 new API tests lock in the behavior above.

No data format change. Start 5.7.1 on the same folder.
