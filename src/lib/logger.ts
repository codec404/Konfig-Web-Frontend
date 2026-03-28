type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: Level
  message: string
  context?: Record<string, unknown>
  timestamp: string
}

const FLUSH_INTERVAL_MS = 5000
const MAX_BATCH = 50

let buffer: LogEntry[] = []
let timer: ReturnType<typeof setTimeout> | null = null

function enqueue(level: Level, message: string, context?: Record<string, unknown>) {
  buffer.push({ level, message, context, timestamp: new Date().toISOString() })
  if (buffer.length >= MAX_BATCH) {
    flush()
    return
  }
  if (!timer) {
    timer = setTimeout(flush, FLUSH_INTERVAL_MS)
  }
}

function flush() {
  if (timer) { clearTimeout(timer); timer = null }
  if (buffer.length === 0) return
  const batch = buffer.splice(0)
  fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
    credentials: 'include',
    keepalive: true,
  }).catch(() => { /* silent — never break the app over logging */ })
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flush)
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => enqueue('debug', msg, ctx),
  info:  (msg: string, ctx?: Record<string, unknown>) => enqueue('info',  msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => enqueue('warn',  msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => enqueue('error', msg, ctx),
}
