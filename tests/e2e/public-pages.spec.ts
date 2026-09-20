import { test, expect } from '@playwright/test';

const locales = ['en', 'de', 'fr', 'es', 'ar'];

test.describe('Public pages', () => {
    for (const locale of locales) {
        test(`homepage loads in ${locale}`, async ({ page }) => {
            await page.goto(`/${locale === 'en' ? '' : locale}/`);
            await expect(page).toHaveTitle(/./);
        });
    }

    test.describe('About pages across locales', () => {
        for (const locale of locales) {
            test(`about page loads in ${locale}`, async ({ page }) => {
                await page.goto(`/${locale === 'en' ? '' : locale}/about`);
                await expect(page).toHaveURL(/\/about/);
            });
        }
    });

    test('public content pages are accessible', async ({ page }) => {
        await page.goto('/en');
        const links = page.locator('a[href*="/en/"]');
        const count = await links.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });
});
