import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfigList from '../components/ConfigList'
import ServiceTokens from '../components/ServiceTokens'

type Tab = 'configs' | 'tokens'

export default function ServicePage() {
  const { serviceName } = useParams<{ serviceName: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('configs')

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
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Services /
          </span>
          <span className="service-badge">{svc}</span>
        </div>
        <div className="page-title">{svc}</div>
        <div className="page-subtitle">Manage configs and rollouts for this service</div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 20,
        borderBottom: '1px solid var(--border)',
        paddingBottom: 0,
      }}>
        {(['configs', 'tokens'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'configs' && <ConfigList serviceName={svc} />}
      {tab === 'tokens' && <ServiceTokens serviceName={svc} />}
    </div>
  )
}
