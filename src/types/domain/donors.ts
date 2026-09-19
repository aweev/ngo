import type { DonorType, DonorStatus, DonationType, DonationStatus } from '../database-enums'

export interface CommunicationPreferences {
  email: boolean
  sms: boolean
  phone: boolean
  mail: boolean
  newsletter: boolean
}

export interface Donor {
  id: string
  organization_id: string
  name: string
  type: DonorType
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  website: string | null
  status: DonorStatus
  first_donation_date: string | null
  last_donation_date: string | null
  total_donated: number
  currency: string
  preferred_payment_method: string | null
  communication_preferences: CommunicationPreferences
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DonorInsert {
  id?: string
  organization_id: string
  name: string
  type: DonorType
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  website?: string | null
  status?: DonorStatus
  first_donation_date?: string | null
  last_donation_date?: string | null
  total_donated?: number
  currency?: string
  preferred_payment_method?: string | null
  communication_preferences?: CommunicationPreferences
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface DonorUpdate {
  id?: string
  organization_id?: string
  name?: string
  type?: DonorType
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  website?: string | null
  status?: DonorStatus
  first_donation_date?: string | null
  last_donation_date?: string | null
  total_donated?: number
  currency?: string
  preferred_payment_method?: string | null
  communication_preferences?: CommunicationPreferences
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface Donation {
  id: string
  organization_id: string
  donor_id: string | null
  campaign_id: string | null
  project_id: string | null
  amount: number
  currency: string
  type: DonationType
  status: DonationStatus
  payment_method: string | null
  payment_reference: string | null
  is_anonymous: boolean
  dedication: string | null
  notes: string | null
  donated_at: string
  created_at: string
  updated_at: string
}

export interface DonationInsert {
  id?: string
  organization_id: string
  donor_id?: string | null
  campaign_id?: string | null
  project_id?: string | null
  amount: number
  currency?: string
  type?: DonationType
  status?: DonationStatus
  payment_method?: string | null
  payment_reference?: string | null
  is_anonymous?: boolean
  dedication?: string | null
  notes?: string | null
  donated_at?: string
  created_at?: string
  updated_at?: string
}

export interface DonationUpdate {
  id?: string
  organization_id?: string
  donor_id?: string | null
  campaign_id?: string | null
  project_id?: string | null
  amount?: number
  currency?: string
  type?: DonationType
  status?: DonationStatus
  payment_method?: string | null
  payment_reference?: string | null
  is_anonymous?: boolean
  dedication?: string | null
  notes?: string | null
  donated_at?: string
  created_at?: string
  updated_at?: string
}
