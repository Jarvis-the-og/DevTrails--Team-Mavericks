import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.claims_service import _ml_fraud_score

tests = [
    ("LEGIT (Bangalore, near event)", {"lat":12.9716,"lon":77.5946,"ip":"103.21.58.12","user_agent":"Mozilla/5.0 Android","recent_ip_claims":0}),
    ("FRAUD (Delhi, 800km away, bot)", {"lat":28.7041,"lon":77.1025,"ip":"10.0.0.99","user_agent":"curl/7.68","recent_ip_claims":5}),
    ("FRAUD (No GPS, 0/0)", {"lat":0,"lon":0,"ip":"192.168.1.1","user_agent":"","recent_ip_claims":0}),
    ("BORDERLINE (Chennai, moderate)", {"lat":13.0827,"lon":80.2707,"ip":"117.200.51.33","user_agent":"Mozilla/5.0 iPhone","recent_ip_claims":2}),
]

with open("db/test_results.txt", "w", encoding="utf-8") as f:
    f.write("FRAUD DETECTION MODEL TEST RESULTS\n")
    f.write("=" * 50 + "\n\n")
    for name, data in tests:
        r = _ml_fraud_score(data)
        tag = "PASS" if r["decision"]=="instant_payout" else ("WARN" if r["decision"]=="verification_required" else "BLOCKED")
        f.write(f"[{tag}] {name}\n")
        f.write(f"  Score:    {r['trustScore']}\n")
        f.write(f"  Decision: {r['decision']}\n")
        f.write(f"  Location: {r['factors']['location_score']}\n")
        f.write(f"  Behavior: {r['factors']['behavioral_score']}\n")
        f.write(f"  Device:   {r['factors']['device_score']}\n\n")
    f.write("=" * 50 + "\n")
    f.write("Score > 0.8  = instant_payout (legit)\n")
    f.write("Score 0.5-0.8 = verification_required\n")
    f.write("Score < 0.5  = flagged (fraud blocked)\n")

print("Results written to db/test_results.txt")
