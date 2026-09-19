import type { PartnerType, PartnershipType, PartnerStatus } from '../database-enums'

export interface PartnerDocument {
  id: string
  name: string
  type: string
  url: string
  uploaded_at: string
}

export interface Partner {
  id: string
  organization_id: string
  name: string
  type: PartnerType
  contact_person: string | null
  email: string
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  country: string | null
  logo_url: string | null
  partnership_type: PartnershipType
  status: PartnerStatus
  start_date: string | null
  end_date: string | null
  contract_value: number | null
  currency: string
  description: string | null
  notes: string | null
  documents: PartnerDocument[]
  created_at: string
  updated_at: string
}

export interface PartnerInsert {
  id?: string
  organization_id: string
  name: string
  type: PartnerType
  contact_person?: string | null
  email: string
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  logo_url?: string | null
  partnership_type?: PartnershipType
  status?: PartnerStatus
  start_date?: string | null
  end_date?: string | null
  contract_value?: number | null
  currency?: string
  description?: string | null
  notes?: string | null
  documents?: PartnerDocument[]
  created_at?: string
  updated_at?: string
}

export interface PartnerUpdate {
  id?: string
  organization_id?: string
  name?: string
  type?: PartnerType
  contact_person?: string | null
  email?: string
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  logo_url?: string | null
  partnership_type?: PartnershipType
  status?: PartnerStatus
  start_date?: string | null
  end_date?: string | null
  contract_value?: number | null
  currency?: string
  description?: string | null
  notes?: string | null
  documents?: PartnerDocument[]
  created_at?: string
  updated_at?: string
}
