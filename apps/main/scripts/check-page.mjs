import { chromium } from '@playwright/test';

async function checkPage() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    console.log('\nBODY INNER TEXT:', await page.evaluate(() => document.body.innerText));
    await browser.close();
}

checkPage();
