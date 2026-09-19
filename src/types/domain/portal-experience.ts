import type { SupportedLocale } from '@/lib/i18n/locales';

export type PortalExperienceKind = 'auth_testimonial' | 'auth_stat' | 'onboarding_option';
export type OnboardingOptionGroup = 'role' | 'skills' | 'availability' | 'causes';

export interface PortalExperienceItem {
    id: string;
    organization_id: string;
    kind: PortalExperienceKind;
    item_key: string;
    label: string;
    description: string | null;
    value: string | null;
    icon: string | null;
    metadata: { group?: OnboardingOptionGroup; roles?: ('volunteer' | 'donor')[]; [key: string]: unknown };
    translations: Partial<Record<SupportedLocale, { label?: string; description?: string; value?: string; author?: string }>>;
    sort_order: number;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export type PortalExperienceInput = Omit<PortalExperienceItem, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;