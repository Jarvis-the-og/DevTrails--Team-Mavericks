import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebaseConfig'

import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ClaimsPage from './pages/ClaimsPage'
import PolicyPage from './pages/PolicyPage'
import VerificationPage from './pages/VerificationPage'
import Layout from './components/Layout'

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
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // Listen to Firebase Auth state — works even on page refresh
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute user={firebaseUser} loading={authLoading}>
              <Layout user={firebaseUser} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard user={firebaseUser} />} />
          <Route path="claims" element={<ClaimsPage user={firebaseUser} />} />
          <Route path="policy" element={<PolicyPage user={firebaseUser} />} />
          <Route path="verify" element={<VerificationPage user={firebaseUser} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
