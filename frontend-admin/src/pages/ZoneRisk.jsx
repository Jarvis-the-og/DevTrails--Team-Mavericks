import { useState, useEffect } from 'react'
import { MapPin, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const riskConfig = {
  HIGH: { badgeClass: 'badge-red', label: 'High Risk', barColor: '#ef4444', glow: 'rgba(239,68,68,0.2)' },
  MEDIUM: { badgeClass: 'badge-yellow', label: 'Medium Risk', barColor: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  LOW: { badgeClass: 'badge-green', label: 'Low Risk', barColor: '#22c55e', glow: 'rgba(34,197,94,0.1)' },
}

const TrendIcon = ({ t }) => t === 'up' ? <TrendingUp size={14} color="#f87171" /> : t === 'down' ? <TrendingDown size={14} color="#4ade80" /> : <Minus size={14} color="#94a3b8" />

export default function ZoneRisk() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchZones = () => {
    setLoading(true)
    fetch(`${API}/zones`)
      .then(res => res.json())
      .then(data => {
        if (data.zones) setZones(data.zones)
        setLoading(false)
      })
      .catch(err => { console.error(err); setLoading(false) })
  }

  useEffect(() => {
    fetchZones()
  }, [])

  if (loading && zones.length === 0) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading zone data from database...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Zone Risk Map</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Geographic risk analysis driving dynamic premium pricing</p>
        </div>
        <button onClick={fetchZones} className="btn" style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem', background: 'rgba(51,65,85,0.3)', color: '#94a3b8', border: '1px solid transparent', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="glass" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Risk Legend:</span>
        {Object.entries(riskConfig).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.barColor }} />
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{v.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#64748b' }}>
          Trend: <TrendingUp size={12} style={{ display: 'inline', color: '#f87171' }} /> Rising &nbsp;
          <TrendingDown size={12} style={{ display: 'inline', color: '#4ade80' }} /> Falling &nbsp;
          <Minus size={12} style={{ display: 'inline', color: '#94a3b8' }} /> Stable
        </div>
      </div>

      {/* Zone Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '1rem' }}>
        {zones.map((z, i) => {
          const rc = riskConfig[z.risk] || riskConfig.LOW
          return (
            <div key={i} className="glass" style={{ padding: '1.5rem', borderTop: `3px solid ${rc.barColor}`, background: `linear-gradient(135deg, ${rc.glow}, transparent)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <MapPin size={14} color={rc.barColor} />
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>{z.name}</span>
                    <TrendIcon t={z.trend} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{z.city} · {z.workers} active workers</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: rc.barColor, lineHeight: 1 }}>₹{z.premiumAdj >= 0 ? z.premiumAdj : z.premiumAdj}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>adj / week</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem' }}>
                <span className={`badge ${rc.badgeClass}`}>{rc.label}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>{z.weekClaims} claims this week</span>
              </div>

              {/* Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.3rem' }}>
                    <span>Flood Probability</span>
                    <span style={{ color: rc.barColor, fontWeight: 700 }}>{(z.floodProb * 100).toFixed(0)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${z.floodProb * 100}%`, background: `linear-gradient(90deg, ${rc.barColor}99, ${rc.barColor})` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.3rem' }}>
                    <span>Avg AQI</span>
                    <span style={{ color: z.aqiAvg > 200 ? '#f87171' : z.aqiAvg > 150 ? '#facc15' : '#4ade80', fontWeight: 700 }}>{z.aqiAvg}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(100, z.aqiAvg / 3)}%`, background: `linear-gradient(90deg, #d97706, #f59e0b)` }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
