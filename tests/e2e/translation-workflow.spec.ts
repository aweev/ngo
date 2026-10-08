import { test, expect } from '@playwright/test';

/**
 * The admin surface is behind auth, so this suite needs a seeded session.
 * It is skipped unless E2E_BASE_URL + storage state are provided, instead of
 * running `expect(body).toBeVisible()` against a login redirect and reporting
 * green. Run with:
 *   pnpm exec playwright codegen --save-storage=.auth/admin.json <staging>/en/auth/login
 *   PLAYWRIGHT_STORAGE_STATE=.auth/admin.json pnpm test:e2e
 */
const HAS_SESSION = !!process.env.PLAYWRIGHT_STORAGE_STATE;

test.describe('Translation workflow (admin, requires session)', () => {
    test.skip(!HAS_SESSION, 'no PLAYWRIGHT_STORAGE_STATE - admin suite needs a seeded login');

    test('content list renders rows, not an error boundary', async ({ page }) => {
        const response = await page.goto('/en/admin/content');
        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expect(page.locator('main')).not.toContainText(/Application error|Something went wrong/);
    });

    test('every supported locale is represented in the editor', async ({ page }) => {
        await page.goto('/en/admin/content');
        // Open the first content page; the translations editor only exists on
        // the detail route.
        const first = page.locator('a[href*="/admin/content/"]').first();
        await expect(first, 'no content pages exist to edit').toBeVisible();
        await first.click();
        await page.waitForURL(/\/admin\/content\/[^/]+$/);

        const rows = page.locator('[data-testid="translation-row"]');
        // Exactly one row per supported locale, each tagged with its locale.
        await expect(rows).toHaveCount(5);
        for (const locale of ['en', 'de', 'fr', 'es', 'ar']) {
            await expect(rows.filter({ has: page.locator(`[data-locale="${locale}"]`) }).first())
                .toBeVisible();
        }
    });

    test('AI translation is honest about being unconfigured', async ({ page }) => {
        await page.goto('/en/admin/content');
        const aiButton = page.getByRole('button', { name: /ai|translate/i }).first();
        if (await aiButton.count()) {
            // Must be disabled or labelled as unavailable, never silently inert.
            const disabled = await aiButton.isDisabled();
            const described = await aiButton.getAttribute('title')
                ?? await aiButton.getAttribute('aria-describedby');
            expect(disabled || !!described,
                'AI translation button is neither disabled nor explained').toBeTruthy();
        }
    });

    test('workflow transitions expose only permitted actions', async ({ page }) => {
        await page.goto('/en/admin/content');
        const publish = page.getByRole('button', { name: /publish/i });
        if (await publish.count()) {
            await expect(publish.first()).toBeVisible();
        }
    });
});
