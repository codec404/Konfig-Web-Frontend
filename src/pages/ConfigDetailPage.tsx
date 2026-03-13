import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConfig, getServiceConfigs } from '../api/configs'
import { rollbackConfig } from '../api/rollouts'
import type { ConfigMetadata } from '../api/types'

function formatDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export default function ConfigDetailPage() {
  const { serviceName, configId } = useParams<{ serviceName: string; configId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [rollbackTarget, setRollbackTarget] = useState<ConfigMetadata | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const svc = serviceName ?? ''
  const cfgId = configId ?? ''

  // Fetch full config content
  const { data: configData, isLoading: contentLoading, error: contentError } = useQuery({
    queryKey: ['config-detail', cfgId],
    queryFn: () => getConfig(cfgId),
    enabled: !!cfgId,
  })

  // Fetch all configs for the service (needed for metadata + rollback targets)
  const { data: allConfigs } = useQuery({
    queryKey: ['configs', svc, 0],
    queryFn: () => getServiceConfigs(svc, 100, 0),
    enabled: !!svc,
  })

  const configs = allConfigs?.configs ?? []
  const meta = configs.find((c) => c.config_id === cfgId)
  const olderVersions = configs.filter((c) => !c.is_active && c.config_id !== cfgId)

  const showRollback = meta?.is_active && (meta?.version ?? 0) > 1 && olderVersions.length > 0

  const rollbackMutation = useMutation({
    mutationFn: ({ toVersion }: { toVersion: number }) =>
      rollbackConfig(cfgId, { service_name: svc, to_version: toVersion }),
    onSuccess: (res) => {
      setResult({ success: res.success, message: res.message })
      setRollbackTarget(null)
      setConfirmed(false)
      queryClient.invalidateQueries({ queryKey: ['configs', svc] })
      if (res.success) {
        // Navigate back to service configs after successful rollback
        setTimeout(() => navigate(`/services/${encodeURIComponent(svc)}`), 1500)
      }
    },
    onError: (e) => {
      setResult({ success: false, message: e instanceof Error ? e.message : 'Rollback failed' })
    },
  })

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
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Services /
          </span>
          <span
            className="service-badge"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/services/${encodeURIComponent(svc)}`)}
          >
            {svc}
          </span>
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
        <div className="card-header"><span className="card-title">Content</span></div>
        {contentLoading && <div className="loading-container"><div className="spinner" /> Loading...</div>}
        {contentError && (
          <div className="alert alert-error">
            {contentError instanceof Error ? contentError.message : 'Failed to load content'}
          </div>
        )}
        {configData && (
          <pre className="code-block" style={{ maxHeight: 480, overflowY: 'auto', margin: 0 }}>
            {configData.content}
          </pre>
        )}
      </div>

      {/* Rollback */}
      {showRollback && (
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
