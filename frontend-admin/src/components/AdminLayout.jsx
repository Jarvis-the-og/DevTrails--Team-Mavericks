import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, AlertOctagon, MapPin, LogOut, Bell, Shield, Zap } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebaseConfig'

export default function AdminLayout({ user: firebaseUser }) {
  const navigate = useNavigate()
  const displayName = firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Admin'

  const logout = async () => {
    try { await signOut(auth) } catch (e) { console.warn(e) }
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', flexShrink: 0, padding: '1.5rem 1rem',
        borderRight: '1px solid rgba(168,85,247,0.15)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        background: 'rgba(10,10,15,0.95)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto'
      }}>
        {/* Logo */}
        <div style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '8px',
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><Shield size={16} color="white" /></div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f1f5f9' }}>
              Admin<span style={{ color: '#a855f7' }}>Panel</span>
            </span>
          </div>
        </div>

        {/* User pill */}
        <div className="glass-light" style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.875rem', color: 'white', flexShrink: 0
          }}>
            {displayName?.[0]?.toUpperCase() || 'A'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: '0.7rem', color: '#a855f7' }}>Super Admin</div>
          </div>
        </div>

        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} /> Analytics
        </NavLink>
        <NavLink to="/claims" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={18} /> Claims Manager
        </NavLink>
        <NavLink to="/fraud" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <AlertOctagon size={18} /> Fraud Monitor
        </NavLink>
        <NavLink to="/zones" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <MapPin size={18} /> Zone Risk
        </NavLink>
        <NavLink to="/triggers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          style={({ isActive }) => ({ color: isActive ? '#facc15' : undefined })}>
          <Zap size={18} /> Trigger Control
        </NavLink>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={logout} className="nav-link" style={{ color: '#f87171' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid rgba(168,85,247,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(10px)',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="pulse-dot" style={{ background: '#a855f7', boxShadow: '0 0 0 0 rgba(168,85,247,0.4)' }} />
            <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 500 }}>System Operational</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Bell size={20} />
          </button>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
