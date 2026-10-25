# Vikora-One Troubleshooting Guide and Error Catalog

**Status:** Initial diagnostic playbook. The entries below are symptom-based checklists, not claims of verified Vikora-One error codes or proven fixes.

## Report a problem safely

Record:
- Vikora-One edition/version, module/screen, and company/branch context (without confidential identifiers).
- Exact error message and error code, if present.
- Date/time and action immediately before the issue.
- Whether one user/client or all users are affected.
- Whether the issue is repeatable and safe steps already tried.
- Redacted screenshot, if useful.

Never include passwords, OTPs, secret licence keys, database credentials, bank details, or identifiable customer/employee information.

## Symptom: Login or access denied

1. Check whether one user or multiple users are affected.
2. Verify the correct username/company/branch without sharing credentials.
3. Ask an administrator to check account status, role, permissions, licence entitlement, and any documented access policy.
4. Preserve the exact error text and escalate if still blocked.
5. Do not bypass permissions or use another user's account.

## Symptom: Sales or purchase totals differ

1. Stop before posting a correction.
2. Check quantity, unit, rate, authorised discount, tax setup, freight/charges, rounding, and document status.
3. Compare against the source order/receipt/invoice.
4. Have the authorised accountant/admin confirm any accounting or tax adjustment.

## Symptom: Inventory balance is wrong

1. Capture item, location, date range, report and filters.
2. Compare opening balance and source movements chronologically.
3. Check duplicate, backdated, unposted, cancelled, wrong-unit, and wrong-location transactions.
4. Trace the cause and obtain approval before any adjustment.

## Symptom: Report is missing a transaction

1. Match company/branch, dates, currency, status/posting filters, and permissions.
2. Search the underlying transaction by reference/date.
3. Verify whether the document is saved, posted, cancelled, or reversed under the edition's documented rules.
4. Export only via approved controls and keep the file protected.

## Symptom: Client cannot connect to server

1. Check if one/all clients are affected.
2. Verify server is running and approved application services are healthy.
3. Confirm approved LAN/Wi-Fi/VPN.
4. Have IT check hostname/IP and name resolution.
5. Check only documented application service/port and firewall rules.
6. Do not disable security controls or expose database ports publicly.

## Actual error evidence register

No verified, version-specific Vikora-One error codes or proven fixes have been supplied yet. Add an entry only after product/support verification using this format:

- Error code and exact message:
- Vikora-One edition/version/build:
- Module and triggering action:
- Scope and reproducibility:
- Root cause confirmed by:
- Fix verified on:
- Regression test/result:
- Date and approver:
- Screenshot/manual reference with sensitive details redacted:

## Escalation

Contact **hello@vikora.com** or **+91 99117 18105** with redacted diagnostics. Do not label a suspected cause as a verified fix.
