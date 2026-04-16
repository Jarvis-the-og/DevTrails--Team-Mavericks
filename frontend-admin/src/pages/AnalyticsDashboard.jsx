import { useState, useEffect } from 'react'
import { Users, FileText, ShieldAlert, IndianRupee, RefreshCw } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebaseConfig'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#13131f', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.78rem' }}>
      <div style={{ color: '#94a3b8', marginBottom: '0.4rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = () => {
    setLoading(true)
    fetch(`${API}/analytics/weekly`)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(err => { console.error(err); setLoading(false) })
  }

  useEffect(() => {
    // Real-time Firestore listener on the weekly_summary document
    const unsub = onSnapshot(
      doc(db, 'analytics', 'weekly_summary'),
      (snap) => {
        if (snap.exists()) {
          setData(snap.data())
        }
        setLoading(false)
      },
      () => {
        // Firestore failed — fall back to REST
        fetchAnalytics()
      }
    )
    return () => unsub()
  }, [])

  const weekData = data?.days || []
  const totalClaims = data?.total_claims || weekData.reduce((s, d) => s + d.claims, 0)
  const totalFraud = data?.total_fraud || weekData.reduce((s, d) => s + d.fraud, 0)
  const totalPayouts = data?.total_payouts || weekData.reduce((s, d) => s + d.payouts, 0)
  const activePolicies = data?.active_policies || 0
  const fraudRate = totalClaims > 0 ? ((totalFraud / totalClaims) * 100).toFixed(1) : '0.0'

  const lossRatio = data?.loss_ratio ? `${(data.loss_ratio * 100).toFixed(0)}%` : '—'
  const approvalRate = data?.approval_rate ? `${(data.approval_rate * 100).toFixed(0)}%` : '—'
  const fraudSavings = data?.fraud_savings ? `₹${data.fraud_savings.toLocaleString('en-IN')}` : '—'
  const avgPayoutTime = data?.avg_payout_time_sec ? `${data.avg_payout_time_sec}s` : '—'

  if (loading && !data) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading analytics from database...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Analytics Dashboard</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Platform performance for this week</p>
        </div>
        <button onClick={fetchAnalytics} className="btn" style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem', background: 'rgba(51,65,85,0.3)', color: '#94a3b8', border: '1px solid transparent', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Claims', value: totalClaims, sub: 'This week', color: '#c084fc', icon: <FileText size={18} />, bg: 'rgba(168,85,247,0.1)' },
          { label: 'Active Policies', value: activePolicies.toLocaleString('en-IN'), sub: 'Across all zones', color: '#60a5fa', icon: <Users size={18} />, bg: 'rgba(96,165,250,0.1)' },
          { label: 'Total Payouts', value: `₹${(totalPayouts/1000).toFixed(0)}K`, sub: '7-day total', color: '#4ade80', icon: <IndianRupee size={18} />, bg: 'rgba(34,197,94,0.1)' },
          { label: 'Fraud Detected', value: totalFraud, sub: `${fraudRate}% fraud rate`, color: '#f87171', icon: <ShieldAlert size={18} />, bg: 'rgba(239,68,68,0.1)', alert: true },
        ].map((s, i) => (
          <div key={i} className="glass stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
              <div style={{ padding: '0.5rem', background: s.bg, borderRadius: '0.5rem', height: 'fit-content' }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Claims vs Fraud — 7 Day View</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.08)" />
              <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 11 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
              <Line type="monotone" dataKey="claims" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} name="Claims" />
              <Line type="monotone" dataKey="fraud" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Fraud" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Daily Payouts (₹)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.08)" />
              <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 11 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `₹${v/1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="payouts" fill="url(#purpleGrad)" radius={[4, 4, 0, 0]} name="Payouts (₹)" />
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Loss ratio */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem', marginBottom: '1rem' }}>Platform Health Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem' }}>
          {[
            { label: 'Loss Ratio', value: lossRatio, desc: 'Payouts / Premiums collected', color: '#4ade80' },
            { label: 'Claim Approval Rate', value: approvalRate, desc: 'Approved vs total submitted', color: '#60a5fa' },
            { label: 'Fraud Savings', value: fraudSavings, desc: 'Blocked fraudulent payouts', color: '#f87171' },
            { label: 'Avg Payout Time', value: avgPayoutTime, desc: 'From trigger to wallet credit', color: '#4ade80' },
          ].map((m, i) => (
            <div key={i} className="glass-light" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: m.color, marginTop: '0.25rem' }}>{m.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
