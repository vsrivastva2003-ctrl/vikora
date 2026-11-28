import hashlib
import html
import hmac
import json
import os
import secrets
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint, create_engine, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

APP_ENV = os.getenv("APP_ENV", "").lower()
DATABASE_URL = os.getenv("DATABASE_URL", "")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "vikoraone@vikora.in")
FRONTEND_URLS = ["https://vikora.in", "https://www.vikora.in"]
LICENSE_ENCRYPTION_KEY = os.getenv("LICENSE_ENCRYPTION_KEY", "")
FULFILLMENT_ADMIN_TOKEN = os.getenv("FULFILLMENT_ADMIN_TOKEN", "")

# This service is deliberately production-only. It must never accept Test Mode keys.
if APP_ENV != "production":
    raise RuntimeError("Production payment service requires APP_ENV=production.")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required; ephemeral SQLite storage is not supported.")
if not RAZORPAY_KEY_ID.startswith("rzp_live_") or not RAZORPAY_KEY_SECRET or not RAZORPAY_WEBHOOK_SECRET:
    raise RuntimeError("Live Razorpay key ID, key secret and webhook secret are required.")
if not RESEND_API_KEY or not EMAIL_FROM:
    raise RuntimeError("Verified Resend email credentials and EMAIL_FROM are required.")
if not LICENSE_ENCRYPTION_KEY or not FULFILLMENT_ADMIN_TOKEN:
    raise RuntimeError("LICENSE_ENCRYPTION_KEY and FULFILLMENT_ADMIN_TOKEN are required.")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

fernet = Fernet(LICENSE_ENCRYPTION_KEY.encode())
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=5)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

PRICE_TABLE = {
    "lifetime_single": ("Vikora-One Single User Lifetime", 2099900, 1),
    "lifetime_multi": ("Vikora-One Multi User Lifetime", 5500000, 10),
}

class Base(DeclarativeBase):
    pass

class Purchase(Base):
    __tablename__ = "production_purchases"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider_order_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    provider_payment_id: Mapped[Optional[str]] = mapped_column(String(120), unique=True, nullable=True)
    customer_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254), index=True)
    phone: Mapped[str] = mapped_column(String(32))
    company: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    address: Mapped[str] = mapped_column(String(240))
    city: Mapped[str] = mapped_column(String(100))
    region: Mapped[str] = mapped_column(String(100))
    postal_code: Mapped[str] = mapped_column(String(24))
    country: Mapped[str] = mapped_column(String(80))
    tax_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    plan_key: Mapped[str] = mapped_column(String(40))
    amount: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[str] = mapped_column(String(24), default="created", index=True)
    license_key_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    license_key_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    license_key_last4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    email_status: Mapped[str] = mapped_column(String(24), default="not_sent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

class WebhookEvent(Base):
    __tablename__ = "production_webhook_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(80))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(engine)

app = FastAPI(title="Vikora Production Payments & Licensing", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Razorpay-Signature", "X-Razorpay-Event-Id", "X-Fulfillment-Token"],
)

class CheckoutRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=32)
    company: Optional[str] = Field(default=None, max_length=180)
    address: str = Field(min_length=3, max_length=240)
    city: str = Field(min_length=2, max_length=100)
    region: str = Field(min_length=2, max_length=100)
    postal_code: str = Field(min_length=3, max_length=24)
    country: str = Field(min_length=2, max_length=80)
    tax_id: Optional[str] = Field(default=None, max_length=40)
    plan_key: str

class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

