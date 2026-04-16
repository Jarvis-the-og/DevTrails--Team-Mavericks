import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebaseConfig'

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password)
      navigate('/')
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'No admin account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/invalid-email': 'Invalid email address.',
      }
      setError(messages[err.code] || 'Login failed. Check your credentials.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', background: 'linear-gradient(135deg, #0a0a0f 0%, #150d24 50%, #0a0a0f 100%)'
    }}>
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%', width: '500px', height: '500px',
        borderRadius: '50%', background: 'rgba(168,85,247,0.06)', filter: 'blur(80px)', pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: '1rem', marginBottom: '1rem',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            boxShadow: '0 0 30px rgba(168,85,247,0.3)'
          }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9' }}>Admin Access</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>Secure portal — authorized personnel only</p>
        </div>

        <div className="glass" style={{ padding: '2rem' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#f87171', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input className="input" style={{ paddingLeft: '2.5rem' }} type="email" placeholder="admin@parametric.ai" value={form.email} onChange={set('email')} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input className="input" style={{ paddingLeft: '2.5rem', borderColor: 'rgba(168,85,247,0.3)' }} type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}>
              {loading ? 'Verifying...' : <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Access Dashboard <ArrowRight size={16} /></span>}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(168,85,247,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(168,85,247,0.1)', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
            Use your Firebase admin account credentials to log in.
          </div>
        </div>
      </div>
    </div>
  )
}
