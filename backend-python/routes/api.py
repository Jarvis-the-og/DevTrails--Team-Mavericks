import math
import time
import hashlib as _hashlib

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import razorpay

from services import premium_service, trigger_service, claims_service
from db.database import get_firestore_client

router = APIRouter()

# ─── Razorpay Client ──────────────────────────────────────────────────────────
RZP_KEY_ID = 'rzp_test_SZTRH39KNoZTLr'
RZP_KEY_SECRET = 'cBcDe0W3URwyZe1c925luque'
rzp_client = razorpay.Client(auth=(RZP_KEY_ID, RZP_KEY_SECRET))


# ══════════════════════════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ══════════════════════════════════════════════════════════════════════════════

class PremiumCalculateRequest(BaseModel):
    plan: str = "standard"
    zone: str = "hsr_layout"
    platform: str = "swiggy"
    aqi_risk: float = 0.0
    disruption_frequency: float = 0.0

class ClaimSubmitRequest(BaseModel):
    userId: str = 'Worker'
    platform: str = 'Unknown'
    lat: float
    lon: float
    upiId: str = 'test@tx'

class CreateOrderRequest(BaseModel):
    planId: str
    planLabel: str
    amount: int
    userId: str = 'Worker'

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    planId: str
    userId: str = 'Worker'
    amount: int = 0

class FraudScoreRequest(BaseModel):
    userId: str
    userAgent: str = ""
    screenResolution: str = ""
    timezone: str = ""
    browserFingerprint: str = ""
    livenessScore: float = 0.85
    lat: float = 0.0
    lon: float = 0.0
    ipLat: float = 0.0
    ipLon: float = 0.0
    claimFrequency30d: int = 0
    hoursAfterEvent: float = 1.0
    claimedLossAmount: float = 500.0
    disruptionType: str = "rain"

class RiskScoreRequest(BaseModel):
    userId: str
    plan: str = "standard"
    zone: str = "hsr_layout"
    platform: str = "swiggy"
    claimFrequency30d: int = 0
    locationDeviationKm: float = 5.0
    hoursAfterEvent: float = 1.0
    claimedLossAmount: float = 500.0
    disruptionType: str = "rain"

class LivenessRequest(BaseModel):
    userId: str
    imageBase64: str = ""
    headYaw: float = 0.0
    headPitch: float = 0.0
    movementDelta: float = 0.0
    frameCount: int = 1

class TriggerFireRequest(BaseModel):
    triggerType: str
    zone: str = "HSR Layout"
    value: float = 75.0
    affectedPlatforms: List[str] = []
    adminId: str = "admin"


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _device_anomaly_score(user_agent: str, screen_res: str, tz: str, fingerprint: str) -> float:
    """Layer 1 - Device & Session Integrity (Isolation Forest analog)."""
    score = 0.0
    ua_lower = user_agent.lower()
    if not user_agent or any(k in ua_lower for k in ['bot', 'curl', 'wget', 'python', 'scrapy', 'headless']):
        score += 0.6
    if not screen_res or screen_res in ['0x0', 'unknown']:
        score += 0.2
    if fingerprint:
        h = int(_hashlib.md5(fingerprint.encode()).hexdigest(), 16)
        entropy = (h % 1000) / 1000.0
        if entropy < 0.1:
            score += 0.2
    return min(score, 1.0)


def _location_anomaly_score(lat: float, lon: float, ip_lat: float, ip_lon: float) -> float:
    """Layer 3 - Location Consistency Model."""
    if lat == 0.0 and lon == 0.0:
        return 0.7
    if ip_lat == 0.0 and ip_lon == 0.0:
        return 0.1
    dist_km = _haversine_km(lat, lon, ip_lat, ip_lon)
    if dist_km < 30:
        return 0.0
    elif dist_km < 100:
        return 0.3
    elif dist_km < 500:
        return 0.6
    return 0.9


def _behavioral_graph_score(claim_freq: int, hours_after: float, loss_amount: float) -> float:
    """Layer 4 - Behavioral Graph Intelligence."""
    score = 0.0
    if claim_freq > 10:
        score += 0.5
    elif claim_freq > 5:
        score += 0.3
    elif claim_freq > 2:
        score += 0.1
    hours_norm = min(hours_after / 72.0, 1.0)
    if hours_norm > 0.9:
        score += 0.25
    loss_norm = min(loss_amount / 10000.0, 1.0)
    if loss_norm > 0.8:
        score += 0.25
    return min(score, 1.0)


def _strip_icons(obj):
    """Strip emoji 'icon' fields from dicts/lists — prevents Windows cp1252 encoding crash."""
    if isinstance(obj, dict):
        return {k: _strip_icons(v) for k, v in obj.items() if k != "icon"}
    if isinstance(obj, list):
        return [_strip_icons(i) for i in obj]
    return obj


