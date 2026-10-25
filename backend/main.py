import hashlib
import hmac
import os
import secrets
import smtplib
from email.message import EmailMessage
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import DateTime, Integer, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

APP_ENV = os.getenv("APP_ENV", "test").lower()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vikora_test.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", GMAIL_ADDRESS)
EMAIL_TO = os.getenv("EMAIL_TO", GMAIL_ADDRESS)
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://vikora-b4yt.onrender.com").rstrip(" /")
MONTHLY_SINGLE_PLAN_ID = os.getenv("RAZORPAY_MONTHLY_SINGLE_PLAN_ID", "")
MONTHLY_MULTI_PLAN_ID = os.getenv("RAZORPAY_MONTHLY_MULTI_PLAN_ID", "")

PRICE_TABLE = {
    "lifetime_single": ("Vikora-One Single User Lifetime", 2099900, 1),
    "lifetime_multi": ("Vikora-One Multi User Lifetime", 5500000, 10),
    "monthly_single": ("Vikora-One Single User Monthly", 299900, 1),
    "monthly_multi": ("Vikora-One Multi User Monthly", 599900, 10),
}

class Base(DeclarativeBase):
    pass

class Purchase(Base):
    __tablename__ = "vikora_purchases"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider_order_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    provider_payment_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, unique=True)
    customer_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254), index=True)
    plan_key: Mapped[str] = mapped_column(String(40))
    amount: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="created")
    license_key_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    license_key_last4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Subscription(Base):
    __tablename__ = "vikora_subscriptions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider_subscription_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254), index=True)
    plan_key: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(30), default="created")
    license_key_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    license_key_last4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    current_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(engine)

app = FastAPI(title="Vikora-One Payments API", version="0.1.0-test")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:5500"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Razorpay-Signature"],
)

class CheckoutRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    plan_key: str

class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    topic: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1, max_length=5000)

def send_email(to: str, subject: str, html: str) -> bool:
    # Prefer Gmail SMTP when configured; retain Resend as an optional fallback.
    if GMAIL_ADDRESS and GMAIL_APP_PASSWORD:
        try:
            message = EmailMessage()
            message["From"] = EMAIL_FROM or GMAIL_ADDRESS
            message["To"] = to
            message["Subject"] = subject
            message.set_content("This email contains HTML content. Please view it in an HTML-capable email client.")
            message.add_alternative(html, subtype="html")
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as smtp:
                smtp.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD.replace(" ", ""))
                smtp.send_message(message)
            return True
        except (OSError, smtplib.SMTPException) as exc:
            print(f"GMAIL_SEND_FAILED error={type(exc).__name__}")
            return False
    if RESEND_API_KEY and EMAIL_FROM:
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html},
                timeout=12.0,
            )
            response.raise_for_status()
            return True
        except httpx.HTTPError as exc:
            print(f"RESEND_SEND_FAILED error={type(exc).__name__}")
            return False
    return False

def issue_license(db, purchase: Purchase) -> Optional[str]:
    if purchase.license_key_hash:
        return None
    key = "VKO1-" + secrets.token_hex(4).upper() + "-" + secrets.token_hex(4).upper() + "-" + secrets.token_hex(4).upper()
    purchase.license_key_hash = hashlib.sha256(key.encode()).hexdigest()
    purchase.license_key_last4 = key[-4:]
    purchase.status = "paid"
    db.commit()
    label, _, seats = PRICE_TABLE[purchase.plan_key]
    sent = send_email(
        purchase.email,
        "Your Vikora-One license",
        f"<p>Hello {purchase.customer_name},</p><p>Your payment was verified. Here is your Vikora-One license key:</p>"
        f"<p style='font-size:20px;font-weight:bold;letter-spacing:1px'>{key}</p>"
        f"<p>Plan: {label}<br>Seats: {seats}<br>License type: lifetime</p>"
        "<p>Keep this key private. Contact support if you need help.</p>",
    )
    if not sent:
        # License is stored as a hash; never generate a second key on webhook retry.
        # Operators should configure Resend before running customer-facing tests.
        print(f"LICENSE_EMAIL_FAILED purchase_id={purchase.id} email={purchase.email} last4={key[-4:]}")
    return key

def razorpay_configured():
    return bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)

@app.get("/health")
def health():
    return {"status": "ok", "service": "vikora-payments-api", "mode": APP_ENV}

@app.get("/api/config")
def public_config():
    return {"mode": APP_ENV, "razorpay_key_id": RAZORPAY_KEY_ID if APP_ENV == "test" else ""}

