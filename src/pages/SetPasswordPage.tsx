import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authApi } from '../api/auth'

type Step = 'sending' | 'otp' | 'password' | 'done'

export default function SetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const email = params.get('email') ?? ''

  const [step, setStep] = useState<Step>('sending')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Auto-send OTP on mount
  useEffect(() => {
    if (!email) {
      navigate('/login')
      return
    }
    sendOTP()
  }, [])

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function sendOTP() {
    setStep('sending')
    setError('')
    try {
      await authApi.sendOTP(email, 'set_password')
      setStep('otp')
      setCountdown(60)
    } catch {
      setError('Failed to send OTP. Please try again.')
      setStep('otp')
    }
  }

  const handleOTPSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      setError('Enter the 6-digit code sent to your email.')
      return
    }
    setError('')
    setStep('password')
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(email, code, password)
      setStep('done')
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to set password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/konfig.svg" alt="Konfig" width={40} height={40} />
          <h1>Konfig</h1>
        </div>

        {step === 'sending' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <span className="spinner" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Sending verification code to <strong>{email}</strong>…
            </p>
          </div>
        )}

        {step === 'otp' && (
          <>
            <h2 className="auth-title">Check your email</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <form onSubmit={handleOTPSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="code">Verification code</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="form-control"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  required
                  style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="btn btn-primary auth-submit" type="submit">
                Verify code
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: 13, marginTop: 12, color: 'var(--text-muted)' }}>
              {countdown > 0
                ? `Resend code in ${countdown}s`
                : (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={sendOTP}
                    style={{ fontSize: 13, padding: '2px 6px' }}
                  >
                    Resend code
                  </button>
                )}
            </p>
          </>
        )}

        {step === 'password' && (
          <>
            <h2 className="auth-title">Set your password</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
              Choose a password for <strong>{email}</strong>
            </p>
            <form onSubmit={handlePasswordSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm">Confirm password</label>
                <input
                  id="confirm"
                  type="password"
                  className="form-control"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : 'Set password'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <h2 className="auth-title" style={{ marginBottom: 8 }}>Password set!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
              You can now sign in with your new password.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
