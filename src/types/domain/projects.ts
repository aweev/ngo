import type { ProjectStatus, CampaignStatus } from '../database-enums'

export interface ProjectDocument {
  id: string
  name: string
  type: string
  url: string
  uploaded_at: string
}

export interface Project {
  id: string
  organization_id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  budget: number | null
  currency: string
  spent: number
  location: string | null
  country: string | null
  beneficiaries_target: number | null
  beneficiaries_reached: number
  progress: number
  cover_image_url: string | null
  gallery_urls: string[]
  documents: ProjectDocument[]
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ProjectInsert {
  id?: string
  organization_id: string
  name: string
  slug: string
  description?: string | null
  category?: string | null
  status?: ProjectStatus
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  currency?: string
  spent?: number
  location?: string | null
  country?: string | null
  beneficiaries_target?: number | null
  beneficiaries_reached?: number
  progress?: number
  cover_image_url?: string | null
  gallery_urls?: string[]
  documents?: ProjectDocument[]
  tags?: string[]
  created_at?: string
  updated_at?: string
}

export interface ProjectUpdate {
  id?: string
  organization_id?: string
  name?: string
  slug?: string
  description?: string | null
  category?: string | null
  status?: ProjectStatus
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  currency?: string
  spent?: number
  location?: string | null
  country?: string | null
  beneficiaries_target?: number | null
  beneficiaries_reached?: number
  progress?: number
  cover_image_url?: string | null
  gallery_urls?: string[]
  documents?: ProjectDocument[]
  tags?: string[]
  created_at?: string
  updated_at?: string
}

export interface Campaign {
  id: string
  organization_id: string
  project_id: string | null
  name: string
  slug: string
  description: string | null
  goal_amount: number
  raised_amount: number
  currency: string
  status: CampaignStatus
  start_date: string | null
  end_date: string | null
  cover_image_url: string | null
  video_url: string | null
  created_at: string
  updated_at: string
}

export interface CampaignInsert {
  id?: string
  organization_id: string
  project_id?: string | null
  name: string
  slug: string
  description?: string | null
  goal_amount: number
  raised_amount?: number
  currency?: string
  status?: CampaignStatus
  start_date?: string | null
  end_date?: string | null
  cover_image_url?: string | null
  video_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface CampaignUpdate {
  id?: string
  organization_id?: string
  project_id?: string | null
  name?: string
  slug?: string
  description?: string | null
  goal_amount?: number
  raised_amount?: number
  currency?: string
  status?: CampaignStatus
  start_date?: string | null
  end_date?: string | null
  cover_image_url?: string | null
  video_url?: string | null
  created_at?: string
  updated_at?: string
}
