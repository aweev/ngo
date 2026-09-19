import type { Json } from '../database'

export interface AuditLog {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Json | null
  new_values: Json | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogInsert {
  id?: string
  organization_id: string
  user_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  old_values?: Json | null
  new_values?: Json | null
  ip_address?: string | null
  user_agent?: string | null
  created_at?: string
}
