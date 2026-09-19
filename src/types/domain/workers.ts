import type { EmploymentType, WorkerStatus } from '../database-enums'

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

export interface WorkerDocument {
  id: string
  name: string
  type: string
  url: string
  uploaded_at: string
}

export interface Worker {
  id: string
  organization_id: string
  user_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  employee_id: string | null
  department: string | null
  position: string | null
  employment_type: EmploymentType
  status: WorkerStatus
  hire_date: string | null
  termination_date: string | null
  salary: number | null
  currency: string
  address: string | null
  city: string | null
  country: string | null
  emergency_contact: EmergencyContact | null
  documents: WorkerDocument[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkerInsert {
  id?: string
  organization_id: string
  user_id?: string | null
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  employee_id?: string | null
  department?: string | null
  position?: string | null
  employment_type?: EmploymentType
  status?: WorkerStatus
  hire_date?: string | null
  termination_date?: string | null
  salary?: number | null
  currency?: string
  address?: string | null
  city?: string | null
  country?: string | null
  emergency_contact?: EmergencyContact | null
  documents?: WorkerDocument[]
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface WorkerUpdate {
  id?: string
  organization_id?: string
  user_id?: string | null
  first_name?: string
  last_name?: string
  email?: string
  phone?: string | null
  employee_id?: string | null
  department?: string | null
  position?: string | null
  employment_type?: EmploymentType
  status?: WorkerStatus
  hire_date?: string | null
  termination_date?: string | null
  salary?: number | null
  currency?: string
  address?: string | null
  city?: string | null
  country?: string | null
  emergency_contact?: EmergencyContact | null
  documents?: WorkerDocument[]
  notes?: string | null
  created_at?: string
  updated_at?: string
}
