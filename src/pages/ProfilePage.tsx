import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar_url ?? '')
  const [avatarData, setAvatarData] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setAvatarPreview(dataUrl)
      setAvatarData(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setSuccess('')
    setLoading(true)
    try {
      await authApi.updateMe({
        name: name || undefined,
        phone: phone || undefined,
        avatar_url: avatarData || undefined,
      })
      await refreshUser()
      setAvatarData('')
      setSuccess('Profile updated.')
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const initials = (user?.name ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="page-container" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Profile</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
        Manage your account details
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: '50%', cursor: 'pointer',
              background: avatarPreview ? 'transparent' : 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: '2px solid var(--border)',
              flexShrink: 0,
            }}
            title="Click to change photo"
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>{initials}</span>
            }
          </div>
          <div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              Change photo
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '4px 0 0' }}>JPG, PNG or GIF · max 2 MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {/* Email (read-only) */}
        <div className="form-group" style={{ margin: 0 }}>
          <label>Email <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>(cannot change)</span></label>
          <input className="form-control" value={user?.email ?? ''} disabled style={{ opacity: 0.6 }} />
        </div>

        {/* Name */}
        <div className="form-group" style={{ margin: 0 }}>
          <label>Name</label>
          <input className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>

        {/* Phone */}
        <div className="form-group" style={{ margin: 0 }}>
          <label>Phone <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>(optional)</span></label>
          <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" type="tel" />
        </div>

        {err && <div className="auth-error">{err}</div>}
        {success && <div style={{ color: 'var(--success, #22c55e)', fontSize: 13 }}>{success}</div>}

        <div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
