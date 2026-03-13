import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listServices } from '../api/stats'
import type { ServiceSummary } from '../api/stats'

function formatDate(s: string): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleString() } catch { return s }
}

export default function ServicesPage() {
  const navigate = useNavigate()

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: listServices,
    refetchInterval: 30000,
  })

  function goToService(name: string) {
    try {
      const existing: string[] = JSON.parse(localStorage.getItem('recentServices') || '[]')
      const updated = [name, ...existing.filter((s) => s !== name)].slice(0, 8)
      localStorage.setItem('recentServices', JSON.stringify(updated))
    } catch { /* ignore */ }
    navigate(`/services/${encodeURIComponent(name)}`)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Services</div>
        <div className="page-subtitle">All services with registered configurations</div>
      </div>

      {isLoading && (
        <div className="loading-container"><div className="spinner" /> Loading services...</div>
      )}

      {error && (
        <div className="alert alert-error">{error instanceof Error ? error.message : 'Failed to load'}</div>
      )}

      {!isLoading && services.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🗂️</div>
            <div className="empty-state-title">No services yet</div>
            <div className="empty-state-desc">Upload a config to register a service.</div>
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Latest Version</th>
                  <th>Configs</th>
                  <th>Last Updated</th>
                  <th>Rollout</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc: ServiceSummary) => (
                  <tr key={svc.service_name} className="clickable" onClick={() => goToService(svc.service_name)}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                        {svc.service_name}
                      </span>
                    </td>
                    <td><span style={{ color: 'var(--accent)' }}>v{svc.latest_version}</span></td>
                    <td>{svc.config_count}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(svc.latest_updated_at)}</td>
                    <td>
                      {svc.has_active_rollout
                        ? <span className="badge badge-in-progress">Active</span>
                        : <span className="badge badge-inactive">None</span>}
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); goToService(svc.service_name) }}>
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
