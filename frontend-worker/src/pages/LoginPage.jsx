import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebaseConfig'
import { Mail, Lock, User, Briefcase, ArrowRight, Shield, Phone } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({
    name: '', email: '', password: '', platform: 'Zomato', phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // Sign in with Firebase Auth
        await signInWithEmailAndPassword(auth, form.email, form.password)
      } else {
        // Create account with Firebase Auth
        const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password)

        // Set display name
        await updateProfile(user, { displayName: form.name })

        // Save worker profile to Firestore users collection
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: form.name,
          email: form.email,
          phone: form.phone,
          platform: form.platform,
          plan: 'basic',
          trustScore: 1.0,
          createdAt: serverTimestamp(),
        })
      }
      navigate('/')
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/invalid-credential': 'Invalid email or password.',
      }
      setError(messages[err.code] || err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)'
    }}>
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(34,197,94,0.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'rgba(59,130,246,0.05)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: '1rem', marginBottom: '1rem',
            background: 'linear-gradient(135deg,#16a34a,#22c55e)',
            boxShadow: '0 0 30px rgba(34,197,94,0.3)'
          }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>
            {isLogin ? 'Welcome back' : 'Start earning safely'}
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {isLogin ? 'Sign in to your worker account' : 'Create your gig worker insurance account'}
          </p>
        </div>

        <div className="glass" style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem',
              color: '#f87171', fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                  <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Rahul Kumar" value={form.name} onChange={set('name')} required={!isLogin} />
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Platform</label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                  <select className="input" style={{ paddingLeft: '2.5rem' }} value={form.platform} onChange={set('platform')}>
                    {['Zomato','Swiggy','Ola','Uber','Zepto','Blinkit','Dunzo'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                  <input className="input" style={{ paddingLeft: '2.5rem' }} type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input className="input" style={{ paddingLeft: '2.5rem' }} type="email" placeholder="rahul@example.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input className="input" style={{ paddingLeft: '2.5rem' }} type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}>
              {loading ? 'Authenticating...' : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid rgba(51,65,85,0.5)', paddingTop: '1.5rem' }}>
            <button onClick={() => { setIsLogin(!isLogin); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', fontSize: '0.875rem', fontWeight: 500 }}>
              {isLogin ? "New gig worker? Create account →" : "Already have an account? Sign in →"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#334155', fontSize: '0.75rem' }}>
          Protected by Firebase Auth · AI-powered parametric insurance
        </p>
      </div>
    </div>
  )
}
