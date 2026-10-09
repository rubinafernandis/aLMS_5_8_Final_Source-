# Recommendations for Real-Learner Testing

The final round shows that the right information is on every screen, reachable by everyone, and that the system adapts correctly. Simulated personas cannot show how real people feel about it, whether they trust it, or whether it changes what they do over weeks. Use 5 to 8 real learners for the questions below, ideally in the first two weeks after launch.

## What the simulation could not answer

1. **Real payments.** Staging used stand-ins for Razorpay, Stripe and PayPal. Each gateway's real page, currency display, UPI app hand-off, and the return to the course must be tried once with live keys and a real (small) payment, then refunded.
2. **Trust in the forecast.** Do learners read "Early estimate, 27 to 65%" and "Too early" as honest, or as the system hiding something? Does a solid "Chance of passing 49%" motivate or discourage?
3. **Acting on "How to improve".** We verified the guidance is correct and reachable, not whether learners actually open the rubric and revise.
4. **Translation quality.** Real Hindi, Tamil and Bengali transcripts must be judged by native speakers, especially technical terms.
5. **Screen-reader reality.** Automated checks pass and the keyboard path works; only a real NVDA, JAWS or VoiceOver user can judge announcement order and fatigue.
6. **Email delivery.** Password-reset emails were captured on staging. On the live site, check they arrive (and not in spam) from your Hostinger mailbox.
7. **Manager workload.** Does the "Needs support" list stay short enough to act on with 40 real learners?

## Recruit

| # | Profile | Mirrors |
|---|---|---|
| 2 | Working professionals with under 30 minutes a day | Dana |
| 1 | Career changer, no technical background | Marcus |
| 2 | Non-native English speakers (one Hindi, one Tamil or Bengali reader) | Priya |
| 1 | Blind or low-vision screen-reader user | James |
| 1 | Team lead or L&D manager responsible for 10 or more learners | Elena |
| 1 | First online course in years, paying with UPI | Sam, new buyer |

## Session plan (45 minutes each, moderated, think-aloud)

1. **Buy a course (new participants).** "Create an account and enroll in a course, paying the way you normally would." Observe the method they choose and any hesitation at the payment page. Use a real low-priced course, or a 100% discount, and refund afterwards.
2. **Five-second test.** Hide the dashboard after 5 seconds. "What should you do next? How are you doing?"
3. **Explain the numbers.** "What do Comprehension and Mastery mean? What does 'Too early' mean?"
4. **Act on a weakness.** Seed weak applied work. "Improve your grade as quickly as you can."
5. **Fit it into time.** "You have 20 minutes before a meeting. Do what makes sense."
6. **Transcript (non-native speakers).** Rate the translated transcript from 1 to 5 and mark mistranslated terms.
7. **Keyboard and screen reader.** "Find out whether you are ready for the final, then open it." Time it.
8. **Manager task.** "Name the three people who need you most this week, and what you would say to each."
9. **Exit.** Confidence 1 to 5; "Would you continue?"; "Would you recommend buying here?"

## Measures

- Task success rate and time for tasks 1, 4, 5, 7 and 8
- Payment completion rate and drop-off point per gateway
- Share who describe the early estimate as "not decided yet" rather than "I am failing"
- Revision uptake after two weeks
- Translation accuracy per language
- System Usability Scale (SUS)

## Reproducing the simulated sessions

The staging harness ships with the code: `tests/staging/start-staging.sh` starts a seeded site on http://127.0.0.1:4697 with stand-in AI, video and payment services. It re-seeds on every start, so state-changing tests are safe.
