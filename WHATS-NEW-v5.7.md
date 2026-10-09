# What's new in 5.7

## Paid courses now require payment
- **Fixed:** learners could press "Enroll for $X" and get straight into a paid course without paying.
  A paid course now opens only when the payment gateway confirms the payment to the server, when the
  course was free when the learner joined, or when an instructor gives access.
- **Real payment gateway:** Razorpay (UPI, cards, netbanking, wallets) or Stripe (international cards,
  Apple Pay, Google Pay). Every payment is checked with the gateway (signature, amount, status) before
  the course opens; the learner's browser can never mark a course as paid. Webhooks open the course
  even if the learner closes the tab right after paying. Authorized Razorpay payments are captured.
- The price shows in the currency you charge in (`PAYMENT_CURRENCY`, default USD).
- Each payment notifies the course's instructor and is recorded in the audit log.
- **Learners who already got into a paid course without paying** keep their progress, but the course
  stays locked until they pay (from Explore Courses) or you give access. On **Learners & Access** they
  show as "Awaiting payment". They are left out of Cohort figures until then.
- Without gateway keys, paid courses cannot be bought (learners are asked to contact their instructor).

Setup: DEPLOY.md, "Taking payments".

## Video transcripts are the video's own words
- **Fixed:** the "transcript" showed the lesson text written under the video, not what the video says.
  It now comes only from the video's own captions: YouTube's captions, Vimeo's text track, or the
  caption file of an uploaded video. Nothing from the page.
- The learner's language comes from the captions themselves: a caption track already in that language,
  then YouTube's own caption translation, then a server-side translation of the captions (timings kept).
- Removed: the "Open in Google Translate" link and the "add an AI key" messages. If a language cannot be
  produced, the learner sees the video's original captions with a short note.
- Uploaded videos: the same captions are offered on the player's CC button, in the learner's language.
- The old lesson-text transcripts are removed automatically on upgrade. Captions an instructor added
  themselves are kept.

## Upgrading
Start 5.7 on the same folder. Data format 9: a 5.5 or 5.6 data file is upgraded in place (backup kept).
