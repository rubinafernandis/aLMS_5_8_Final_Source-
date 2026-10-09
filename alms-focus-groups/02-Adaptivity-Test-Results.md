# Adaptivity Test Results

Run out of persona after the sessions, on a freshly seeded staging site, on the final launch build (5.8.0).

## Seed verification

All seven accounts matched their documented profiles before the sessions (no mismatches). Every account holds a verified payment for "AI Fluency for the Workplace"; activities are rubric-scored out of 20.

| Account | Seeded profile | Completion | Comprehension | Mastery | Forecast range | Evidence |
|---|---|---|---|---|---|---|
| A, Priya | Strong comprehension, weak mastery | 60% | 100 | 58 | 59 to 85% | solid |
| B, Dana | Capable but behind pace | 20% | 100 | 94 | 70 to 100% | early |
| C, Marcus | Weak on one objective (33%) | 60% | 89 | 87 | 74 to 100% | solid |
| D, Sam | One quiz, one unscored activity | 10% | not measured | building | 27 to 65% | early |
| E, James | All lessons done, near the final | 100% | 100 | 97 | 89 to 100% | solid |
| F, control | Identical evidence to A | 60% | 100 | 58 | 59 to 85% | solid |
| G, Sam (new) | Joined today, no history | 0% | not measured | building | none yet | none |

## Side-by-side

| Account | Expected (Overview) | What the learner is told | Rating |
|---|---|---|---|
| A | Routed to applied activities, not more reading | "Improve your applied work: My AI Capability Checklist. You understand the ideas (check 100%), but this activity scored 30% on its rubric." The button opens that activity's Apply step. | **Matches** |
| B | Momentum guidance, no repetition | "Next up: Day 3: Writing useful prompts" (no repetition of Days 1 and 2), with "Longer than your 20-minute plan? Do one part today. Your place is saved." and "Build your rhythm" in How to improve. | **Matches** |
| C | Targeted review on the weak objective | "Strengthen: Writing useful prompts. Your understanding of this topic is at 33%, and later lessons build on it... Then continue Day 7." | **Matches** |
| D | Honest statement that the forecast is not reliable yet | Header "~ 27 to 65%, Early estimate"; Comprehension and Mastery "Not yet"; Chance of passing "Too early: shown after more graded work". | **Matches** |
| E | Readiness confirmation and assessment preparation | "Take your final assessment. All lessons are complete. You need 75% to pass", forecast 89 to 100%. | **Matches** |
| F | Same as A | Identical to A in every element. | **Consistent** |
| G | Orientation and one obvious first step | Welcome tour (goal, time, study space), then "Start here: Day 1"; no inactivity warnings for a learner who joined today. | **Matches** |

**Score: 6 of 6 match, and the control is consistent.**

Screenshots, in account order: `G1-priya-dashboard-00.jpg`, `G1-dana-dashboard-00.jpg`, `G2-marcus-dashboard-00.jpg`, `G1-sam-d-dashboard-00.jpg`, `G2-james-dashboard-00.jpg`, `ctrl-f-dashboard-00.jpg`, `G1-sam-g-03-after-onboarding.jpg`.

## Consistency control (A vs. F)

Same next step, same recommendations, same forecast, same metrics. **Result: pass.**

## Limited evidence (D)

No single number appears anywhere for an early estimate: the header, the dashboard and the instructor's Cohort all show the range labelled "Early estimate", and the chance of passing reads "Too early". **Result: pass.** Screenshot: `G1-sam-d-dashboard-01.jpg`.

## Live adaptation (A)

Priya acted in the browser; Elena reviewed in her Assessments screen. The staging site is re-seeded before every round, so this was safe.

| Step | Mastery | Forecast | What's Next |
|---|---|---|---|
| Start | 58% | 59 to 85% (72) | Improve your applied work |
| Priya opens the activity, edits it, and resubmits | 58% (the old score stays until rescored) | unchanged | Continue: Day 7 (no second revision is forced) |
| Elena sees it marked "resubmitted", scores it 16/20 and approves | **63%** | **62 to 88% (75)** | Continue: Day 7 |

**Result: pass.** Screenshots: `LIVE-priya-01-editing.jpg`, `LIVE-priya-03-dashboard-after-resubmit.jpg`, `G3-elena-04-assessments.jpg`, `G3-elena-06-scoring-priya-revision.jpg`, `LIVE-priya-05-dashboard-after-revision-scored.jpg`.
