import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createRollout, getRolloutStatus, rollbackConfig, promoteRollout } from '../api/rollouts'
import { getServiceConfigs } from '../api/configs'
import type { RolloutStrategy, RolloutStatus } from '../api/types'

interface RolloutPanelProps {
  serviceName: string
}

const STRATEGY_OPTIONS: RolloutStrategy[] = ['ALL_AT_ONCE', 'CANARY', 'PERCENTAGE']

function statusClass(status: RolloutStatus): string {
  const map: Record<RolloutStatus, string> = {
    PENDING: 'badge-pending',
    IN_PROGRESS: 'badge-in-progress',
    COMPLETED: 'badge-completed',
    FAILED: 'badge-failed',
    ROLLED_BACK: 'badge-rolled-back',
  }
  return map[status] ?? 'badge-inactive'
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function RolloutPanel({ serviceName }: RolloutPanelProps) {
  const queryClient = useQueryClient()
  const [selectedConfigId, setSelectedConfigId] = useState('')
  const [strategy, setStrategy] = useState<RolloutStrategy>('ALL_AT_ONCE')
  const [targetPct, setTargetPct] = useState(50)
  const [rolloutConfigId, setRolloutConfigId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`rollout_tracking_${serviceName}`) || null
    } catch { return null }
  })
  const [rollbackVersion, setRollbackVersion] = useState('')
  const [promoteTarget, setPromoteTarget] = useState(100)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function trackRollout(configId: string | null) {
    try {
      if (configId) {
        localStorage.setItem(`rollout_tracking_${serviceName}`, configId)
      } else {
        localStorage.removeItem(`rollout_tracking_${serviceName}`)
      }
    } catch { /* ignore */ }
    setRolloutConfigId(configId)
  }

  // Fetch configs for the dropdown
  const { data: configData } = useQuery({
    queryKey: ['configs', serviceName, 0],
    queryFn: () => getServiceConfigs(serviceName, 20, 0),
  })

  const configs = configData?.configs ?? []

  // Poll rollout status when we have a config to track
  const { data: rolloutStatus, error: statusError } = useQuery({
    queryKey: ['rollout-status', rolloutConfigId],
    queryFn: () => getRolloutStatus(rolloutConfigId!),
    enabled: !!rolloutConfigId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'IN_PROGRESS' || status === 'PENDING' ? 3000 : false
    },
  })

  const createMutation = useMutation({
    mutationFn: createRollout,
    onSuccess: () => {
      trackRollout(selectedConfigId)
      setSuccessMsg('Rollout started successfully!')
      setFormError(null)
      queryClient.invalidateQueries({ queryKey: ['rollout-status', selectedConfigId] })
      setTimeout(() => setSuccessMsg(null), 3000)
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Failed to start rollout')
    },
  })

  const rollbackMutation = useMutation({
    mutationFn: ({ configId, payload }: { configId: string; payload: { service_name: string; to_version: number } }) =>
      rollbackConfig(configId, payload),
    onSuccess: () => {
      setSuccessMsg('Rollback initiated!')
      queryClient.invalidateQueries({ queryKey: ['rollout-status', rolloutConfigId] })
      setTimeout(() => setSuccessMsg(null), 3000)
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Rollback failed')
    },
  })

  const promoteMutation = useMutation({
    mutationFn: ({ configId, target }: { configId: string; target: number }) =>
      promoteRollout(configId, target),
    onSuccess: (data) => {
      if (data.success) {
        setSuccessMsg(data.message)
        queryClient.invalidateQueries({ queryKey: ['rollout-status', rolloutConfigId] })
      } else {
        setFormError(data.message)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Promote failed')
    },
  })

  function handlePromote() {
    if (!rolloutConfigId) return
    setFormError(null)
    promoteMutation.mutate({ configId: rolloutConfigId, target: promoteTarget })
  }

  function handleStartRollout(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!selectedConfigId) {
      setFormError('Please select a config')
      return
    }
    createMutation.mutate({
      config_id: selectedConfigId,
      strategy,
      target_percentage: strategy === 'ALL_AT_ONCE' ? undefined : targetPct,
    })
  }

  function handleRollback() {
    if (!rolloutConfigId || !rollbackVersion) return
    const ver = parseInt(rollbackVersion, 10)
    if (isNaN(ver) || ver < 1) {
      setFormError('Enter a valid version number')
      return
    }
    rollbackMutation.mutate({
      configId: rolloutConfigId,
      payload: { service_name: serviceName, to_version: ver },
    })
  }

  const progressPct =
    rolloutStatus?.status === 'COMPLETED'
      ? 100
      : rolloutStatus
      ? Math.min(rolloutStatus.current_percentage, 100)
      : 0

  const fillClass =
    rolloutStatus?.status === 'COMPLETED'
      ? 'success'
      : rolloutStatus?.status === 'FAILED'
      ? 'error'
      : ''

  return (
    <div>
      {/* Start Rollout Form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Start Rollout</span>
        </div>

        {formError && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            {formError}
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: 14 }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleStartRollout} className="rollout-form">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Config</label>
            <select
              className="select"
              value={selectedConfigId}
              onChange={(e) => setSelectedConfigId(e.target.value)}
              required
            >
              <option value="">— Select a config —</option>
              {configs.map((c) => (
                <option key={c.config_id} value={c.config_id}>
                  v{c.version} — {c.config_id.slice(0, 12)}... ({c.format}){' '}
                  {c.is_active ? '[active]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Strategy</label>
              <select
                className="select"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as RolloutStrategy)}
              >
                {STRATEGY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {strategy !== 'ALL_AT_ONCE' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target Percentage</label>
                <div className="flex-center gap-2">
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={100}
                    value={targetPct}
                    onChange={(e) => setTargetPct(parseInt(e.target.value, 10))}
                  />
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>%</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <div className="spinner" />
                  Starting...
                </>
              ) : (
                'Start Rollout'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Rollout Status */}
      {rolloutConfigId && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Rollout Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {rolloutStatus && (
                <span className={`badge ${statusClass(rolloutStatus.status)}`}>
                  {rolloutStatus.status.replace(/_/g, ' ')}
                </span>
              )}
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '2px 8px' }}
                onClick={() => trackRollout(null)}
              >
                Stop Tracking
              </button>
            </div>
          </div>

          {statusError && (
            <div className="alert alert-error" style={{ marginBottom: 14 }}>
              {statusError instanceof Error ? statusError.message : 'Failed to fetch status'}
            </div>
          )}

          {!rolloutStatus && !statusError && (
            <div className="loading-container">
              <div className="spinner" />
              Loading status...
            </div>
          )}

          {rolloutStatus && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div className="form-label">Config ID</div>
                  <div className="text-mono" style={{ marginTop: 4, color: 'var(--text)' }}>
                    {rolloutStatus.config_id}
                  </div>
                </div>
                <div>
                  <div className="form-label">Strategy</div>
                  <div style={{ marginTop: 4, color: 'var(--text)' }}>
                    {rolloutStatus.strategy?.replace(/_/g, ' ') ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="form-label">Started At</div>
                  <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>
                    {formatDate(rolloutStatus.started_at)}
                  </div>
                </div>
                <div>
                  <div className="form-label">Completed At</div>
                  <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>
                    {rolloutStatus.completed_at ? formatDate(rolloutStatus.completed_at) : '—'}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 20 }}>
                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <span className="form-label">Progress</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {rolloutStatus.current_percentage}% of fleet updated · {rolloutStatus.target_percentage || 100}% target
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className={`progress-bar-fill ${fillClass}`}
                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Promote section — canary/percentage rollouts in progress below 100% */}
              {rolloutStatus.status === 'IN_PROGRESS' &&
                (rolloutStatus.strategy === 'CANARY' || rolloutStatus.strategy === 'PERCENTAGE') &&
                rolloutStatus.target_percentage < 100 && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>
                    Promote Canary
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Currently targeting {rolloutStatus.target_percentage}% of instances. Increase to roll out further.
                  </div>
                  <div className="flex-center gap-2">
                    <input
                      className="input"
                      type="number"
                      min={rolloutStatus.target_percentage + 1}
                      max={100}
                      value={promoteTarget}
                      onChange={(e) => setPromoteTarget(parseInt(e.target.value, 10))}
                      style={{ maxWidth: 120 }}
                    />
                    <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>%</span>
                    <button
                      className="btn btn-primary"
                      onClick={handlePromote}
                      disabled={
                        promoteMutation.isPending ||
                        promoteTarget <= rolloutStatus.target_percentage ||
                        promoteTarget > 100
                      }
                    >
                      {promoteMutation.isPending ? (
                        <><div className="spinner" /> Promoting...</>
                      ) : (
                        'Promote →'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Rollback section */}
              {(rolloutStatus.status === 'COMPLETED' ||
                rolloutStatus.status === 'FAILED' ||
                rolloutStatus.status === 'IN_PROGRESS') && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <div className="form-label" style={{ marginBottom: 8 }}>
                    Rollback to Version
                  </div>
                  <div className="flex-center gap-2">
                    <input
                      className="input"
                      type="number"
                      min={1}
                      placeholder="Target version number"
                      value={rollbackVersion}
                      onChange={(e) => setRollbackVersion(e.target.value)}
                      style={{ maxWidth: 200 }}
                    />
                    <button
                      className="btn btn-danger"
                      onClick={handleRollback}
                      disabled={rollbackMutation.isPending || !rollbackVersion}
                    >
                      {rollbackMutation.isPending ? (
                        <>
                          <div className="spinner" /> Rolling back...
                        </>
                      ) : (
                        'Rollback'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!rolloutConfigId && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🚀</div>
            <div className="empty-state-title">No active rollout</div>
            <div className="empty-state-desc">
              Select a config and start a rollout to see status here.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
