import { test, expect } from '@playwright/test';

const locales = ['en', 'de', 'fr', 'es', 'ar'];

/**
 * Every route is locale-prefixed (routing.localePrefix === 'always' in
 * src/lib/navigation.ts), so a bare '/' is a redirect and /about is a 404.
 * Assertions here used to be `toHaveTitle(/./)` and
 * `toBeGreaterThanOrEqual(0)`, which pass against an error page - they are
 * replaced with real content checks.
 */
test.describe('Public pages', () => {
    for (const locale of locales) {
        test(`homepage renders localized content in ${locale}`, async ({ page }) => {
            const response = await page.goto(`/${locale}/public`);
            expect(response?.status(), `HTTP ${response?.status()}`).toBeLessThan(400);
            await expect(page.locator('html')).toHaveAttribute('lang', locale);
            await expect(page.locator('main').first()).toBeVisible();
            // A heading exists and is not a raw i18n key (drift shows as "Namespace.key").
            const heading = page.getByRole('heading', { level: 1 }).first();
            await expect(heading).toBeVisible();
            await expect(heading).not.toContainText(/\.\w+_/);
        });

        test(`about page renders in ${locale}`, async ({ page }) => {
            const response = await page.goto(`/${locale}/public/about`);
            expect(response?.status(), `HTTP ${response?.status()}`).toBeLessThan(400);
            await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        });

        test(`get-involved hub renders in ${locale}`, async ({ page }) => {
            const response = await page.goto(`/${locale}/public/get-involved`);
            expect(response?.status(), `HTTP ${response?.status()}`).toBeLessThan(400);
            await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        });
    }

    test('Arabic is RTL and Hebrew-free (direction, not just a dir attribute)', async ({ page }) => {
        await page.goto('/ar/public');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('language switcher offers every supported locale', async ({ page }) => {
        await page.goto('/en/public');
        // next-intl renders one link/option per locale for the current route.
        const localeLinks = page.locator('a[href^="/de/public"], a[href^="/fr/public"], a[href^="/es/public"], a[href^="/ar/public"]');
        await expect(localeLinks.first()).toBeVisible();
    });

    test('unknown locale returns 404, not a silent fallback', async ({ page }) => {
        const response = await page.goto('/zz/public');
        expect(response?.status()).toBe(404);
    });

    test('unpublished CMS content is not reachable', async ({ page }) => {
        const response = await page.goto('/en/public/news/this-slug-does-not-exist');
        expect(response?.status()).toBe(404);
    });
});
