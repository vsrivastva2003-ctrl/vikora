# Module Guide — Inventory, Stock, and Warehouse

**Status:** Generic diagnostic guide; verify actual reports and posting rules for the installed edition.

## Stock reconciliation

A useful diagnostic model is:

**Closing quantity = opening quantity + receipts + approved positive adjustments − issues/dispatches − approved negative adjustments.**

This is a reconciliation aid, not a claim about Vikora-One's exact costing or stock-ledger implementation.

## Procedure

1. Record item code/name, unit of measure, warehouse/location, date range, and report name.
2. Confirm the same company/branch and filters across reports.
3. Compare opening quantity and each source movement in chronological order.
4. Check unposted or cancelled documents, duplicates, backdated entries, wrong units, transfers between locations, and incorrect item selection.
5. Trace each mismatch to source documents.
6. Obtain approval and follow the documented adjustment/transfer procedure; do not make an unsupported adjustment just to force totals to agree.
7. Rerun the same report with identical filters and record the result.

## Common symptoms

- **Negative stock:** Check transaction chronology, backdated issues, missing receipts, and whether negative stock is permitted by the approved setup.
- **Warehouse totals differ:** Check location filters and whether transfers are represented on both sides.
- **Quantity differs but value matches (or vice versa):** Check units, conversion factors, valuation method, and the report's measurement basis with the authorised administrator.
- **Stock does not update:** Verify document type/status and the documented posting sequence.

## Required product verification

Insert the actual item master, stock ledger, transfer, adjustment, valuation and stock-report screens only after confirming the installed product version. Redact item/customer-sensitive data in screenshots.
