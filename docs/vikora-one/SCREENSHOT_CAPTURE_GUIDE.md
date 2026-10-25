# Screenshot Capture and Annotation Guide

**Important:** This repository does not yet contain verified screenshots of the real Vikora-One UI. Do not create synthetic UI images and present them as real application screens.

## Capture real screens safely

1. Open the actual Vikora-One installation in a test/demo company where possible.
2. Capture only the screen needed to explain one workflow or issue.
3. Before sharing, redact customer names, addresses, phone numbers, email addresses, bank/account details, transaction values where confidential, employee information, passwords, OTPs, licence keys, connection strings, hostnames/IPs if sensitive, and any database credentials.
4. Preserve useful labels and buttons so the workflow remains understandable.
5. Save as PNG/JPG under a module-specific folder, using a descriptive filename such as `sales-invoice-review.png`.
6. Add a same-name Markdown file describing:
   - Vikora-One edition/version/build and screen context.
   - What the screenshot shows.
   - Exact menu path only if verified.
   - Step-by-step action and expected result.
   - Any configuration/permission prerequisites.
   - Redaction confirmation and reviewer/date.

## Suggested screenshot set

- Sales: customer/document selection, line items, totals review, saved invoice status.
- Purchase: supplier bill, source receipt/order matching, approval/status.
- Inventory: item/location selection, stock ledger, report filters, reconciliation.
- Accounts: transaction review, ledger view, report filters and totals.
- Installation: supported installer screens and prerequisite checks.
- Licence: non-secret activation/status screen (never capture licence secrets).
- Client/server: connection configuration with sensitive network values masked.
- Troubleshooting: actual error dialog plus version/context and verified resolution.

Only actual product captures should be labelled screenshots. Until supplied, use written checklists and clearly marked placeholders.