# ══════════════════════════════════════════════════════════════════════════════
# EXISTING ENDPOINTS (PRESERVED)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/premium/calculate")
async def calculate_premium(req: PremiumCalculateRequest):
    try:
        result = premium_service.calculate_premium(**req.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/events/check")
async def check_event(lat: float = 12.9716, lon: float = 77.5946):
    try:
        result = await trigger_service.check_weather_event(lat, lon)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/claims/submit")
async def submit_claim(req: ClaimSubmitRequest, request: Request):
    try:
        ip = request.client.host
        user_agent = request.headers.get('user-agent', '')
        payload = req.model_dump()
        payload['ip'] = ip
        payload['userAgent'] = user_agent
        result = await claims_service.submit_claim(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# NOTE: /claims/all MUST come BEFORE /claims/{user_id}
@router.get("/claims/all")
async def get_all_claims():
    try:
        claims = await claims_service.get_all_claims()
        return {"claims": claims}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/claims/{user_id}")
async def get_user_claims(user_id: str):
    try:
        claims = await claims_service.get_claims(user_id)
        return {"claims": claims}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/plans")
async def get_plans():
    try:
        plans = premium_service.get_all_plans()
        return {"plans": plans}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/zones")
async def get_zones():
    try:
        db = get_firestore_client()
        docs = db.collection("zones").stream()
        zones = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            zones.append(data)
        return {"zones": zones}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/weekly")
async def get_weekly_analytics():
    try:
        db = get_firestore_client()
        doc = db.collection("analytics").document("weekly_summary").get()
        if doc.exists:
            return doc.to_dict()
        return {"days": [], "total_claims": 0, "total_fraud": 0, "total_payouts": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workers")
async def get_workers():
    try:
        db = get_firestore_client()
        docs = db.collection("workers").stream()
        workers = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            workers.append(data)
        return {"workers": workers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment/create-order")
async def create_razorpay_order(req: CreateOrderRequest):
    try:
        order_data = {
            "amount": req.amount * 100,
            "currency": "INR",
            "receipt": f"plan_{req.planId}_{int(time.time())}",
            "notes": {"plan": req.planId, "planLabel": req.planLabel, "userId": req.userId}
        }
        order = rzp_client.order.create(data=order_data)
        return {"orderId": order["id"], "amount": order["amount"], "currency": order["currency"], "keyId": RZP_KEY_ID}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment/verify")
async def verify_razorpay_payment(req: VerifyPaymentRequest):
    try:
        params = {
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        }
        rzp_client.utility.verify_payment_signature(params)
        db = get_firestore_client()
        db.collection("payments").add({
            "orderId": req.razorpay_order_id,
            "paymentId": req.razorpay_payment_id,
            "planId": req.planId,
            "userId": req.userId,
            "amount": req.amount,
            "status": "paid",
            "created_at": int(time.time() * 1000)
        })
        return {"status": "success", "message": f"Payment verified. {req.planId} plan activated!"}
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# NEW - ML FRAUD INTELLIGENCE ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/fraud-score")
async def get_fraud_score(req: FraudScoreRequest):
    """
    Unified 4-layer ML fraud scoring endpoint.
    Layer 1: Device integrity (Isolation Forest analog)
    Layer 2: Liveness confidence (from frontend camera check)
    Layer 3: Location consistency (GPS vs IP geolocation)
    Layer 4: Behavioral graph (claim velocity, timing, loss magnitude)
    """
    try:
        device_score = _device_anomaly_score(
            req.userAgent, req.screenResolution, req.timezone, req.browserFingerprint
        )
        liveness_anomaly = max(0.0, 1.0 - req.livenessScore)
        location_score = _location_anomaly_score(req.lat, req.lon, req.ipLat, req.ipLon)
        behavioral_score = _behavioral_graph_score(
            req.claimFrequency30d, req.hoursAfterEvent, req.claimedLossAmount
        )

        fraud_score = round(
            0.25 * device_score +
            0.25 * liveness_anomaly +
            0.30 * location_score +
            0.20 * behavioral_score,
            4
        )
        fraud_score = max(0.0, min(1.0, fraud_score))

        if fraud_score <= 0.35:
            decision = "APPROVE"
            action = "instant_payout"
        elif fraud_score <= 0.65:
            decision = "REVIEW"
            action = "verification_required"
        else:
            decision = "REJECT"
            action = "flagged"

        # Non-blocking Firestore write
        try:
            db = get_firestore_client()
            db.collection("fraud_signals").add({
                "userId": req.userId,
                "fraudScore": fraud_score,
                "decision": decision,
                "layers": {
                    "device_score": device_score,
                    "liveness_anomaly": liveness_anomaly,
                    "location_score": location_score,
                    "behavioral_score": behavioral_score,
                },
                "timestamp": int(time.time() * 1000)
            })
        except Exception:
            pass

        return {
            "userId": req.userId,
            "fraudScore": fraud_score,
            "decision": decision,
            "action": action,
            "layers": {
                "deviceIntegrity": round(1.0 - device_score, 4),
                "livenessConfidence": req.livenessScore,
                "locationConsistency": round(1.0 - location_score, 4),
                "behavioralNormality": round(1.0 - behavioral_score, 4),
            },
            "trustScore": round(1.0 - fraud_score, 4),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk-score")
async def get_risk_score(req: RiskScoreRequest):
    """
    ML-based risk scoring using the Isolation Forest model.
    Returns risk_score (0-1) and a premium adjustment factor.
    """
    try:
        from fraud_engine.ml.model_manager import ModelManager
        mm = ModelManager()
        mm.load_or_train()

        ml_score = mm.score(
            claim_frequency_30d=req.claimFrequency30d,
            location_deviation_km=req.locationDeviationKm,
            hours_after_event=req.hoursAfterEvent,
            claimed_loss_amount=req.claimedLossAmount,
            disruption_type=req.disruptionType,
        )

        premium_adjustment = round(1.0 + (ml_score * 0.5), 3)

        if ml_score < 0.3:
            risk_class = "LOW"
        elif ml_score < 0.6:
            risk_class = "MEDIUM"
        else:
            risk_class = "HIGH"

        return {
            "userId": req.userId,
            "riskScore": round(ml_score, 4),
            "riskClass": risk_class,
            "premiumAdjustmentFactor": premium_adjustment,
            "modelVersion": mm.version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-liveness")
async def verify_liveness(req: LivenessRequest):
    """
    Liveness verification endpoint (calibrated stub).
    Analyzes head pose angles, movement vectors, and frame count.
    Ready for MediaPipe server-side integration on the same interface.
    """
    try:
        confidence = 0.5

        yaw_ok = abs(req.headYaw) <= 45
        pitch_ok = abs(req.headPitch) <= 30
        if yaw_ok and pitch_ok:
            confidence += 0.15

        if req.movementDelta > 0.5:
            confidence += 0.20
        elif req.movementDelta > 0.1:
            confidence += 0.10

        if req.frameCount >= 10:
            confidence += 0.15
        elif req.frameCount >= 5:
            confidence += 0.08

        if req.imageBase64 and len(req.imageBase64) > 1000:
            confidence += 0.10

        confidence = round(min(confidence, 1.0), 3)
        passed = confidence >= 0.70

        try:
            db = get_firestore_client()
            db.collection("device_profiles").add({
                "userId": req.userId,
                "livenessConfidence": confidence,
                "passed": passed,
                "headYaw": req.headYaw,
                "headPitch": req.headPitch,
                "movementDelta": req.movementDelta,
                "frameCount": req.frameCount,
                "timestamp": int(time.time() * 1000)
            })
        except Exception:
            pass

        return {
            "userId": req.userId,
            "livenessConfidence": confidence,
            "passed": passed,
            "verdict": "LIVE" if passed else "SPOOF_SUSPECTED",
            "details": {
                "headPoseValid": yaw_ok and pitch_ok,
                "movementDetected": req.movementDelta > 0.1,
                "framesAnalyzed": req.frameCount,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/triggers/fire")
async def fire_trigger(req: TriggerFireRequest):
    """Admin endpoint to manually fire a parametric trigger."""
    try:
        from services.trigger_service import check_weather_trigger, TRIGGERS

        if req.triggerType not in TRIGGERS:
            raise HTTPException(status_code=400, detail=f"Unknown trigger type: {req.triggerType}")

        kwargs = {
            "rainfall_mm": 0,
            "aqi": 0,
            "zone": req.zone,
            "flood_alert": False,
            "zone_shutdown": False,
            "platform_outage_mins": 0,
        }
        if req.triggerType == "heavy_rain":
            kwargs["rainfall_mm"] = req.value
        elif req.triggerType == "aqi_alert":
            kwargs["aqi"] = int(req.value)
        elif req.triggerType == "flood_alert":
            kwargs["flood_alert"] = True
        elif req.triggerType == "zone_shutdown":
            kwargs["zone_shutdown"] = True
        elif req.triggerType == "platform_outage":
            kwargs["platform_outage_mins"] = int(req.value)

        trigger_result = check_weather_trigger(**kwargs)

        # Strip emoji icon fields — causes cp1252 encoding crash on Windows
        # when Firestore SDK tries to log them. Icons handled on frontend.
        clean_result = _strip_icons(trigger_result)

        # Non-blocking Firestore write
        trigger_id = f"local_{int(time.time())}"
        try:
            db = get_firestore_client()
            trigger_doc = {
                "triggerType": req.triggerType,
                "zone": req.zone,
                "value": req.value,
                "affectedPlatforms": req.affectedPlatforms,
                "firedBy": req.adminId,
                "result": clean_result,
                "timestamp": int(time.time() * 1000),
                "status": "active" if trigger_result["any_triggered"] else "no_match",
            }
            _, doc_ref = db.collection("trigger_events").add(trigger_doc)
            trigger_id = doc_ref.id
        except Exception:
            pass  # Firestore unavailable -- still return result

        return {
            "triggerId": trigger_id,
            "triggered": trigger_result["any_triggered"],
            "activatedTriggers": clean_result.get("triggers_activated", []),
            "zone": req.zone,
            "timestamp": trigger_result["timestamp"],
            "message": (
                f"Trigger fired: {len(trigger_result['triggers_activated'])} condition(s) activated"
                if trigger_result["any_triggered"]
                else "Trigger below threshold -- no claims initiated"
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
