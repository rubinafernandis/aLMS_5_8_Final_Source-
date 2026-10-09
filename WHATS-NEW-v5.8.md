# What's new in 5.8

## Payments, ready for launch
- **Payment Settings screen** for instructors: turn on Razorpay (UPI, cards, netbanking, wallets), Stripe (international cards, Apple Pay, Google Pay) and **PayPal** (new). Paste keys, press **Test connection**, done. Secret keys are stored encrypted and never shown again; every change is audited. Environment variables still work and take priority.
- **Learners choose how to pay** when more than one gateway is on.
- **PayPal checkout:** the learner approves on PayPal; the server captures and checks the payment before the course opens. Signed PayPal webhooks are verified with PayPal.
- **Refunds close access:** a full refund in Razorpay, Stripe or PayPal closes the course automatically (progress kept), and the learner and instructor are notified.

## Accounts
- **Self sign-up** for learners on the sign-in page (`ALLOW_SIGNUP=false` turns it off), limited per connection against spam.
- **Forgot password?** emails a single-use link (30 minutes) through any SMTP mailbox, for example Hostinger email. The answer never reveals who has an account. Using the link ends other sessions.

## Hosting (Hostinger and others)
- **`server.js` entry file**, as Hostinger Node.js Web Apps (and cPanel, Plesk, PM2) require. `npm start` uses it.
- **Fixed: everyone could be locked out of sign-in behind a proxy.** Visitor addresses are now read safely from the host's proxy by default.
- **`DATA_DIR`** keeps the database outside the app folder, so redeploys never touch it.

## Accessibility
- Payment Settings fields have proper labels with linked help text; the show-password button is a full-size target. 0 WCAG 2.2 AA violations on 16 screens.

No data format change. Start 5.8 on the same data folder.
