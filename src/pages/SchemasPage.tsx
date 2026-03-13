import { useState } from 'react'
import SchemaManager from '../components/SchemaManager'

export default function SchemasPage() {
  const [filterService, setFilterService] = useState('')
  const [activeService, setActiveService] = useState<string | undefined>(undefined)

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    setActiveService(filterService.trim() || undefined)
  }

  function clearFilter() {
    setFilterService('')
    setActiveService(undefined)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Schemas</div>
        <div className="page-subtitle">
          Manage validation schemas for config format enforcement
        </div>
      </div>

      <div className="card section">
        <div className="card-header">
          <span className="card-title">Filter by Service</span>
        </div>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Filter by service name (leave blank for all)"
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            style={{ maxWidth: 340 }}
          />
          <button type="submit" className="btn btn-primary">
            Filter
          </button>
          {activeService && (
            <button type="button" className="btn" onClick={clearFilter}>
              Clear
            </button>
          )}
        </form>
        {activeService && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            Showing schemas for:{' '}
            <span className="service-badge" style={{ fontSize: 12 }}>
              {activeService}
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <SchemaManager serviceName={activeService} />
      </div>
    </div>
  )
}
