import { chromium } from '@playwright/test';
import fs from 'fs';

let staffPasscode = process.env.VITE_STAFF_PASSCODE;
if (!staffPasscode) {
    try {
        const envLocal = fs.readFileSync('.env.local', 'utf8');
        const match = envLocal.match(/VITE_STAFF_PASSCODE=(.*)/);
        if (match) staffPasscode = match[1].trim();
    } catch {}
}

async function testPasscodes() {
    console.log('🔍 Testing staff passcode authentication with isolated browser contexts...');
    const browser = await chromium.launch({ headless: true });

    const testCases = [
        { name: "עידן קרבצ'יק", phone: '0507117791', passcode: staffPasscode, shouldPass: true, desc: 'Exact Idan + Authorized Passcode' },
        { name: "עידן", phone: '0507117791', passcode: staffPasscode, shouldPass: true, desc: 'First name Idan + Authorized Passcode' },
        { name: "אביב ליבנה", phone: '0539532896', passcode: staffPasscode, shouldPass: true, desc: 'Partial name Aviv + Authorized Passcode' },
        { name: "נועה שלו", phone: '0539741967', passcode: staffPasscode, shouldPass: true, desc: 'Noa + Authorized Passcode' },
        { name: "נועה", phone: '0539741967', passcode: staffPasscode, shouldPass: true, desc: 'First name Noa + Authorized Passcode' },
        { name: "יעל פנחס", phone: '0549455625', passcode: staffPasscode, shouldPass: true, desc: 'Yael + Authorized Passcode' },
        { name: "הדר", phone: '0586808092', passcode: staffPasscode, shouldPass: true, desc: 'First name Hadar + Authorized Passcode' },
        { name: "עידן קרבצ'יק", phone: '0507117791', passcode: '2027', shouldPass: false, desc: 'Old code 2027 must be REJECTED' }
    ];

    let allPassed = true;

    for (const tc of testCases) {
        console.log(`\n--- Testing: ${tc.desc} ---`);
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('button:has-text("כניסת צוות")', { timeout: 10000 });
        await page.click('button:has-text("כניסת צוות")');
        await page.waitForSelector('#staff-name', { timeout: 10000 });

        await page.fill('#staff-name', tc.name);
        await page.fill('#staff-phone', tc.phone);
        if (await page.$('#staff-passcode')) {
            await page.fill('#staff-passcode', tc.passcode);
        }
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1500);

        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasAdminOrStaff = bodyText.includes('ניהול') || 
                               bodyText.includes('לוח בקרה') || 
                               bodyText.includes('שלום,') || 
                               bodyText.includes('מדריך') || 
                               bodyText.includes('מחלקה') || 
                               bodyText.includes('התחברת בהצלחה');
        const hasError = bodyText.includes('שגוי') || bodyText.includes('לא נמצא');
        
        const success = hasAdminOrStaff && !hasError;
        const testPassed = tc.shouldPass ? success : (!success && hasError);
        console.log(`Result: TestPassed=${testPassed} (ExpectedPass=${tc.shouldPass}, ActualSuccess=${success})`);
        const firstLine = bodyText.split('\n').filter(Boolean).slice(0, 3).join(' | ');
        console.log(`Header snippet: ${firstLine}`);

        if (!testPassed) {
            allPassed = false;
        }

        if (success && tc.shouldPass) {
            // Verify session persistence on page reload
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(800);
            const reloadedBody = await page.evaluate(() => document.body.innerText);
            const stillLoggedIn = reloadedBody.includes('ניהול') || 
                                  reloadedBody.includes('לוח בקרה') || 
                                  reloadedBody.includes('שלום,') || 
                                  reloadedBody.includes('מדריך') || 
                                  reloadedBody.includes('מחלקה');
            console.log(`Session persistence on reload: ${stillLoggedIn ? 'PERSISTED ✅' : 'LOST ❌'}`);
            if (!stillLoggedIn) allPassed = false;
        }

        await context.close();
    }

    await browser.close();
    console.log(`\n========================================`);
    console.log(`OVERALL TEST STATUS: ${allPassed ? 'ALL PASSED ✅' : 'FAILURES DETECTED ❌'}`);
    console.log(`========================================`);
    process.exit(allPassed ? 0 : 1);
}

testPasscodes();
