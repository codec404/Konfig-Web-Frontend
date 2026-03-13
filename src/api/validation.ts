import { apiClient } from './client'
import type { ValidationResult, ValidateRequest, Schema, CreateSchemaRequest } from './types'

interface SchemasResponse {
  schemas: Schema[]
  total_count: number
}

export async function validateConfig(payload: ValidateRequest): Promise<ValidationResult> {
  const res = await apiClient.post<ValidationResult>('/api/validate', payload)
  return res.data
}

export async function getSchemas(serviceName?: string): Promise<Schema[]> {
  const res = await apiClient.get<SchemasResponse>('/api/schemas', {
    params: serviceName ? { service_name: serviceName } : {},
  })
  return res.data.schemas ?? []
}

export async function getSchema(schemaId: string): Promise<Schema> {
  const res = await apiClient.get<{ schema: Schema; success: boolean; message: string }>(
    `/api/schemas/${encodeURIComponent(schemaId)}`
  )
  return res.data.schema
}

export async function createSchema(
  payload: CreateSchemaRequest
): Promise<{ success: boolean; message: string; schema_id: string }> {
  const res = await apiClient.post<{ success: boolean; message: string; schema_id: string }>(
    '/api/schemas',
    payload
  )
  return res.data
}
