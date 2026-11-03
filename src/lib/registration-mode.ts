/**
 * Default registration mode per project category (P0 decision: registration
 * mode is configurable per project, sector drives the default).
 *
 * Pure domain helper — intentionally NOT a server action (no DB, no auth).
 * Health/protection sectors need individual registration (strict PII);
 * cash/voucher/food/livelihoods/shelter work at household level.
 */
export type RegistrationMode = 'household' | 'individual' | 'both';

export function getDefaultRegistrationMode(category: string | null): RegistrationMode {
    if (!category) return 'household';
    const cat = category.toLowerCase();
    // Health/protection sectors → individual registration
    if (cat.includes('health') || cat.includes('protection') || cat.includes('nutrition') || cat.includes('wash')) {
        return 'individual';
    }
    // Cash/voucher/food/livelihoods → household registration
    if (cat.includes('cash') || cat.includes('voucher') || cat.includes('food') || cat.includes('livelihood') || cat.includes('shelter')) {
        return 'household';
    }
    return 'household';
}
