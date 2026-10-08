import {
  DEFAULT_BRAND_THEME,
  isBrandThemeId,
  type BrandThemeId,
} from '@/lib/brand-themes';

/**
 * Campaign skins are deliberately finite, reviewed visual treatments. They
 * are not arbitrary CSS supplied by an organization, which protects contrast,
 * motion, and the product's visual integrity.
 */
export const BRAND_CAMPAIGN_IDS = ['year-end', 'community-week'] as const;
export type BrandCampaignId = (typeof BRAND_CAMPAIGN_IDS)[number];

export interface BrandCampaignSchedule {
  id: BrandCampaignId;
  startsAt: string;
  endsAt: string;
}

export interface BrandExperienceSettings {
  baseTheme: BrandThemeId;
  campaign: BrandCampaignSchedule | null;
}

export interface PublicBrandExperience {
  baseTheme: BrandThemeId;
  campaignId: BrandCampaignId | null;
}

export const DEFAULT_BRAND_EXPERIENCE: BrandExperienceSettings = {
  baseTheme: DEFAULT_BRAND_THEME,
  campaign: null,
};

export function isBrandCampaignId(value: unknown): value is BrandCampaignId {
  return typeof value === 'string' && (BRAND_CAMPAIGN_IDS as readonly string[]).includes(value);
}

function parseIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Parses the small, public-safe brand fragment persisted in organization settings. */
export function parseBrandExperienceSettings(value: unknown): BrandExperienceSettings {
  const settings = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const baseTheme = isBrandThemeId(settings.brand_theme)
    ? settings.brand_theme
    : DEFAULT_BRAND_THEME;
  const rawCampaign = settings.brand_campaign;
  if (!rawCampaign || typeof rawCampaign !== 'object' || Array.isArray(rawCampaign)) {
    return { baseTheme, campaign: null };
  }

  const campaign = rawCampaign as Record<string, unknown>;
  const id = campaign.id;
  const startsAt = parseIsoDate(campaign.starts_at);
  const endsAt = parseIsoDate(campaign.ends_at);
  if (!isBrandCampaignId(id) || !startsAt || !endsAt || new Date(startsAt) >= new Date(endsAt)) {
    return { baseTheme, campaign: null };
  }

  return { baseTheme, campaign: { id, startsAt, endsAt } };
}

export function toBrandExperienceSettings(value: BrandExperienceSettings): Record<string, unknown> {
  return {
    brand_theme: value.baseTheme,
    brand_campaign: value.campaign
      ? {
          id: value.campaign.id,
          starts_at: value.campaign.startsAt,
          ends_at: value.campaign.endsAt,
        }
      : null,
  };
}

/**
 * Campaign treatments belong only on low-risk public journeys. This protects
 * the calm, predictable interface needed for money, privacy, and access work.
 */
export function isSensitiveBrandContext(pathname: string): boolean {
  if (!pathname.includes('/public/')) return true;
  return /\/(donate|contact|secure-report|safeguard|volunteer)(?:\/|$)/.test(pathname);
}