def send_license_email(purchase: Purchase, key: str) -> bool:
    label, _amount, seats = PRICE_TABLE[purchase.plan_key]
    html = (
        f"<p>Hello {html.escape(purchase.customer_name)},</p>"
        "<p>Your Vikora-One payment has been verified. Your licence key is:</p>"
        f"<p style='font-size:20px;font-weight:bold;letter-spacing:1px'>{key}</p>"
        f"<p>Plan: {html.escape(label)}<br>Seats: {seats}<br>Payment reference: {html.escape(purchase.provider_payment_id or '')}</p>"
        "<p>Please keep this key private. For activation support, email vikoraone@vikora.in.</p>"
    )
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": EMAIL_FROM, "to": [purchase.email], "subject": "Your Vikora-One licence", "html": html},
            timeout=15.0,
        )
        response.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        print(f"LICENSE_EMAIL_FAILED purchase_id={purchase.id} error={type(exc).__name__}")
        return False

def decrypt_license(purchase: Purchase) -> str:
    if not purchase.license_key_encrypted:
        raise RuntimeError("No encrypted licence key is stored for this paid order.")
    return fernet.decrypt(purchase.license_key_encrypted.encode()).decode()

def fulfill_paid_purchase(db, purchase: Purchase) -> bool:
    if purchase.status != "paid":
        raise RuntimeError("Cannot fulfil an unpaid order.")
    if not purchase.license_key_encrypted:
        key = "VKO1-" + "-".join(secrets.token_hex(4).upper() for _ in range(3))
        purchase.license_key_hash = hashlib.sha256(key.encode()).hexdigest()
        purchase.license_key_encrypted = fernet.encrypt(key.encode()).decode()
        purchase.license_key_last4 = key[-4:]
        db.commit()
        db.refresh(purchase)
    if purchase.email_status == "sent":
        return True
    key = decrypt_license(purchase)
    sent = send_license_email(purchase, key)
    purchase.email_status = "sent" if sent else "failed"
    db.commit()
    return sent

def verify_razorpay_payment(order_id: str, payment_id: str) -> dict:
    try:
        response = httpx.get(
            f"https://api.razorpay.com/v1/payments/{payment_id}",
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
            timeout=15.0,
        )
        response.raise_for_status()
        payment = response.json()
    except httpx.HTTPError:
        raise HTTPException(502, "Could not confirm payment with Razorpay.")
    if payment.get("order_id") != order_id or payment.get("status") != "captured":
        raise HTTPException(409, "Payment is not captured for this order.")
    return payment

@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(503, "Persistent order database is unavailable.")
    return {"status": "ok", "service": "vikora-production-payments", "mode": "production"}

@app.get("/api/config")
def public_config():
    return {"mode": "production", "razorpay_key_id": RAZORPAY_KEY_ID, "currency": "INR"}

@app.post("/api/checkout/order")
def create_order(payload: CheckoutRequest):
    plan = PRICE_TABLE.get(payload.plan_key)
    if not plan:
        raise HTTPException(400, "This licence option is not available for online checkout.")
    label, amount, _seats = plan
    receipt = "vko_" + secrets.token_hex(10)
    try:
        response = httpx.post(
            "https://api.razorpay.com/v1/orders",
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
            json={"amount": amount, "currency": "INR", "receipt": receipt,
                  "notes": {"email": str(payload.email), "plan_key": payload.plan_key}},
            timeout=15.0,
        )
        response.raise_for_status()
        order = response.json()
    except httpx.HTTPError as exc:
        print(f"RAZORPAY_ORDER_CREATE_FAILED error={type(exc).__name__}")
        raise HTTPException(502, "Could not create a secure payment order.")
    with SessionLocal() as db:
        db.add(Purchase(
            provider_order_id=order["id"], customer_name=payload.name, email=str(payload.email),
            phone=payload.phone, company=payload.company, address=payload.address, city=payload.city,
            region=payload.region, postal_code=payload.postal_code, country=payload.country,
            tax_id=payload.tax_id, plan_key=payload.plan_key, amount=amount, status="created"
        ))
        db.commit()
    return {"order_id": order["id"], "amount": amount, "currency": "INR",
            "key_id": RAZORPAY_KEY_ID, "name": "Vikora", "description": label,
            "prefill": {"name": payload.name, "email": str(payload.email), "contact": payload.phone}}

