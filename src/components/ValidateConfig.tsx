import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { validateConfig } from '../api/validation'
import type { ValidationResult } from '../api/types'

interface ValidateConfigProps {
  serviceName: string
}

const FORMAT_OPTIONS = ['json', 'yaml', 'toml'] as const

export default function ValidateConfig({ serviceName }: ValidateConfigProps) {
  const [content, setContent] = useState('')
  const [format, setFormat] = useState<'json' | 'yaml' | 'toml'>('json')
  const [schemaId, setSchemaId] = useState('')
  const [strict, setStrict] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)

  const mutation = useMutation({
    mutationFn: validateConfig,
    onSuccess: (data) => {
      setResult(data)
    },
    onError: () => {
      setResult(null)
    },
  })

  function handleValidate(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    mutation.mutate({
      service_name: serviceName,
      content,
      format,
      schema_id: schemaId || undefined,
      strict,
    })
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Validate Config</span>
        </div>

        {mutation.error && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            {mutation.error instanceof Error ? mutation.error.message : 'Validation request failed'}
          </div>
        )}

        <form onSubmit={handleValidate}>
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Format</label>
              <select
                className="select"
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Schema ID (optional)</label>
              <input
                className="input"
                placeholder="Leave blank to skip schema validation"
                value={schemaId}
                onChange={(e) => setSchemaId(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Config Content</label>
            <textarea
              className="textarea code"
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                format === 'json'
                  ? '{\n  "key": "value"\n}'
                  : format === 'yaml'
                  ? 'key: value'
                  : 'key = "value"'
              }
              style={{ minHeight: 240 }}
              required
            />
          </div>

          <div className="flex-between">
            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={strict}
                onChange={(e) => setStrict(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Strict mode</span>
            </label>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={mutation.isPending || !content.trim()}
            >
              {mutation.isPending ? (
                <>
                  <div className="spinner" /> Validating...
                </>
              ) : (
                'Validate'
              )}
            </button>
          </div>
        </form>
      </div>

      {result && <ValidationResults result={result} />}
    </div>
  )
}

function ValidationResults({ result }: { result: ValidationResult }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Validation Results</span>
        <span
          className={`badge ${result.valid ? 'badge-active' : 'badge-failed'}`}
        >
          {result.valid ? 'Valid' : 'Invalid'}
        </span>
      </div>

      {result.valid && result.errors.length === 0 && result.warnings.length === 0 && (
        <div className="alert alert-success">
          Config is valid with no issues found.
        </div>
      )}

      {result.errors.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--error)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 8,
            }}
          >
            Errors ({result.errors.length})
          </div>
          {result.errors.map((err, i) => (
            <div key={i} className="validation-item validation-error-item">
              <div className="flex-between">
                <span className="validation-field" style={{ color: 'var(--error)' }}>
                  {err.field || 'root'}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    background: 'var(--error-dim)',
                    color: 'var(--error)',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  {err.error_type}
                </span>
              </div>
              <div className="validation-message">{err.message}</div>
              {(err.line > 0 || err.column > 0) && (
                <div className="validation-location">
                  Line {err.line}, Column {err.column}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {result.warnings.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--warning)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 8,
            }}
          >
            Warnings ({result.warnings.length})
          </div>
          {result.warnings.map((warn, i) => (
            <div key={i} className="validation-item validation-warning-item">
              <div className="flex-between">
                <span className="validation-field" style={{ color: 'var(--warning)' }}>
                  {warn.field || 'root'}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    background: 'var(--warning-dim)',
                    color: 'var(--warning)',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  {warn.warning_type}
                </span>
              </div>
              <div className="validation-message">{warn.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
