# Focus Group Findings

Final round, build 5.8.0, six personas plus three launch journeys.

## Findings by severity

| Severity | Definition (from the brief) | Found in the final round |
|---|---|---|
| Serious | A learner is blocked, misled, or cannot access core information, or adaptive behavior fails | **0** |
| Medium | Works, but causes confusion, extra effort, or weak guidance | **0** |
| Minor | Polish, wording, or visual issues | **0** |

No finding IDs were raised in this round. Every check below passed, with screenshot evidence.

## What was verified

| ID | Check | Personas | Where | Result | Evidence |
|---|---|---|---|---|---|
| FG-V-01 | Every seeded account matches its documented profile | All | Dashboard, Progress | Pass, 7 of 7 | `acct-a-01-dashboard.jpg` to `acct-g-01-dashboard.jpg` |
| FG-V-02 | Guidance matches the evidence (A to E, G) | All | What's Next, How to improve | Pass, 6 of 6 | `G1-priya-dashboard-00.jpg`, `G2-marcus-dashboard-00.jpg` |
| FG-V-03 | Identical evidence gives identical guidance (A and F) | Priya | Dashboard | Pass | `ctrl-f-dashboard-00.jpg` |
| FG-V-04 | Limited evidence is shown as an estimate, never a single score | Sam | Header, How you are doing, Cohort | Pass | `G1-sam-d-dashboard-01.jpg` |
| FG-V-05 | Live adaptation: Mastery, forecast and What's Next update after new evidence | Priya, Elena | Apply step, Assessments, Dashboard | Pass (58% to 63%) | `LIVE-priya-05-dashboard-after-revision-scored.jpg` |
| FG-V-06 | New learners get one clear first step and no inactivity warnings | Sam (new) | Welcome tour, Dashboard | Pass | `G1-sam-g-03-after-onboarding.jpg` |
| FG-V-07 | Weak topic routed to targeted review, consistent with notifications | Marcus | Dashboard, Notifications | Pass | `G2-marcus-followed-next-step.jpg`, `marcus-03-notifications.jpg` |
| FG-V-08 | Time-pressed learner gets a step that fits their plan | Dana | Next-step card | Pass | `G1-dana-dashboard-00.jpg` |
| FG-V-09 | Keyboard-only path to the final; scores available as text | James | Every page | Pass | `G2-james-skip-link.jpg` |
| FG-V-10 | WCAG 2.2 AA on 16 screens, including sign-in, sign-up, Payment Settings, checkout | James (all) | 16 screens | Pass, 0 violations | Accessibility scan log |
| FG-V-11 | Instructor sees the right three at-risk learners, with actions | Elena | Cohort | Pass | `G3-elena-cohort.jpg` |
| FG-V-12 | Instructor sets up a payment gateway and tests it; secret never shown again | Elena | Payment Settings | Pass | `G3-elena-paypal-connected.jpg` |
| FG-V-13 | A new buyer signs up, chooses how to pay, pays, and the course opens | New buyer | Sign-in, Explore, checkout | Pass | `buyer-05-back-from-paypal-course-open.jpg` |
| FG-V-14 | Password recovery by email; the reply never reveals who has an account | Learner | Sign-in | Pass | `forgot-02-choose-new-password.jpg` |
| FG-V-15 | Paid course files are private (paid learner yes; unpaid, signed out, and signed-out-after-session no) | Elena | Uploaded files | Pass | `MEDIA-anonymous-refused.jpg` |
| FG-V-16 | Video transcript is only the video's captions, in the learner's language | Priya | Lesson video | Pass | `G1-priya-06-transcript-tamil.jpg` |
| FG-V-17 | No page errors in any session | All | All screens | Pass, 0 errors | Session logs |

## Automated tests on the same build

| Suite | Result | Covers |
|---|---|---|
| Unit and adaptivity | 46 of 46 pass | The guidance engine, forecasts, transcript parsing, payment signatures |
| API | 40 of 40 pass | Payments (Razorpay, Stripe signatures, PayPal purchase and refund, Razorpay refund), payment settings and secret handling, sign-up, password reset, private files, sign-in protection behind a proxy |

## Related Overview claims

Adaptive guidance from evidence (FG-V-02 to FG-V-08), honest forecasts (FG-V-04), intuitive first step (FG-V-06), accessibility for every learner (FG-V-09, FG-V-10), manager insight beyond completion rates (FG-V-11), and a self-paced learner able to enroll and pay without help (FG-V-13, FG-V-14).
