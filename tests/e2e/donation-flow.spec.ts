import { test, expect } from '@playwright/test';

test.describe('Donation flow', () => {
    test('donation page loads', async ({ page }) => {
        await page.goto('/en/public/get-involved/donate');
        await expect(page).toHaveURL(/\/donate/);
    });

    test('donation form is present', async ({ page }) => {
        await page.goto('/en/public/get-involved/donate');
        const amountInput = page.locator('input[name="amount"]');
        await expect(amountInput).toBeVisible();
    });

    test('thank you page after donation', async ({ page }) => {
        await page.goto('/en/public/get-involved/donate/thank-you');
        await expect(page).toHaveURL(/\/thank-you/);
    });
});
