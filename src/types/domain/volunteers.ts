import type { VolunteerStatus, BackgroundCheckStatus, HoursStatus } from '../database-enums'

export interface Availability {
  monday?: { start: string; end: string }
  tuesday?: { start: string; end: string }
  wednesday?: { start: string; end: string }
  thursday?: { start: string; end: string }
  friday?: { start: string; end: string }
  saturday?: { start: string; end: string }
  sunday?: { start: string; end: string }
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

export interface VolunteerDocument {
  id: string
  name: string
  type: string
  url: string
  uploaded_at: string
}

export interface Volunteer {
  id: string
  organization_id: string
  user_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  date_of_birth: string | null
  address: string | null
  city: string | null
  country: string | null
  skills: string[]
  interests: string[]
  availability: Availability | null
  status: VolunteerStatus
  background_check_status: BackgroundCheckStatus
  background_check_date: string | null
  joined_date: string
  hours_logged: number
  notes: string | null
  emergency_contact: EmergencyContact | null
  documents: VolunteerDocument[]
  created_at: string
  updated_at: string
}

export interface VolunteerInsert {
  id?: string
  organization_id: string
  user_id?: string | null
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  date_of_birth?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  skills?: string[]
  interests?: string[]
  availability?: Availability | null
  status?: VolunteerStatus
  background_check_status?: BackgroundCheckStatus
  background_check_date?: string | null
  joined_date?: string
  hours_logged?: number
  notes?: string | null
  emergency_contact?: EmergencyContact | null
  documents?: VolunteerDocument[]
  created_at?: string
  updated_at?: string
}

export interface VolunteerUpdate {
  id?: string
  organization_id?: string
  user_id?: string | null
  first_name?: string
  last_name?: string
  email?: string
  phone?: string | null
  date_of_birth?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  skills?: string[]
  interests?: string[]
  availability?: Availability | null
  status?: VolunteerStatus
  background_check_status?: BackgroundCheckStatus
  background_check_date?: string | null
  joined_date?: string
  hours_logged?: number
  notes?: string | null
  emergency_contact?: EmergencyContact | null
  documents?: VolunteerDocument[]
  created_at?: string
  updated_at?: string
}

export interface VolunteerHours {
  id: string
  organization_id: string
  volunteer_id: string
  project_id: string | null
  activity: string
  hours: number
  date: string
  notes: string | null
  status: HoursStatus
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface VolunteerHoursInsert {
  id?: string
  organization_id: string
  volunteer_id: string
  project_id?: string | null
  activity: string
  hours: number
  date: string
  notes?: string | null
  status?: HoursStatus
  approved_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface VolunteerHoursUpdate {
  id?: string
  organization_id?: string
  volunteer_id?: string
  project_id?: string | null
  activity?: string
  hours?: number
  date?: string
  notes?: string | null
  status?: HoursStatus
  approved_by?: string | null
  created_at?: string
  updated_at?: string
}
