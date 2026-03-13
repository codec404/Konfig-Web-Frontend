import { apiClient } from './client'
import type { RolloutState, ServiceInstance, CreateRolloutRequest, RollbackRequest } from './types'

interface StartRolloutResponse {
  success: boolean
  message: string
  rollout_id: string
  config_id: string
}

interface RolloutStatusResponse {
  rollout_state: Omit<RolloutState, 'instances'>
  instances: ServiceInstance[]
  success: boolean
}

export async function createRollout(payload: CreateRolloutRequest): Promise<StartRolloutResponse> {
  const res = await apiClient.post<StartRolloutResponse>('/api/rollouts', payload)
  return res.data
}

export async function getRolloutStatus(configId: string): Promise<RolloutState> {
  const res = await apiClient.get<RolloutStatusResponse>(
    `/api/rollouts/${encodeURIComponent(configId)}/status`
  )
  return { ...res.data.rollout_state, instances: res.data.instances ?? [] }
}

export async function rollbackConfig(
  configId: string,
  payload: RollbackRequest
): Promise<{ success: boolean; message: string; config_id: string }> {
  const res = await apiClient.post<{ success: boolean; message: string; config_id: string }>(
    `/api/rollouts/${encodeURIComponent(configId)}/rollback`,
    payload
  )
  return res.data
}

export interface RolloutSummary {
  config_id: string
  service_name: string
  strategy: string
  target_percentage: number
  current_percentage: number
  status: string
  started_at: string
  completed_at: string
}

export async function promoteRollout(
  configId: string,
  newTargetPercentage: number
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    `/api/rollouts/${encodeURIComponent(configId)}/promote`,
    { new_target_percentage: newTargetPercentage }
  )
  return res.data
}

export async function listRollouts(statusFilter?: string, limit = 50): Promise<RolloutSummary[]> {
  const res = await apiClient.get<{ rollouts: RolloutSummary[]; success: boolean }>('/api/rollouts', {
    params: {
      ...(statusFilter ? { status_filter: statusFilter } : {}),
      limit,
    },
  })
  return res.data.rollouts ?? []
}
