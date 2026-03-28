import { useState, useEffect, useRef } from 'react'
import { getOrgSlug } from '../utils/subdomain'

interface LogEntry {
  ts: string
  data: unknown
}

const WS_BASE = import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`

const SESSION_KEY = 'liveUpdatesService'

export default function LiveUpdates() {
  const [serviceName, setServiceName] = useState('')
  const [inputService, setInputService] = useState(() => sessionStorage.getItem(SESSION_KEY) || '')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const logEndRef = useRef<HTMLDivElement | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeService = useRef<string>('')

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  useEffect(() => {
    // Auto-reconnect if a service was active before refresh
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) {
      connectToService(saved)
    }
    return () => {
      activeService.current = ''
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close(1000, 'Cleanup')
    }
  }, [])

  function connect() {
    if (!inputService.trim()) return
    connectToService(inputService.trim())
  }

  function connectToService(svc: string) {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    if (wsRef.current) {
      wsRef.current.close(1000, 'Reconnecting')
    }

    sessionStorage.setItem(SESSION_KEY, svc)
    activeService.current = svc
    setInputService(svc)
    setLogs([])
    setError(null)
    setConnecting(true)
    setServiceName(svc)

    const instanceId = `web-${Date.now()}`
    const orgSlug = getOrgSlug()
    const url = `${WS_BASE}/ws/subscribe/${encodeURIComponent(svc)}?instance_id=${instanceId}${orgSlug ? `&org_slug=${encodeURIComponent(orgSlug)}` : ''}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (ws !== wsRef.current) return
      setConnected(true)
      setConnecting(false)
      setError(null)
      setLogs((prev) => [
        ...prev,
        {
          ts: new Date().toISOString(),
          data: { event: 'connected', service: svc, instance_id: instanceId },
        },
      ])
    }

    ws.onmessage = (e) => {
      if (ws !== wsRef.current) return
      let data: unknown
      try {
        data = JSON.parse(e.data)
      } catch {
        data = e.data
      }
      setLogs((prev) => [...prev.slice(-99), { ts: new Date().toISOString(), data }])
    }

    ws.onerror = () => {
      if (ws !== wsRef.current) return
      setConnecting(false)
      setConnected(false)
      // onerror fires before onclose; the friendly message is set in onclose
      // to use the close code for context. Nothing to do here.
    }

    ws.onclose = (e) => {
      if (ws !== wsRef.current) return
      setConnected(false)
      setConnecting(false)
      if (e.code === 1000) return // clean disconnect, nothing to show

      // Code 1006 = abnormal closure, which the browser reports when the
      // server rejects the HTTP upgrade (e.g. 401 Unauthorised or 403 Forbidden).
      const permissionDenied = e.code === 1006

      if (permissionDenied) {
        setError('Connection refused. You may not have permission to subscribe to this service, or the service name is invalid.')
      }

      setLogs((prev) => [
        ...prev,
        {
          ts: new Date().toISOString(),
          data: { event: 'disconnected', code: e.code, reason: e.reason || 'Connection closed' },
        },
      ])

      // Don't auto-reconnect on server-rejected connections — retrying won't help.
      if (!permissionDenied && activeService.current) {
        reconnectTimer.current = setTimeout(() => {
          if (activeService.current) {
            connectToService(activeService.current)
          }
        }, 3000)
      }
    }
  }

  function disconnect() {
    sessionStorage.removeItem(SESSION_KEY)
    activeService.current = ''
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    wsRef.current?.close(1000, 'User disconnected')
    setConnected(false)
    setServiceName('')
  }

  function clearLogs() {
    setLogs([])
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Live Updates</div>
        <div className="page-subtitle">Real-time config push events via WebSocket</div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">WebSocket Connection</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: connected ? 'var(--success)' : 'var(--text-muted)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: connected ? 'var(--success)' : connecting ? 'var(--warning)' : 'var(--text-dim)',
                display: 'inline-block',
              }}
            />
            {connected ? `Connected to ${serviceName}` : connecting ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div className="flex-center gap-2">
          <input
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Service name (e.g. auth-service)"
            value={inputService}
            onChange={(e) => setInputService(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !connected && connect()}
            disabled={connected || connecting}
          />
          {!connected ? (
            <button
              className="btn btn-primary"
              onClick={connect}
              disabled={!inputService.trim() || connecting}
            >
              {connecting ? (
                <>
                  <div className="spinner" /> Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          ) : (
            <button className="btn btn-danger" onClick={disconnect}>
              Disconnect
            </button>
          )}
          <button className="btn btn-ghost" onClick={clearLogs} disabled={logs.length === 0}>
            Clear
          </button>
        </div>

        {connected && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Endpoint: {WS_BASE}/ws/subscribe/{serviceName}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Event Log</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {logs.length} event{logs.length !== 1 ? 's' : ''} (last 100)
          </span>
        </div>

        <div className="log-container">
          {logs.length === 0 ? (
            <div className="log-empty">
              {connected
                ? 'Waiting for events...'
                : 'Connect to a service to start receiving live updates.'}
            </div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="log-entry">
                <span className="log-ts">{entry.ts.replace('T', ' ').replace('Z', '')}</span>
                <span className="log-data">
                  {typeof entry.data === 'string'
                    ? entry.data
                    : JSON.stringify(entry.data, null, 0)}
                </span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  )
}
