import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('login page loads', async ({ page }) => {
        await page.goto('/admin/login');
        await expect(page.locator('form')).toBeVisible();
    });

    test('register page loads', async ({ page }) => {
        await page.goto('/admin/register');
        await expect(page.locator('form')).toBeVisible();
    });

    test('setup page loads', async ({ page }) => {
        await page.goto('/admin/setup');
        await expect(page.locator('form')).toBeVisible();
    });
});
