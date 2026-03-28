import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listServices } from '../api/stats'
import type { ServiceSummary } from '../api/stats'
import UploadConfig from '../components/UploadConfig'
import { Layers } from 'lucide-react'

function formatDate(s: string): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleString() } catch { return s }
}

export default function ServicesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [step, setStep] = useState<'name' | 'upload'>('name')

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

  function closeModal() {
    setShowNew(false)
    setNewServiceName('')
    setStep('name')
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Services</div>
          <div className="page-subtitle">All services with registered configurations</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Service</button>
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
            <div className="empty-state-icon"><Layers size={36} /></div>
            <div className="empty-state-title">No services yet</div>
            <div className="empty-state-desc">Click "New Service" to upload your first config.</div>
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

      {showNew && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 24, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {step === 'name' ? 'New Service' : `Upload Config — ${newServiceName}`}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
            </div>

            {step === 'name' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Service Name</label>
                  <input
                    className="form-control"
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    placeholder="e.g. auth-service"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && newServiceName.trim() && setStep('upload')}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary" disabled={!newServiceName.trim()} onClick={() => setStep('upload')}>
                    Next →
                  </button>
                </div>
              </div>
            ) : (
              <UploadConfig
                serviceName={newServiceName.trim()}
                onSuccess={() => {
                  qc.invalidateQueries({ queryKey: ['services'] })
                  goToService(newServiceName.trim())
                  closeModal()
                }}
                onCancel={closeModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
