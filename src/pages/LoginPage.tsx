import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'
import { getOrgSlug } from '../utils/subdomain'
import { logger } from '../lib/logger'

type Method = 'otp' | 'totp'
type OTPStep = 'email' | 'code'
type TOTPStep = 'email' | 'enroll' | 'code'

export default function LoginPage() {
  const { googleLogin, refreshUser } = useAuth()
  const navigate = useNavigate()
  const orgSlug = getOrgSlug()

  const [method, setMethod] = useState<Method>('otp')

  // ── OTP state ─────────────────────────────────────────────────────────────
  const [otpStep, setOtpStep] = useState<OTPStep>('email')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [countdown, setCountdown] = useState(0)

  // ── TOTP state ────────────────────────────────────────────────────────────
  const [totpStep, setTotpStep] = useState<TOTPStep>('email')
  const [totpEmail, setTotpEmail] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpQR, setTotpQR] = useState('')        // base64 PNG for new enrolment
  const [totpSecret, setTotpSecret] = useState('') // plaintext secret for manual entry / re-submission
  const [totpEnrolled, setTotpEnrolled] = useState(false)

  // ── Shared ────────────────────────────────────────────────────────────────
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMethod(m: Method) {
    logger.debug('login: method switched', { method: m })
    setMethod(m)
    setError('')
  }

  // ── OTP handlers ──────────────────────────────────────────────────────────
  function startCountdown() {
    setCountdown(60)
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const handleSendOTP = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    logger.debug('otp: sending code', { email: otpEmail, org_slug: orgSlug ?? null })
    try {
      await authApi.sendOTP(otpEmail, 'login', orgSlug ?? undefined)
      logger.debug('otp: code sent successfully', { email: otpEmail })
      setOtpStep('code')
      startCountdown()
    } catch (e: any) {
      logger.warn('otp: failed to send code', { email: otpEmail, error: e?.message })
      setError(e?.message || 'Failed to send code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setLoading(true)
    logger.debug('otp: resending code', { email: otpEmail })
    try {
      await authApi.sendOTP(otpEmail, 'login', orgSlug ?? undefined)
      logger.debug('otp: code resent successfully', { email: otpEmail })
      startCountdown()
    } catch {
      logger.warn('otp: resend failed', { email: otpEmail })
      setError('Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    logger.debug('otp: verifying code', { email: otpEmail })
    try {
      await authApi.loginWithOTP(otpEmail, otpCode)
      logger.info('user login', { email: otpEmail, method: 'otp' })
      await refreshUser()
      navigate('/')
    } catch (err: any) {
      logger.warn('otp: login failed', { email: otpEmail, error: err?.response?.data?.error })
      setError(err?.response?.data?.error || 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  // ── TOTP handlers ─────────────────────────────────────────────────────────
  const handleTOTPEmail = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    logger.debug('totp: checking enrolment status', { email: totpEmail })
    try {
      const res = await authApi.totpInit(totpEmail)
      if (res.enrolled) {
        logger.debug('totp: user already enrolled, showing code input', { email: totpEmail })
        setTotpEnrolled(true)
        setTotpStep('code')
      } else {
        logger.debug('totp: user not enrolled, showing QR for first-time setup', { email: totpEmail })
        setTotpQR(res.qr)
        setTotpSecret(res.secret)
        setTotpEnrolled(false)
        setTotpStep('enroll')
      }
    } catch (err: any) {
      logger.warn('totp: init request failed', { email: totpEmail, error: err?.response?.data?.error })
      setError(err?.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleTOTPLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    logger.debug('totp: submitting code', { email: totpEmail, first_enrolment: !totpEnrolled })
    try {
      // Pass the secret only during first-time enrolment (brand-new users have no pending DB row).
      await authApi.totpLogin(totpEmail, totpCode, totpEnrolled ? undefined : totpSecret)
      logger.info('user login', { email: totpEmail, method: 'totp', first_enrolment: !totpEnrolled })
      await refreshUser()
      navigate('/')
    } catch (err: any) {
      logger.warn('totp: login failed', { email: totpEmail, error: err?.response?.data?.error })
      setError(err?.response?.data?.error || 'Invalid authenticator code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/konfig.svg" alt="K" width={48} height={48} />
          <h1>onfig</h1>
        </div>

        {/* Method tabs — only show on the email entry step */}
        {(otpStep === 'email' && method === 'otp') || (totpStep === 'email' && method === 'totp') ? (
          <>
            <button className="btn btn-google" onClick={googleLogin} type="button">
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="auth-divider"><span>or sign in with email</span></div>

            <div className="auth-method-tabs">
              <div className={`auth-tab-slider${method === 'totp' ? ' slide-right' : ''}`} />
              <button
                type="button"
                className={`auth-method-tab${method === 'otp' ? ' active' : ''}`}
                onClick={() => switchMethod('otp')}
              >
                <EnvelopeIcon size={14} />
                Email code
              </button>
              <button
                type="button"
                className={`auth-method-tab${method === 'totp' ? ' active' : ''}`}
                onClick={() => switchMethod('totp')}
              >
                <KeyIcon size={14} />
                Authenticator app
              </button>
            </div>
          </>
        ) : null}

        {/* ── OTP flow ─────────────────────────────────────────────────── */}
        {method === 'otp' && (
          <>
            {otpStep === 'email' && (
              <>
                <h2 className="auth-title">Welcome back</h2>
                <form onSubmit={handleSendOTP} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="otp-email">Email</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon"><EnvelopeIcon size={15} /></span>
                      <input
                        id="otp-email"
                        type="email"
                        className="form-control"
                        value={otpEmail}
                        onChange={e => setOtpEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
                    {loading ? <span className="spinner spinner-sm" /> : 'Send code'}
                  </button>
                </form>
              </>
            )}

            {otpStep === 'code' && (
              <>
                <h2 className="auth-title">Check your email</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
                  We sent a 6-digit code to <strong>{otpEmail}</strong>
                </p>
                <form onSubmit={handleVerifyOTP} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="otp-code">Verification code</label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="form-control"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoFocus
                      required
                      style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
                    />
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
                    {loading ? <span className="spinner spinner-sm" /> : 'Sign in'}
                  </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                  {countdown > 0 ? `Resend in ${countdown}s` : (
                    <button className="btn btn-ghost btn-sm" onClick={handleResend} disabled={loading}
                      style={{ fontSize: 13, padding: '2px 6px' }}>
                      Resend code
                    </button>
                  )}
                  {' · '}
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => { setOtpStep('email'); setOtpCode(''); setError('') }}
                    style={{ fontSize: 13, padding: '2px 6px' }}>
                    Change email
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── TOTP flow ─────────────────────────────────────────────────── */}
        {method === 'totp' && (
          <>
            {totpStep === 'email' && (
              <>
                <h2 className="auth-title">Welcome back</h2>
                <form onSubmit={handleTOTPEmail} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="totp-email">Email</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon"><EnvelopeIcon size={15} /></span>
                      <input
                        id="totp-email"
                        type="email"
                        className="form-control"
                        value={totpEmail}
                        onChange={e => setTotpEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
                    {loading ? <span className="spinner spinner-sm" /> : 'Continue'}
                  </button>
                </form>
              </>
            )}

            {totpStep === 'enroll' && (
              <>
                <h2 className="auth-title">Set up authenticator</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                  Scan this QR code with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <img src={totpQR} alt="TOTP QR code" width={200} height={200}
                    style={{ borderRadius: 8, border: '1px solid var(--border)', background: '#fff', padding: 4 }} />
                </div>
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Can't scan? Enter the key manually
                  </summary>
                  <code style={{
                    display: 'block', marginTop: 8, padding: '8px 12px', background: 'var(--surface-2)',
                    borderRadius: 6, fontSize: 13, letterSpacing: '0.1em', wordBreak: 'break-all',
                  }}>
                    {totpSecret}
                  </code>
                </details>
                <form onSubmit={handleTOTPLogin} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="totp-enroll-code">Authenticator code</label>
                    <input
                      id="totp-enroll-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="form-control"
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoFocus
                      required
                      style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
                    />
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button className="btn btn-primary auth-submit" type="submit" disabled={loading || totpCode.length < 6}>
                    {loading ? <span className="spinner spinner-sm" /> : 'Verify & sign in'}
                  </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => { setTotpStep('email'); setTotpCode(''); setError('') }}
                    style={{ fontSize: 13, padding: '2px 6px' }}>
                    Change email
                  </button>
                </div>
              </>
            )}

            {totpStep === 'code' && (
              <>
                <h2 className="auth-title">Enter your code</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
                  Open your authenticator app and enter the code for <strong>{totpEmail}</strong>
                </p>
                <form onSubmit={handleTOTPLogin} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="totp-code">Authenticator code</label>
                    <input
                      id="totp-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="form-control"
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoFocus
                      required
                      style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
                    />
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button className="btn btn-primary auth-submit" type="submit" disabled={loading || totpCode.length < 6}>
                    {loading ? <span className="spinner spinner-sm" /> : 'Sign in'}
                  </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => { setTotpStep('email'); setTotpCode(''); setError('') }}
                    style={{ fontSize: 13, padding: '2px 6px' }}>
                    Change email
                  </button>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}

function EnvelopeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1.5 4L8 9.5L14.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function KeyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5.5" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8.5 7H15M13 5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
