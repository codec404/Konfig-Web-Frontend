import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { generateToken, listTokens, revokeToken } from '../api/tokens'
import type { GenerateTokenResponse } from '../api/tokens'

interface ServiceTokensProps {
  serviceName: string
}

function formatDate(iso: string | undefined): string {
  if (!iso) return 'Never'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

// Shown once immediately after generation — user must copy it before dismissing.
function NewTokenBanner({
  result,
  onDismiss,
}: {
  result: GenerateTokenResponse
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(result.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      border: '1px solid rgba(52,211,153,0.4)',
      borderRadius: 8,
      padding: '16px 18px',
      marginBottom: 20,
      background: 'rgba(52,211,153,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#34d399', marginBottom: 2 }}>
            Token generated — copy it now
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            This value will never be shown again. Store it in your service's environment variables.
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onDismiss} style={{ flexShrink: 0 }}>
          Dismiss
        </button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '8px 12px',
        fontFamily: 'monospace',
        fontSize: 13,
        wordBreak: 'break-all',
      }}>
        <span style={{ flex: 1, color: 'var(--text)' }}>{result.token}</span>
        <button
          className="btn btn-sm"
          onClick={handleCopy}
          style={{ flexShrink: 0, minWidth: 64 }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
        Usage: <code style={{ color: 'var(--accent)' }}>Authorization: Bearer {result.token}</code>
      </div>
    </div>
  )
}

export default function ServiceTokens({ serviceName }: ServiceTokensProps) {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('')
  const [newToken, setNewToken] = useState<GenerateTokenResponse | null>(null)

  const { data: tokens = [], isLoading, error } = useQuery({
    queryKey: ['service-tokens', serviceName],
    queryFn: () => listTokens(serviceName),
  })

  const generateMutation = useMutation({
    mutationFn: () => generateToken(serviceName, label.trim() || undefined),
    onSuccess: (data) => {
      setNewToken(data)
      setLabel('')
      queryClient.invalidateQueries({ queryKey: ['service-tokens', serviceName] })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => revokeToken(serviceName, tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-tokens', serviceName] })
    },
  })

  function handleRevoke(tokenId: string, prefix: string) {
    if (!confirm(`Revoke token ${prefix}?\n\nAny service using this token will immediately lose access.`)) return
    revokeMutation.mutate(tokenId)
  }

  return (
    <div>
      {/* New token banner */}
      {newToken && (
        <NewTokenBanner result={newToken} onDismiss={() => setNewToken(null)} />
      )}

      {/* Generate form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Generate New Token</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Label <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. production-server, ci-pipeline"
              onKeyDown={(e) => e.key === 'Enter' && generateMutation.mutate()}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            style={{ marginBottom: 0 }}
          >
            {generateMutation.isPending ? (
              <><div className="spinner" />Generating...</>
            ) : (
              'Generate Token'
            )}
          </button>
        </div>
        {generateMutation.error && (
          <div className="alert alert-error" style={{ marginTop: 12 }}>
            {generateMutation.error instanceof Error ? generateMutation.error.message : 'Failed to generate token'}
          </div>
        )}
      </div>

      {/* Token list */}
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner" />
          Loading tokens...
        </div>
      ) : error ? (
        <div className="alert alert-error">
          {error instanceof Error ? error.message : 'Failed to load tokens'}
        </div>
      ) : tokens.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔑</div>
          <div className="empty-state-title">No tokens yet</div>
          <div className="empty-state-desc">
            Generate a token to connect your service to Konfig via the SDK.
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Label</th>
                <th>Created</th>
                <th>Last Used</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="text-mono" style={{
                      color: 'var(--accent)',
                      fontSize: 13,
                      background: 'var(--surface-2)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                    }}>
                      {t.prefix}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {t.label || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {formatDate(t.created_at)}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {formatDate(t.last_used_at)}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleRevoke(t.id, t.prefix)}
                      disabled={revokeMutation.isPending}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Usage hint */}
      <div style={{
        marginTop: 20,
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderRadius: 8,
        border: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-muted)',
        lineHeight: 1.7,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>SDK usage</div>
        <div>Pull latest config:</div>
        <code style={{ color: 'var(--accent)', display: 'block', margin: '2px 0 8px' }}>
          GET /api/public/services/{serviceName}/configs/{'<config-name>'}/latest
        </code>
        <div>Live push (WebSocket):</div>
        <code style={{ color: 'var(--accent)', display: 'block', margin: '2px 0' }}>
          WS /ws/sdk/subscribe/{serviceName}
        </code>
        <div style={{ marginTop: 6 }}>Both require: <code style={{ color: 'var(--accent)' }}>Authorization: Bearer sk_svc_...</code></div>
      </div>
    </div>
  )
}
