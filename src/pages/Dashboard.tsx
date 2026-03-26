import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getStats, getAuditLog, listServices } from '../api/stats'
import type { ServiceSummary } from '../api/stats'
import { superAdminApi } from '../api/orgs'
import { useAuth } from '../contexts/AuthContext'

function actionIcon(action: string): string {
  if (action.includes('upload')) return '📄'
  if (action.includes('rollback')) return '↩️'
  if (action.includes('rollout') || action.includes('delivered')) return '🚀'
  if (action.includes('delet')) return '🗑️'
  return '•'
}

function actionColor(action: string): string {
  if (action.includes('delet') || action.includes('fail')) return 'var(--error)'
  if (action.includes('upload') || action.includes('rollout')) return 'var(--success)'
  if (action.includes('rollback')) return 'var(--warning)'
  return 'var(--text-muted)'
}

function relativeTime(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.role === 'super_admin') return <SuperAdminDashboard />

  return <UserDashboard />
}

function SuperAdminDashboard() {
  const navigate = useNavigate()

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['admin', 'orgs'],
    queryFn: superAdminApi.listOrgs,
    refetchInterval: 60000,
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: superAdminApi.listAllUsers,
    refetchInterval: 60000,
  })

  const orgCount = orgsData?.orgs?.length ?? 0
  const userCount = usersData?.users?.length ?? 0
  const pendingCount = usersData?.users?.filter(u => u.member_status === 'pending').length ?? 0
  const adminCount = usersData?.users?.filter(u => u.role === 'admin').length ?? 0

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Konfig — Super Admin</div>
        <div className="page-subtitle">System-wide overview of all organizations and users</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{
          '--card-color': '#818cf8', '--card-bg': 'rgba(129,140,248,0.08)',
          '--card-shadow': 'rgba(129,140,248,0.35)', '--card-text': '#ffffff', '--card-text-muted': '#c5cbff',
          cursor: 'pointer',
        } as React.CSSProperties}
          onClick={() => navigate('/admin')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="stat-label">Organizations</div>
            <span className="stat-icon">🏢</span>
          </div>
          <div className="stat-value">{orgsLoading ? <span className="stat-loading" /> : orgCount}</div>
          <div className="stat-sub">Active organizations</div>
        </div>

        <div className="stat-card" style={{
          '--card-color': '#c084fc', '--card-bg': 'rgba(192,132,252,0.08)',
          '--card-shadow': 'rgba(192,132,252,0.35)', '--card-text': '#ffffff', '--card-text-muted': '#ead5ff',
        } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="stat-label">Total Users</div>
            <span className="stat-icon">👥</span>
          </div>
          <div className="stat-value">{usersLoading ? <span className="stat-loading" /> : userCount}</div>
          <div className="stat-sub">Across all orgs</div>
        </div>

        <div className="stat-card" style={{
          '--card-color': '#f59e0b', '--card-bg': 'rgba(245,158,11,0.08)',
          '--card-shadow': 'rgba(245,158,11,0.35)', '--card-text': '#1c0a00', '--card-text-muted': '#6b3600',
        } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="stat-label">Pending Approvals</div>
            <span className="stat-icon">⏳</span>
          </div>
          <div className="stat-value">{usersLoading ? <span className="stat-loading" /> : pendingCount}</div>
          <div className="stat-sub">Awaiting admin review</div>
        </div>

        <div className="stat-card" style={{
          '--card-color': '#10b981', '--card-bg': 'rgba(16,185,129,0.08)',
          '--card-shadow': 'rgba(16,185,129,0.35)', '--card-text': '#001a0d', '--card-text-muted': '#00522a',
        } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="stat-label">Admins</div>
            <span className="stat-icon">⚙️</span>
          </div>
          <div className="stat-value">{usersLoading ? <span className="stat-loading" /> : adminCount}</div>
          <div className="stat-sub">Org administrators</div>
        </div>
      </div>

      {/* Org list quick view */}
      <div className="card section">
        <div className="card-header">
          <span className="card-title">Organizations</span>
          <button className="btn btn-sm" onClick={() => navigate('/admin')} style={{ fontSize: 12 }}>
            Manage →
          </button>
        </div>
        {orgsLoading ? (
          <div className="spinner" style={{ margin: '20px auto' }} />
        ) : (orgsData?.orgs ?? []).length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No organizations yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {(orgsData?.orgs ?? []).slice(0, 8).map(org => (
              <div key={org.id} onClick={() => navigate('/admin')}
                style={{ background: 'var(--surface-2, #222)', border: '1px solid var(--border)', borderRadius: 6,
                  padding: '10px 14px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{org.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Created {new Date(org.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UserDashboard() {
  const navigate = useNavigate()
  const [serviceInput, setServiceInput] = useState('')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30000,
  })

  const { data: auditLog = [], isLoading: auditLoading, error: auditError } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => getAuditLog(undefined, 10),
    refetchInterval: 15000,
  })

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: listServices,
    refetchInterval: 30000,
  })

  function addRecentService(svc: string) {
    try {
      const existing: string[] = JSON.parse(localStorage.getItem('recentServices') || '[]')
      const updated = [svc, ...existing.filter((s) => s !== svc)].slice(0, 8)
      localStorage.setItem('recentServices', JSON.stringify(updated))
    } catch { /* ignore */ }
  }

  function handleNavigate(e: React.FormEvent) {
    e.preventDefault()
    const svc = serviceInput.trim()
    if (!svc) return
    addRecentService(svc)
    navigate(`/services/${encodeURIComponent(svc)}`)
  }

  function goToService(svc: string) {
    addRecentService(svc)
    navigate(`/services/${encodeURIComponent(svc)}`)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Konfig — Configuration Management</div>
        <div className="page-subtitle">
          Manage, validate, and deploy configurations for distributed services
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {/* Services — indigo fill: white primary, light indigo tint for muted */}
        <div className="stat-card" style={{
          '--card-color': '#818cf8',
          '--card-bg': 'rgba(129,140,248,0.08)',
          '--card-shadow': 'rgba(129,140,248,0.35)',
          '--card-text': '#ffffff',
          '--card-text-muted': '#c5cbff',
        } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="stat-label">Services</div>
            <span className="stat-icon">🗂️</span>
          </div>
          <div className="stat-value">
            {statsLoading ? <span className="stat-loading" /> : (stats?.total_services ?? '—')}
          </div>
          <div className="stat-sub">Tracked services</div>
        </div>

        {/* Configs — violet fill: white primary, light violet tint for muted */}
        <div className="stat-card" style={{
          '--card-color': '#c084fc',
          '--card-bg': 'rgba(192,132,252,0.08)',
          '--card-shadow': 'rgba(192,132,252,0.35)',
          '--card-text': '#ffffff',
          '--card-text-muted': '#ead5ff',
        } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="stat-label">Configs</div>
            <span className="stat-icon">📄</span>
          </div>
          <div className="stat-value">
            {statsLoading ? <span className="stat-loading" /> : (stats?.total_configs ?? '—')}
          </div>
          <div className="stat-sub">Total versions stored</div>
        </div>

        {/* Active Rollouts — amber fill: dark brown primary, deep amber for muted */}
        <div className="stat-card" style={{
          '--card-color': '#f59e0b',
          '--card-bg': 'rgba(245,158,11,0.08)',
          '--card-shadow': 'rgba(245,158,11,0.35)',
          '--card-text': '#1c0a00',
          '--card-text-muted': '#6b3600',
        } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="stat-label">Active Rollouts</div>
            <span className="stat-icon">🚀</span>
          </div>
          <div className="stat-value">
            {statsLoading ? <span className="stat-loading" /> : (stats?.active_rollouts ?? '—')}
          </div>
          <div className="stat-sub">In progress</div>
        </div>

        {/* Schemas — emerald fill: dark green primary, deep forest for muted */}
        <div className="stat-card" style={{
          '--card-color': '#10b981',
          '--card-bg': 'rgba(16,185,129,0.08)',
          '--card-shadow': 'rgba(16,185,129,0.35)',
          '--card-text': '#001a0d',
          '--card-text-muted': '#00522a',
        } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="stat-label">Schemas</div>
            <span className="stat-icon">⬡</span>
          </div>
          <div className="stat-value">
            {statsLoading ? <span className="stat-loading" /> : (stats?.total_schemas ?? '—')}
          </div>
          <div className="stat-sub">Active schemas</div>
        </div>
      </div>

      {/* Service navigation */}
      <div className="card section">
        <div className="card-header">
          <span className="card-title">Explore a Service</span>
        </div>
        <form onSubmit={handleNavigate} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            className="input"
            placeholder="Enter service name (e.g. auth-service)"
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            style={{ maxWidth: 380 }}
          />
          <button type="submit" className="btn btn-primary" disabled={!serviceInput.trim()}>
            Go to Service →
          </button>
        </form>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            {servicesLoading ? 'Loading services...' : `${services.length} Service${services.length !== 1 ? 's' : ''}`}
          </div>

          {services.length === 0 && !servicesLoading ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              No services yet — upload a config to register a service.
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {services.slice(0, 5).map((svc: ServiceSummary) => (
                  <div
                    key={svc.service_name}
                    onClick={() => goToService(svc.service_name)}
                    style={{
                      background: 'var(--surface-2, #222)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {svc.service_name}
                      </span>
                      {svc.has_active_rollout && (
                        <span className="badge badge-in-progress" style={{ fontSize: 10, flexShrink: 0 }}>rollout</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      v{svc.latest_version} · {svc.config_count} config{svc.config_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
              {services.length > 5 && (
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <a href="/services" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
                    onClick={(e) => { e.preventDefault(); navigate('/services') }}>
                    View all {services.length} services →
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Activity</span>
          {auditLoading && <div className="spinner" style={{ width: 14, height: 14 }} />}
        </div>

        {auditError ? (
          <div className="alert alert-error" style={{ margin: '12px 0' }}>
            Failed to load activity: {auditError instanceof Error ? auditError.message : 'Unknown error'}
          </div>
        ) : auditLog.length === 0 && !auditLoading ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No activity yet</div>
            <div className="empty-state-desc">Upload a config or start a rollout to see activity here.</div>
          </div>
        ) : (
          <div>
            {auditLog.map((item) => (
              <div
                key={item.id}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: item.service_name ? 'pointer' : 'default' }}
                onClick={() => item.service_name && goToService(item.service_name)}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{actionIcon(item.action)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    {item.service_name && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                        {item.service_name}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: actionColor(item.action) }}>
                      {item.action}
                      {item.details ? ` — ${item.details}` : ''}
                    </span>
                  </div>
                  {item.performed_by && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>by {item.performed_by}</div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {relativeTime(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
