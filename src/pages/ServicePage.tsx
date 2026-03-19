import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfigList from '../components/ConfigList'

export default function ServicePage() {
  const { serviceName } = useParams<{ serviceName: string }>()
  const navigate = useNavigate()

  const svc = serviceName ?? ''

  useEffect(() => {
    if (!svc) {
      navigate('/')
      return
    }
    // Track in recent services
    try {
      const existing: string[] = JSON.parse(localStorage.getItem('recentServices') || '[]')
      const updated = [svc, ...existing.filter((s) => s !== svc)].slice(0, 8)
      localStorage.setItem('recentServices', JSON.stringify(updated))
    } catch {
      // ignore
    }
  }, [svc, navigate])

  if (!svc) return null

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => navigate('/')}
            style={{ padding: '4px 8px' }}
          >
            ← Back
          </button>
          <span
            style={{ color: 'var(--text-muted)', fontSize: 13 }}
          >
            Services /
          </span>
          <span className="service-badge">{svc}</span>
        </div>
        <div className="page-title">{svc}</div>
        <div className="page-subtitle">Manage configs and rollouts for this service</div>
      </div>

      <ConfigList serviceName={svc} />
    </div>
  )
}
