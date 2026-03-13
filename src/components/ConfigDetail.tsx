import { useQuery } from '@tanstack/react-query'
import { getConfig } from '../api/configs'

interface ConfigDetailProps {
  configId: string
  onClose?: () => void
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function ConfigDetail({ configId, onClose }: ConfigDetailProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['config-detail', configId],
    queryFn: () => getConfig(configId),
    enabled: !!configId,
  })

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        Loading config...
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        {error instanceof Error ? error.message : 'Failed to load config'}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Config Detail</span>
        {onClose && (
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            ✕ Close
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        <div>
          <div className="form-label">Config ID</div>
          <div className="text-mono" style={{ marginTop: 4, color: 'var(--text)' }}>
            {data.config_id}
          </div>
        </div>
        <div>
          <div className="form-label">Service</div>
          <div className="service-badge" style={{ marginTop: 6, fontSize: 12 }}>
            {data.service_name}
          </div>
        </div>
        <div>
          <div className="form-label">Version</div>
          <div style={{ marginTop: 4, color: 'var(--accent)', fontWeight: 700 }}>
            v{data.version}
          </div>
        </div>
        <div>
          <div className="form-label">Format</div>
          <div style={{ marginTop: 4 }}>
            <span className="badge badge-inactive" style={{ textTransform: 'uppercase' }}>
              {data.format}
            </span>
          </div>
        </div>
        <div>
          <div className="form-label">Created By</div>
          <div className="text-mono" style={{ marginTop: 4 }}>
            {data.created_by || '—'}
          </div>
        </div>
        <div>
          <div className="form-label">Created At</div>
          <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>
            {formatDate(data.created_at)}
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="form-label">Content Hash</div>
          <div className="text-mono" style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>
            {data.content_hash || '—'}
          </div>
        </div>
      </div>

      <div>
        <div className="form-label" style={{ marginBottom: 8 }}>
          Content
        </div>
        <pre className="code-block">{data.content}</pre>
      </div>
    </div>
  )
}
