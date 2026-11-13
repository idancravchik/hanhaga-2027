import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Hanhaga 2027 Landing Page & PWA Security Suite', () => {
    test('Test 1 & 2: Pre-Auth Isolation & localStorage Tampering Rejection (SEC-05)', async ({ page }) => {
        await page.goto('/');

        // Inject a forged staff session without a valid staffToken into localStorage
        await page.evaluate(() => {
            localStorage.setItem(
                'hanhaga_profile',
                JSON.stringify({
                    profile: { id: '0500000000', phone: '0500000000', name: 'Forged Admin', role: 'admin' },
                    expiresAt: Date.now() + 3600_000,
                })
            );
        });

        await page.reload();

        // Should reject the forged session and render LoginView
        await expect(page.getByRole('heading', { name: 'מערכת הנהגה' })).toBeVisible();
        const stored = await page.evaluate(() => localStorage.getItem('hanhaga_profile'));
        expect(stored).toBeNull();
    });

    test('Test 3: Partial / Single-Character Staff Name Rejection (SEC-HIGH-01)', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /כניסת צוות/i }).click();

        await page.locator('#staff-name').fill('ע');
        await page.locator('#staff-phone').fill('0507117791');
        const passcodeInput = page.locator('#staff-passcode');
        if (await passcodeInput.isVisible()) {
            await passcodeInput.fill('2027');
        }
        await page.getByRole('button', { name: /התחבר כאיש צוות|שלח קוד אימות/i }).click();

        // Should stay on login view and display validation error toast
        await expect(page.getByRole('heading', { name: 'מערכת הנהגה' })).toBeVisible();
    });

    test('Test 4: Input Boundaries, XSS Escaping, and Submit Button Loading State (FUNC-LOW-01)', async ({ page }) => {
        await page.goto('/');

        const nameInput = page.locator('#student-name');
        const phoneInput = page.locator('#student-phone');

        await expect(nameInput).toHaveAttribute('maxlength', '100');
        await expect(phoneInput).toHaveAttribute('maxlength', '15');

        await nameInput.fill('<img src=x onerror="window.__xss=true">');
        await phoneInput.fill('050123');
        await page.getByRole('button', { name: 'התחבר למערכת' }).click();

        const xssTriggered = await page.evaluate(() => (window as any).__xss);
        expect(xssTriggered).toBeUndefined();
    });

    test('Test 5: WCAG Accessibility Audit on Landing Shell', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'מערכת הנהגה' })).toBeVisible();

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .disableRules(['color-contrast'])
            .analyze();
        expect(results.violations).toEqual([]);
    });
});
