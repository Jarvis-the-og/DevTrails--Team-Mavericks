import { useState, useEffect } from 'react'
import { Zap, CloudRain, Wind, Waves, Ban, AlertTriangle, CheckCircle, Clock, RefreshCw, Play } from 'lucide-react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebaseConfig'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const TRIGGERS = [
  {
    id: 'heavy_rain',
    label: 'Heavy Rain',
    icon: <CloudRain size={20} color="#60a5fa" />,
    iconBg: 'rgba(96,165,250,0.1)',
    borderColor: '#3b82f6',
    description: 'Rainfall > 50mm in 3 hours — auto-triggers income protection',
    unit: 'mm/3hr',
    defaultValue: 75,
    min: 51,
    max: 200,
  },
  {
    id: 'aqi_alert',
    label: 'AQI Alert',
    icon: <Wind size={20} color="#a78bfa" />,
    iconBg: 'rgba(167,139,250,0.1)',
    borderColor: '#8b5cf6',
    description: 'Air Quality Index > 300 — outdoor work unsafe',
    unit: 'AQI',
    defaultValue: 350,
    min: 301,
    max: 500,
  },
  {
    id: 'flood_alert',
    label: 'Flood Alert',
    icon: <Waves size={20} color="#22d3ee" />,
    iconBg: 'rgba(34,211,238,0.1)',
    borderColor: '#06b6d4',
    description: 'Waterlogging / flood signal in delivery zone',
    unit: 'binary',
    defaultValue: 1,
    min: 1,
    max: 1,
    binary: true,
  },
  {
    id: 'zone_shutdown',
    label: 'Zone Shutdown',
    icon: <Ban size={20} color="#f87171" />,
    iconBg: 'rgba(248,113,113,0.1)',
    borderColor: '#ef4444',
    description: 'Government curfew or zone restriction signal',
    unit: 'binary',
    defaultValue: 1,
    min: 1,
    max: 1,
    binary: true,
  },
  {
    id: 'platform_outage',
    label: 'Platform Outage',
    icon: <AlertTriangle size={20} color="#f59e0b" />,
    iconBg: 'rgba(245,158,11,0.1)',
    borderColor: '#f59e0b',
    description: 'Delivery platform downtime > 60 minutes',
    unit: 'minutes',
    defaultValue: 90,
    min: 61,
    max: 480,
  },
]

const ZONES = ['HSR Layout', 'Koramangala', 'Indiranagar', 'Marathahalli', 'Whitefield', 'Electronic City']

