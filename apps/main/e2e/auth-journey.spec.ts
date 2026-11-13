import { test, expect } from '@playwright/test';

test.describe('Black-Box E2E: Landing, Auth & Session Protection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('TC-01: Landing Page UI Elements & RTL Shell', async ({ page }) => {
        // Assert RTL root
        const dir = await page.locator('html').getAttribute('dir');
        expect(dir).toBe('rtl');

        // Assert Title, Subtitle, and Logo
        await expect(page.getByRole('heading', { name: 'מערכת הנהגה' })).toBeVisible();
        await expect(page.getByText('ניהול והערכה לקורסי מנהיגות')).toBeVisible();
        await expect(page.getByRole('img', { name: 'Logo' })).toBeVisible();

        // Assert Login Tabs
        await expect(page.getByRole('button', { name: 'כניסת חניכים' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'כניסת צוות' })).toBeVisible();
    });

    test('TC-02: Tab Switcher & Form Rendering', async ({ page }) => {
        // Default is student form
        await expect(page.locator('#student-name')).toBeVisible();
        await expect(page.locator('#student-phone')).toBeVisible();
        await expect(page.getByRole('button', { name: 'התחבר למערכת' })).toBeVisible();

        // Switch to Staff tab
        await page.getByRole('button', { name: 'כניסת צוות' }).click();
        await expect(page.locator('#staff-name')).toBeVisible();
        await expect(page.locator('#staff-phone')).toBeVisible();

        // Switch back to Student tab
        await page.getByRole('button', { name: 'כניסת חניכים' }).click();
        await expect(page.locator('#student-name')).toBeVisible();
    });

    test('TC-03: Input Field Boundaries & Format Validation', async ({ page }) => {
        const nameInput = page.locator('#student-name');
        const phoneInput = page.locator('#student-phone');

        // Enforce max length boundaries
        await expect(nameInput).toHaveAttribute('maxlength', '100');
        await expect(phoneInput).toHaveAttribute('maxlength', '15');
        await expect(nameInput).toHaveAttribute('required', '');
        await expect(phoneInput).toHaveAttribute('required', '');

        // LTR direction for phone input
        await expect(phoneInput).toHaveAttribute('dir', 'ltr');
    });

    test('TC-04: Non-Existent Cadet Login Shows User-Friendly Error Toast', async ({ page }) => {
        await page.locator('#student-name').fill('חניך שאינו קיים');
        await page.locator('#student-phone').fill('0509999999');
        await page.getByRole('button', { name: 'התחבר למערכת' }).click();

        // Must display error toast and remain safely on landing view without crashing
        await expect(page.getByRole('status').or(page.getByText(/לא נמצא|שגיאה/)).first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('heading', { name: 'מערכת הנהגה' })).toBeVisible();
    });

    test('TC-05: Staff Login Passcode Validation Failure', async ({ page }) => {
        await page.getByRole('button', { name: 'כניסת צוות' }).click();
        await page.locator('#staff-name').fill('מדריך בדיקה');
        await page.locator('#staff-phone').fill('0501111111');

        const passcodeInput = page.locator('#staff-passcode');
        if (await passcodeInput.isVisible()) {
            await passcodeInput.fill('wrong-passcode-999');
            await page.getByRole('button', { name: /התחבר כאיש צוות/i }).click();
            await expect(page.getByText(/שגיאה|שגוי|לא נמצא/).first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('TC-06: Session Tampering & Privilege Escalation Rejection', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem(
                'hanhaga_profile',
                JSON.stringify({
                    profile: { id: 'forged-attacker', phone: '0500000000', name: 'Malicious Actor', role: 'admin' },
                    expiresAt: Date.now() + 3600_000,
                })
            );
        });
        await page.reload();

        // The system must validate the session token, reject the tampering, and keep the user on login
        await expect(page.getByRole('heading', { name: 'מערכת הנהגה' })).toBeVisible();
        const stored = await page.evaluate(() => localStorage.getItem('hanhaga_profile'));
        expect(stored).toBeNull();
    });
});
