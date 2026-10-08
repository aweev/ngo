'use client';

import { Sparkles } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  isSensitiveBrandContext,
  type BrandCampaignId,
} from '@/lib/brand-experience';

const CAMPAIGN_IDS: readonly string[] = ['year-end', 'community-week'];

function readCampaignId(): BrandCampaignId | null {
  const value = document.documentElement.getAttribute('data-campaign');
  return CAMPAIGN_IDS.includes(value ?? '') ? (value as BrandCampaignId) : null;
}

function subscribeCampaign(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-campaign'],
  });
  return () => observer.disconnect();
}

export function CampaignRibbon() {
  const pathname = usePathname();
  const t = useTranslations('CampaignTheme');
  const campaignId = useSyncExternalStore(subscribeCampaign, readCampaignId, () => null);

  if (!campaignId || isSensitiveBrandContext(pathname)) return null;

  return (
    <aside
      className="campaign-ribbon border-b border-primary-foreground/20 bg-primary px-4 py-2 text-center text-xs font-semibold text-primary-foreground"
      aria-label={t('label')}
    >
      <span className="inline-flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t(`${campaignId}.message`)}
      </span>
    </aside>
  );
}