export default function TriggerControl() {
  const [values, setValues] = useState(
    Object.fromEntries(TRIGGERS.map(t => [t.id, t.defaultValue]))
  )
  const [zone, setZone] = useState('HSR Layout')
  const [firing, setFiring] = useState(null)
  const [results, setResults] = useState({})
  const [recentTriggers, setRecentTriggers] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Real-time listener for recent trigger events
  useEffect(() => {
    const q = query(
      collection(db, 'trigger_events'),
      orderBy('timestamp', 'desc'),
      limit(20)
    )
    const unsub = onSnapshot(q, (snap) => {
      setRecentTriggers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoadingHistory(false)
    }, () => setLoadingHistory(false))
    return () => unsub()
  }, [])

  const fireTrigger = async (trigger) => {
    setFiring(trigger.id)
    try {
      const res = await fetch(`${API}/triggers/fire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: trigger.id,
          zone,
          value: values[trigger.id],
          affectedPlatforms: ['Zomato', 'Swiggy', 'Blinkit'],
          adminId: 'admin',
        })
      })
      const data = await res.json()
      setResults(r => ({ ...r, [trigger.id]: data }))
    } catch (err) {
      setResults(r => ({ ...r, [trigger.id]: { error: 'Failed to connect to backend' } }))
    }
    setFiring(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Trigger Control</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manually fire parametric triggers to initiate claim processing for eligible workers
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', padding: '0.4rem 0.875rem', borderRadius: '9999px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Engine Live</span>
          </div>
        </div>
      </div>

      {/* Zone selector */}
      <div className="glass" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>Target Zone:</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {ZONES.map(z => (
            <button key={z} onClick={() => setZone(z)} style={{
              padding: '0.35rem 0.875rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
              border: `1px solid ${zone === z ? 'rgba(34,197,94,0.5)' : 'rgba(51,65,85,0.5)'}`,
              background: zone === z ? 'rgba(34,197,94,0.12)' : 'transparent',
              color: zone === z ? '#4ade80' : '#64748b',
              transition: 'all 0.2s ease'
            }}>
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* Trigger Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {TRIGGERS.map(trigger => {
          const result = results[trigger.id]
          const isFiring = firing === trigger.id

          return (
            <div key={trigger.id} className="glass" style={{
              padding: '1.5rem', borderLeft: `3px solid ${trigger.borderColor}`,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.625rem', borderRadius: '0.625rem', background: trigger.iconBg, flexShrink: 0 }}>
                  {trigger.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>{trigger.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', lineHeight: 1.5 }}>{trigger.description}</div>
                </div>
              </div>

              {/* Value slider (hidden for binary triggers) */}
              {!trigger.binary && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Value</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{values[trigger.id]} {trigger.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={trigger.min} max={trigger.max}
                    value={values[trigger.id]}
                    onChange={e => setValues(v => ({ ...v, [trigger.id]: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: trigger.borderColor, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', color: '#475569' }}>{trigger.min}</span>
                    <span style={{ fontSize: '0.65rem', color: '#475569' }}>{trigger.max}</span>
                  </div>
                </div>
              )}

              {/* Result display */}
              {result && (
                <div style={{
                  padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem',
                  background: result.error ? 'rgba(239,68,68,0.08)' : result.triggered ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${result.error ? 'rgba(239,68,68,0.2)' : result.triggered ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  fontSize: '0.78rem',
                }}>
                  {result.error ? (
                    <span style={{ color: '#f87171' }}>⚠ {result.error}</span>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: result.triggered ? '#4ade80' : '#facc15', fontWeight: 600, marginBottom: '0.25rem' }}>
                        {result.triggered ? <CheckCircle size={13} /> : <Clock size={13} />}
                        {result.message}
                      </div>
                      {result.triggerId && (
                        <div style={{ color: '#475569', fontFamily: 'monospace' }}>ID: {result.triggerId.slice(0, 8)}...</div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Fire button */}
              <button
                onClick={() => fireTrigger(trigger)}
                disabled={isFiring}
                style={{
                  width: '100%', padding: '0.625rem', borderRadius: '0.5rem', cursor: isFiring ? 'wait' : 'pointer',
                  border: 'none', fontWeight: 700, fontSize: '0.875rem',
                  background: isFiring ? 'rgba(51,65,85,0.4)' : `linear-gradient(135deg, ${trigger.borderColor}dd, ${trigger.borderColor})`,
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {isFiring ? (
                  <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Firing...</>
                ) : (
                  <><Play size={14} /> Fire {trigger.label}</>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Recent Trigger Events (real-time) */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(51,65,85,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={16} color="#facc15" /> Recent Trigger Events
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} /> Live
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                {['Time', 'Type', 'Zone', 'Value', 'Status', 'Fired By'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.68rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Loading trigger history...</td></tr>
              ) : recentTriggers.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>No triggers fired yet. Use the controls above to test.</td></tr>
              ) : recentTriggers.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(51,65,85,0.2)' }}>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {t.timestamp ? new Date(t.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#f1f5f9', fontSize: '0.85rem' }}>
                    {TRIGGERS.find(tr => tr.id === t.triggerType)?.label || t.triggerType}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.82rem', color: '#94a3b8' }}>{t.zone}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600 }}>{t.value}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
                      background: t.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                      color: t.status === 'active' ? '#4ade80' : '#facc15',
                      border: `1px solid ${t.status === 'active' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    }}>
                      {t.status === 'active' ? <CheckCircle size={10} /> : <Clock size={10} />}
                      {t.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.78rem', color: '#64748b' }}>{t.firedBy || 'admin'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
