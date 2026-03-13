import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSchemas, createSchema } from '../api/validation'
import type { Schema, CreateSchemaRequest } from '../api/types'

interface SchemaManagerProps {
  serviceName?: string
}

const SCHEMA_TYPES = ['json_schema', 'protobuf', 'avro', 'custom'] as const

export default function SchemaManager({ serviceName }: SchemaManagerProps) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateSchemaRequest>({
    service_name: serviceName ?? '',
    schema_id: '',
    schema_type: 'json_schema',
    schema_content: '',
    description: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: schemas, isLoading, error } = useQuery({
    queryKey: ['schemas', serviceName],
    queryFn: () => getSchemas(serviceName),
  })

  const createMutation = useMutation({
    mutationFn: createSchema,
    onSuccess: () => {
      setSuccessMsg('Schema registered successfully!')
      setShowForm(false)
      setForm({
        service_name: serviceName ?? '',
        schema_id: '',
        schema_type: 'json_schema',
        schema_content: '',
        description: '',
      })
      queryClient.invalidateQueries({ queryKey: ['schemas'] })
      setTimeout(() => setSuccessMsg(null), 3000)
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Failed to register schema')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.schema_content.trim()) {
      setFormError('Schema content is required')
      return
    }
    createMutation.mutate(form)
  }

  function toggleExpand(schema: Schema) {
    setExpandedId(expandedId === schema.schema_id ? null : schema.schema_id)
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        Loading schemas...
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        {error instanceof Error ? error.message : 'Failed to load schemas'}
      </div>
    )
  }

  const schemaList = schemas ?? []

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {schemaList.length} schema{schemaList.length !== 1 ? 's' : ''}
          {serviceName ? ` for ${serviceName}` : ' total'}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Register Schema'}
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Register New Schema</span>
          </div>

          {formError && (
            <div className="alert alert-error" style={{ marginBottom: 14 }}>
              {formError}
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
                <label className="form-label">Schema ID</label>
                <input
                  className="input"
                  value={form.schema_id}
                  onChange={(e) => setForm((f) => ({ ...f, schema_id: e.target.value }))}
                  placeholder="my-service-v1"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Schema Type</label>
                <select
                  className="select"
                  value={form.schema_type}
                  onChange={(e) => setForm((f) => ({ ...f, schema_type: e.target.value }))}
                >
                  {SCHEMA_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Schema Content</label>
              <textarea
                className="textarea code"
                rows={12}
                value={form.schema_content}
                onChange={(e) => setForm((f) => ({ ...f, schema_content: e.target.value }))}
                placeholder={
                  form.schema_type === 'json_schema'
                    ? '{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "type": "object",\n  "properties": {\n    "key": { "type": "string" }\n  }\n}'
                    : 'Enter schema content...'
                }
                required
                style={{ minHeight: 200 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <div className="spinner" /> Registering...
                  </>
                ) : (
                  'Register Schema'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {schemaList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⬡</div>
          <div className="empty-state-title">No schemas registered</div>
          <div className="empty-state-desc">
            Register a schema to enable config validation.
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Schema ID</th>
                <th>Service</th>
                <th>Type</th>
                <th>Description</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {schemaList.map((schema) => (
                <>
                  <tr
                    key={schema.schema_id}
                    className="clickable"
                    onClick={() => toggleExpand(schema)}
                  >
                    <td className="text-mono" style={{ color: 'var(--accent)' }}>
                      {schema.schema_id}
                    </td>
                    <td className="text-mono">{schema.service_name}</td>
                    <td>
                      <span className="badge badge-inactive">
                        {schema.schema_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {schema.description || '—'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          schema.is_active ? 'badge-active' : 'badge-inactive'
                        }`}
                      >
                        {schema.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-ghost">
                        {expandedId === schema.schema_id ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === schema.schema_id && (
                    <tr key={`${schema.schema_id}-expand`}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div className="config-expand">
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                            Schema Content
                          </div>
                          <pre className="code-block schema-content">
                            {schema.schema_content}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
