// scripts/ui-audit-runner.mjs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = process.env.AUDIT_URL || 'http://localhost:3000';
const OUTPUT_DIR = './.audit-results';

const VIEWPORTS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
];

async function runAudit() {
    try {
        console.log('Starting audit runner...');
        if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

        console.log('Launching chromium...');
        const browser = await chromium.launch({ headless: true });
        console.log('Browser launched.');

        const context = await browser.newContext();
        const page = await context.newPage();

        console.log(`Auditing target: ${TARGET_URL}`);
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log('Page loaded successfully.');

        // 1. Accessibility Scan (Axe-core)
        console.log('Running Axe accessibility scan...');
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
            .analyze();

        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'a11y-report.json'),
            JSON.stringify(accessibilityScanResults.violations, null, 2)
        );
        console.log('A11y scan complete.');

        // 2. Viewport Screenshots & Overflow Detection
        for (const vp of VIEWPORTS) {
            console.log(`Testing viewport ${vp.name}...`);
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.waitForTimeout(500); // Allow layout transition

            // Check horizontal overflow
            const hasHorizontalScroll = await page.evaluate(() => {
                return document.documentElement.scrollWidth > window.innerWidth;
            });

            await page.screenshot({
                path: path.join(OUTPUT_DIR, `${vp.name}-full.png`),
                fullPage: true
            });

            console.log(`[${vp.name.toUpperCase()}] Screenshot saved. Horizontal overflow: ${hasHorizontalScroll}`);
        }

        await browser.close();
        console.log('Audit run complete. Results stored in .audit-results/');
    } catch (err) {
        console.error('Audit failed with error:', err);
        process.exit(1);
    }
}

runAudit();