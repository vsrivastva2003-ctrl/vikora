# Vikora-One ERP — User Manual (Draft for Product Verification)

**Document status:** Draft support guide, not an authenticated vendor manual.  
**Product/version:** Confirm against the customer's installed Vikora-One edition and release.  
**Audience:** End users, supervisors, system administrators, and support staff.

## 1. Purpose and safe use

This guide provides a careful, edition-neutral workflow framework for working with ERP transactions. Exact menu names, screen layouts, automatic postings, tax calculations, and feature availability must be checked against the installed Vikora-One version and approved company procedures. Do not treat a generic workflow as proof that a particular button or feature exists.

Before making changes, confirm the correct company, branch, financial period, user role, and environment. Use a test company for training where available. Never share passwords, OTPs, secret licence keys, database credentials, or unredacted customer data in support requests.

## 2. Common workflow pattern

1. Sign in through the approved application shortcut and account.
2. Select the correct company/branch and period if the installation requires it.
3. Open the relevant module using the navigation available in your edition.
4. Search for an existing document before creating a new one.
5. Enter the source-document details and verify required fields.
6. Review totals, dates, references, and item/account selections.
7. Save or submit using the application's documented action.
8. Reopen or search for the saved record and verify its status.
9. Confirm downstream stock, ledger, or report effects only where those integrations are enabled and documented.

If the screen differs from this description, stop and consult the edition-specific guide rather than guessing.

## 3. Sales, billing, and invoicing

First identify the business document required: quotation, sales order, delivery record, invoice, credit note, or receipt. These documents serve different purposes and must not be substituted for one another without an approved process.

Before saving an invoice, check:
- Customer account and billing details.
- Company/branch, document date, and reference number.
- Item or service, quantity, unit of measure, rate, and authorised discount.
- Tax treatment according to the customer's approved configuration and accountant's advice.
- Payment terms, due date, currency, and supporting order/delivery documents.
- Duplicate invoice risk.

After saving, verify the document number, status, customer balance, and stock/account impact only according to the installed configuration. Do not assume that saving automatically posts to accounts or reduces inventory.

## 4. Purchase and supplier invoicing

Distinguish purchase requisition, purchase order, goods receipt, supplier invoice, debit note, and supplier payment. Confirm which documents are required by the customer's process.

Before recording a supplier bill, verify supplier identity, supplier invoice number/date, purchase reference, received quantity, item codes, units, rates, freight/other charges, tax treatment, and duplicate records. Compare the bill with approved purchase and receipt records. Confirm when inventory and accounts update in the installed version; do not assume the timing.

## 5. Inventory and warehouse

For item-level checks, identify the item code, unit, warehouse/location, date range, and report used. Reconcile opening stock plus receipts and approved positive adjustments, minus issues/dispatches and approved negative adjustments, to the expected closing quantity. Review unposted documents, duplicate movements, backdated entries, wrong units, wrong warehouses, and report filters.

Do not post stock adjustments solely to force a report to match. Trace the source documents and obtain required approval first. Confirm costing and valuation rules with the product documentation and finance owner.

## 6. Accounts and financial reports

Identify whether the event is a customer invoice, supplier bill, receipt, payment, expense, or journal adjustment. Prefer the approved source transaction workflow where available to avoid duplicate ledger entries.

Check account selection, transaction date, reference, debit/credit balance, company/branch, posting status, and supporting evidence. For report differences, compare the report and underlying transaction list using the same date range, company, currency, status, and access scope. Tax, payroll, statutory reporting, period close, and accounting-policy decisions require confirmation by the authorised accountant.

## 7. Users and permissions

When a module is missing or access is denied, establish whether one user or several users are affected. Ask an administrator to verify account status, role, module rights, company/branch scope, and licence entitlement. Never bypass permissions or use another person's credentials.

## 8. Installation, server/client, and licensing

Follow the official installation package and version-specific instructions. Before installing or upgrading, verify supported operating systems, database requirements, backup/restore procedures, licence terms, and the vendor's upgrade path. Do not run unverified scripts against production data.

For client connectivity, compare affected PCs, confirm approved LAN/Wi-Fi/VPN, and ask IT to check the configured server hostname/IP, documented application service/port, and firewall rules. Ping can be blocked even when the application service is available. Never disable firewalls or expose database ports publicly.

For licence activation, use the official entitlement and vendor process. Do not publish or send secret licence keys in chat.

## 9. Backup, restore, and data exchange

Use only the backup/export and restore procedures approved for the installed version. Verify backup completion, storage location, retention, access restrictions, and restoration testing. Treat exports as confidential. Test imports on a safe copy first; validate field mapping, date formats, duplicates, totals, and rejected rows before production use.

## 10. Troubleshooting and escalation

Capture the exact error text, date/time, module, action immediately before the error, version, scope (one/all users), and safe steps already tried. Redact personal, financial, credential, and licence information. Do not repeatedly retry transactions if duplicate posting is possible.

Escalate installation-specific questions to **hello@vikora.com** or **+91 99117 18105** with the above details.
