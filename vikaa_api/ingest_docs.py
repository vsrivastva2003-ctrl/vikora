"""
Build VIKAA's searchable knowledge base from approved Vikora-One documentation.

Usage:
  python -m pip install -r vikaa_api/requirements.txt
  python vikaa_api/ingest_docs.py --input docs/vikaa_source --output vikaa_api/knowledge_base.json

Supported: .md, .txt, .pdf. Put only approved, non-confidential product documentation
in the input folder. PDFs must contain selectable text; scanned PDFs/screenshots need
OCR or a human-written caption before they can be searched.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

SUPPORTED = {".md", ".txt", ".pdf"}
CHUNK_CHARS = 4200
OVERLAP_CHARS = 300


def read_document(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("PDF support requires pypdf; install requirements.txt") from exc
        reader = PdfReader(str(path))
        return "\n\n".join((page.extract_text() or "") for page in reader.pages)
    return path.read_text(encoding="utf-8", errors="replace")


def chunks(text: str) -> list[str]:
    text = text.replace("\r\n", "\n").strip()
    if not text:
        return []
    # Prefer section boundaries, then split oversized sections safely.
    sections = re.split(r"(?m)(?=^#{1,4}\s+)", text)
    result = []
    for section in sections:
        section = section.strip()
        while len(section) > CHUNK_CHARS:
            cut = section.rfind("\n", 0, CHUNK_CHARS)
            if cut < CHUNK_CHARS // 2:
                cut = CHUNK_CHARS
            result.append(section[:cut].strip())
            section = section[max(0, cut - OVERLAP_CHARS):].strip()
        if section:
            result.append(section)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="docs/vikaa_source")
    parser.add_argument("--output", default="vikaa_api/knowledge_base.json")
    args = parser.parse_args()
    source = Path(args.input)
    output = Path(args.output)
    if not source.exists():
        raise SystemExit(f"Input folder does not exist: {source}")
    documents = sorted(p for p in source.rglob("*") if p.is_file() and p.suffix.lower() in SUPPORTED)
    if not documents:
        raise SystemExit(f"No .md, .txt, or .pdf documents found in {source}")

    articles = []
    for path in documents:
        raw = read_document(path)
        for index, part in enumerate(chunks(raw), 1):
            digest = hashlib.sha256((str(path) + "\n" + str(index) + "\n" + part).encode("utf-8")).hexdigest()[:14]
            headings = re.findall(r"(?m)^#{1,4}\s+(.+)$", part)
            title = headings[0].strip() if headings else path.stem.replace("_", " ").replace("-", " ").title()
            relative = path.relative_to(source).as_posix()
            terms = re.findall(r"[a-zA-Z][a-zA-Z0-9-]{2,}", title + " " + part)
            keywords = list(dict.fromkeys(term.lower() for term in terms))[:80]
            articles.append({
                "id": "doc-" + digest,
                "title": title[:180],
                "keywords": keywords,
                "content": part,
                "source": relative,
                "source_type": path.suffix.lower().lstrip("."),
                "verified_product_documentation": True
            })

    output.parent.mkdir(parents=True, exist_ok=True)
    # Preserve the existing starter articles and replace only previously ingested document chunks.
    existing_articles = []
    if output.exists():
        try:
            existing = json.loads(output.read_text(encoding="utf-8"))
            existing_articles = [
                item for item in existing.get("articles", [])
                if not item.get("verified_product_documentation", False)
            ]
        except (OSError, json.JSONDecodeError):
            raise SystemExit(f"Existing knowledge base is invalid JSON: {output}; refusing to overwrite it.")

    payload = {
        "title": "Vikora-One support knowledge base",
        "version": 2,
        "notice": "Contains general starter guidance and ingested approved documentation. Check each article's source and verification status.",
        "articles": existing_articles + articles
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Ingested {len(documents)} documents into {len(articles)} searchable sections.")
    print(f"Knowledge base written to: {output}")
    print("Review the generated JSON and run tests before deploying it.")


if __name__ == "__main__":
    main()
