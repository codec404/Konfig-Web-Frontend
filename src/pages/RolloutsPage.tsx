import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listRollouts, promoteRollout } from '../api/rollouts'
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

function SpeedometerGauge({ current, target, status }: { current: number; target: number; status: string }) {
  const cx = 110, cy = 108, r = 80, sw = 14

  const isPartial = target > 0 && target < 100
  const sliceCovered = isPartial && current >= target
  const fillEnd = isPartial ? Math.min(current, target) : (status === 'COMPLETED' ? 100 : Math.min(current, 100))

  // Animate arc and counter from 0 → fillEnd / target on mount
  const [animFill, setAnimFill] = useState(0)
  const [animText, setAnimText] = useState(0)

  useEffect(() => {
    setAnimFill(0)
    setAnimText(0)
    if (fillEnd <= 0.01) return  // nothing to animate — keep both at 0

    // For partial rollouts (canary/percentage) the text shows the target goal.
    // For full-fleet rollouts the text shows actual coverage (fillEnd), so
    // "100% of fleet" only appears when the rollout is truly complete.
    const textEnd = isPartial ? target : fillEnd

    const duration = 1100
    const start = performance.now()
    let raf: number
    function frame(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)  // ease-out cubic; both driven by same value
      setAnimFill(fillEnd * ease)
      setAnimText(Math.round(textEnd * ease))
      if (t < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [fillEnd, target])

  // Convert 0–100% → point on the upper semicircle
  const toPoint = (pct: number) => {
    const a = Math.PI * (1 - Math.min(Math.max(pct, 0), 100) / 100)
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
  }

  // SVG arc — splits spans > 50% to avoid the degenerate 180° case; sweep-flag=1 = clockwise
  const arc = (fromPct: number, toPct: number): string => {
    if (toPct - fromPct > 50) {
      const midPct = (fromPct + toPct) / 2
      const s = toPoint(fromPct), m = toPoint(midPct), e = toPoint(toPct)
      return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 1 ${m.x.toFixed(2)} ${m.y.toFixed(2)} A ${r} ${r} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
    }
    const s = toPoint(fromPct), e = toPoint(toPct)
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
  }

  const fillColor = status === 'COMPLETED' ? '#4ade80'
    : sliceCovered ? '#4ade80'
    : status === 'FAILED' ? '#f87171'
    : '#818cf8'

  const tickAngle = Math.PI * (1 - target / 100)
  const t1 = { x: cx + (r - sw - 2) * Math.cos(tickAngle), y: cy - (r - sw - 2) * Math.sin(tickAngle) }
  const t2 = { x: cx + (r + sw + 2) * Math.cos(tickAngle), y: cy - (r + sw + 2) * Math.sin(tickAngle) }
  const endLabel = { x: cx + r + sw + 14, y: cy + 4 }

  return (
    <svg viewBox="0 0 220 132" style={{ width: '100%', maxWidth: 280, display: 'block', margin: '0 auto' }}>
      {/* Background track */}
      <path d={arc(0, 99.99)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={sw} strokeLinecap="round" />

      {/* Animated filled arc */}
      {animFill > 0.1 && (
        <path d={arc(0, animFill)} fill="none" stroke={fillColor} strokeWidth={sw} strokeLinecap="round" />
      )}

      {/* Target tick mark */}
      {isPartial && (
        <line
          x1={t1.x.toFixed(2)} y1={t1.y.toFixed(2)}
          x2={t2.x.toFixed(2)} y2={t2.y.toFixed(2)}
          stroke={sliceCovered ? '#4ade80' : 'rgba(255,255,255,0.55)'}
          strokeWidth={2.5} strokeLinecap="round"
        />
      )}

      <text x={cx - r - sw - 4} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={9}>0%</text>
      <text x={endLabel.x} y={endLabel.y} textAnchor="start" fill="rgba(255,255,255,0.25)" fontSize={9}>100%</text>

      {/* Animated center text */}
      <text x={cx} y={cy - 14} textAnchor="middle" fill="white" fontSize={28} fontWeight={700} fontFamily="monospace">
        {animText}%
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={11}>
        of fleet
      </text>
    </svg>
  )
}

function RolloutDetailModal({ r, onClose }: { r: RolloutSummary; onClose: () => void }) {
  const isPartial = r.target_percentage > 0 && r.target_percentage < 100
  const sliceCovered = isPartial && r.current_percentage >= r.target_percentage && r.status === 'IN_PROGRESS'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface-1, #1a1d2e)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '24px 28px',
          width: 420,
          maxWidth: '90vw',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Rollout Progress</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{r.config_id}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        {/* Speedometer gauge */}
        <div style={{ marginBottom: 20, padding: '8px 0' }}>
          <SpeedometerGauge current={r.current_percentage} target={r.target_percentage} status={r.status} />
        </div>

        {/* Detail grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '14px 12px',
          background: 'var(--surface-2, rgba(255,255,255,0.04))',
          borderRadius: 8, padding: '14px 16px',
          marginBottom: sliceCovered ? 14 : 0,
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Strategy</div>
            <StrategyBadge strategy={r.strategy} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
            <span className={`badge ${statusClass(r.status)}`}>{r.status.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {isPartial ? `${r.target_percentage}% of fleet` : 'Full fleet (100%)'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Service</div>
            <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{r.service_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Started</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(r.started_at)}</div>
          </div>
          {r.completed_at && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(r.completed_at)}</div>
            </div>
          )}
        </div>

        {sliceCovered && (
          <div style={{ fontSize: 12, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, padding: '8px 12px' }}>
            Target slice fully covered — promote to 100% to deploy to the full fleet.
          </div>
        )}
      </div>
    </div>
  )
}

export default function RolloutsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [promoteError, setPromoteError] = useState<string | null>(null)
  const [modalRollout, setModalRollout] = useState<RolloutSummary | null>(null)
  const [recentPage, setRecentPage] = useState(1)
  const PAGE_SIZE = 10

  const { data: rollouts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['rollouts-all'],
    queryFn: () => listRollouts('', 500),
    refetchInterval: 10000,
  })

  const promoteMutation = useMutation({
    mutationFn: (configId: string) => promoteRollout(configId, 100),
    onSuccess: () => {
      setPromotingId(null)
      queryClient.invalidateQueries({ queryKey: ['rollouts-all'] })
    },
    onError: (e) => {
      setPromotingId(null)
      setPromoteError(e instanceof Error ? e.message : 'Promote failed')
    },
  })

  const active = rollouts.filter(r => r.status === 'IN_PROGRESS' || r.status === 'PENDING')
  const recent = rollouts.filter(r => r.status !== 'IN_PROGRESS' && r.status !== 'PENDING')

  function goToService(name: string) {
    if (!name) return
    navigate(`/services/${encodeURIComponent(name)}`)
  }

  const canPromote = (r: RolloutSummary) =>
    r.status === 'IN_PROGRESS' &&
    (r.strategy === 'CANARY' || r.strategy === 'PERCENTAGE' || r.strategy === '1' || r.strategy === '2') &&
    (r.target_percentage ?? 100) < 100

  function RolloutTable({ items, title, totalCount, page, onPage }: {
    items: RolloutSummary[]
    title: string
    totalCount?: number
    page?: number
    onPage?: (p: number) => void
  }) {
    if ((totalCount ?? items.length) === 0) return null
    const total = totalCount ?? items.length
    const totalPages = onPage ? Math.ceil(total / PAGE_SIZE) : 1
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">{title}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total} rollout{total !== 1 ? 's' : ''}</span>
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
                const isPartial = r.target_percentage > 0 && r.target_percentage < 100
                // Small bar: for partial rollouts fill = progress toward target (0→full when target reached)
                const barPct = r.status === 'COMPLETED' ? 100
                  : isPartial && r.target_percentage > 0
                    ? Math.min(r.current_percentage / r.target_percentage * 100, 100)
                    : Math.min(r.current_percentage, 100)
                const fillClass = r.status === 'COMPLETED' ? 'success'
                  : r.status === 'FAILED' ? 'error'
                  : r.status === 'IN_PROGRESS' ? 'in-progress'
                  : ''
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
                    <td style={{ minWidth: 180 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                        title="Click for details"
                        onClick={() => setModalRollout(r)}
                      >
                        <div className="progress-bar-container" style={{ flex: 1, height: 6 }}>
                          <div className={`progress-bar-fill ${fillClass}`} style={{ width: `${barPct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                          {isPartial ? `${Math.round(barPct)}%(${r.target_percentage})` : (r.status === 'COMPLETED' ? '100%' : `${r.current_percentage}%`)}
                        </span>
                      </div>
                    </td>
                    <td><span className={`badge ${statusClass(r.status)}`}>{r.status.replace(/_/g, ' ')}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(r.started_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canPromote(r) && (
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={promotingId === r.config_id}
                            onClick={() => { setPromoteError(null); setPromotingId(r.config_id); promoteMutation.mutate(r.config_id) }}
                          >
                            {promotingId === r.config_id
                              ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Promoting...</>
                              : 'Promote 100%'}
                          </button>
                        )}
                        {r.service_name && (
                          <button className="btn btn-sm" onClick={() => goToService(r.service_name)}>View</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {onPage && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-sm" disabled={(page ?? 1) <= 1} onClick={() => onPage((page ?? 1) - 1)}>‹ Prev</button>
            <button className="btn btn-sm" disabled={(page ?? 1) >= totalPages} onClick={() => onPage((page ?? 1) + 1)}>Next ›</button>
          </div>
        )}
      </div>
    )
  }

  const pagedRecent = recent.slice((recentPage - 1) * PAGE_SIZE, recentPage * PAGE_SIZE)

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
      {promoteError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {promoteError}
          <button style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14 }} onClick={() => setPromoteError(null)}>✕</button>
        </div>
      )}

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
      <RolloutTable
        items={pagedRecent}
        title="Recent History"
        totalCount={recent.length}
        page={recentPage}
        onPage={(p) => setRecentPage(p)}
      />

      {modalRollout && (
        <RolloutDetailModal r={modalRollout} onClose={() => setModalRollout(null)} />
      )}
    </div>
  )
}
