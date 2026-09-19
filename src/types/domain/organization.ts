import type { Json } from '../database'
import type { OrganizationSize, OrganizationStatus, MemberRole } from '../database-enums'

export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  logo_url: string | null
  founded_date: string | null
  registration_number: string | null
  tax_id: string | null
  size: OrganizationSize
  status: OrganizationStatus
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationInsert {
  id?: string
  name: string
  slug: string
  description?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  logo_url?: string | null
  founded_date?: string | null
  registration_number?: string | null
  tax_id?: string | null
  size?: OrganizationSize
  status?: OrganizationStatus
  settings?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface OrganizationUpdate {
  id?: string
  name?: string
  slug?: string
  description?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  logo_url?: string | null
  founded_date?: string | null
  registration_number?: string | null
  tax_id?: string | null
  size?: OrganizationSize
  status?: OrganizationStatus
  settings?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  department: string | null
  title: string | null
  permissions: Record<string, unknown>
  joined_at: string
  created_at: string
  updated_at: string
}

export interface OrganizationMemberInsert {
  id?: string
  organization_id: string
  user_id: string
  role?: MemberRole
  department?: string | null
  title?: string | null
  permissions?: Record<string, unknown>
  joined_at?: string
  created_at?: string
  updated_at?: string
}

export interface OrganizationMemberUpdate {
  id?: string
  organization_id?: string
  user_id?: string
  role?: MemberRole
  department?: string | null
  title?: string | null
  permissions?: Record<string, unknown>
  joined_at?: string
  created_at?: string
  updated_at?: string
}
