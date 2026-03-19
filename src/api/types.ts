export interface ConfigData {
  config_id: string
  service_name: string
  config_name: string
  version: number
  content: string
  format: string
  content_hash: string
  created_at: string
  created_by: string
}

export interface ConfigMetadata {
  config_id: string
  service_name: string
  config_name: string
  version: number
  format: string
  created_at: string
  created_by: string
  description: string
  is_active: boolean
}

export interface NamedConfigSummary {
  service_name: string
  config_name: string
  format: string
  version_count: number
  latest_version: number
  latest_updated_at: string
  has_active_rollout: boolean
}

export type RolloutStrategy = 'ALL_AT_ONCE' | 'CANARY' | 'PERCENTAGE'
export type RolloutStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK'

export interface RolloutState {
  config_id: string
  strategy: RolloutStrategy
  target_percentage: number
  current_percentage: number
  status: RolloutStatus
  started_at: string
  completed_at: string
  instances?: ServiceInstance[]
}

export interface ServiceInstance {
  service_name: string
  instance_id: string
  current_config_version: number
  last_heartbeat: string
  status: string
}

export interface ValidationError {
  field: string
  error_type: string
  message: string
  line: number
  column: number
}

export interface ValidationWarning {
  field: string
  warning_type: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface Schema {
  schema_id: string
  service_name: string
  schema_type: string
  schema_content: string
  description: string
  is_active: boolean
}

export interface CreateConfigRequest {
  service_name: string
  config_name: string
  content: string
  format: string
  created_by: string
  description: string
  validate: boolean
}

export interface CreateRolloutRequest {
  config_id: string
  strategy: RolloutStrategy
  target_percentage?: number
}

export interface RollbackRequest {
  service_name: string
  config_name: string
  to_version: number
}

export interface ValidateRequest {
  service_name: string
  content: string
  format: string
  schema_id?: string
  strict?: boolean
}

export interface CreateSchemaRequest {
  service_name: string
  schema_id: string
  schema_type: string
  schema_content: string
  description: string
}

export interface PaginatedConfigs {
  configs: ConfigMetadata[]
  total_count: number
}

export interface AuditEntry {
  id: number
  config_id: string
  action: string
  performed_by: string
  service_name: string
  details: string
  created_at: string
}

export interface KonfigStats {
  total_configs: number
  active_rollouts: number
  total_schemas: number
  connected_instances: number
  total_services: number
}
