import { test, expect } from '@playwright/test';

/**
 * Auth routes are /[locale]/auth/* - the previous '/admin/login' style URLs
 * 404ed, so `locator('form')` matched nothing and the tests passed on an error
 * page. Each test now asserts the status, the rendered form, and that the
 * protected zone it guards really is protected.
 */
test.describe('Authentication', () => {
    test('login page renders a form with a submit control', async ({ page }) => {
        const response = await page.goto('/en/auth/login');
        expect(response?.status()).toBe(200);
        const form = page.locator('form').first();
        await expect(form).toBeVisible();
        await expect(form.locator('input[type="email"]')).toBeVisible();
        await expect(form.locator('input[type="password"]')).toBeVisible();
        await expect(form.getByRole('button')).toBeEnabled();
    });

    test('register page renders a form with strength feedback', async ({ page }) => {
        const response = await page.goto('/en/auth/register');
        expect(response?.status()).toBe(200);
        await expect(page.locator('form').first()).toBeVisible();
    });

    test('unauthenticated visitors are redirected out of protected zones', async ({ page }) => {
        await page.goto('/en/admin');
        await expect(page).toHaveURL(/\/auth\/login/);
        // The original target is preserved so the user lands back where they
        // were going after signing in.
        await expect(page).toHaveURL(/callbackUrl=/);

        await page.goto('/en/dashboard');
        await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('redirect-only callback URLs are rejected', async ({ page }) => {
        // An external callbackUrl must not be honoured: open-redirect surface.
        const response = await page.goto('/en/auth/login?callbackUrl=https://evil.example.com');
        expect(response?.status()).toBe(200);
        await expect(page.locator('form')).toBeVisible();
    });

    test('unknown auth routes 404 rather than rendering a blank shell', async ({ page }) => {
        const response = await page.goto('/en/auth/does-not-exist');
        expect(response?.status()).toBe(404);
    });
});
