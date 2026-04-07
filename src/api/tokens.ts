import { apiClient } from './client'

export interface ServiceToken {
  id: string
  service_name: string
  namespace: string
  prefix: string
  label: string
  created_by: string
  created_at: string
  last_used_at?: string
  revoked: boolean
}

export interface GenerateTokenResponse {
  token: string       // raw value — shown once, never again
  id: string
  prefix: string
  label: string
  created_at: string
}

export async function generateToken(
  serviceName: string,
  label?: string
): Promise<GenerateTokenResponse> {
  const res = await apiClient.post<GenerateTokenResponse>(
    `/api/services/${encodeURIComponent(serviceName)}/tokens`,
    { label: label ?? '' }
  )
  return res.data
}

export async function listTokens(serviceName: string): Promise<ServiceToken[]> {
  const res = await apiClient.get<ServiceToken[]>(
    `/api/services/${encodeURIComponent(serviceName)}/tokens`
  )
  return res.data ?? []
}

export async function revokeToken(serviceName: string, tokenId: string): Promise<void> {
  await apiClient.delete(
    `/api/services/${encodeURIComponent(serviceName)}/tokens/${encodeURIComponent(tokenId)}`
  )
}
