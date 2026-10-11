import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility release gate (audit Wave 0 item 5, Wave 4: "WCAG 2.2 AA as a
 * release requirement").
 *
 * - axe-core runs with WCAG 2.0/2.1/2.2 A+AA tags against the key public,
 *   auth, and legal pages in EN and the RTL locale (AR).
 * - Both `critical` AND `serious` violations block the release.
 * - Beyond axe: RTL document direction, keyboard focus entry, and a
 *   reduced-motion pass (Wave 4: keyboard / screen-reader-proxy /
 *   reduced-motion / RTL testing).
 */
/**
 * Routes carry the locale prefix explicitly. Public content lives under
 * /public/* (see src/app/[locale]/public), so /about is a 404 - a previous
 * version of this list navigated there, which meant the WCAG gate was auditing
 * error pages and passing. scripts/verify-cta-links.mjs now scans this file,
 * and expectRealPage() below fails loudly rather than silently.
 */
const PAGES = [
    '/public',
    '/public/about',
    '/public/get-involved',
    '/public/get-involved/donate',
    '/public/contact',
    '/public/programs',
    '/public/programs/health',
    '/auth/login',
    '/auth/register',
    '/legal/privacy',
    '/legal/terms',
];

/**
 * Fails when the response is an error page. Without this, every assertion in
 * the suite passes trivially against a 404 or 500 body.
 */
async function expectRealPage(page: import('@playwright/test').Page, url: string) {
    const response = await page.goto(url);
    expect(response, `no response for ${url}`).not.toBeNull();
    const status = response!.status();
    expect(status, `${url} returned HTTP ${status}`).toBeLessThan(400);
    await expect(
        page.getByRole('heading', { level: 1 }),
        `${url} rendered no <h1>; likely the not-found page`,
    ).toHaveCount(1, { timeout: 15_000 });
}

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

test.describe('Accessibility (axe-core)', () => {
    for (const locale of ['en', 'ar']) {
        for (const pagePath of PAGES) {
            test(`no critical/serious violations: ${locale} ${pagePath}`, async ({ page }) => {
                await expectRealPage(page, `/${locale}${pagePath}`);
                const results = await new AxeBuilder({ page })
                    .withTags(AXE_TAGS)
                    .analyze();
                const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ''));
                const summary = blocking
                    .map((v) => `${v.id} [${v.impact}] (${v.nodes.length} nodes)`)
                    .join(', ');
                expect(blocking, `a11y violations: ${summary}`).toHaveLength(0);
            });
        }
    }

    test('AR renders as RTL', async ({ page }) => {
        await expectRealPage(page, '/ar/public');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('keyboard: Tab moves focus into the page chrome', async ({ page }) => {
        await expectRealPage(page, '/en/public');
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => ({
            tag: document.activeElement?.tagName,
            visible: document.activeElement !== null && document.activeElement !== document.body,
        }));
        expect(focused.tag, 'first Tab must land on a focusable element, not <body>').not.toBe('BODY');
        expect(focused.visible).toBe(true);
    });

    test('reduced-motion: page still renders its main landmark', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/en/public');
        await expect(page.locator('main').first()).toBeVisible();
    });

    test('high-contrast (forced-colors): page still renders its main landmark', async ({ page }) => {
        await page.emulateMedia({ forcedColors: 'active' });
        await page.goto('/en/public');
        await expect(page.locator('main').first()).toBeVisible();
    });

    test('low-bandwidth: page renders with 100ms/request latency', async ({ page }) => {
        await page.route('**/*', async (route) => {
            await new Promise((r) => setTimeout(r, 100));
            await route.continue();
        });
        await page.goto('/en/public', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 });
    });

    test('long-string / layout: no document-level horizontal overflow', async ({ page }) => {
        // Long unbroken strings (names, URLs, untranslated fallbacks) must not
        // push the document wider than the viewport in any locale.
        for (const localePath of ['/en/public', '/ar/public', '/en/public/about', '/ar/public/about']) {
            await expectRealPage(page, localePath);
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );
            expect(overflow, `horizontal overflow on ${localePath}`).toBeLessThanOrEqual(1);
        }
    });
});
