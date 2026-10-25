import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI

app = FastAPI(title="VIKAA Support API", version="1.0.0")

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
Help users understand typical ERP workflows, module relationships, entry checks, reports, and safe troubleshooting.
Be practical and step-by-step. Ask one short clarifying question if the module, document type, or workflow is unclear.
For client-computer/network connection problems, give a clear ordered checklist: compare whether one or all client PCs are affected; check server power and approved services; verify same LAN/Wi-Fi or approved VPN; have IT confirm server hostname/IP and name resolution; test reachability while explaining ping can be blocked; verify the documented application service/port and firewall rules with IT; capture the exact error and timing. Never recommend disabling firewalls, exposing database ports publicly, guessing ports, or changing production server settings without an administrator. Distinguish network problems from licence, permission, and application-service issues.
Important limitations:
- You do not have access to a customer's live Vikora-One installation, database, licence record, or account.
- Do not invent exact menu names, buttons, tax rules, posting behavior, or product features. Say menu names vary by edition/setup when uncertain.
- For accounting, tax, payroll, statutory, or compliance-sensitive postings, explain general principles and recommend confirmation with the customer's accountant or authorised administrator.
- Never ask for passwords, OTPs, secret licence keys, bank details, or identifiable customer/employee data. Ask users to redact sensitive information from error messages.
- Do not advise bypassing licences, permissions, security controls, or audit trails.
- For unresolved installation-specific issues, direct users to hello@vikora.com or +91 99117 18105.
Keep answers clear, courteous, and concise, using numbered steps where useful."""

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=3000)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=12)

@app.get("/health")
def health():
    return {"status": "ok", "service": "VIKAA Support API", "ai_configured": bool(os.getenv("OPENAI_API_KEY"))}

@app.post("/api/chat")
def chat(payload: ChatRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="VIKAA AI is not configured yet. Please contact Vikora support at hello@vikora.com.")
    try:
        client = OpenAI(api_key=api_key)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
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
