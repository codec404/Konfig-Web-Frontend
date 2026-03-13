import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listRollouts } from '../api/rollouts'
import type { RolloutSummary } from '../api/rollouts'

function statusClass(status: string): string {
  switch (status) {
    case 'IN_PROGRESS': return 'badge-in-progress'
    case 'PENDING': return 'badge-pending'
    case 'COMPLETED': return 'badge-completed'
    case 'FAILED': return 'badge-failed'
    case 'ROLLED_BACK': return 'badge-rolled-back'
    default: return 'badge-inactive'
  }
}

const STRATEGY_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  '0': { label: 'ALL AT ONCE', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.3)' },
  'ALL_AT_ONCE': { label: 'ALL AT ONCE', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.3)' },
  '1': { label: 'CANARY', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)' },
  'CANARY': { label: 'CANARY', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)' },
  '2': { label: 'PERCENTAGE', color: '#e879f9', bg: 'rgba(232,121,249,0.12)', border: 'rgba(232,121,249,0.3)' },
  'PERCENTAGE': { label: 'PERCENTAGE', color: '#e879f9', bg: 'rgba(232,121,249,0.12)', border: 'rgba(232,121,249,0.3)' },
}

function StrategyBadge({ strategy }: { strategy: string }) {
  const s = STRATEGY_MAP[strategy] ?? { label: strategy, color: 'var(--text-muted)', bg: 'var(--surface-2)', border: 'var(--border)' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.4px',
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  )
}

function formatDate(s: string): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleString() } catch { return s }
}

export default function RolloutsPage() {
  const navigate = useNavigate()

  const { data: rollouts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['rollouts-all'],
    queryFn: () => listRollouts('', 100),
    refetchInterval: 10000,
  })

  const active = rollouts.filter(r => r.status === 'IN_PROGRESS' || r.status === 'PENDING')
  const recent = rollouts.filter(r => r.status !== 'IN_PROGRESS' && r.status !== 'PENDING')

  function goToService(name: string) {
    if (!name) return
    navigate(`/services/${encodeURIComponent(name)}`)
  }

  function RolloutTable({ items, title }: { items: RolloutSummary[]; title: string }) {
    if (items.length === 0) return null
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">{title}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} rollout{items.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Config ID</th>
                <th>Service</th>
                <th>Strategy</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Started</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const pct = r.status === 'COMPLETED' ? 100
                  : r.target_percentage > 0
                    ? Math.round((r.current_percentage / r.target_percentage) * 100)
                    : 0
                return (
                  <tr key={r.config_id}>
                    <td className="text-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{r.config_id}</td>
                    <td>
                      {r.service_name
                        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}
                            onClick={() => goToService(r.service_name)}>{r.service_name}</span>
                        : '—'}
                    </td>
                    <td><StrategyBadge strategy={r.strategy} /></td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar-container" style={{ flex: 1, height: 6 }}>
                          <div className={`progress-bar-fill ${r.status === 'COMPLETED' ? 'success' : r.status === 'FAILED' ? 'error' : ''}`}
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {r.current_percentage}%
                        </span>
                      </div>
                    </td>
                    <td><span className={`badge ${statusClass(r.status)}`}>{r.status.replace(/_/g, ' ')}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(r.started_at)}</td>
                    <td>
                      {r.service_name && (
                        <button className="btn btn-sm" onClick={() => goToService(r.service_name)}>View</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Rollouts</div>
          <div className="page-subtitle">Config deployment history and active rollouts</div>
        </div>
        <button className="btn" onClick={() => refetch()} style={{ marginTop: 4 }}>
          Refresh
        </button>
      </div>

      {isLoading && <div className="loading-container"><div className="spinner" /> Loading rollouts...</div>}
      {error && <div className="alert alert-error">{error instanceof Error ? error.message : 'Failed to load'}</div>}

      {!isLoading && rollouts.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🚀</div>
            <div className="empty-state-title">No rollouts yet</div>
            <div className="empty-state-desc">Start a rollout from a service's config page.</div>
          </div>
        </div>
      )}

      <RolloutTable items={active} title={`Active Rollouts${active.length ? ` (${active.length})` : ''}`} />
      <RolloutTable items={recent} title="Recent History" />
    </div>
  )
}
