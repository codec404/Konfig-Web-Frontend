import { apiClient } from './client'
import type { KonfigStats, AuditEntry } from './types'

export async function getStats(): Promise<KonfigStats> {
  const res = await apiClient.get<KonfigStats>('/api/stats')
  return res.data
}

export async function getAuditLog(serviceName?: string, limit = 20): Promise<AuditEntry[]> {
  const res = await apiClient.get<{ entries: AuditEntry[]; success: boolean }>('/api/audit-log', {
    params: {
      ...(serviceName ? { service_name: serviceName } : {}),
      limit,
    },
  })
  return res.data.entries ?? []
}

export interface ServiceSummary {
  service_name: string
  latest_version: number
  config_count: number
  latest_updated_at: string
  has_active_rollout: boolean
}

export async function listServices(): Promise<ServiceSummary[]> {
  const res = await apiClient.get<{ services: ServiceSummary[]; success: boolean }>('/api/services')
  return res.data.services ?? []
}
