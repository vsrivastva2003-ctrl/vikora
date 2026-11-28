# Vikora production payments and licence service

Separate production-only service. It does not modify the existing test service or ERP.

## Render service
- Runtime: Python
- Branch: `production/payments-licensing`
- Build: `pip install -r production_payments/requirements.txt`
- Start: `uvicorn main:app --app-dir production_payments --host 0.0.0.0 --port $PORT`
- Health check: `/health`
- Region: Singapore (same region as the Vikora website and support API)

## Required Render environment variables (set in Render, never commit secrets)
- `APP_ENV=production`
- `DATABASE_URL`: internal URL for a dedicated persistent Render PostgreSQL database
- `RAZORPAY_KEY_ID`: live key ID (must begin `rzp_live_`)
- `RAZORPAY_KEY_SECRET`: live API secret
- `RAZORPAY_WEBHOOK_SECRET`: webhook signing secret for this exact production endpoint
- `RESEND_API_KEY`: Resend API key
- `EMAIL_FROM`: verified sender, e.g. `Vikora <billing@vikora.in>` only after domain verification
- `LICENSE_ENCRYPTION_KEY`: Fernet key generated securely; used to encrypt recoverable licence keys at rest
- `FULFILLMENT_ADMIN_TOKEN`: long random token for operator-triggered email retry
- `SUPPORT_EMAIL=vikoraone@vikora.in`

The app refuses to start if any mandatory production setting is absent, if test-mode Razorpay keys are used, or if persistent PostgreSQL is not configured. Do not use SQLite for customer orders.

## Implemented API
- `GET /health`: checks database connectivity.
- `GET /api/config`: returns the public Razorpay live key ID.
- `POST /api/checkout/order`: server-priced lifetime single-user or multi-user order; stores billing/order data.
- `POST /api/checkout/verify`: validates checkout HMAC and independently fetches captured payment from Razorpay; checks amount, currency and order association.
- `POST /api/webhooks/razorpay`: validates raw-body HMAC and unique event ID; handles captured payments idempotently.
- `POST /api/fulfillment/retry`: protected operator retry for failed licence emails.

Licence keys are generated only after payment is verified. A SHA-256 hash is retained for activation checks; an encrypted copy is stored to allow safe email retry without generating a second key. Raw keys are never returned from the public verification endpoint. Webhook event IDs and payment IDs are unique in PostgreSQL.

## Intentionally not enabled
- Monthly rental / recurring subscription checkout: not yet implemented. Requires Razorpay subscription plan setup, authorization, renewal, cancellation, charge-failure and entitlement-expiry handling.
- PayPal / overseas payments.
- Customer-facing licence activation API and invoice/tax automation.
- Public checkout UI integration (a separate frontend task after production service and credentials are verified).

## Before accepting customers
Configure Razorpay Live credentials and webhook in the Razorpay Dashboard; configure Resend verified sender; complete privacy/refund/terms/GST review; test in a separate staging setup; then run an end-to-end low-value live verification before announcing launch. Never share secrets in chat or GitHub.
