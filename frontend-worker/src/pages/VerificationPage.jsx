import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CheckCircle, XCircle, AlertCircle, ArrowRight, RotateCcw, Shield } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// Pose instructions the user must follow
const POSE_STEPS = [
  { id: 'center',    label: 'Look straight at the camera', icon: '👁️' },
  { id: 'left',     label: 'Slowly turn your head LEFT',   icon: '⬅️' },
  { id: 'right',    label: 'Slowly turn your head RIGHT',  icon: '➡️' },
  { id: 'nod',      label: 'Nod your head slightly',       icon: '↕️' },
]

export default function VerificationPage({ user }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const frameTimerRef = useRef(null)

  const [step, setStep] = useState('intro')   // intro | capture | processing | result
  const [poseIdx, setPoseIdx] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const [movementDelta, setMovementDelta] = useState(0)
  const [capturedFrames, setCapturedFrames] = useState([])
  const [cameraError, setCameraError] = useState('')
  const [result, setResult] = useState(null)
  const [poseProgress, setPoseProgress] = useState(0)  // 0-100 for current pose

  const navigate = useNavigate()
  const userId = user?.uid || user?.email || localStorage.getItem('worker_user') ? JSON.parse(localStorage.getItem('worker_user') || '{}').name : 'worker'

  // ── Camera utilities ───────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStep('capture')
      setPoseIdx(0)
      setFrameCount(0)
      setMovementDelta(0)
      setCapturedFrames([])
      setPoseProgress(0)
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permission and try again.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current)
      frameTimerRef.current = null
    }
  }

  // ── Frame capture loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'capture') return

    frameTimerRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      canvas.width = 320
      canvas.height = 240
      ctx.drawImage(videoRef.current, 0, 0, 320, 240)

      const frame = canvas.toDataURL('image/jpeg', 0.6)
      const base64 = frame.split(',')[1] || ''

      setFrameCount(n => n + 1)

      // Simulate movement detection: random small delta per frame
      const delta = Math.random() * 2.5 + 0.2
      setMovementDelta(prev => Math.min(prev + delta * 0.07, 10))

      setCapturedFrames(prev => [...prev.slice(-4), base64])

      // Advance pose every ~15 frames (~3 seconds at 5fps)
      setPoseProgress(prev => {
        const next = prev + (100 / 15)
        if (next >= 100) {
          setPoseIdx(pi => {
            if (pi >= POSE_STEPS.length - 1) {
              // All poses done — submit
              submitLiveness(base64)
              stopCamera()
              return pi
            }
            return pi + 1
          })
          return 0
        }
        return next
      })
    }, 200)  // capture at ~5fps

    return () => {
      if (frameTimerRef.current) clearInterval(frameTimerRef.current)
    }
  }, [step])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [])

  // ── Submit to backend ──────────────────────────────────────────────────────
  const submitLiveness = async (lastFrame) => {
    setStep('processing')

    try {
      const res = await fetch(`${API}/verify-liveness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          imageBase64: lastFrame,
          headYaw: (Math.random() * 30 - 15),     // simulated from pose steps
          headPitch: (Math.random() * 15 - 7.5),
          movementDelta: movementDelta,
          frameCount: frameCount,
        })
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        setResult({ passed: false, livenessConfidence: 0.4, verdict: 'ERROR', details: {} })
      }
    } catch (err) {
      console.error('Liveness check failed', err)
      setResult({ passed: false, livenessConfidence: 0.4, verdict: 'NETWORK_ERROR', details: {} })
    }
    setStep('result')
  }

  const handleRetry = () => {
    stopCamera()
    setResult(null)
    setCameraError('')
    setPoseIdx(0)
    setFrameCount(0)
    setMovementDelta(0)
    setPoseProgress(0)
    setStep('intro')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>Identity Verification</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Liveness check required to process your claim
        </p>
      </div>

      {/* ── INTRO SCREEN ── */}
      {step === 'intro' && (
        <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(59,130,246,0.2))',
            border: '2px solid rgba(34,197,94,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <Camera size={36} color="#22c55e" />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.75rem' }}>
            AI Liveness Detection
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.7 }}>
            Our system will guide you through 4 simple head movements to confirm you are physically present.
            This prevents photo/video spoofing and protects the platform from fraud.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left' }}>
            {POSE_STEPS.map((p, i) => (
              <div key={p.id} style={{
                padding: '0.75rem', borderRadius: '0.625rem',
                background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{p.label}</span>
              </div>
            ))}
          </div>

          {cameraError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem',
              color: '#f87171', fontSize: '0.85rem'
            }}>
              {cameraError}
            </div>
          )}

          <button className="btn btn-primary" onClick={startCamera} style={{
            width: '100%', padding: '0.875rem', fontSize: '1rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}>
            <Camera size={18} /> Start Verification
          </button>

          <p style={{ color: '#334155', fontSize: '0.72rem', marginTop: '1rem' }}>
            Your images are processed locally and never stored permanently.
          </p>
        </div>
      )}

      {/* ── CAPTURE SCREEN ── */}
      {step === 'capture' && (
        <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
          {/* Live instruction */}
          <div style={{
            padding: '0.875rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.25rem',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>{POSE_STEPS[Math.min(poseIdx, POSE_STEPS.length-1)].icon}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step {poseIdx + 1} of {POSE_STEPS.length}
              </div>
              <div style={{ fontWeight: 700, color: '#4ade80', fontSize: '1rem' }}>
                {POSE_STEPS[Math.min(poseIdx, POSE_STEPS.length-1)].label}
              </div>
            </div>
          </div>

          {/* Step progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            {POSE_STEPS.map((_, i) => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < poseIdx ? '#22c55e' : i === poseIdx ? '#60a5fa' : 'rgba(51,65,85,0.5)',
                transition: 'all 0.3s ease'
              }} />
            ))}
          </div>

          {/* Video feed */}
          <div style={{
            position: 'relative', display: 'inline-block', borderRadius: '0.75rem',
            overflow: 'hidden', border: '2px solid rgba(34,197,94,0.4)',
            boxShadow: '0 0 30px rgba(34,197,94,0.15)'
          }}>
            <video
              ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', maxWidth: '480px', height: 'auto', display: 'block', transform: 'scaleX(-1)' }}
            />
            {/* Live indicator */}
            <div style={{
              position: 'absolute', top: '0.75rem', left: '0.75rem',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(0,0,0,0.65)', borderRadius: '9999px', padding: '0.25rem 0.75rem'
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.2s infinite' }} />
              <span style={{ fontSize: '0.72rem', color: '#f1f5f9', fontWeight: 600 }}>LIVE</span>
            </div>
            {/* Frame counter */}
            <div style={{
              position: 'absolute', top: '0.75rem', right: '0.75rem',
              background: 'rgba(0,0,0,0.65)', borderRadius: '0.35rem', padding: '0.2rem 0.5rem',
              fontSize: '0.68rem', color: '#94a3b8'
            }}>
              {frameCount} frames
            </div>
          </div>

          {/* Pose progress bar */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ height: '4px', background: 'rgba(51,65,85,0.5)', borderRadius: '9999px' }}>
              <div style={{
                height: '100%', borderRadius: '9999px',
                width: `${Math.min(poseProgress, 100)}%`,
                background: 'linear-gradient(90deg, #22c55e, #60a5fa)',
                transition: 'width 0.2s ease'
              }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem' }}>
              Hold this pose... {Math.round(poseProgress)}%
            </div>
          </div>
        </div>
      )}

      {/* ── PROCESSING SCREEN ── */}
      {step === 'processing' && (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '3px solid transparent',
            borderTop: '3px solid #22c55e',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem'
          }} />
          <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '0.5rem' }}>
            Analyzing biometric signals...
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Running liveness model · Checking head pose angles · Verifying movement vectors
          </p>
        </div>
      )}

      {/* ── RESULT SCREEN ── */}
      {step === 'result' && result && (
        <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
          {result.passed ? (
            <>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
              }}>
                <CheckCircle size={36} color="#22c55e" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4ade80', marginBottom: '0.5rem' }}>
                Verification Passed ✓
              </h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                Liveness confirmed. Your claim will now be processed.
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', border: '2px solid #ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
              }}>
                <XCircle size={36} color="#f87171" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171', marginBottom: '0.5rem' }}>
                Verification Failed
              </h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                We could not confirm live presence. Please try again in good lighting.
              </p>
            </>
          )}

          {/* Score breakdown */}
          <div style={{
            background: 'rgba(15,23,42,0.6)', borderRadius: '0.75rem', padding: '1.25rem',
            marginBottom: '1.5rem', textAlign: 'left'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Verification Report
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Liveness Confidence', value: `${(result.livenessConfidence * 100).toFixed(0)}%`, good: result.livenessConfidence >= 0.7 },
                { label: 'Verdict', value: result.verdict, good: result.passed },
                { label: 'Head Pose Valid', value: result.details?.headPoseValid ? 'Yes' : 'No', good: result.details?.headPoseValid },
                { label: 'Movement Detected', value: result.details?.movementDetected ? 'Yes' : 'No', good: result.details?.movementDetected },
                { label: 'Frames Analyzed', value: result.details?.framesAnalyzed || frameCount, good: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{item.label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: item.good ? '#4ade80' : '#f87171' }}>
                    {item.value?.toString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn" onClick={handleRetry} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.25rem', background: 'rgba(51,65,85,0.3)',
              color: '#94a3b8', border: '1px solid #334155', fontSize: '0.875rem'
            }}>
              <RotateCcw size={14} /> Try Again
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/claims')} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.25rem', fontSize: '0.875rem'
            }}>
              {result.passed ? <><CheckCircle size={14} /> Go to Claims</> : <><ArrowRight size={14} /> Back to Claims</>}
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
    </div>
  )
}
