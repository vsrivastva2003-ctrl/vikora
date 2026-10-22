# Vikora.com website starter

A responsive static marketing site for **Vikora** and the **FinSight AI** accounting software project.

## Included
- `index.html` — homepage, product features, workflow and software access CTA
- `tutorial.html` — getting-started tutorial
- `about.html` — About Vikora
- `contact.html` — contact form starter
- `privacy.html` and `terms.html` — clearly marked legal drafting placeholders
- `styles.css`, `script.js` — responsive design and lightweight interactions

## Preview locally
Open `index.html` in a browser. For local development, any static file server also works.

## Required before public launch
1. **Verify domain ownership and DNS** for `vikora.com`; this package does not register the domain.
2. Connect the site to a hosting provider and enable HTTPS.
3. Replace the support email placeholder in `script.js` with a monitored address or connect a secure server-side form provider.
4. Add the verified Windows installer URL only after release/signature/security checks. The current CTA requests software access rather than offering a fake download.
5. Choose a payment provider (for India, Razorpay is a common option) and integrate checkout on a server. Never put secret API keys in frontend code. Confirm prices, taxes, receipts, cancellations and refunds before accepting money.
6. Implement purchase verification and protected download delivery if downloads are paid.
7. Replace the privacy and terms templates with policies reviewed for the actual data practices, business entity and jurisdictions.
8. For real customer accounting data, deploy and test authentication, company-level data isolation, backups/restore, logging, rate limits, secrets management, HTTPS and incident recovery. The website alone does not make the FinSight AI application production-ready.

## Important
The dashboard figures on the homepage are illustrative demo data. Do not present them as real customers or live financial results. Legal pages are not ready-to-publish legal advice. No payment processor, email backend, customer database, or software binary is included in this starter.
