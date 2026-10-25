import json
import os
import re
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI

app = FastAPI(title="VIKAA Support API", version="1.1.0")

KNOWLEDGE_PATH = Path(__file__).with_name("knowledge_base.json")
try:
    KNOWLEDGE_BASE = json.loads(KNOWLEDGE_PATH.read_text(encoding="utf-8"))
    KNOWLEDGE_ARTICLES = KNOWLEDGE_BASE.get("articles", [])
except (OSError, json.JSONDecodeError):
    KNOWLEDGE_BASE = {"title": "VIKAA support knowledge base", "version": 1}
    KNOWLEDGE_ARTICLES = []


def retrieve_knowledge(question: str, limit: int = 3) -> list[dict]:
    """Simple local retrieval over approved JSON support notes; no customer data is stored."""
    normalized = re.sub(r"[^a-z0-9\s-]", " ", question.lower())
    terms = {term for term in normalized.split() if len(term) > 2}
    ranked = []
    for article in KNOWLEDGE_ARTICLES:
        title = article.get("title", "").lower()
        keywords = [str(value).lower() for value in article.get("keywords", [])]
        body_terms = set(re.sub(r"[^a-z0-9\s-]", " ", article.get("content", "").lower()).split())
        score = sum(3 for keyword in keywords if keyword in normalized)
        score += sum(1 for term in terms if term in title.split())
        score += sum(0.25 for term in terms if term in body_terms)
        if score > 0:
            ranked.append((score, article))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [article for _, article in ranked[:limit]]

# Restrict browser callers to the official Vikora site; configure VIKAA_ALLOWED_ORIGIN in Render if the domain changes.
allowed_origin = os.getenv("VIKAA_ALLOWED_ORIGIN", "https://vikora-b4yt.onrender.com").rstrip("/")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

SYSTEM_PROMPT = """You are VIKAA, the customer-support guide for Vikora-One ERP.
Answer customer questions across the full range of Vikora-One ERP support: what the software is used for; modules and workflows; sales, purchase, billing, inventory, stock, customers, suppliers, accounts, reports, users and permissions; installation and configuration; server/client and networking; performance and errors; licence and multi-user setup; data import/export, integrations, backups, and general best practices. Treat every relevant Vikora-One question as a support request, even when it is phrased casually or uses different terminology.
Give the most useful answer possible: explain the likely concept, then provide ordered, practical steps, checks, and what result to expect. Adapt the detail to the question. If essential details are missing, first provide safe general checks and then ask one focused clarifying question (for example, module/screen, exact error, or whether one or all users are affected). For feature-specific questions, clearly separate verified general ERP guidance from features that depend on the customer’s Vikora-One edition, configuration, permissions, or version. Never claim that a feature exists unless supported by reliable context. If you do not know an exact Vikora-One-specific menu, setting, report, shortcut, or behavior, say so plainly, offer a safe way to verify it, and do not guess. Do not give a bare refusal just because the exact setup is unknown; still help with relevant general guidance and next diagnostic steps.
For client-computer/network connection problems, give a clear ordered checklist: compare whether one or all client PCs are affected; check server power and approved services; verify same LAN/Wi-Fi or approved VPN; have IT confirm server hostname/IP and name resolution; test reachability while explaining ping can be blocked; verify the documented application service/port and firewall rules with IT; capture the exact error and timing. Never recommend disabling firewalls, exposing database ports publicly, guessing ports, or changing production server settings without an administrator. Distinguish network problems from licence, permission, and application-service issues.
Important limitations:
- You do not have access to a customer's live Vikora-One installation, database, licence record, or account.
- Do not invent exact menu names, buttons, tax rules, posting behavior, or product features. Say menu names vary by edition/setup when uncertain.
- For accounting, tax, payroll, statutory, or compliance-sensitive postings, explain general principles and recommend confirmation with the customer's accountant or authorised administrator.
- Never ask for passwords, OTPs, secret licence keys, bank details, or identifiable customer/employee data. Ask users to redact sensitive information from error messages.
- Do not advise bypassing licences, permissions, security controls, or audit trails.
- For unresolved installation-specific issues, direct users to hello@vikora.com or +91 99117 18105.
Answer directly rather than giving generic filler. For how-to questions, use numbered steps; for errors, use diagnose → check → fix → verify; for comparison questions, explain the differences. If a question is outside Vikora-One support, briefly clarify the boundary and help with the related software issue if possible. Keep answers clear, courteous, and concise, and always end with the next useful check or a focused question when needed."""

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=3000)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=12)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "VIKAA Support API",
        "ai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "knowledge_base_articles": len(KNOWLEDGE_ARTICLES),
        "knowledge_base_version": KNOWLEDGE_BASE.get("version", 1),
    }


@app.get("/api/knowledge")
def knowledge_status():
    return {
        "title": KNOWLEDGE_BASE.get("title", "VIKAA support knowledge base"),
        "version": KNOWLEDGE_BASE.get("version", 1),
        "article_count": len(KNOWLEDGE_ARTICLES),
        "articles": [{"id": a.get("id"), "title": a.get("title")} for a in KNOWLEDGE_ARTICLES],
    }

@app.post("/api/chat")
def chat(payload: ChatRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="VIKAA AI is not configured yet. Please contact Vikora support at hello@vikora.com.")
    try:
        client = OpenAI(api_key=api_key)
        retrieved = retrieve_knowledge(payload.message)
        knowledge_context = ""
        if retrieved:
            note_blocks = []
            for item in retrieved:
                note_blocks.append("Article: " + item.get("title", "Support note") + "\n" + item.get("content", ""))
            knowledge_context = "\n\nRelevant support knowledge-base notes (starter guidance; not proof of edition-specific features):\n" + "\n\n".join(note_blocks)
        messages = [{"role": "system", "content": SYSTEM_PROMPT + knowledge_context}]
        # Only accept a short, role-validated history; do not trust client-supplied system messages.
        messages.extend({"role": item.role, "content": item.content} for item in payload.history[-8:])
        messages.append({"role": "user", "content": payload.message})
        response = client.chat.completions.create(
            model=os.getenv("VIKAA_MODEL", "gpt-4o-mini"),
            messages=messages,
            temperature=0.2,
            max_tokens=650,
        )
        answer = response.choices[0].message.content
        if not answer:
            raise RuntimeError("Empty model response")
        return {"answer": answer, "source": "ai"}
    except HTTPException:
        raise
    except Exception:
        # Do not return provider error details or credentials to the browser.
        raise HTTPException(status_code=502, detail="VIKAA could not answer right now. Please try again or contact hello@vikora.com.")
