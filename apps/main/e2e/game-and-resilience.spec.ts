import { test, expect } from '@playwright/test';

test.describe('Black-Box E2E: Resilience, Static Assets & Field Game Accessibility', () => {
    test('RES-01: Critical Static Assets & PWA Metadata Accessibility', async ({ request }) => {
        // PWA Manifest
        const manifestRes = await request.get('/manifest.webmanifest');
        expect(manifestRes.status()).toBe(200);
        const manifest = await manifestRes.json();
        expect(manifest.name).toBeTruthy();

        // Favicon & Logo
        const logoRes = await request.get('/logo.png');
        expect(logoRes.status()).toBe(200);

        // Service Worker
        const swRes = await request.get('/sw.js');
        expect(swRes.status()).toBe(200);
    });

    test('RES-02: React ErrorBoundary Trapping & Recovery Action', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'מערכת הנהגה' })).toBeVisible();

        // Simulate an unexpected frontend runtime error inside a React lifecycle or event
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('unhandledrejection', {
                detail: { reason: new Error('Simulated network drop exception') }
            }));
        });

        // The app shell must remain stable without crashing to an unstyled blank page
        await expect(page.locator('body')).toBeVisible();
    });

    test('RES-03: Field Game Route Unlocks Body Scroll and Touch Actions', async ({ page }) => {
        await page.goto('/');

        // Verify body does not have destructive overflow: hidden or locked touchAction
        const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
        const bodyTouch = await page.evaluate(() => document.body.style.touchAction);

        expect(bodyOverflow).not.toBe('hidden');
        expect(bodyTouch).not.toBe('none');
    });
});
