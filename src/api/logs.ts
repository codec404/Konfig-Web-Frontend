import { apiClient } from './client'

export interface AppLog {
  id: number
  source: 'backend' | 'frontend'
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: Record<string, unknown>
  created_at: string
}

export interface LogsResponse {
  logs: AppLog[]
  total: number
}

export interface LogQuery {
  source?: string
  level?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export const logsAdminApi = {
  list: (q: LogQuery): Promise<LogsResponse> => {
    const params = new URLSearchParams()
    if (q.source && q.source !== 'all') params.set('source', q.source)
    if (q.level  && q.level  !== 'all') params.set('level',  q.level)
    if (q.from)   params.set('from',   q.from)
    if (q.to)     params.set('to',     q.to)
    if (q.limit)  params.set('limit',  String(q.limit))
    if (q.offset) params.set('offset', String(q.offset))
    return apiClient.get(`/api/admin/logs?${params}`).then(r => r.data)
  },
  getSettings: (): Promise<{ levels: string[] }> =>
    apiClient.get('/api/admin/logs/settings').then(r => r.data),
  setSettings: (levels: string[]): Promise<{ levels: string[] }> =>
    apiClient.put('/api/admin/logs/settings', { levels }).then(r => r.data),
}
