# VIKAA product-documentation ingestion

VIKAA currently has nine general starter articles. For accurate, edition-specific answers, add approved Vikora-One manuals and troubleshooting material here.

## Add source material

1. Create folders such as `docs/vikaa_source/sales`, `inventory`, `accounts`, `installation`, and `troubleshooting`.
2. Add approved, non-confidential `.pdf`, `.md`, or `.txt` documents. Use real manuals, verified module steps, release notes, known-error guides, and installation/networking instructions.
3. Do not commit customer records, live database exports, credentials, licence keys, personal data, or confidential customer screenshots.
4. For screenshots, add a Markdown or text file beside each image describing the exact visible screen, edition/version, purpose, field labels, and verified steps. Scanned PDFs and image files are not OCR-processed by this script.
5. Keep each source's edition/version and effective date in its content. Retire superseded instructions instead of leaving conflicting versions active.

## Build the knowledge base locally

From the repository root:

```powershell
python -m pip install -r vikaa_api/requirements.txt
python vikaa_api/ingest_docs.py --input docs/vikaa_source --output vikaa_api/knowledge_base.json
```

Review the generated JSON, test questions against the source documents, then commit the reviewed knowledge base to `main`. Render auto-deploys the API from that branch.

**Important:** the ingestion command builds the KB from files in the input folder; it replaces the existing JSON, including starter notes. Before using it for the first time, copy the current `vikaa_api/knowledge_base.json` to a safe backup and either include approved starter notes in the source folder or merge them intentionally. Do not deploy until the generated content has been reviewed.

## Quality checklist

- Exact menu labels and workflow steps match the relevant Vikora-One version.
- Each article identifies its source, module, version, and effective date where known.
- Screenshots have captions and sensitive information redacted.
- No conflicting or obsolete instructions remain.
- Test questions cover normal workflows, permissions, common errors, reporting, installation, and server/client setup.
