import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getNamedConfigs, getConfigVersions, deleteConfig } from '../api/configs'
import type { NamedConfigSummary, ConfigMetadata } from '../api/types'
import UploadConfig from './UploadConfig'

interface ConfigListProps {
  serviceName: string
}

const FORMAT_MAP: Record<string, { color: string; bg: string; border: string }> = {
  json:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  yaml:  { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  yml:   { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  toml:  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)'  },
  xml:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  env:   { color: '#e879f9', bg: 'rgba(232,121,249,0.12)', border: 'rgba(232,121,249,0.3)' },
  ini:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  text:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
}

function FormatBadge({ format }: { format: string }) {
  const key = format.toLowerCase()
  const s = FORMAT_MAP[key] ?? { color: 'var(--text-muted)', bg: 'var(--surface-2)', border: 'var(--border)' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
    }}>
      {format}
    </span>
  )
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

// ─── Level 1: Named Config List ──────────────────────────────────────────────

function NamedConfigList({
  serviceName,
  onSelect,
}: {
  serviceName: string
  onSelect: (nc: NamedConfigSummary) => void
}) {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: configs = [], isLoading, error } = useQuery({
    queryKey: ['named-configs', serviceName],
    queryFn: () => getNamedConfigs(serviceName),
  })

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        Loading configs...
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ marginBottom: 16 }}>
        {error instanceof Error ? error.message : 'Failed to load configs'}
      </div>
    )
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {configs.length} named config{configs.length !== 1 ? 's' : ''}
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Config
        </button>
      </div>

      {showCreate && (
        <div style={{ marginBottom: 20 }}>
          <UploadConfig
            serviceName={serviceName}
            onSuccess={() => {
              setShowCreate(false)
              queryClient.invalidateQueries({ queryKey: ['named-configs', serviceName] })
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {configs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <div className="empty-state-title">No configs yet</div>
          <div className="empty-state-desc">Create the first named config for this service.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Config Name</th>
                <th>Format</th>
                <th>Versions</th>
                <th>Latest Version</th>
                <th>Last Updated</th>
                <th>Rollout</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {configs.map((nc) => (
                <tr
                  key={nc.config_name}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelect(nc)}
                >
                  <td>
                    <span className="text-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      {nc.config_name}
                    </span>
                  </td>
                  <td><FormatBadge format={nc.format || 'json'} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{nc.version_count}</td>
                  <td>
                    <span className="text-mono" style={{ color: 'var(--accent)' }}>
                      v{nc.latest_version}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(nc.latest_updated_at)}</td>
                  <td>
                    {nc.has_active_rollout ? (
                      <span className="badge badge-in-progress">Active</span>
                    ) : (
                      <span className="badge badge-inactive">None</span>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onSelect(nc) }}>
                      View Versions →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Level 2: Version List for a Named Config ─────────────────────────────────

function ConfigVersionList({
  serviceName,
  namedConfig,
  onBack,
}: {
  serviceName: string
  namedConfig: NamedConfigSummary
  onBack: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['config-versions', serviceName, namedConfig.config_name, page],
    queryFn: () => getConfigVersions(serviceName, namedConfig.config_name, limit, page * limit),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-versions', serviceName, namedConfig.config_name] })
      queryClient.invalidateQueries({ queryKey: ['named-configs', serviceName] })
    },
  })

  function handleDelete(configId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this config version? This action cannot be undone.')) return
    deleteMutation.mutate(configId)
  }

  function handleView(config: ConfigMetadata, e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/services/${encodeURIComponent(serviceName)}/configs/${encodeURIComponent(config.config_id)}`)
  }

  const configs = data?.configs ?? []
  const total = data?.total_count ?? 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-sm btn-ghost" onClick={onBack} style={{ padding: '4px 8px' }}>
          ← Back
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Named Configs /</span>
        <span className="text-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          {namedConfig.config_name}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {total} version{total !== 1 ? 's' : ''} · Open any version to create a new one based on it
        </span>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner" />
          Loading versions...
        </div>
      ) : error ? (
        <div className="alert alert-error">
          {error instanceof Error ? error.message : 'Failed to load versions'}
        </div>
      ) : configs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <div className="empty-state-title">No versions</div>
          <div className="empty-state-desc">Add the first version for this config.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Format</th>
                <th>Created By</th>
                <th>Created At</th>
                <th>Description</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.config_id}>
                  <td>
                    <span className="text-mono" style={{ color: 'var(--accent)' }}>
                      v{config.version}
                    </span>
                  </td>
                  <td><FormatBadge format={config.format} /></td>
                  <td className="text-mono">{config.created_by || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(config.created_at)}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 200 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {config.description || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${config.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', minWidth: 140 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <button className="btn btn-sm" onClick={(e) => handleView(config, e)}>View</button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={(e) => handleDelete(config.config_id, e)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <div className="flex-center gap-2" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Page {page + 1} of {Math.ceil(total / limit)}
          </span>
          <button
            className="btn btn-sm"
            disabled={(page + 1) * limit >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function ConfigList({ serviceName }: ConfigListProps) {
  const [selected, setSelected] = useState<NamedConfigSummary | null>(null)

  if (selected) {
    return (
      <ConfigVersionList
        serviceName={serviceName}
        namedConfig={selected}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <NamedConfigList
      serviceName={serviceName}
      onSelect={setSelected}
    />
  )
}
