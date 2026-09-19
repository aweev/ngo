export type EventType = 'in_person' | 'virtual' | 'hybrid';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type RegistrationStatus = 'registered' | 'waitlisted' | 'attended' | 'cancelled';

export interface OrgEvent {
    id: string;
    organization_id: string;
    title: string;
    slug: string;
    description: string | null;
    type: EventType;
    status: EventStatus;
    start_date: string;
    end_date: string | null;
    location: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    virtual_link: string | null;
    max_attendees: number | null;
    registered_count: number;
    cover_image_url: string | null;
    is_public: boolean;
    project_id: string | null;
    campaign_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface EventRegistration {
    id: string;
    organization_id: string;
    event_id: string;
    registrant_type: 'worker' | 'volunteer' | 'donor' | 'partner' | 'external';
    registrant_id: string | null;
    name: string;
    email: string;
    phone: string | null;
    status: RegistrationStatus;
    notes: string | null;
    registered_at: string;
    created_at: string;
}

export type OrgEventInsert = Omit<OrgEvent, 'id' | 'registered_count' | 'created_at' | 'updated_at'>;
export type OrgEventUpdate = Partial<OrgEventInsert>;
