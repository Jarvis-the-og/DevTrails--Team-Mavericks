import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Clock, Search, Plus, MapPin, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebaseConfig'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const statusConfig = {
  PAID:              { label: 'Paid',      class: 'badge-green',  icon: <CheckCircle size={11} /> },
  approved_paid:     { label: 'Paid',      class: 'badge-green',  icon: <CheckCircle size={11} /> },
  instant_payout:    { label: 'Paid',      class: 'badge-green',  icon: <CheckCircle size={11} /> },
  REJECTED:          { label: 'Rejected',  class: 'badge-red',    icon: <XCircle size={11} /> },
  flagged:           { label: 'Flagged',   class: 'badge-red',    icon: <XCircle size={11} /> },
  UNDER_REVIEW:      { label: 'Review',    class: 'badge-yellow', icon: <AlertCircle size={11} /> },
  verification_required: { label: 'Review', class: 'badge-yellow', icon: <AlertCircle size={11} /> },
  PENDING:           { label: 'Pending',   class: 'badge-blue',   icon: <Clock size={11} /> },
}

export default function ClaimsPage({ user: firebaseUser }) {
  const localUser = JSON.parse(localStorage.getItem('worker_user') || '{"name":"Rahul","platform":"Zomato"}')
  const user = {
    name: firebaseUser?.displayName || localUser.name || firebaseUser?.email?.split('@')[0] || 'Worker',
    platform: localUser.platform || 'Swiggy',
  }
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [claimsData, setClaimsData] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ upiId: localStorage.getItem('worker_upi') || 'test@tx', reason: 'Manual Claim' })
  const [locationStatus, setLocationStatus] = useState('Pending')

  const fetchClaims = () => {
    setLoading(true)
    fetch(`${API}/claims/${encodeURIComponent(user.name)}`)
      .then(res => res.json())
      .then(data => {
        if (data.claims) {
          const mapped = data.claims.map((c, i) => ({
            id: c.id ? `CLM-${c.id.slice(0, 4).toUpperCase()}` : `CLM-${i}`,
            date: c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
            event: c.event || 'Parametric Trigger',
            amount: c.amount || 0,
            status: c.status === 'approved_paid' || c.status === 'instant_payout' ? 'PAID' : c.status === 'flagged' ? 'REJECTED' : c.status === 'verification_required' ? 'UNDER_REVIEW' : 'PENDING',
            trustScore: c.trustScore || 0,
            rawStatus: c.status,
          }))
          setClaimsData(mapped)
        }
        setLoading(false)
      })
      .catch(err => { console.error(err); setLoading(false) })
  }

  useEffect(() => {
    // Real-time Firestore listener
    const claimsQ = query(collection(db, 'claims'), where('userId', '==', user.name))
    const unsubscribe = onSnapshot(claimsQ, (snapshot) => {
      const mapped = snapshot.docs.map((doc, i) => {
        const c = { id: doc.id, ...doc.data() }
        return {
          id: `CLM-${c.id.slice(0, 4).toUpperCase()}`,
          date: c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
          event: c.event || 'Parametric Trigger',
          amount: c.amount || 0,
          status: c.status === 'approved_paid' || c.status === 'instant_payout' ? 'PAID' : c.status === 'flagged' ? 'REJECTED' : c.status === 'verification_required' ? 'UNDER_REVIEW' : 'PENDING',
          trustScore: c.trustScore || 0,
          rawStatus: c.status,
        }
      })
      setClaimsData(mapped)
      setLoading(false)
    }, () => fetchClaims())
    return () => unsubscribe()
  }, [user.name])

  const handleOpenModal = () => {
    setShowModal(true)
    setLocationStatus('Locating...')
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setFormData(f => ({ ...f, lat: pos.coords.latitude, lon: pos.coords.longitude }))
          setLocationStatus(`Found: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
        },
        err => {
          console.warn(err)
          setLocationStatus('Failed - Using default (12.9716, 77.5946)')
          setFormData(f => ({ ...f, lat: 12.9716, lon: 77.5946 }))
        }
      )
    } else {
      setLocationStatus('Unavailable - Using default')
      setFormData(f => ({ ...f, lat: 12.9716, lon: 77.5946 }))
    }
  }

  const handleSubmitClaim = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        userId: user.name,
        platform: user.platform,
        lat: formData.lat || 12.9716,
        lon: formData.lon || 77.5946,
        upiId: formData.upiId
      }

      const res = await fetch(`${API}/claims/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setShowModal(false)
        // Refresh from database
        setTimeout(fetchClaims, 500)
      } else {
        alert('Failed to submit claim. Backend returned an error.')
      }
    } catch (err) {
      alert('Network error submitting claim.')
    }
    
    setSubmitting(false)
  }

  const totalPaid = claimsData.filter(c => c.status === 'PAID').reduce((sum, c) => sum + (c.amount || 0), 0)

  const filtered = claimsData.filter(c => {
    const q = search.toLowerCase()
    return (c.id.toLowerCase().includes(q) || c.event.toLowerCase().includes(q)) &&
      (filter === 'ALL' || c.status === filter)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>My Claims</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>Your full payout history</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={fetchClaims} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', background: 'rgba(51,65,85,0.3)', color: '#94a3b8', border: '1px solid transparent', fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleOpenModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> File a Claim
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Total', value: claimsData.length, color: '#60a5fa' },
          { label: 'Paid', value: claimsData.filter(c => c.status === 'PAID').length, color: '#4ade80' },
          { label: 'Received', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: '#22c55e' },
          { label: 'Rejected', value: claimsData.filter(c => c.status === 'REJECTED').length, color: '#f87171' },
        ].map((s, i) => (
          <div key={i} className="glass" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="glass" style={{ padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            className="input" style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
            placeholder="Search claims..." value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', WebkitOverflowScrolling: 'touch' }}>
        {['ALL', 'PAID', 'UNDER_REVIEW', 'REJECTED'].map(f => {
          const label = f === 'ALL' ? 'All' : statusConfig[f]?.label || f
          return (
            <button key={f} onClick={() => setFilter(f)} className="btn" style={{
              padding: '0.375rem 0.875rem', fontSize: '0.75rem', flexShrink: 0,
              background: filter === f ? 'rgba(34,197,94,0.15)' : 'rgba(51,65,85,0.3)',
              color: filter === f ? '#22c55e' : '#94a3b8',
              border: `1px solid ${filter === f ? 'rgba(34,197,94,0.4)' : 'transparent'}`
            }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Claims Table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Event</th>
                <th>Trust</th>
                <th>Payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && claimsData.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>Loading claims from database...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>No claims found. File a claim to get started!</td></tr>
              ) : filtered.map((c, i) => {
                const sc = statusConfig[c.status] || { label: c.status, class: 'badge-blue', icon: <Clock size={11} /> }
                const tsColor = c.trustScore > 0.8 ? '#4ade80' : c.trustScore > 0.5 ? '#facc15' : '#f87171'
                return (
                  <tr key={i}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#60a5fa' }}>{c.id}</span></td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{c.date}</td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.event}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '36px', height: '4px', borderRadius: '9999px', background: 'rgba(51,65,85,0.5)' }}>
                          <div style={{ width: `${c.trustScore * 100}%`, height: '100%', borderRadius: '9999px', background: tsColor }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: tsColor, fontWeight: 700 }}>{(c.trustScore * 100).toFixed(0)}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#f1f5f9' }}>{c.amount > 0 ? `₹${c.amount.toLocaleString('en-IN')}` : '—'}</td>
                    <td>
                      <span className={`badge ${sc.class}`} style={{ gap: '0.25rem' }}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#0f172a', padding: '1.5rem', borderRadius: '1rem',
            width: '100%', maxWidth: '450px', border: '1px solid #334155',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.25rem' }}>Submit Manual Claim</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>If a parametric trigger failed to catch a genuine disruption, submit it for secondary review.</p>

            <form onSubmit={handleSubmitClaim} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Disruption Type</label>
                <select className="input" style={{ width: '100%', appearance: 'none', background: 'rgba(15,23,42,0.8)' }} value={formData.reason} onChange={e => setFormData(f => ({ ...f, reason: e.target.value }))}>
                  <option>Manual Exception</option>
                  <option>Heavy Rain (Unrecorded)</option>
                  <option>Severe AQI (Unrecorded)</option>
                  <option>Platform Glitch</option>
                  <option>Data Anomaly</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Registered UPI ID</label>
                <input className="input" style={{ width: '100%' }} value={formData.upiId} onChange={e => setFormData(f => ({ ...f, upiId: e.target.value }))} required />
              </div>

              <div style={{ background: 'rgba(34,197,94,0.08)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(34,197,94,0.2)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    <MapPin size={14} /> Location Telemetry
                 </div>
                 <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    Status: <span style={{ color: '#f1f5f9' }}>{locationStatus}</span>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ color: '#94a3b8', borderColor: '#334155' }} onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
