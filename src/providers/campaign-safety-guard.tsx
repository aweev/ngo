'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isSensitiveBrandContext } from '@/lib/brand-experience';

/**
 * A campaign skin is a public storytelling treatment, never a treatment for
 * money, personal data, account access, or internal operations. Keeping this
 * guard in the root client tree also covers client-side navigation.
 */
export function CampaignSafetyGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (isSensitiveBrandContext(pathname)) {
      root.setAttribute('data-campaign-suppressed', 'true');
    } else {
      root.removeAttribute('data-campaign-suppressed');
    }
    return () => root.removeAttribute('data-campaign-suppressed');
  }, [pathname]);

  return null;
}
