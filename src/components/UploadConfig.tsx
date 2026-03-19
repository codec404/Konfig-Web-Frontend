import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createConfig } from '../api/configs'
import { validateConfig } from '../api/validation'
import type { CreateConfigRequest, ValidationError, ValidationWarning } from '../api/types'

interface UploadConfigProps {
  serviceName: string
  configName?: string
  onSuccess: () => void
  onCancel: () => void
}

const FORMAT_OPTIONS = ['json', 'yaml'] as const

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

export default function UploadConfig({ serviceName, configName, onSuccess, onCancel }: UploadConfigProps) {
  const isNewVersion = !!configName

  const [form, setForm] = useState<CreateConfigRequest>({
    service_name: serviceName,
    config_name: configName ?? '',
    content: '',
    format: 'json',
    created_by: '',
    description: '',
    validate: false,
  })
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([])
  const [showValidationPanel, setShowValidationPanel] = useState(false)
  const [validationRan, setValidationRan] = useState(false)

  const createMutation = useMutation({
    mutationFn: createConfig,
    onSuccess: (data) => {
      setSuccessMsg(`Config saved successfully! Version: ${data.version}`)
      setTimeout(() => onSuccess(), 1200)
    },
  })

  const validateMutation = useMutation({
    mutationFn: validateConfig,
    onSuccess: (result) => {
      setValidationErrors(result.errors ?? [])
      setValidationWarnings(result.warnings ?? [])
      setValidationRan(true)
      setShowValidationPanel(true)
      if (result.valid) {
        createMutation.mutate(form)
      }
    },
    onError: () => {
      createMutation.mutate(form)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim() || !form.config_name.trim()) return
    validateMutation.mutate({
      service_name: form.service_name,
      content: form.content,
      format: form.format,
    })
  }

  const errorCount = validationErrors.length
  const warnCount = validationWarnings.length
  const isPending = validateMutation.isPending || createMutation.isPending

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          {isNewVersion ? `Add New Version — ${configName}` : 'Create Named Config'}
        </span>
        <button className="btn btn-sm btn-ghost" onClick={onCancel}>Cancel</button>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>{successMsg}</div>
      )}
      {createMutation.error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {createMutation.error instanceof Error ? createMutation.error.message : 'Upload failed'}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Service Name</label>
            <input
              className="input"
              value={form.service_name}
              onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))}
              placeholder="my-service"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Config Name</label>
            <input
              className="input"
              value={form.config_name}
              onChange={(e) => setForm((f) => ({ ...f, config_name: e.target.value }))}
              placeholder="e.g. database-config"
              required
              disabled={isNewVersion}
              style={isNewVersion ? { opacity: 0.6 } : undefined}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Format</label>
            <select
              className="select"
              value={form.format}
              onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
            >
              {FORMAT_OPTIONS.map((fmt) => (
                <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Created By</label>
            <input
              className="input"
              value={form.created_by}
              onChange={(e) => setForm((f) => ({ ...f, created_by: e.target.value }))}
              placeholder="username or system"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={isNewVersion ? 'What changed in this version?' : 'Brief description'}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Config Content</label>
          <textarea
            className="textarea code"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            onKeyDown={(e) => handleTabKey(e, (v) => setForm((f) => ({ ...f, content: v })))}
            placeholder={form.format === 'json' ? '{\n  "key": "value"\n}' : 'key: value\n'}
            rows={12}
            required
            style={{ minHeight: 220 }}
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
              cursor: validationRan ? 'pointer' : 'default',
              padding: 0,
              fontSize: 13,
              color: errorCount > 0 ? 'var(--error)' : validationRan ? '#34d399' : 'var(--text-muted)',
            }}
            onClick={() => validationRan && setShowValidationPanel((v) => !v)}
          >
            <span style={{ fontSize: 15 }}>🐛</span>
            <span>
              {!validationRan
                ? 'Validation will run on save'
                : errorCount > 0
                ? `${errorCount} error${errorCount !== 1 ? 's' : ''}${warnCount > 0 ? `, ${warnCount} warning${warnCount !== 1 ? 's' : ''}` : ''} — click to ${showValidationPanel ? 'hide' : 'view'}`
                : warnCount > 0
                ? `${warnCount} warning${warnCount !== 1 ? 's' : ''}, no errors`
                : 'No errors'}
            </span>
          </button>

          {showValidationPanel && validationRan && (
            <div style={{
              marginTop: 8,
              border: `1px solid ${errorCount > 0 ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
              borderRadius: 6,
              padding: '10px 12px',
            }}>
              {errorCount === 0 && warnCount === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No issues found.</div>
              ) : (
                <>
                  {validationErrors.map((err, i) => (
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
                  {validationWarnings.map((w, i) => (
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

        <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || !form.content.trim() || !form.config_name.trim()}
          >
            {isPending ? (
              <><div className="spinner" />{validateMutation.isPending ? 'Validating...' : 'Saving...'}</>
            ) : isNewVersion ? (
              'Save as New Version'
            ) : (
              'Create Config'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
