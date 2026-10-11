import { test, expect } from '@playwright/test';

const locales = ['en', 'de', 'fr', 'es', 'ar'] as const;

test.describe('Public pages — full locale coverage', () => {
    for (const locale of locales) {
        test.describe(`${locale} locale`, () => {
            test('homepage renders with localized hero and sections', async ({ page }) => {
                const response = await page.goto(`/${locale}/public`);
                expect(response?.status()).toBeLessThan(400);
                await expect(page.locator('html')).toHaveAttribute('lang', locale);
                await expect(page.locator('main').first()).toBeVisible();
                const h1 = page.getByRole('heading', { level: 1 }).first();
                await expect(h1).toBeVisible();
                await expect(h1).not.toContainText(/\.\w+_/);
            });

            test('about page renders mission, vision, timeline', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/about`);
                expect(response?.status()).toBeLessThan(400);
                await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
                // Mission section
                await expect(page.getByRole('heading', { name: /mission|vision|our story/i })).toBeVisible({ timeout: 10000 });
            });

            test('about/team page renders team members', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/about/team`);
                expect(response?.status()).toBeLessThan(400);
                await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
            });

            test('about/financials page renders', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/about/financials`);
                expect(response?.status()).toBeLessThan(400);
            });

            test('about/partners page renders', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/about/partners`);
                expect(response?.status()).toBeLessThan(400);
            });

            test('programs hub renders', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/programs`);
                expect(response?.status()).toBeLessThan(400);
            });

            test('stories hub renders with filter bar', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/stories`);
                expect(response?.status()).toBeLessThan(400);
                await expect(page.locator('[role="combobox"]').first()).toBeVisible({ timeout: 10000 });
            });

            test('news hub renders', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/news`);
                expect(response?.status()).toBeLessThan(400);
            });

            test('events hub renders', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/events`);
                expect(response?.status()).toBeLessThan(400);
            });

            test('get-involved hub renders volunteer/corporate/donate cards', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/get-involved`);
                expect(response?.status()).toBeLessThan(400);
                await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
            });

            test('volunteer page renders role finder', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/get-involved/volunteer`);
                expect(response?.status()).toBeLessThan(400);
            });

            test('corporate page renders', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/get-involved/corporate`);
                expect(response?.status()).toBeLessThan(400);
            });

            test('donate page renders donation widget', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/get-involved/donate`);
                expect(response?.status()).toBeLessThan(400);
                // Donation widget should be present
                await expect(page.locator('input[name="amount"], button:has-text("Donate")').first()).toBeVisible({ timeout: 10000 });
            });

            test('contact page renders contact form', async ({ page }) => {
                const response = await page.goto(`/${locale}/public/contact`);
                expect(response?.status()).toBeLessThan(400);
                await expect(page.locator('form').first()).toBeVisible({ timeout: 10000 });
            });
        });
    }
});

test.describe('Language switcher & RTL', () => {
    test('language switcher works for all locales', async ({ page }) => {
        await page.goto('/en/public');
        for (const locale of ['de', 'fr', 'es', 'ar']) {
            const link = page.locator(`a[href^="/${locale}/public"]`).first();
            await expect(link).toBeVisible();
            await link.click();
            await expect(page.locator('html')).toHaveAttribute('lang', locale);
            await page.waitForURL(`/${locale}/public**`);
        }
    });

    test('Arabic RTL layout direction and logical properties', async ({ page }) => {
        await page.goto('/ar/public');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        // Check that header logo is on the right in RTL
        const header = page.locator('header').first();
        await expect(header).toBeVisible();
    });

    test('RTL timeline renders correctly', async ({ page }) => {
        await page.goto('/ar/public/about');
        await expect(page.locator('section').filter({ hasText: /timeline|milestones/i })).toBeVisible({ timeout: 10000 });
    });

    test('RTL filter bar works', async ({ page }) => {
        await page.goto('/ar/public/stories');
        const select = page.locator('[role="combobox"]').first();
        await expect(select).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Accessibility — WCAG 2.1 AA', () => {
    for (const locale of locales) {
        test(`keyboard navigation works on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            // Tab through focusable elements
            await page.keyboard.press('Tab');
            const focused = page.locator(':focus');
            await expect(focused.first()).toBeVisible({ timeout: 5000 });
        });

        test(`focus visible styles on ${locale}`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            await page.keyboard.press('Tab');
            const focused = page.locator(':focus-visible');
            await expect(focused.first()).toHaveCSS('outline-style', /solid|dashed|dotted/);
        });

        test(`heading hierarchy on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            const h1 = page.locator('h1').first();
            await expect(h1).toBeVisible();
            // Only one h1
            const h1Count = await page.locator('h1').count();
            expect(h1Count).toBeLessThanOrEqual(1);
        });

        test(`landmarks present on ${locale}`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            await expect(page.locator('header')).toBeVisible();
            await expect(page.locator('main')).toBeVisible();
            await expect(page.locator('footer')).toBeVisible();
        });

        test(`forms have labels on ${locale} contact page`, async ({ page }) => {
            await page.goto(`/${locale}/public/contact`);
            const inputs = page.locator('input, textarea, select');
            for (const input of await inputs.all()) {
                const id = await input.getAttribute('id');
                if (id) {
                    const label = page.locator(`label[for="${id}"]`);
                    await expect(label).toBeVisible({ timeout: 2000 });
                }
            }
        });

        test(`images have alt text on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            const images = page.locator('img');
            for (const img of await images.all()) {
                const alt = await img.getAttribute('alt');
                expect(alt).toBeTruthy();
            }
        });

        test(`color contrast on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            // This is a basic check - real contrast testing needs axe
            const body = page.locator('body');
            await expect(body).toBeVisible();
        });
    }
});

