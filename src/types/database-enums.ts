/**
 * Hand-maintained database value unions.
 *
 * Supabase's `gen types` output (`src/types/database.ts`) is the source of
 * truth for tables and RPCs, but it does not emit the string-union aliases the
 * domain types depend on. Keeping them here means `pnpm supabase:gen-types` can
 * be re-run at any time without deleting them (it previously clobbered them).
 *
 * Each union mirrors the CHECK constraint / column default in
 * `supabase/migrations`. When a migration changes an allowed value, update the
 * matching union here too. `src/lib/auth/permissions.ts` owns the runtime
 * meaning of MemberRole (`APP_ROLES`) — keep the two in sync.
 */

export type OrganizationSize = 'small' | 'medium' | 'large' | 'enterprise';
export type OrganizationStatus = 'active' | 'inactive' | 'suspended';
export type MemberRole = 'owner' | 'admin' | 'manager' | 'member';

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type WorkerStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export type VolunteerStatus = 'active' | 'inactive' | 'pending' | 'on_break';
export type BackgroundCheckStatus = 'pending' | 'approved' | 'rejected' | 'not_required';
export type HoursStatus = 'pending' | 'approved' | 'rejected';

export type PartnerType = 'corporate' | 'government' | 'ngo' | 'educational' | 'individual' | 'other';
export type PartnershipType = 'financial' | 'in_kind' | 'strategic' | 'implementing' | 'other';
export type PartnerStatus = 'active' | 'inactive' | 'prospect' | 'former';

export type DonorType = 'individual' | 'corporate' | 'foundation' | 'government' | 'anonymous';
export type DonorStatus = 'active' | 'inactive' | 'prospect' | 'lapsed';
export type DonationType = 'one_time' | 'recurring' | 'in_kind' | 'legacy';
export type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';