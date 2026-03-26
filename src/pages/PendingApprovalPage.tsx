import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function PendingApprovalPage() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleRefresh = async () => {
    await refreshUser()
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: 480, width: '100%', margin: '0 20px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>⏳</div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>
          Waiting for Approval
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
          Your request to join the organization has been submitted.
          An admin needs to approve your access before you can use Konfig.
        </p>

        {user && (
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px', marginBottom: 24, textAlign: 'left',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.6px' }}>
              Your account
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user.email}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#f59e0b22', color: '#f59e0b' }}>
                pending
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn" onClick={handleRefresh} style={{ fontSize: 13 }}>
            Check Status
          </button>
          <button className="btn" onClick={handleLogout} style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Sign Out
          </button>
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-dim)' }}>
          Contact your organization admin if this is taking too long.
        </p>
      </div>
    </div>
  )
}
