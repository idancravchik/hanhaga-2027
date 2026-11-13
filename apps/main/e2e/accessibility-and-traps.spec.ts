import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Black-Box E2E: Accessibility, Keyboard Traps & Focus', () => {
    test('A11Y-01: Automated WCAG 2.1 AA Audit on Landing View', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'מערכת הנהגה' })).toBeVisible();

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .disableRules(['color-contrast']) // Ignore external image/background contrast in dynamic canvas
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('A11Y-02: Keyboard Navigation Tab Cycle on Login Form', async ({ page }) => {
        await page.goto('/');

        // Focus on first interactive tab
        const studentTab = page.getByRole('button', { name: 'כניסת חניכים' });
        await studentTab.focus();
        await expect(studentTab).toBeFocused();

        // Tab to staff tab
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'כניסת צוות' })).toBeFocused();

        // Tab to Student Name input
        await page.keyboard.press('Tab');
        await expect(page.locator('#student-name')).toBeFocused();

        // Tab to Phone input
        await page.keyboard.press('Tab');
        await expect(page.locator('#student-phone')).toBeFocused();

        // Tab to Submit button
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'התחבר למערכת' })).toBeFocused();
    });

    test('A11Y-03: Form Label Association and Accessibility Tree', async ({ page }) => {
        await page.goto('/');

        const nameInput = page.locator('#student-name');
        const phoneInput = page.locator('#student-phone');

        // Assert inputs have associated labels via htmlFor
        await expect(page.locator('label[for="student-name"]')).toHaveText('שם מלא');
        await expect(page.locator('label[for="student-phone"]')).toHaveText('מספר טלפון נייד');

        // Click label focuses input
        await page.locator('label[for="student-name"]').click();
        await expect(nameInput).toBeFocused();

        await page.locator('label[for="student-phone"]').click();
        await expect(phoneInput).toBeFocused();
    });
});
