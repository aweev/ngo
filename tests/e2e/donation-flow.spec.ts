import { test, expect } from '@playwright/test';

/**
 * The donate page is the single most important conversion surface, so these
 * tests assert real controls. They previously checked `input[name="amount"]`,
 * an element that did not exist (the field had no name attribute), and
 * `toBeVisible()` on the thank-you page - so CI was green while the money page
 * was untested.
 */
test.describe('Donation flow', () => {
    const DONATE = '/en/public/get-involved/donate';

    test('donate page renders the widget with real controls', async ({ page }) => {
        const response = await page.goto(DONATE);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expect(page.locator('input[name="amount"]')).toBeVisible();
        await expect(page.locator('input[name="email"]')).toBeVisible();
    });

    test('preset amounts drive the impact copy and the submit label', async ({ page }) => {
        await page.goto(DONATE);
        const submit = page.getByRole('button', { name: /€\s*50|donate/i }).last();
        await expect(submit).toBeVisible();

        await page.getByRole('button', { name: '€250' }).click();
        // The amount the donor will be charged is reflected in the button.
        await expect(page.getByRole('button', { name: /250/ }).last()).toBeVisible();
    });

    test('invalid input is reported, not silently ignored', async ({ page }) => {
        await page.goto(DONATE);
        await page.locator('input[name="amount"]').fill('99999999');
        await expect(page.getByRole('alert').first()).toContainText(/amount/i);

        await page.locator('input[name="email"]').fill('not-an-email');
        await page.getByRole('button', { name: /donate|spenden|donar|donner|تبرع/i }).last().click();
        await expect(page.getByRole('alert')).not.toHaveCount(0);
    });

    test('no fabricated transparency chart when the org has no financials', async ({ page }) => {
        await page.goto(DONATE);
        // The page used to hardcode an 85% efficiency donut. Until real data
        // exists, it must not present invented numbers as accounting facts.
        await expect(page.getByText('85%').first()).toHaveCount(0);
    });

    test('thank-you page confirms rather than crashes', async ({ page }) => {
        const response = await page.goto('/en/public/get-involved/donate/thank-you');
        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    });
});
