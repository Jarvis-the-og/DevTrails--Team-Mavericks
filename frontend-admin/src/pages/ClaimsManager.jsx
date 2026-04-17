import { useState, useEffect } from 'react'
import { Search, RefreshCw, X, CheckCircle, AlertCircle, Info, ShieldCheck } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const statusMap = {
  approved_paid: { label: 'Paid', class: 'badge-green' },
  instant_payout: { label: 'Paid', class: 'badge-green' },
  flagged: { label: 'Flagged', class: 'badge-red' },
  verification_required: { label: 'Review', class: 'badge-yellow' },
  pending: { label: 'Pending', class: 'badge-blue' },
  rejected: { label: 'Rejected', class: 'badge-gray' },
  cap_reached: { label: 'Cap Reached', class: 'badge-yellow' },
}

export default function ClaimsManager() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchClaims = () => {
    setLoading(true)
    fetch(`${API}/claims/all`)
      .then(res => res.json())
      .then(data => {
        if (data.claims) {
          const liveClaims = data.claims.map((c, i) => ({
            ...c,
            displayId: c.id ? `CLM-${c.id.slice(0, 4).toUpperCase()}` : `CLM-${i}`,
          }))
          setClaims(liveClaims)
          
          // Refresh selected claim if it's open
          if (selectedClaim) {
            const updated = liveClaims.find(lc => lc.id === selectedClaim.id)
            if (updated) setSelectedClaim(updated)
          }
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch claims:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchClaims()
    const interval = setInterval(fetchClaims, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleUpdateStatus = async (status) => {
    if (!selectedClaim) return
    if (status === 'rejected' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason.')
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`${API}/claims/${selectedClaim.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: rejectionReason })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to update status')
      }

      alert(`Claim successfully ${status === 'rejected' ? 'rejected' : 'approved'}.`)
      setRejectionReason('')
      fetchClaims()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = claims.filter(c => {
    const q = search.toLowerCase()
    const match = c.displayId.toLowerCase().includes(q) || (c.userId || '').toLowerCase().includes(q) || (c.event || '').toLowerCase().includes(q)
    if (filter === 'ALL') return match
    if (filter === 'approved_paid') return match && (c.status === 'approved_paid' || c.status === 'instant_payout')
    return match && c.status === filter
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Claims Manager</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Review, approve, or flag all incoming parametric claims</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'Total', value: claims.length, color: '#c084fc' },
          { label: 'Paid', value: claims.filter(c => c.status === 'approved_paid' || c.status === 'instant_payout').length, color: '#4ade80' },
          { label: 'Flagged', value: claims.filter(c => c.status === 'flagged').length, color: '#f87171' },
          { label: 'In Review', value: claims.filter(c => c.status === 'verification_required').length, color: '#facc15' },
        ].map((s, i) => (
          <div key={i} className="glass" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="glass" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search claims, users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={fetchClaims} className="btn" style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem', background: 'rgba(51,65,85,0.3)', color: '#94a3b8', border: '1px solid transparent', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
          {[['ALL', 'All'], ['approved_paid', 'Paid'], ['flagged', 'Flagged'], ['verification_required', 'Review']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className="btn" style={{
              padding: '0.4rem 0.875rem', fontSize: '0.75rem',
              background: filter === v ? 'rgba(168,85,247,0.15)' : 'rgba(51,65,85,0.3)',
              color: filter === v ? '#a855f7' : '#94a3b8',
              border: `1px solid ${filter === v ? 'rgba(168,85,247,0.4)' : 'transparent'}`
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Claim ID</th>
              <th>Worker</th>
              <th>Trigger Event</th>
              <th>Zone</th>
              <th>Trust Score</th>
              <th>Payout</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && claims.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading claims from database...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No claims found.</td></tr>
            ) : filtered.map((c, i) => {
              const tsColor = c.trustScore > 0.8 ? '#4ade80' : c.trustScore > 0.5 ? '#facc15' : '#f87171'
              const sm = statusMap[c.status] || { label: c.status, class: 'badge-blue' }
              return (
                <tr key={i} onClick={() => setSelectedClaim(c)} style={{ cursor: 'pointer' }}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#c084fc' }}>{c.displayId}</span></td>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{c.userId}</td>
                  <td style={{ fontSize: '0.8rem' }}>{c.event}</td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{c.zone || 'HSR Layout'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '50px', height: '4px', borderRadius: '9999px', background: 'rgba(51,65,85,0.5)' }}>
                        <div style={{ width: `${c.trustScore * 100}%`, height: '100%', borderRadius: '9999px', background: tsColor }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: tsColor }}>{(c.trustScore * 100).toFixed(0)}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#f1f5f9' }}>{c.amount > 0 ? `₹${c.amount.toLocaleString('en-IN')}` : '—'}</td>
                  <td><span className={`badge ${sm.class}`}>{sm.label}</span></td>
                  <td>
                    <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
                      Details
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedClaim && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setSelectedClaim(null)} style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <ShieldCheck size={28} style={{ color: '#c084fc' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Claim Investigation</h3>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Review the parameters captured during the trigger event.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="glass" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Worker & Platform</div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1.1rem' }}>{selectedClaim.userId}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{selectedClaim.platform} Partner</div>
                <div style={{ marginTop: '0.5rem', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 600 }}>UPI: {selectedClaim.upi_id || selectedClaim.upiId || 'Not set'}</div>
              </div>
              <div className="glass" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>System Decision</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className={`badge ${statusMap[selectedClaim.status]?.class || 'badge-blue'}`}>{statusMap[selectedClaim.status]?.label || selectedClaim.status}</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedClaim.trustScore > 0.8 ? '#4ade80' : '#f87171' }}>
                  {(selectedClaim.trustScore * 100).toFixed(0)}% Trust
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={16} color="#60a5fa" /> Intelligence Data
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 {[
                   { label: 'IP Address', value: selectedClaim.ip || 'Unknown' },
                   { label: 'Event Type', value: selectedClaim.event },
                   { label: 'Coordinates', value: selectedClaim.location ? `${selectedClaim.location.lat}, ${selectedClaim.location.lon}` : 'Unknown' },
                   { label: 'Submitted', value: new Date(selectedClaim.created_at).toLocaleString() },
                 ].map((item, idx) => (
                   <div key={idx}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>{item.label}</div>
                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>{item.value}</div>
                   </div>
                 ))}
              </div>
            </div>

            {/* Factors Visualization */}
            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: '1rem' }}>Layer Breakdown</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(selectedClaim.factors || {}).map(([key, val]) => (
                    <div key={key}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                         <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                         <span style={{ color: val > 0.8 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{(val * 100).toFixed(0)}%</span>
                       </div>
                       <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                          <div style={{ width: `${val * 100}%`, height: '100%', background: val > 0.8 ? '#4ade80' : '#f87171', borderRadius: '2px' }} />
                       </div>
                    </div>
                  ))}
                </div>
            </div>

            {/* Action Section */}
            {(selectedClaim.status === 'verification_required' || selectedClaim.status === 'flagged' || selectedClaim.status === 'pending') && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                 <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Administrative Note / Rejection Reason</label>
                    <textarea 
                      className="input" 
                      style={{ height: '80px', resize: 'none' }} 
                      placeholder="Mandatory if rejecting. Optional if approving."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                 </div>
                 <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      className="btn" 
                      disabled={actionLoading}
                      onClick={() => handleUpdateStatus('rejected')}
                      style={{ flex: 1, background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', fontWeight: 700, padding: '0.8rem' }}>
                      Reject Claim
                    </button>
                    <button 
                      className="btn" 
                      disabled={actionLoading}
                      onClick={() => handleUpdateStatus('approved_paid')}
                      style={{ flex: 1, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', fontWeight: 700, padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={18} /> Approve & Payout
                    </button>
                 </div>
              </div>
            )}

            {selectedClaim.rejectionReason && (
              <div className="glass" style={{ padding: '1rem', borderLeft: '3px solid #f87171', background: 'rgba(248,113,113,0.05)' }}>
                 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', marginBottom: '0.25rem' }}>Admin Rejection Reason</div>
                 <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{selectedClaim.rejectionReason}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