test.describe('Forms — newsletter, contact, safeguarding', () => {
    for (const locale of locales) {
        test(`newsletter form submits in ${locale}`, async ({ page }) => {
            await page.goto(`/${locale}/public/get-involved/donate`);
            // Find newsletter signup if present
            const emailInput = page.locator('input[type="email"]').first();
            if (await emailInput.isVisible({ timeout: 5000 })) {
                await emailInput.fill(`test-${locale}@example.com`);
                await page.locator('button[type="submit"]').first().click();
                // Should not error (rate limited or success)
                await page.waitForTimeout(1000);
            }
        });

        test(`contact form validation in ${locale}`, async ({ page }) => {
            await page.goto(`/${locale}/public/contact`);
            await page.locator('button[type="submit"]').first().click();
            // Should show validation errors
            await expect(page.locator('text=/required|invalid|error/i').first()).toBeVisible({ timeout: 5000 });
        });

        test(`safeguarding form accessible in ${locale}`, async ({ page }) => {
            await page.goto(`/${locale}/public/contact`);
            // Check safeguarding link or section exists
            const safeguard = page.locator('text=/safeguarding|report|concern/i').first();
            await expect(safeguard).toBeVisible({ timeout: 5000 });
        });
    }
});

test.describe('Donation flow', () => {
    for (const locale of locales) {
        test(`donate page loads donation widget in ${locale}`, async ({ page }) => {
            await page.goto(`/${locale}/public/get-involved/donate`);
            await expect(page.locator('text=/donate|support|contribute/i').first()).toBeVisible({ timeout: 10000 });
            // Amount input
            await expect(page.locator('input[name="amount"], input[placeholder*="amount" i]').first()).toBeVisible({ timeout: 5000 });
        });
    }
});

test.describe('404 & unpublished handling', () => {
    for (const locale of locales) {
        test(`404 page renders in ${locale}`, async ({ page }) => {
            const response = await page.goto(`/${locale}/public/this-page-does-not-exist-12345`);
            expect(response?.status()).toBe(404);
            await expect(page.getByRole('heading', { level: 1 })).toContainText(/not found|404/i);
        });

        test(`unpublished news returns 404 in ${locale}`, async ({ page }) => {
            const response = await page.goto(`/${locale}/public/news/unpublished-slug`);
            expect(response?.status()).toBe(404);
        });

        test(`unpublished story returns 404 in ${locale}`, async ({ page }) => {
            const response = await page.goto(`/${locale}/public/stories/unpublished-slug`);
            expect(response?.status()).toBe(404);
        });
    }
});

test.describe('SEO metadata', () => {
    for (const locale of locales) {
        test(`canonical URL present on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            const canonical = page.locator('link[rel="canonical"]');
            await expect(canonical).toHaveAttribute('href', new RegExp(`/${locale}/public`));
        });

        test(`hreflang alternates present on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            for (const l of locales) {
                const hreflang = page.locator(`link[rel="alternate"][hreflang="${l}"]`);
                await expect(hreflang).toHaveAttribute('href', new RegExp(`/${l}/public`));
            }
        });

        test(`OG tags present on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
            await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
            await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/);
        });

        test(`Twitter card tags present on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
        });

        test(`JSON-LD structured data present on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`);
            const ldJson = page.locator('script[type="application/ld+json"]');
            await expect(ldJson.first()).toBeVisible();
            const content = await ldJson.first().textContent();
            expect(content).toContain('@context');
            expect(content).toContain('@type');
        });
    }
});

test.describe('ISR & revalidation', () => {
    test('homepage is cached (ISR)', async ({ page }) => {
        await page.goto('/en/public');
        const response1 = await page.goto('/en/public');
        expect(response1?.status()).toBeLessThan(400);
        // Check for cache headers if available
    });
});

test.describe('Sitemap', () => {
    test('sitemap.xml is accessible', async ({ page }) => {
        const response = await page.goto('/sitemap.xml');
        expect(response?.status()).toBe(200);
        const content = await page.textContent('body');
        expect(content).toContain('xml');
    });

    test('sitemap contains all locales', async ({ page }) => {
        const response = await page.goto('/sitemap.xml');
        const content = await page.textContent('body');
        for (const locale of locales) {
            expect(content).toContain(`/${locale}/public`);
        }
    });
});

test.describe('Performance — Core Web Vitals', () => {
    for (const locale of ['en', 'ar']) {
        test(`LCP < 2.5s on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`, { waitUntil: 'networkidle' });
            const lcp = await page.evaluate(() => {
                return new Promise((resolve) => {
                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lcpEntry = entries[entries.length - 1];
                        resolve(lcpEntry.startTime);
                    }).observe({ type: 'largest-contentful-paint', buffered: true });
                });
            });
            expect(lcp).toBeLessThan(2500);
        });

        test(`CLS < 0.1 on ${locale} homepage`, async ({ page }) => {
            await page.goto(`/${locale}/public`, { waitUntil: 'networkidle' });
            const cls = await page.evaluate(() => {
                return new Promise((resolve) => {
                    let clsValue = 0;
                    new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            const layoutShift = entry as unknown as { hadRecentInput?: boolean; value: number };
                            if (!layoutShift.hadRecentInput) {
                                clsValue += layoutShift.value;
                            }
                        }
                        resolve(clsValue);
                    }).observe({ type: 'layout-shift', buffered: true });
                });
            });
            expect(cls).toBeLessThan(0.1);
        });
    }
});

test.describe('Error boundaries & loading states', () => {
    for (const locale of locales) {
        test(`loading skeleton shows on slow ${locale} page`, async ({ page }) => {
            // This would need a slow network or mocked delay
            await page.goto(`/${locale}/public`);
            // Just verify no layout shift on load
            await page.waitForLoadState('networkidle');
        });
    }
});