import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebaseConfig'

import AdminLogin from './pages/AdminLogin'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import ClaimsManager from './pages/ClaimsManager'
import FraudMonitor from './pages/FraudMonitor'
import ZoneRisk from './pages/ZoneRisk'
import TriggerControl from './pages/TriggerControl'
import AdminLayout from './components/AdminLayout'

function ProtectedRoute({ children, user, loading }) {
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0f172a', color: '#64748b', fontSize: '0.9rem'
      }}>
        Authenticating...
      </div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [adminUser, setAdminUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route
          path="/"
          element={
            <ProtectedRoute user={adminUser} loading={authLoading}>
              <AdminLayout user={adminUser} />
            </ProtectedRoute>
          }
        >
          <Route index element={<AnalyticsDashboard />} />
          <Route path="claims" element={<ClaimsManager />} />
          <Route path="fraud" element={<FraudMonitor />} />
          <Route path="zones" element={<ZoneRisk />} />
          <Route path="triggers" element={<TriggerControl />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
