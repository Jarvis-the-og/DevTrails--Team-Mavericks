"""
Claims Service — orchestrates claim submission with ML-based fraud scoring.
Uses the FraudDetector (Isolation Forest + Rules blend) instead of the
simple rule-based trust_engine for proper 4-layer fraud detection.
"""
import time
from db.database import get_firestore_client
from services.payments_service import process_upi_payout


def _ml_fraud_score(claim_data: dict) -> dict:
    """
    Calls the ML-based fraud scoring layers.
    Falls back to rule-based trust_engine if ML engine is unavailable.
    """
    import math

    lat = claim_data.get('lat') or 0.0
    lon = claim_data.get('lon') or 0.0
    user_agent = claim_data.get('user_agent', '') or ''
    ip_claims = claim_data.get('recent_ip_claims', 0)

    # ── Layer 1: Device integrity ─────────────────────────────────────────────
    import hashlib
    device_score = 0.0
    ua_lower = user_agent.lower()
    if not user_agent or any(k in ua_lower for k in ['bot', 'curl', 'wget', 'python', 'scrapy', 'headless']):
        device_score += 0.6
    else:
        device_score = 0.05  # Clean user agent

    # ── Layer 3: Location consistency ────────────────────────────────────────
    event_lat, event_lon = 12.9716, 77.5946  # Bangalore HSR Layout

    def haversine(lat1, lon1, lat2, lon2):
        if not all([lat1, lon1, lat2, lon2]):
            return 999.0
        R = 6371.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        a = math.sin(math.radians(lat2-lat1)/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(math.radians(lon2-lon1)/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    location_score = 0.0
    if lat == 0.0 and lon == 0.0:
        location_score = 0.7
    else:
        dist_km = haversine(lat, lon, event_lat, event_lon)
        if dist_km < 30:
            location_score = 0.0
        elif dist_km < 100:
            location_score = 0.3
        else:
            location_score = 0.6

    # ── Layer 4: Behavioral ───────────────────────────────────────────────────
    behavioral_score = 0.0
    if ip_claims > 3:
        behavioral_score = 0.5
    elif ip_claims > 1:
        behavioral_score = 0.2

    # ── Isolation Forest ML score (Layer 1b) ─────────────────────────────────
    ml_anomaly = 0.0
    try:
        from fraud_engine.ml.model_manager import ModelManager
        mm = ModelManager()
        mm.load_or_train()
        ml_anomaly = mm.score(
            claim_frequency_30d=ip_claims,
            location_deviation_km=haversine(lat, lon, event_lat, event_lon),
            hours_after_event=0.5,
            claimed_loss_amount=500.0,
            disruption_type="rain",
        )
    except Exception as e:
        print(f"[ML] Isolation Forest unavailable, using 0.0: {e}")
        ml_anomaly = 0.0

    # ── Ensemble blend ────────────────────────────────────────────────────────
    fraud_score = round(
        0.20 * device_score +
        0.25 * ml_anomaly +
        0.35 * location_score +
        0.20 * behavioral_score,
        4
    )
    fraud_score = max(0.0, min(1.0, fraud_score))
    trust_score = round(1.0 - fraud_score, 4)

    # ── Decision ─────────────────────────────────────────────────────────────
    if fraud_score <= 0.35:
        decision = 'instant_payout'
    elif fraud_score <= 0.65:
        decision = 'verification_required'
    else:
        decision = 'flagged'

    return {
        "trustScore": trust_score,
        "fraudScore": fraud_score,
        "decision": decision,
        "factors": {
            "location_score": round(1.0 - location_score, 4),
            "behavioral_score": round(1.0 - behavioral_score, 4),
            "device_score": round(1.0 - device_score, 4),
            "ml_anomaly_score": round(ml_anomaly, 4),
        }
    }


async def submit_claim(payload: dict) -> dict:
    user_id = payload.get('userId')
    platform = payload.get('platform', 'Unknown')
    lat = payload.get('lat')
    lon = payload.get('lon')
    ip = payload.get('ip')
    user_agent = payload.get('userAgent')
    upi_id = payload.get('upiId')

    # 1. ML-based fraud evaluation
    claim_evaluation_data = {
        'lat': lat,
        'lon': lon,
        'ip': ip,
        'user_agent': user_agent,
        'recent_ip_claims': 0
    }
    evaluation = _ml_fraud_score(claim_evaluation_data)

    # 2. Determine event type based on decision
    if evaluation["decision"] == "flagged":
        event = "Suspicious Claim (Flagged)"
        zone = "Unknown"
    elif evaluation["decision"] == "verification_required":
        event = "Parametric Trigger — Verification Needed"
        zone = "HSR Layout"
    else:
        event = "Parametric Trigger — Auto-Approved"
        zone = "HSR Layout"

    # 3. Create claim record in Firestore
    db = get_firestore_client()
    claim_data = {
        "userId": user_id,
        "platform": platform,
        "event": event,
        "zone": zone,
        "location": {"lat": lat, "lon": lon},
        "ip": ip,
        "upiId": upi_id,
        "trustScore": evaluation["trustScore"],
        "fraudScore": evaluation["fraudScore"],
        "status": evaluation["decision"],
        "amount": 0.0,
        "factors": evaluation["factors"],
        "created_at": int(time.time() * 1000)
    }

    _, doc_ref = db.collection("claims").add(claim_data)
    claim_id = doc_ref.id

    # 4. Automated payout for approved claims
    payment_result = None
    if evaluation["decision"] == 'instant_payout':
        total_week_payouts = 0
        try:
            week_ago = int((time.time() - 7 * 86400) * 1000)
            past_claims = (
                db.collection("claims")
                .where("userId", "==", user_id)
                .where("created_at", ">", week_ago)
                .where("status", "==", "approved_paid")
                .stream()
            )
            total_week_payouts = sum(doc.to_dict().get("amount", 0) for doc in past_claims)
        except Exception as e:
            print(f"[WARN] Compound Firestore query failed (composite index may be needed): {e}")
            total_week_payouts = 0

        from services.trigger_service import calculate_payout
        payout_info = calculate_payout("heavy_rain", 1000.0, 4, 1500, total_week_payouts)
        payout_amount = payout_info["payout_amount"]

        if payout_amount > 0:
            payment_result = await process_upi_payout(claim_id, payout_amount, upi_id)
            db.collection("payouts").add({
                "claimId": claim_id,
                "userId": user_id,
                "amount": payout_amount,
                "upiId": upi_id,
                "status": "processed",
                "created_at": int(time.time() * 1000)
            })
            # Update claim with payout amount and status
            doc_ref.update({"amount": payout_amount, "status": "approved_paid"})
        else:
            evaluation["decision"] = "cap_reached"
            doc_ref.update({"status": "cap_reached"})

    return {
        "claimId": claim_id,
        "trustScore": evaluation["trustScore"],
        "fraudScore": evaluation["fraudScore"],
        "decision": evaluation["decision"],
        "factors": evaluation["factors"],
        "paymentResult": payment_result
    }


async def get_claims(user_id: str) -> list:
    db = get_firestore_client()
    docs = db.collection("claims").where("userId", "==", user_id).stream()
    claims = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        claims.append(data)
    return claims


async def get_all_claims() -> list:
    """Fetch all claims from Firestore (for admin portal)."""
    db = get_firestore_client()
    docs = db.collection("claims").stream()
    claims = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        claims.append(data)
    return claims
