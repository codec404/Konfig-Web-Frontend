import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createConfig } from '../api/configs'
import type { CreateConfigRequest } from '../api/types'

interface UploadConfigProps {
  serviceName: string
  onSuccess: () => void
  onCancel: () => void
}

const FORMAT_OPTIONS = ['json', 'yaml'] as const

export default function UploadConfig({ serviceName, onSuccess, onCancel }: UploadConfigProps) {
  const [form, setForm] = useState<CreateConfigRequest>({
    service_name: serviceName,
    content: '',
    format: 'json',
    created_by: '',
    description: '',
    validate: true,
  })
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [formatError, setFormatError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createConfig,
    onSuccess: (data) => {
      setSuccessMsg(`Config created successfully! Version: ${data.version}`)
      setTimeout(() => {
        onSuccess()
      }, 1200)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) return
    setFormatError(null)
    if (form.format === 'json') {
      try {
        JSON.parse(form.content)
      } catch {
        setFormatError('Content is not valid JSON. Switch the format to YAML/TOML or fix the content.')
        return
      }
    } else if (form.format === 'yaml') {
      let looksLikeJson = false
      try {
        JSON.parse(form.content)
        looksLikeJson = true
      } catch { /* not json, that's fine */ }
      if (looksLikeJson) {
        setFormatError('Content is JSON but format is set to YAML. Switch the format to JSON or provide YAML content.')
        return
      }
    }
    mutation.mutate(form)
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Upload New Config</span>
        <button className="btn btn-sm btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      {formatError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {formatError}
        </div>
      )}

      {mutation.error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {mutation.error instanceof Error ? mutation.error.message : 'Upload failed'}
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
            <label className="form-label">Format</label>
            <select
              className="select"
              value={form.format}
              onChange={(e) => { setFormatError(null); setForm((f) => ({ ...f, format: e.target.value })) }}
            >
              {FORMAT_OPTIONS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Created By</label>
            <input
              className="input"
              value={form.created_by}
              onChange={(e) => setForm((f) => ({ ...f, created_by: e.target.value }))}
              placeholder="username or system"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of changes"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Config Content</label>
          <textarea
            className="textarea code"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder={
              form.format === 'json'
                ? '{\n  "key": "value"\n}'
                : form.format === 'yaml'
                ? 'key: value\n'
                : 'key = "value"\n'
            }
            rows={12}
            required
            style={{ minHeight: 220 }}
          />
        </div>

        <div className="form-group">
          <label className="checkbox-group">
            <input
              type="checkbox"
              checked={form.validate}
              onChange={(e) => setForm((f) => ({ ...f, validate: e.target.checked }))}
            />
            <span>Validate before upload</span>
          </label>
        </div>

        <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={mutation.isPending || !form.content.trim()}
          >
            {mutation.isPending ? (
              <>
                <div className="spinner" />
                Uploading...
              </>
            ) : (
              'Upload Config'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
