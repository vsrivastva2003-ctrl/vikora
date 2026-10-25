# Vikora-One test payments API

This is a TEST-MODE starter. It does not accept live payments. Do not switch to live Razorpay keys until end-to-end tests and legal/business setup are complete.

## Render settings
- Runtime: Python
- Build command: pip install -r backend/requirements.txt
- Start command: uvicorn main:app --app-dir backend --host 0.0.0.0 --port $PORT
- Health path: /health

## Required Render environment variables
- APP_ENV=test
- DATABASE_URL (Render PostgreSQL internal connection string)
- FRONTEND_URL=https://vikora-b4yt.onrender.com
- RAZORPAY_KEY_ID (test key only)
- RAZORPAY_KEY_SECRET (test key only)
- RAZORPAY_WEBHOOK_SECRET (secret configured for the Test Mode webhook)
- RESEND_API_KEY
- EMAIL_FROM (verified sender, e.g. Vikora-One <onboarding@resend.dev> during allowed testing)
- EMAIL_TO (the inbox that receives contact-form messages)
- RAZORPAY_MONTHLY_SINGLE_PLAN_ID and RAZORPAY_MONTHLY_MULTI_PLAN_ID (create in Razorpay Test Mode before monthly subscription work)

## API
- GET /health
- GET /api/config
- POST /api/checkout/order (lifetime only; INR amount is set server-side)
- POST /api/checkout/verify (checks signature and fetches captured status from Razorpay)
- POST /api/webhooks/razorpay (verifies webhook HMAC and handles payment.captured idempotently)
- POST /api/contact
- GET /api/licenses/status?email=...

## Important implementation notes
- Monthly recurring plans are deliberately not enabled yet. Create Razorpay Test Mode subscription plans, then implement subscription checkout and renewal/cancellation webhook handling before selling monthly plans.
- The current website checkout is not yet connected to these endpoints. Do not advertise payments or license delivery as live until the frontend is integrated and tested.
- License keys are emailed once and only their SHA-256 hash and final four characters are stored. Configure email before customer tests; if email fails, an operator-assisted recovery flow is needed before launch.
- Confirm pricing, taxes, invoice requirements, privacy policy, refund/cancellation terms, and support address before launch.
- Never commit real secrets to GitHub.
