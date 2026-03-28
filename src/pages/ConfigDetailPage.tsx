import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bug } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConfig, getConfigVersions, createConfig } from '../api/configs'
import { rollbackConfig, createRollout } from '../api/rollouts'
import { validateConfig } from '../api/validation'
import type { ConfigMetadata, ValidationError, ValidationWarning } from '../api/types'
import { useCurrentOrgId } from '../hooks/useCurrentOrgId'
import { useOrgPermissions } from '../hooks/useOrgPermissions'

function formatDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

function handleTabKey(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  setValue: (v: string) => void
) {
  if (e.key !== 'Tab') return
  e.preventDefault()
  const ta = e.currentTarget
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const newVal = ta.value.substring(0, start) + '  ' + ta.value.substring(end)
  setValue(newVal)
  requestAnimationFrame(() => {
    ta.selectionStart = ta.selectionEnd = start + 2
  })
}

export default function ConfigDetailPage() {
  const { serviceName, configId } = useParams<{ serviceName: string; configId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const orgId = useCurrentOrgId()
  const { can } = useOrgPermissions(orgId)

  const [rollbackTarget, setRollbackTarget] = useState<ConfigMetadata | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // New-version form state
  const [showNewVersion, setShowNewVersion] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newVersionError, setNewVersionError] = useState<string | null>(null)

  // New-version validation state
  const [nvValidationErrors, setNvValidationErrors] = useState<ValidationError[]>([])
  const [nvValidationWarnings, setNvValidationWarnings] = useState<ValidationWarning[]>([])
  const [nvValidationRan, setNvValidationRan] = useState(false)
  const [nvShowValidationPanel, setNvShowValidationPanel] = useState(false)

  // Rollout form state
  const [showRolloutForm, setShowRolloutForm] = useState(false)
  const [rolloutStrategy, setRolloutStrategy] = useState<'ALL_AT_ONCE' | 'CANARY' | 'PERCENTAGE'>('ALL_AT_ONCE')
  const [rolloutTargetPct, setRolloutTargetPct] = useState(100)

  const svc = serviceName ?? ''
  const cfgId = configId ?? ''

  // Fetch full config content
  const { data: configData, isLoading: contentLoading, error: contentError } = useQuery({
    queryKey: ['config-detail', cfgId],
    queryFn: () => getConfig(cfgId),
    enabled: !!cfgId,
  })

  const configName = configData?.config_name ?? ''

  // Fetch all versions of this named config
  const { data: allConfigs } = useQuery({
    queryKey: ['config-versions', svc, configName, 0],
    queryFn: () => getConfigVersions(svc, configName, 100, 0),
    enabled: !!svc && !!configName,
  })

  const configs = allConfigs?.configs ?? []
  const meta = configs.find((c) => c.config_id === cfgId)

  // Extract rollback source version from description (e.g. "Rollback to v3" → 3)
  const rollbackSourceVersion = meta?.description?.match(/^Rollback to v(\d+)/i)?.[1]
    ? Number(meta.description.match(/^Rollback to v(\d+)/i)![1])
    : null

  const olderVersions = configs.filter(
    (c) =>
      !c.is_active &&
      c.config_id !== cfgId &&
      (rollbackSourceVersion === null || c.version !== rollbackSourceVersion)
  )

  const showRollback = meta?.is_active && (meta?.version ?? 0) > 1 && olderVersions.length > 0

  // Latest version's meta for change detection
  const latestMeta = configs[0] // sorted DESC by version

  const rollbackMutation = useMutation({
    mutationFn: ({ toVersion }: { toVersion: number }) =>
      rollbackConfig({ service_name: svc, config_name: configName, to_version: toVersion }),
    onSuccess: (res) => {
      setResult({ success: res.success, message: res.message })
      setRollbackTarget(null)
      setConfirmed(false)
      queryClient.invalidateQueries({ queryKey: ['config-versions', svc, configName] })
      queryClient.invalidateQueries({ queryKey: ['named-configs', svc] })
      if (res.success) {
        setTimeout(() => navigate(`/services/${encodeURIComponent(svc)}`), 1500)
      }
    },
    onError: (e) => {
      setResult({ success: false, message: e instanceof Error ? e.message : 'Rollback failed' })
    },
  })

  const rolloutMutation = useMutation({
    mutationFn: () =>
      createRollout({
        config_id: cfgId,
        strategy: rolloutStrategy,
        ...(rolloutStrategy !== 'ALL_AT_ONCE' ? { target_percentage: rolloutTargetPct } : {}),
      }),
    onSuccess: () => {
      setShowRolloutForm(false)
      queryClient.invalidateQueries({ queryKey: ['config-versions', svc, configName] })
      queryClient.invalidateQueries({ queryKey: ['named-configs', svc] })
      setTimeout(() => navigate('/rollouts'), 800)
    },
    onError: (e) => {
      setResult({ success: false, message: e instanceof Error ? e.message : 'Rollout failed' })
    },
  })

  const nvValidateMutation = useMutation({
    mutationFn: validateConfig,
    onSuccess: (res) => {
      setNvValidationErrors(res.errors ?? [])
      setNvValidationWarnings(res.warnings ?? [])
      setNvValidationRan(true)
      setNvShowValidationPanel(true)
      if (res.valid) {
        newVersionMutation.mutate({
          service_name: svc,
          config_name: configName,
          content: newContent,
          format: configData?.format ?? 'json',
          created_by: '',
          description: newDescription,
          validate: false,
        })
      }
    },
    onError: () => {
      // Validation service down — proceed anyway
      newVersionMutation.mutate({
        service_name: svc,
        config_name: configName,
        content: newContent,
        format: configData?.format ?? 'json',
        created_by: '',
        description: newDescription,
        validate: false,
      })
    },
  })

  const newVersionMutation = useMutation({
    mutationFn: createConfig,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['config-versions', svc, configName] })
      queryClient.invalidateQueries({ queryKey: ['named-configs', svc] })
      navigate(`/services/${encodeURIComponent(svc)}/configs/${encodeURIComponent(data.config_id)}`)
    },
    onError: (e) => {
      setNewVersionError(e instanceof Error ? e.message : 'Failed to create version')
    },
  })

  function handleOpenNewVersion() {
    setNewContent(configData?.content ?? '')
    setNewDescription('')
    setNewVersionError(null)
    setNvValidationRan(false)
    setNvValidationErrors([])
    setNvValidationWarnings([])
    setNvShowValidationPanel(false)
    setShowNewVersion(true)
  }

  function handleSubmitNewVersion(e: React.FormEvent) {
    e.preventDefault()
    setNewVersionError(null)

    if (!newContent.trim()) {
      setNewVersionError('Content cannot be empty')
      return
    }

    // Block if content is identical to the latest version's content
    if (configData && latestMeta && newContent === configData.content && meta?.config_id === latestMeta.config_id) {
      setNewVersionError('No changes detected — the content is identical to the current version. Edit the content before saving.')
      return
    }

    nvValidateMutation.mutate({
      service_name: svc,
      content: newContent,
      format: configData?.format ?? 'json',
    })
  }

  const nvErrorCount = nvValidationErrors.length
  const nvWarnCount = nvValidationWarnings.length
  const nvIsPending = nvValidateMutation.isPending || newVersionMutation.isPending

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => navigate(`/services/${encodeURIComponent(svc)}`)}
            style={{ padding: '4px 8px' }}
          >
            ← Back
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Services /</span>
          <span
            className="service-badge"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/services/${encodeURIComponent(svc)}`)}
          >
            {svc}
          </span>
          {configName && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>
                {configName}
              </span>
            </>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>/</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>
            {meta ? `v${meta.version}` : cfgId.slice(0, 8)}
          </span>
        </div>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {meta ? `Config v${meta.version}` : 'Config Detail'}
          {meta?.is_active && <span className="badge badge-active">Active</span>}
        </div>
        <div className="page-subtitle">{svc} · {meta?.format ?? ''}</div>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {result.message}
          <button
            style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14 }}
            onClick={() => setResult(null)}
          >✕</button>
        </div>
      )}

      {/* Metadata */}
      {meta && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><span className="card-title">Metadata</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px 24px' }}>
            {[
              { label: 'Config ID', value: meta.config_id, mono: true },
              { label: 'Config Name', value: meta.config_name || '—', mono: true },
              { label: 'Version', value: `v${meta.version}`, mono: true },
              { label: 'Format', value: meta.format },
              { label: 'Created By', value: meta.created_by || '—', mono: true },
              { label: 'Created At', value: formatDate(meta.created_at) },
              { label: 'Description', value: meta.description || '—' },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Content */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Content</span>
          {configData && !showNewVersion && can('configs.create') && (
            <button className="btn btn-primary btn-sm" onClick={handleOpenNewVersion}>
              + Create New Version
            </button>
          )}
        </div>
        {contentLoading && <div className="loading-container"><div className="spinner" /> Loading...</div>}
        {contentError && (
          <div className="alert alert-error">
            {contentError instanceof Error ? contentError.message : 'Failed to load content'}
          </div>
        )}
        {configData && !showNewVersion && (
          <pre className="code-block" style={{ maxHeight: 480, overflowY: 'auto', margin: 0 }}>
            {configData.content}
          </pre>
        )}

        {/* Inline new-version editor */}
        {showNewVersion && (
          <form onSubmit={handleSubmitNewVersion}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Editing from <strong>v{meta?.version}</strong> — modify the content below and save as a new version.
            </div>

            {newVersionError && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>
                {newVersionError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">Description (what changed)</label>
              <input
                className="input"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Briefly describe what changed in this version"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Content</label>
              <textarea
                className="textarea code"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => handleTabKey(e, setNewContent)}
                rows={16}
                style={{ minHeight: 280 }}
                required
              />
            </div>

            {/* Bug icon — validation indicator */}
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  cursor: nvValidationRan ? 'pointer' : 'default',
                  padding: 0,
                  fontSize: 13,
                  color: nvErrorCount > 0 ? 'var(--error)' : nvValidationRan ? '#34d399' : 'var(--text-muted)',
                }}
                onClick={() => nvValidationRan && setNvShowValidationPanel((v) => !v)}
              >
                <Bug size={14} style={{ flexShrink: 0 }} />
                <span>
                  {!nvValidationRan
                    ? 'Validation will run on save'
                    : nvErrorCount > 0
                    ? `${nvErrorCount} error${nvErrorCount !== 1 ? 's' : ''}${nvWarnCount > 0 ? `, ${nvWarnCount} warning${nvWarnCount !== 1 ? 's' : ''}` : ''} — click to ${nvShowValidationPanel ? 'hide' : 'view'}`
                    : nvWarnCount > 0
                    ? `${nvWarnCount} warning${nvWarnCount !== 1 ? 's' : ''}, no errors`
                    : 'No errors'}
                </span>
              </button>

              {nvShowValidationPanel && nvValidationRan && (
                <div style={{
                  marginTop: 8,
                  border: `1px solid ${nvErrorCount > 0 ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                }}>
                  {nvErrorCount === 0 && nvWarnCount === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No issues found.</div>
                  ) : (
                    <>
                      {nvValidationErrors.map((err, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--error)' }}>{err.field || 'root'}</span>
                            <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: 'var(--error)', padding: '1px 6px', borderRadius: 4 }}>{err.error_type}</span>
                          </div>
                          <div style={{ fontSize: 12 }}>{err.message}</div>
                          {(err.line > 0 || err.column > 0) && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              Line {err.line}, Col {err.column}
                            </div>
                          )}
                        </div>
                      ))}
                      {nvValidationWarnings.map((w, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>{w.field || 'root'}</span>
                            <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 6px', borderRadius: 4 }}>{w.warning_type}</span>
                          </div>
                          <div style={{ fontSize: 12 }}>{w.message}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                onClick={() => { setShowNewVersion(false); setNewVersionError(null) }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={nvIsPending || !newContent.trim()}
              >
                {nvIsPending ? (
                  <><div className="spinner" />{nvValidateMutation.isPending ? 'Validating...' : 'Saving...'}</>
                ) : (
                  'Save as New Version'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Rollout */}
      {meta && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Rollout</span>
          </div>

          {meta.is_active ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              This version is currently active — no rollout needed.
            </div>
          ) : (
            <>
              {!showRolloutForm ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>
                    This version is inactive. Start a rollout to make it the active version.
                  </div>
                  {can('rollouts.manage') && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowRolloutForm(true)}
                    >
                      Start Rollout →
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
                      <label className="form-label">Strategy</label>
                      <select
                        className="select"
                        value={rolloutStrategy}
                        onChange={(e) => setRolloutStrategy(e.target.value as 'ALL_AT_ONCE' | 'CANARY' | 'PERCENTAGE')}
                      >
                        <option value="ALL_AT_ONCE">All at once</option>
                        <option value="CANARY">Canary</option>
                        <option value="PERCENTAGE">Percentage</option>
                      </select>
                    </div>
                    {rolloutStrategy !== 'ALL_AT_ONCE' && (
                    <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                      <label className="form-label">Target % (1–100)</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={100}
                        value={rolloutTargetPct}
                        onChange={(e) => setRolloutTargetPct(Number(e.target.value))}
                      />
                    </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm" onClick={() => setShowRolloutForm(false)}>Cancel</button>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={rolloutMutation.isPending}
                      onClick={() => rolloutMutation.mutate()}
                    >
                      {rolloutMutation.isPending ? (
                        <><div className="spinner" /> Starting...</>
                      ) : (
                        'Confirm Rollout'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Rollback */}
      {showRollback && can('rollouts.manage') && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Rollback</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {olderVersions.length} version{olderVersions.length !== 1 ? 's' : ''} available
            </span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Select a version to roll back to. This will immediately create and activate a copy of that config.
          </p>

          <div className="table-container" style={{ marginBottom: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Version</th>
                  <th>Created By</th>
                  <th>Description</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {olderVersions.map((c) => (
                  <tr
                    key={c.config_id}
                    className="clickable"
                    onClick={() => { setRollbackTarget(c); setConfirmed(false) }}
                    style={{
                      background: rollbackTarget?.config_id === c.config_id
                        ? 'rgba(99,102,241,0.1)' : undefined,
                      outline: rollbackTarget?.config_id === c.config_id
                        ? '1px solid var(--accent)' : undefined,
                    }}
                  >
                    <td>
                      <input
                        type="radio"
                        readOnly
                        checked={rollbackTarget?.config_id === c.config_id}
                        style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                    </td>
                    <td><span className="text-mono" style={{ color: 'var(--accent)' }}>v{c.version}</span></td>
                    <td className="text-mono">{c.created_by || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.description || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rollbackTarget && (
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 8,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, color: '#f59e0b', flex: 1 }}>
                Roll back from <strong>v{meta?.version}</strong> → <strong>v{rollbackTarget.version}</strong>.
                This will immediately activate v{rollbackTarget.version}.
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  style={{ accentColor: '#f59e0b' }}
                />
                I confirm this rollback
              </label>
              <button
                className="btn btn-danger"
                disabled={!confirmed || rollbackMutation.isPending}
                onClick={() => rollbackMutation.mutate({ toVersion: rollbackTarget.version })}
              >
                {rollbackMutation.isPending ? 'Rolling back…' : '↩ Execute Rollback'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
