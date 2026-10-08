import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        trace: 'on-first-retry',
    },
    // Boot the production server for the suite: E2E is a blocking release
    // gate (audit Wave 0, item 5), so it must start the app itself.
    webServer: {
        command: process.env.CI
            ? 'pnpm exec next build && pnpm exec next start -p 3000'
            : 'pnpm exec next dev -p 3000',
        url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: {
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
        },
    },
    projects: [
        {
            name: 'chromium',
            // PLAYWRIGHT_E2E_CHANNEL: opt-in system browser (e.g. 'chrome' or
            // 'msedge') for environments where Playwright's CDN download is
            // unreachable. Unset → default downloaded headless shell.
            use: {
                ...devices['Desktop Chrome'],
                ...(process.env.PLAYWRIGHT_E2E_CHANNEL
                    ? { channel: process.env.PLAYWRIGHT_E2E_CHANNEL as 'chrome' | 'msedge' }
                    : {}),
            },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
    ],
});