@app.post("/api/checkout/order")
def create_order(payload: CheckoutRequest):
    if not razorpay_configured():
        raise HTTPException(503, "Razorpay test credentials are not configured.")
    plan = PRICE_TABLE.get(payload.plan_key)
    if not plan:
        raise HTTPException(400, "Unknown plan.")
    if payload.plan_key.startswith("monthly_"):
        raise HTTPException(501, "Monthly recurring checkout requires Razorpay subscription plan IDs. Configure both test plans before enabling monthly checkout.")
    label, amount, _seats = plan
    try:
        with httpx.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET), timeout=15.0) as client:
            response = client.post("https://api.razorpay.com/v1/orders", json={
                "amount": amount, "currency": "INR",
                "receipt": "vko_" + secrets.token_hex(8),
                "notes": {"customer_name": payload.name, "email": str(payload.email), "plan_key": payload.plan_key},
            })
            response.raise_for_status()
            order = response.json()
    except httpx.HTTPError:
        raise HTTPException(502, "Could not create a Razorpay test order.")
    with SessionLocal() as db:
        db.add(Purchase(provider_order_id=order["id"], customer_name=payload.name, email=str(payload.email),
                        plan_key=payload.plan_key, amount=amount, status="created"))
        db.commit()
    return {"order_id": order["id"], "amount": amount, "currency": "INR", "key_id": RAZORPAY_KEY_ID,
            "name": "Vikora-One", "description": label, "prefill": {"name": payload.name, "email": str(payload.email)}}

@app.post("/api/checkout/verify")
def verify_payment(payload: VerifyRequest):
    if not razorpay_configured():
        raise HTTPException(503, "Payment verification is not configured.")
    expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(400, "Invalid payment signature.")
    try:
        with httpx.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET), timeout=15.0) as client:
            response = client.get(f"https://api.razorpay.com/v1/payments/{payload.razorpay_payment_id}")
            response.raise_for_status()
            payment = response.json()
    except httpx.HTTPError:
        raise HTTPException(502, "Could not verify payment status with Razorpay.")
    if payment.get("status") != "captured" or payment.get("order_id") != payload.razorpay_order_id:
        raise HTTPException(400, "Payment is not captured for this order.")
    with SessionLocal() as db:
        purchase = db.scalar(select(Purchase).where(Purchase.provider_order_id == payload.razorpay_order_id))
        if not purchase:
            raise HTTPException(404, "Order not found.")
        if purchase.amount != payment.get("amount"):
            raise HTTPException(400, "Payment amount does not match the order.")
        if purchase.status != "paid":
            purchase.provider_payment_id = payload.razorpay_payment_id
            key = issue_license(db, purchase)
        else:
            key = None
        return {"status": "paid", "license_email_sent_or_queued": bool(RESEND_API_KEY and EMAIL_FROM),
                "license_key": key, "license_last4": purchase.license_key_last4}

@app.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(default="")):
    body = await request.body()
    if not RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(503, "Webhook secret is not configured.")
    expected = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_razorpay_signature):
        raise HTTPException(400, "Invalid webhook signature.")
    import json
    event = json.loads(body)
    if event.get("event") == "payment.captured":
        entity = event.get("payload", {}).get("payment", {}).get("entity", {})
        order_id, payment_id = entity.get("order_id"), entity.get("id")
        if order_id and payment_id:
            with SessionLocal() as db:
                purchase = db.scalar(select(Purchase).where(Purchase.provider_order_id == order_id))
                if purchase and purchase.status != "paid" and entity.get("amount") == purchase.amount:
                    purchase.provider_payment_id = payment_id
                    issue_license(db, purchase)
    return {"received": True}

@app.post("/api/contact")
def contact(payload: ContactRequest):
    if not EMAIL_TO or not EMAIL_FROM or not ((GMAIL_ADDRESS and GMAIL_APP_PASSWORD) or RESEND_API_KEY):
        raise HTTPException(503, "Customer email is not configured yet.")
    sent = send_email(EMAIL_TO, f"Vikora-One enquiry: {payload.topic}",
        f"<p><b>Name:</b> {payload.name}<br><b>Email:</b> {payload.email}<br><b>Topic:</b> {payload.topic}</p>"
        f"<p>{payload.message.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')}</p>")
    if not sent:
        raise HTTPException(502, "Could not send the enquiry. Please try again later.")
    return {"sent": True}

@app.get("/api/licenses/status")
def license_status(email: EmailStr):
    with SessionLocal() as db:
        rows = db.scalars(select(Purchase).where(Purchase.email == str(email), Purchase.status == "paid")).all()
        return {"licenses": [{"plan_key": p.plan_key, "last4": p.license_key_last4, "status": p.status}
                             for p in rows]}
