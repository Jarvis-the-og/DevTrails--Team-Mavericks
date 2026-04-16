import { useState, useEffect } from 'react'
import { Search, RefreshCw } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const statusMap = {
  approved_paid: { label: 'Paid', class: 'badge-green' },
  instant_payout: { label: 'Paid', class: 'badge-green' },
  flagged: { label: 'Flagged', class: 'badge-red' },
  verification_required: { label: 'Review', class: 'badge-yellow' },
  pending: { label: 'Pending', class: 'badge-blue' },
}

export default function ClaimsManager() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchClaims = () => {
    setLoading(true)
    fetch(`${API}/claims/all`)
      .then(res => res.json())
      .then(data => {
        if (data.claims) {
          const liveClaims = data.claims.map((c, i) => ({
            id: c.id ? `CLM-${c.id.slice(0, 4).toUpperCase()}` : `CLM-${i}`,
            userId: c.userId || 'Unknown',
            platform: c.platform || 'Unknown',
            event: c.event || 'Parametric Trigger',
            zone: c.location ? `${c.location.lat?.toFixed(2)}, ${c.location.lon?.toFixed(2)}` : 'Unknown',
            trustScore: c.trustScore || 0,
            amount: c.amount || 0,
            status: c.status || 'pending',
            created_at: c.created_at || Date.now(),
          }))
          setClaims(liveClaims)
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

  const filtered = claims.filter(c => {
    const q = search.toLowerCase()
    const match = c.id.toLowerCase().includes(q) || c.userId.toLowerCase().includes(q) || (c.event || '').toLowerCase().includes(q)
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
            </tr>
          </thead>
          <tbody>
            {loading && claims.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading claims from database...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No claims found. Submit a claim from the Worker portal to see it here.</td></tr>
            ) : filtered.map((c, i) => {
              const tsColor = c.trustScore > 0.8 ? '#4ade80' : c.trustScore > 0.5 ? '#facc15' : '#f87171'
              const sm = statusMap[c.status] || { label: c.status, class: 'badge-blue' }
              return (
                <tr key={i}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#c084fc' }}>{c.id}</span></td>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{c.userId}</td>
                  <td style={{ fontSize: '0.8rem' }}>{c.event}</td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{c.zone}</td>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
