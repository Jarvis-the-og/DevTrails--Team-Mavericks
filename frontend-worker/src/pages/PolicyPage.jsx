import { useState, useEffect } from 'react'
import { Shield, CloudRain, Wind, MapPin, CheckCircle, IndianRupee, CreditCard, Loader2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

const PLAN_PRICES = {
  basic:    29,
  standard: 49,
  pro:      79,
}

export default function PolicyPage() {
  const user = JSON.parse(localStorage.getItem('worker_user') || '{"name":"Rahul","platform":"Zomato","email":"rahul@example.com","phone":""}')
  
  const [upiId, setUpiId] = useState(localStorage.getItem('worker_upi') || '')
  const [isUpiSaved, setIsUpiSaved] = useState(!!localStorage.getItem('worker_upi'))
  
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [activePlan, setActivePlan] = useState(localStorage.getItem('worker_plan') || 'basic')
  const [dynamicPremium, setDynamicPremium] = useState(null)
  const [payingPlan, setPayingPlan] = useState(null) // which plan is currently paying

  useEffect(() => {
    setLoadingPlans(true)
    fetch(`${API}/plans`)
      .then(res => res.json())
      .then(data => {
        if (data.plans) setPlans(data.plans)
        setLoadingPlans(false)
      })
      .catch(err => { console.error(err); setLoadingPlans(false) })
  }, [])

  useEffect(() => {
    fetch(`${API}/premium/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        plan: activePlan, 
        zone: 'hsr_layout', 
        platform: user.platform.toLowerCase() 
      })
    })
      .then(res => res.json())
      .then(data => setDynamicPremium(data))
      .catch(console.error)
  }, [activePlan, user.platform])

  const saveUpi = () => {
    if(upiId.trim() !== '') {
      localStorage.setItem('worker_upi', upiId)
      setIsUpiSaved(true)
    }
  }

  // ─── Razorpay Payment Flow ───────────────────────────────────
  const handlePayment = async (plan) => {
    setPayingPlan(plan.id)

    try {
      // 1. Create order on backend
      const orderRes = await fetch(`${API}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          planLabel: plan.label,
          amount: PLAN_PRICES[plan.id] || plan.weekly_premium,
          userId: user.name
        })
      })

      if (!orderRes.ok) {
        throw new Error('Failed to create order')
      }

      const orderData = await orderRes.json()

      // 2. Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ParametricGuard',
        description: `${plan.label} Plan — Weekly Premium`,
        order_id: orderData.orderId,
        prefill: {
          name: user.name,
          email: user.email || '',
          contact: user.phone || '',
        },
        theme: {
          color: '#22c55e',
          backdrop_color: 'rgba(15,23,42,0.85)',
        },
        handler: async function (response) {
          // 3. Verify payment on backend
          try {
            const verifyRes = await fetch(`${API}/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
                userId: user.name,
                amount: PLAN_PRICES[plan.id] || plan.weekly_premium,
              })
            })

            if (verifyRes.ok) {
              setActivePlan(plan.id)
              localStorage.setItem('worker_plan', plan.id)
              alert(`Payment successful! ${plan.label} plan is now active.`)
            } else {
              alert('Payment verification failed. Please contact support.')
            }
          } catch (err) {
            console.error(err)
            alert('Error verifying payment.')
          }
          setPayingPlan(null)
        },
        modal: {
          ondismiss: function () {
            setPayingPlan(null)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        alert(`Payment failed: ${response.error.description}`)
        setPayingPlan(null)
      })
      rzp.open()

    } catch (err) {
      console.error(err)
      alert('Failed to initiate payment. Please try again.')
      setPayingPlan(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>My Policy & Payout</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.2rem' }}>Manage your coverage and payout preferences.</p>
      </div>

      {/* UPI Details Section */}
      <div className="glass glass-padded" style={{ padding: '1.5rem', borderLeft: '3px solid #3b82f6' }}>
        <h3 style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.75rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <IndianRupee size={16} className="text-blue-400" /> Payout Details
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1rem' }}>Enter your UPI ID to receive instant automated claim payouts directly to your bank account.</p>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>UPI ID</label>
            <input 
              className="input" 
              type="text" 
              placeholder="e.g. rahul@okicici" 
              value={upiId} 
              onChange={e => {
                setUpiId(e.target.value)
                setIsUpiSaved(false)
              }} 
            />
          </div>
          <button onClick={saveUpi} className="btn btn-primary" style={{ height: '42px', padding: '0 1.5rem' }}>
            {isUpiSaved ? <><CheckCircle size={15}/> Saved</> : 'Save UPI'}
          </button>
        </div>
      </div>

      {/* Active Policy Banner */}
      <div className="glass" style={{ padding: '1.5rem', background: 'linear-gradient(135deg,rgba(34,197,94,0.1),rgba(15,23,42,0.9))', borderTop: '3px solid #22c55e', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: '0.625rem' }}>Active Coverage</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', textTransform: 'capitalize' }}>{activePlan} Parametric Plan</h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.2rem' }}>Payouts capped strictly to the plan limit.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>
              ₹{dynamicPremium ? dynamicPremium.weekly_premium : '...'}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>dynamic premium/week</div>
          </div>
        </div>

        <div className="policy-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
          {[
            { icon: <Shield size={15} />, label: 'Max Payout / Week', value: `₹${dynamicPremium ? dynamicPremium.weekly_cap : '...'}` },
            { icon: <CloudRain size={15} />, label: 'Rain Trigger', value: '> 50mm strict' },
            { icon: <Wind size={15} />, label: 'AQI Alert', value: '> 300 AQI' },
            { icon: <MapPin size={15} />, label: 'Zone', value: 'HSR Layout' },
          ].map((item, i) => (
            <div key={i} className="glass-light" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e', flexShrink: 0 }}>{item.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Plans */}
      <h3 style={{ fontWeight: 700, color: '#f1f5f9', marginTop: '0.5rem', fontSize: '1rem' }}>Available Plans</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {loadingPlans ? (
          <div className="glass" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}>Loading plans...</div>
        ) : plans.map(plan => {
          const price = PLAN_PRICES[plan.id] || plan.weekly_premium
          const isActive = plan.id === activePlan
          const isPaying = payingPlan === plan.id

          return (
            <div key={plan.id} className="glass stat-card" style={{
              borderTop: isActive ? '3px solid #22c55e' : '3px solid #475569',
              opacity: isActive ? 1 : 0.9,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>{plan.label}</h4>
                {isActive && <span className="badge badge-green">Current</span>}
              </div>

              {/* Price tag */}
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: isActive ? '#22c55e' : '#60a5fa' }}>₹{price}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}> / week</span>
              </div>
              
              <div style={{ marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                Maximum Claim Payout: <strong style={{ color: '#f1f5f9' }}>₹{plan.weekly_cap || plan.cap} / week</strong>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {plan.features?.map((feat, idx) => (
                  <li key={idx} style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle size={12} color="#22c55e" /> {feat}
                  </li>
                ))}
              </ul>

              {isActive ? (
                <div style={{
                  width: '100%', padding: '0.6rem', borderRadius: '0.5rem',
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  color: '#4ade80', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}>
                  <CheckCircle size={15} /> Active Plan
                </div>
              ) : (
                <button
                  onClick={() => handlePayment(plan)}
                  disabled={isPaying}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.65rem',
                    background: isPaying ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #16a34a, #22c55e)',
                    cursor: isPaying ? 'wait' : 'pointer',
                    fontSize: '0.9rem', fontWeight: 700,
                  }}
                >
                  {isPaying ? (
                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                  ) : (
                    <><CreditCard size={16} /> Pay ₹{price} — {plan.label}</>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Payment Info */}
      <div className="glass" style={{ padding: '1rem 1.5rem', borderLeft: '3px solid #64748b' }}>
        <p style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: 1.6 }}>
          <strong style={{ color: '#94a3b8' }}>Secure Payments via Razorpay</strong> — All payments are processed securely through Razorpay's PCI DSS compliant infrastructure. 
          After successful payment, your plan is activated instantly. You can upgrade or downgrade anytime.
        </p>
      </div>
    </div>
  )
}
