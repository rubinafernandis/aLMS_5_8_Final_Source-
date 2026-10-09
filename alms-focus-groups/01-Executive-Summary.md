# USAII aLMS Persona Focus Groups: Executive Summary

**Build tested:** USAII LMS 5.8.0, the final launch build. **Test:** the final round of the persona focus groups, run on a freshly seeded staging site with stand-in AI, video and payment services (no real money, no external sites). **Method:** the six personas and seven seeded accounts (A to G) from the focus-group brief, plus three launch journeys (Elena sets up payments; a brand-new buyer signs up and pays; a learner recovers a forgotten password), all run in a real Chromium browser, with an automated WCAG 2.2 AA accessibility scan (axe-core 4.10) of 16 screens. **Evidence:** 84 screenshots, referenced throughout.

## Verdict

**Is the aLMS adaptive? Yes.** All seven seeded accounts received guidance that matches their profile (7 of 7), and the identical-evidence control pair (A and F) received identical guidance. In the live adaptation test, Priya revised an activity, the instructor scored it, and Mastery rose from 58% to 63%, the forecast moved from 59 to 85% to 62 to 88%, and "What's Next" moved on to the next lesson. Evidence: `G1-priya-dashboard-00.jpg`, `LIVE-priya-05-dashboard-after-revision-scored.jpg`.

**Is it intuitive? Yes.** Every persona could say where they were, how they were doing and what to do next within 60 seconds. The launch journeys worked without help: a first-time buyer created an account, chose how to pay, completed PayPal and landed in the course on "Start here: Day 1". Evidence: `buyer-04-choose-how-to-pay.jpg`, `buyer-05-back-from-paypal-course-open.jpg`.

**Is it ready for launch? Yes.** The final round found no issues of any severity. Before taking real money, make one real purchase per gateway with live keys, and check one real YouTube lesson video, because staging uses stand-ins for external services.

## Results at a glance

| Check | Result |
|---|---|
| Seeded accounts matching their documented profile | 7 of 7 |
| Accounts receiving the expected guidance (A to E, G) | 6 of 6 |
| Consistency control (A and F identical) | Pass |
| Limited evidence shown honestly (D) | Pass |
| Live adaptation (A) | Pass |
| Launch journeys (payment setup, sign-up and pay, password recovery) | 3 of 3 pass |
| Page errors across all sessions | 0 |
| WCAG 2.2 AA violations (16 screens) | 0 |
| Automated tests (unit, adaptivity, API) | 86 of 86 pass |

## Findings in the final round

| Severity | Count |
|---|---|
| Serious | 0 |
| Medium | 0 |
| Minor | 0 |

## What works best (for internal use)

1. **Buying a course takes about a minute.** Sign up, pick UPI or cards (Razorpay), card or Apple Pay or Google Pay (Stripe), or PayPal, pay, and the course opens. Evidence: `buyer-02-create-account.jpg`, `buyer-04-choose-how-to-pay.jpg`.
2. **Payments are set up from a screen, not the server.** Elena pasted PayPal keys, pressed Test connection, and saw "Connected to PayPal (sandbox mode)". The secret never appeared again in the page. Evidence: `G3-elena-payment-settings.jpg`, `G3-elena-paypal-connected.jpg`.
3. **Guidance follows each learner's evidence.** Priya is sent to revise her applied work, Marcus to strengthen his weak topic, James straight to his final. Evidence: `G1-priya-followed-next-step.jpg`, `G2-marcus-dashboard-00.jpg`, `G2-james-dashboard-00.jpg`.
4. **Forecasts are honest.** With little evidence, Sam sees a range labelled "Early estimate" and "Too early" for the chance of passing, never a scary single number. Evidence: `G1-sam-d-dashboard-01.jpg`.
5. **Accessible to everyone.** James reaches "Start final assessment" with the skip link; every score is read as text; zero accessibility violations. Evidence: `G2-james-skip-link.jpg`.

## Quotes (simulated, for internal use)

- New buyer: "I made an account, picked how to pay, paid, and the course was just there."
- Elena: "I pasted the keys, pressed Test connection, and it said Connected. I never had to ask IT."
- Priya: "It tells me my applied work is the problem and opens that exact activity. And the transcript is in Tamil."
- Sam: "It says 'Too early' instead of scaring me with a number."
- James: "Skip to main content, then straight to the final. Every number is read to me."
