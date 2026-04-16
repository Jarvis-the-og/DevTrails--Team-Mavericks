import { useState, useEffect } from 'react'
import { CloudRain, TrendingUp, ShieldCheck, IndianRupee, Wind } from 'lucide-react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../firebaseConfig'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

export default function Dashboard({ user: firebaseUser }) {
  // Derive display info from Firebase user or localStorage fallback
  const localUser = JSON.parse(localStorage.getItem('worker_user') || '{"name":"Rahul","platform":"Zomato"}')
  const user = {
    name: firebaseUser?.displayName || localUser.name || firebaseUser?.email?.split('@')[0] || 'Worker',
    platform: localUser.platform || 'Swiggy',
    uid: firebaseUser?.uid || localUser.uid || 'anonymous',
    email: firebaseUser?.email || localUser.email,
  }
  const activePlanId = localStorage.getItem('worker_plan') || 'standard'
  
  const [rainfall, setRainfall] = useState(2.4)
  const [aqi] = useState(145)
  const [premiumInfo, setPremiumInfo] = useState({ 
    weekly_premium: 29, 
    weekly_cap: 1500, 
    plan: activePlanId.charAt(0).toUpperCase() + activePlanId.slice(1) 
  })
  const [claims, setClaims] = useState([])

  useEffect(() => {
    // Fetch dynamic premium info
    fetch(`${API}/premium/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        plan: activePlanId, 
        zone: 'hsr_layout', 
        platform: user.platform.toLowerCase() 
      })
    })
      .then(res => res.json())
      .then(data => setPremiumInfo(data))
      .catch(() => {
        // Fallback for demo when backend is offline
        setPremiumInfo({ weekly_premium: 45, weekly_cap: 2000, plan: 'Standard' })
      })

    // Real-time Firestore listener for this user's claims
    const claimsQuery = query(
      collection(db, 'claims'),
      where('userId', '==', user.name)
    )
    const unsubscribe = onSnapshot(claimsQuery, (snapshot) => {
      const liveClaims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setClaims(liveClaims)
    }, (err) => {
      console.warn('Firestore listener error:', err)
      // Fallback: fetch from REST API
      fetch(`${API}/claims/${encodeURIComponent(user.name)}`)
        .then(res => res.json())
        .then(data => { if (data.claims) setClaims(data.claims) })
        .catch(() => {})
    })
    return () => unsubscribe()
  }, [user.name, user.platform, activePlanId])

  const weeklyCap = premiumInfo.weekly_cap || 0
  const totalPaidThisWeek = claims
    .filter(c => {
      const weekAgo = Date.now() - 7 * 86400 * 1000
      const claimDate = c.created_at || Date.now()
      return (c.status === 'approved_paid' || c.status === 'PAID') && claimDate > weekAgo
    })
    .reduce((sum, c) => sum + (c.amount || 0), 0)
  
  const remainingCap = Math.max(0, weeklyCap - totalPaidThisWeek)

  const trustScore = 0.87
  const riskColor = trustScore > 0.8 ? '#4ade80' : trustScore > 0.5 ? '#facc15' : '#f87171'

  // Only show real claims from the database
  const displayClaims = claims

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div>
        <h2 className="hero-title" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>
          Good morning, {user.name.split(' ')[0]} 👋
        </h2>
        <p className="hero-sub" style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          &nbsp;·&nbsp;<span style={{ color: '#22c55e' }}>{user.platform}</span>
        </p>
      </div>

      {/* KPI Row — 2 cols on mobile, 4 on desktop */}
      <div className="grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Weekly Premium', value: `₹${premiumInfo.weekly_premium}`, sub: `${premiumInfo.plan} Plan`, color: '#4ade80', icon: <IndianRupee size={18} />, bg: 'rgba(34,197,94,0.1)', border: '#22c55e' },
          { label: 'Remaining Cap', value: `₹${remainingCap}`, sub: `of ₹${weeklyCap} total`, color: '#60a5fa', icon: <TrendingUp size={18} />, bg: 'rgba(96,165,250,0.1)', border: '#60a5fa' },
          { label: 'Trust Score', value: `${(trustScore * 100).toFixed(0)}`, sub: 'Low fraud risk', color: riskColor, icon: <ShieldCheck size={18} />, bg: 'rgba(74,222,128,0.08)', border: riskColor },
          { label: 'Total Paid', value: `₹${claims.filter(c => c.status === 'approved_paid' || c.status === 'PAID').reduce((sum, c) => sum + (c.amount || 0), 0)}`, sub: 'All time', color: '#f59e0b', icon: <IndianRupee size={18} />, bg: 'rgba(245,158,11,0.1)', border: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="glass stat-card" style={{ borderTop: `3px solid ${s.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
              <div style={{ padding: '0.4rem', background: s.bg, borderRadius: '0.5rem' }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Conditions */}
      <div className="grid-1col" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>

        {/* Live Weather */}
        <div className="glass glass-padded" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>Live Conditions</h3>
            <span className="badge badge-green">HSR Layout</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.78rem' }}><CloudRain size={13} /> Rainfall</div>
                <span style={{ fontSize: '0.78rem', color: rainfall > 20 ? '#f87171' : '#4ade80', fontWeight: 700 }}>
                  {rainfall}mm {rainfall > 20 ? '⚠️' : '✓'}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(100, (rainfall / 20) * 100)}%`, background: rainfall > 20 ? 'linear-gradient(90deg,#dc2626,#ef4444)' : undefined }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.78rem' }}><Wind size={13} /> AQI</div>
                <span style={{ fontSize: '0.78rem', color: '#facc15', fontWeight: 700 }}>{aqi} / 300</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(100, (aqi / 300) * 100)}%`, background: 'linear-gradient(90deg,#d97706,#f59e0b)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payouts table with horizontal scroll on mobile */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(51,65,85,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>Recent Payouts</h3>
          <span className="badge badge-green">{displayClaims.length} activities</span>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayClaims.map((row, i) => (
                <tr key={i}>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{row.date || new Date(row.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td>{row.event || (row.triggers_activated && row.triggers_activated[0]?.trigger_name) || 'Manual Claim'}</td>
                  <td style={{ fontWeight: 700, color: '#f1f5f9' }}>{row.amount || `₹${row.payout_amount || 0}`}</td>
                  <td>
                    <span className={`badge ${row.status === 'PAID' || row.status === 'approved_paid' ? 'badge-green' : 'badge-red'}`}>
                      {row.status === 'approved_paid' ? 'PAID' : row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