@app.post("/api/checkout/verify")
def verify_payment(payload: VerifyRequest):
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(400, "Invalid payment signature.")
    payment = verify_razorpay_payment(payload.razorpay_order_id, payload.razorpay_payment_id)
    with SessionLocal() as db:
        purchase = db.scalar(select(Purchase).where(Purchase.provider_order_id == payload.razorpay_order_id).with_for_update())
        if not purchase:
            raise HTTPException(404, "Order not found.")
        if payment.get("amount") != purchase.amount or payment.get("currency") != purchase.currency:
            raise HTTPException(409, "Payment amount or currency does not match the order.")
        if purchase.status != "paid":
            purchase.provider_payment_id = payload.razorpay_payment_id
            purchase.status = "paid"
            purchase.paid_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(purchase)
        elif purchase.provider_payment_id != payload.razorpay_payment_id:
            raise HTTPException(409, "This order is already associated with another payment.")
        email_sent = fulfill_paid_purchase(db, purchase)
        return {"status": "paid", "license_last4": purchase.license_key_last4,
                "license_email_status": "sent" if email_sent else "retry_required",
                "message": "Payment verified. Licence delivery is being completed by email."}

@app.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(default=""),
                           x_razorpay_event_id: str = Header(default="")):
    body = await request.body()
    expected = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_razorpay_signature):
        raise HTTPException(400, "Invalid webhook signature.")
    if not x_razorpay_event_id:
        raise HTTPException(400, "Missing Razorpay event ID.")
    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid webhook payload.")
    event_type = event.get("event", "")
    entity = event.get("payload", {}).get("payment", {}).get("entity", {})
    order_id, payment_id = entity.get("order_id"), entity.get("id")
    with SessionLocal() as db:
        if db.scalar(select(WebhookEvent).where(WebhookEvent.event_id == x_razorpay_event_id)):
            return {"received": True, "duplicate": True}
        if event_type == "payment.captured":
            if not order_id or not payment_id:
                raise HTTPException(400, "Captured payment event is missing its order or payment ID.")
            purchase = db.scalar(select(Purchase).where(Purchase.provider_order_id == order_id).with_for_update())
            if not purchase:
                # Do not acknowledge an unknown order; a transient DB/order race can be retried.
                raise HTTPException(404, "Payment order is not present in the production order database.")
            if entity.get("amount") != purchase.amount or entity.get("currency") != purchase.currency:
                raise HTTPException(409, "Captured payment amount or currency does not match the stored order.")
            if purchase.status == "paid" and purchase.provider_payment_id != payment_id:
                raise HTTPException(409, "Order is already associated with a different captured payment.")
            if purchase.status != "paid":
                purchase.provider_payment_id = payment_id
                purchase.status = "paid"
                purchase.paid_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(purchase)
            if purchase.provider_payment_id != payment_id:
                raise HTTPException(409, "Payment ID does not match the paid order.")
            fulfill_paid_purchase(db, purchase)
        # Persist only after all required processing; failures remain retryable by Razorpay.
        db.add(WebhookEvent(event_id=x_razorpay_event_id, event_type=event_type))
        db.commit()
    return {"received": True}

@app.post("/api/fulfillment/retry")
def retry_failed_fulfillment(request: Request, x_fulfillment_token: str = Header(default="")):
    if not hmac.compare_digest(x_fulfillment_token, FULFILLMENT_ADMIN_TOKEN):
        raise HTTPException(403, "Forbidden.")
    with SessionLocal() as db:
        rows = db.scalars(select(Purchase).where(Purchase.status == "paid", Purchase.email_status != "sent").limit(50)).all()
        results = []
        for purchase in rows:
            results.append({"order_id": purchase.provider_order_id, "email_sent": fulfill_paid_purchase(db, purchase)})
        return {"processed": len(results), "results": results}
