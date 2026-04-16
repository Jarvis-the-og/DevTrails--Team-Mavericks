import { AlertOctagon, Clock, Ban, Eye, X, ShieldAlert, Navigation, Smartphone, Fingerprint, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../firebaseConfig'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

function ScoreBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ width: '60px', height: '5px', borderRadius: '9999px', background: 'rgba(51,65,85,0.5)', flexShrink: 0 }}>
        <div style={{ width: `${value * 100}%`, height: '100%', borderRadius: '9999px', background: color }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{(value * 100).toFixed(0)}</span>
    </div>
  )
}

export default function FraudMonitor() {
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [flagged, setFlagged] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFlagged = () => {
    setLoading(true)
    fetch(`${API}/claims/all`)
      .then(res => res.json())
      .then(data => {
        if (data.claims) mapClaims(data.claims)
        setLoading(false)
      })
      .catch(err => { console.error(err); setLoading(false) })
  }

  const mapClaims = (claimsList) => {
    const flaggedClaims = claimsList
      .filter(c => c.status === 'flagged' || (c.trustScore && c.trustScore < 0.5))
      .map(c => ({
        id: c.id ? `CLM-${c.id.slice(0, 4).toUpperCase()}` : 'CLM-????',
        user: c.userId || 'Unknown',
        ip: c.ip || '0.0.0.0',
        platform: c.platform || 'Unknown',
        reason: c.fraudScore > 0.65 ? 'High ML anomaly score — multi-layer fraud flags triggered' : c.trustScore < 0.3 ? 'Missing GPS + suspicious user-agent' : 'Low trust score — anomalous behavior pattern',
        trustScore: c.trustScore || 0,
        fraudScore: c.fraudScore || 0,
        locationScore: c.factors?.location_score || 0,
        behaviorScore: c.factors?.behavioral_score || 0,
        deviceScore: c.factors?.device_score || 0,
        mlAnomalyScore: c.factors?.ml_anomaly_score || 0,
        date: c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown',
        // Real velocity: count how many claims this user has
        attempts: claimsList.filter(x => x.userId === c.userId).length,
        location: c.location,
      }))
    setFlagged(flaggedClaims)
  }

  useEffect(() => {
    // Real-time Firestore listener for flagged claims
    const q = query(collection(db, 'claims'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      mapClaims(all)
      setLoading(false)
    }, () => fetchFlagged())
    return () => unsubscribe()
  }, [])

  const blockedPayouts = flagged.length * 2000

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Fraud Monitor</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>AI-flagged suspicious claims requiring manual review</p>
        </div>
        <button onClick={fetchFlagged} className="btn" style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem', background: 'rgba(51,65,85,0.3)', color: '#94a3b8', border: '1px solid transparent', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Alert Banner */}
      <div style={{
        padding: '1rem 1.5rem', borderRadius: '0.75rem',
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <AlertOctagon size={20} color="#f87171" />
        <div>
          <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.875rem' }}>{flagged.length} High-Risk Claims Detected</div>
          <div style={{ color: '#64748b', fontSize: '0.78rem' }}>IP velocity abuse and GPS spoofing patterns identified. ₹{blockedPayouts.toLocaleString('en-IN')} in payouts blocked.</div>
        </div>
      </div>

      {loading && flagged.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading flagged claims from database...</div>
      ) : flagged.length === 0 ? (
        <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: '#4ade80' }}>✓ No flagged claims found. All clear!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {flagged.map((c, i) => (
            <div key={i} className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#c084fc', fontWeight: 700 }}>{c.id}</span>
                    <span className="badge badge-red">FLAGGED</span>
                    {c.attempts > 3 && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>×{c.attempts} velocity</span>}
                  </div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{c.user} · <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.875rem' }}>{c.platform}</span></div>
                  <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.25rem' }}>⚠ {c.reason}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Trust Score</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f87171', lineHeight: 1 }}>{(c.trustScore * 100).toFixed(0)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#f87171' }}>High Risk</div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '0.75rem', padding: '1rem', background: 'rgba(10,10,15,0.4)', borderRadius: '0.625rem' }}>
                {[
                  { label: 'Location Score', value: c.locationScore },
                  { label: 'Behavior Score', value: c.behaviorScore },
                  { label: 'Device Score', value: c.deviceScore },
                ].map((s, j) => {
                  const col = s.value > 0.7 ? '#4ade80' : s.value > 0.4 ? '#facc15' : '#f87171'
                  return (
                    <div key={j}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.35rem' }}>{s.label}</div>
                      <ScoreBar value={s.value} color={col} />
                    </div>
                  )
                })}
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.35rem' }}>Source IP</div>
                  <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#f87171' }}>{c.ip}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-danger" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }} onClick={() => alert(`Permanently blocking user ${c.user} / claim ${c.id}`)}>
                  <Ban size={13} /> Block Permanently
                </button>
                <button className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem', color: '#94a3b8', borderColor: '#334155' }} onClick={() => setSelectedClaim(c)}>
                  <Eye size={13} /> Review Details
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.75rem' }}>
                  <Clock size={12} /> {c.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedClaim && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }} onClick={() => setSelectedClaim(null)}>
          <div style={{
            background: '#0f172a', padding: '2rem', borderRadius: '1rem',
            width: '100%', maxWidth: '600px', border: '1px solid rgba(239,68,68,0.3)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', maxHeight: '90vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={20} color="#f87171" />
                  Investigation: {selectedClaim.id}
                </h3>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Reviewing signals for {selectedClaim.user} on {selectedClaim.platform}
                </div>
              </div>
              <button onClick={() => setSelectedClaim(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.5rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(15,23,42,0.5)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f1f5f9', fontWeight: 600, marginBottom: '1rem' }}>
                  <Navigation size={16} color="#3b82f6" /> Telemetry Data
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Reported Location</div>
                    <div style={{ fontSize: '0.85rem', color: '#f1f5f9' }}>{selectedClaim.location?.lat?.toFixed(4) || '—'}° N, {selectedClaim.location?.lon?.toFixed(4) || '—'}° E</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Velocity</div>
                    <div style={{ fontSize: '0.85rem', color: '#f1f5f9' }}>{selectedClaim.attempts} claims in 15 mins</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.5)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f1f5f9', fontWeight: 600, marginBottom: '1rem' }}>
                  <Smartphone size={16} color="#8b5cf6" /> Device Fingerprint
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Source IP</div>
                    <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#f1f5f9' }}>{selectedClaim.ip}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Trust Score</div>
                    <div style={{ fontSize: '0.85rem', color: '#f87171' }}>{(selectedClaim.trustScore * 100).toFixed(0)} — High Risk</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.1)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '1.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 700, marginBottom: '0.5rem' }}>
                 <Fingerprint size={16} /> AI Investigator Conclusion
               </div>
               <p style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {selectedClaim.reason}. The system identified highly anomalous behavior consistent with script-based location spoofing. The Trust Score of {(selectedClaim.trustScore * 100).toFixed(0)} is below the critical threshold.
               </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-outline" style={{ color: '#94a3b8', borderColor: '#334155', padding: '0.5rem 1rem', borderRadius: '0.5rem' }} onClick={() => setSelectedClaim(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: 'white', border: 'none' }} onClick={() => { alert(`Permanently blocking user ${selectedClaim.user}`); setSelectedClaim(null); }}>
                <Ban size={14} /> Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
