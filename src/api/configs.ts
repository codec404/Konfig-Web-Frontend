import { apiClient } from './client'
import type { ConfigData, ConfigMetadata, CreateConfigRequest, PaginatedConfigs } from './types'

export async function getServiceConfigs(
  serviceName: string,
  limit = 20,
  offset = 0
): Promise<PaginatedConfigs> {
  const res = await apiClient.get<PaginatedConfigs>(
    `/api/services/${encodeURIComponent(serviceName)}/configs`,
    { params: { limit, offset } }
  )
  return res.data
}

export async function getConfig(configId: string): Promise<ConfigData> {
  const res = await apiClient.get<{ config: ConfigData; success: boolean; message: string }>(
    `/api/configs/${encodeURIComponent(configId)}`
  )
  return res.data.config
}

export async function createConfig(
  payload: CreateConfigRequest
): Promise<{ config_id: string; version: number; success: boolean; message: string }> {
  const res = await apiClient.post<{
    config_id: string
    version: number
    success: boolean
    message: string
  }>('/api/configs', payload)
  return res.data
}

export async function deleteConfig(configId: string): Promise<void> {
  await apiClient.delete(`/api/configs/${encodeURIComponent(configId)}`)
}

export type { ConfigMetadata }
