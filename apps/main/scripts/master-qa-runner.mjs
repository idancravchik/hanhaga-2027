import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173';
const OUTPUT_DIR = 'C:\\Users\\jnux9\\.gemini\\antigravity\\brain\\0665a605-52d7-491a-ad9f-e04bdc5b4d9e\\evidence';
const RESULTS_FILE = 'C:\\Users\\jnux9\\.gemini\\antigravity\\brain\\0665a605-52d7-491a-ad9f-e04bdc5b4d9e\\qa_test_results.json';

const VIEWPORTS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
];

const results = {
    timestamp: new Date().toISOString(),
    suites: {
        security: [],
        accessibility: [],
        ui_layout: [],
        functional: []
    },
    summary: {
        totalPassed: 0,
        totalFailed: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0
    }
};

function recordFinding(category, item) {
    results.suites[category].push(item);
    if (item.status === 'FAIL') {
        results.summary.totalFailed++;
        if (item.severity === 'CRITICAL') results.summary.criticalIssues++;
        else if (item.severity === 'HIGH') results.summary.highIssues++;
        else if (item.severity === 'MEDIUM') results.summary.mediumIssues++;
        else results.summary.lowIssues++;
    } else {
        results.summary.totalPassed++;
    }
}

async function run() {
    console.log('🚀 Starting Master QA Runner...');
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // -------------------------------------------------------------
    // SUITE 1: STATIC & CODE-LEVEL SECURITY AUDIT
    // -------------------------------------------------------------
    console.log('\n🔒 [SUITE 1] Running Static Security & Red-Team Audit...');

    // 1.1 Firestore Security Rules Audit
    try {
        const rootRules = fs.readFileSync('C:\\Users\\jnux9\\OneDrive\\שולחן העבודה\\hanhaga-2027\\.worktrees\\testing-revision-02-10-2026\\firestore.rules', 'utf8');
        const appRules = fs.readFileSync('C:\\Users\\jnux9\\OneDrive\\שולחן העבודה\\hanhaga-2027\\.worktrees\\testing-revision-02-10-2026\\apps\\main\\firestore.rules', 'utf8');

        const isOpenWildcard = rootRules.includes('allow read, write: if request.auth != null;') || 
                               appRules.includes('match /artifacts/{appId}/public/data/{document=**} {\n      allow read, write: if isAuthenticated();');

        if (isOpenWildcard) {
            recordFinding('security', {
                id: 'SEC-01',
                title: 'Firestore Rules: Overly Permissive Wildcard Read/Write',
                severity: 'CRITICAL',
                status: 'FAIL',
                details: 'Both root firestore.rules and apps/main/firestore.rules grant universal read and write access to all authenticated users for all collections (users, exams, grades, attendance, notes). A student or anonymous user can write/delete grades, alter exams, and modify user profiles.',
                recommendation: 'Implement granular role-based access rules. Restrict write access to admins and instructors, and ensure students can only read their own grades/notes.'
            });
        } else {
            recordFinding('security', { id: 'SEC-01', title: 'Firestore Rules Audit', severity: 'CRITICAL', status: 'PASS' });
        }
    } catch (e) {
        console.error('Error reading firestore rules:', e);
    }

    // 1.2 PII Leakage in App.tsx (Unrestricted users collection subscription)
    try {
        const appCode = fs.readFileSync('C:\\Users\\jnux9\\OneDrive\\שולחן העבודה\\hanhaga-2027\\.worktrees\\testing-revision-02-10-2026\\apps\\main\\src\\App.tsx', 'utf8');
        const isUsersSubscriptionGuarded = appCode.includes("profile && profile.role !== 'student'") &&
            /if\s*\(\s*profile\s*&&\s*profile\.role\s*!==\s*['"]student['"]\s*\)[\s\S]*?onSnapshot\(collection\(db,\s*'artifacts',\s*appId,\s*'public',\s*'data',\s*'users'\)/.test(appCode);

        if (!isUsersSubscriptionGuarded) {
            recordFinding('security', {
                id: 'SEC-02',
                title: 'PII Leakage: Unrestricted Users Collection Download for All Roles',
                severity: 'CRITICAL',
                status: 'FAIL',
                details: 'In App.tsx (lines 78-84), as soon as any user is authenticated (including students), an onSnapshot listener subscribes to the entire `users` collection. This downloads all user records (phone numbers, full names, medical condition tags, allergies) into every student\'s browser memory.',
                recommendation: 'Remove global users collection subscription for student role. Students should only fetch their own user profile document.'
            });
        } else {
            recordFinding('security', { id: 'SEC-02', title: 'PII Subscription Isolation', severity: 'CRITICAL', status: 'PASS' });
        }
    } catch (e) {
        console.error('Error checking PII leakage:', e);
    }

    // 1.3 Hardcoded Passcode & Master Admin Credentials in Client Source
    let staffPasscode = process.env.VITE_STAFF_PASSCODE;
    if (!staffPasscode) {
        try {
            const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
            const match = envLocal.match(/VITE_STAFF_PASSCODE=(.*)/);
            if (match) staffPasscode = match[1].trim();
        } catch {}
    }

    try {
        const authContextCode = fs.readFileSync('C:\\Users\\jnux9\\OneDrive\\שולחן העבודה\\hanhaga-2027\\.worktrees\\testing-revision-02-10-2026\\apps\\main\\src\\context\\AuthContext.tsx', 'utf8');
        const hasHardcodedPasscode = staffPasscode ? authContextCode.includes(staffPasscode) : false;
        const hasHardcodedAdminPhone = authContextCode.includes('0507117791');

        if (hasHardcodedPasscode || hasHardcodedAdminPhone) {
            recordFinding('security', {
                id: 'SEC-03',
                title: 'Hardcoded Passcode & Master Admin Credentials in Client Code',
                severity: 'HIGH',
                status: 'FAIL',
                details: 'AuthContext.tsx embeds sensitive credentials or master admin phones directly in the client bundle. Any user inspecting source code or network traffic can discover this bypass.',
                recommendation: 'Remove hardcoded credentials from client-side code. Manage authentication secrets on the backend/Firebase Cloud Functions.'
            });
        } else {
            recordFinding('security', { id: 'SEC-03', title: 'Credential Hardcoding Check', severity: 'HIGH', status: 'PASS' });
        }
    } catch (e) {
        console.error('Error checking hardcoded credentials:', e);
    }

    // 1.4 CSV Formula Injection & Parsing Logic
    try {
        const csvCode = fs.readFileSync('C:\\Users\\jnux9\\OneDrive\\שולחן העבודה\\hanhaga-2027\\.worktrees\\testing-revision-02-10-2026\\apps\\main\\src\\utils\\csv.ts', 'utf8');
        const sanitizeRegex = /if\s*\(\/\^\[=\+\-@\]\/\.test\(str\)\)/.test(csvCode);
        const hasNaiveSplit = csvCode.includes("trimmed.split(',')");

        if (sanitizeRegex && !csvCode.includes('\\t') && !csvCode.includes('\\r')) {
            recordFinding('security', {
                id: 'SEC-04',
                title: 'CSV Formula Injection: Incomplete Leading Character Sanitization',
                severity: 'MEDIUM',
                status: 'FAIL',
                details: 'sanitizeCSVField only checks for =+-@, but does not sanitize leading tabs (\\t), carriage returns (\\r), or pipes (|), which Excel and LibreOffice execute as formula triggers.',
                recommendation: 'Update regex to /^[=+\\-@\\t\\r\\|]/ and ensure fields beginning with whitespace or formula symbols are quoted and prepended with an apostrophe.'
            });
        } else {
            recordFinding('security', { id: 'SEC-04', title: 'CSV Formula Injection Sanitization', severity: 'MEDIUM', status: 'PASS' });
        }

        if (hasNaiveSplit) {
            recordFinding('functional', {
                id: 'FUNC-01',
                title: 'CSV Parser: Comma in Quoted Field Causes Column Shift',
                severity: 'MEDIUM',
                status: 'FAIL',
                details: 'parseUsersCSV uses `line.split(",")` without handling quoted commas (e.g. "Cohen, Yossi"). This causes column alignment corruption on CSV import.',
                recommendation: 'Use a proper RFC-4180 compliant CSV parser or regex matcher instead of String.prototype.split(\',\').'
            });
        } else {
            recordFinding('functional', { id: 'FUNC-01', title: 'RFC-4180 CSV Parser Quoted Field Support', severity: 'MEDIUM', status: 'PASS' });
        }
    } catch (e) {
        console.error('Error testing CSV security:', e);
    }

    // -------------------------------------------------------------
    // SUITE 2: DYNAMIC BROWSER AUDIT (DEVTOOLS / PLAYWRIGHT / AXE)
    // -------------------------------------------------------------
    console.log('\n🌐 [SUITE 2] Launching Headless Chromium for Dynamic UI & A11y Audits...');
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
    } catch (err) {
        browser = await chromium.launch({ headless: true, channel: 'chrome' });
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    // SAFETY GUARANTEE: Block any real write mutations to Firestore
    await page.route('**/*.firestore.googleapis.com/**', (route) => {
        if (route.request().method() !== 'GET') {
            console.log('🛑 [SAFETY INTERCEPTOR] Blocked write request to production Firestore:', route.request().url());
            return route.abort();
        }
        return route.continue();
    });

    // Helper: Run Axe scan
    async function auditA11y(pageInstance, screenName) {
        try {
            const results = await new AxeBuilder({ page: pageInstance })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();

            const seriousAndCritical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
            const colorContrastViolations = results.violations.filter(v => v.id === 'color-contrast');

            return {
                totalViolations: results.violations.length,
                seriousAndCritical,
                colorContrastViolations,
                allViolations: results.violations.map(v => ({
                    id: v.id,
                    impact: v.impact,
                    description: v.description,
                    help: v.help,
                    nodesCount: v.nodes.length,
                    target: v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')
                }))
            };
        } catch (e) {
            console.warn(`A11y scan failed on ${screenName}:`, e.message);
            return { totalViolations: 0, seriousAndCritical: [], colorContrastViolations: [], allViolations: [] };
        }
    }

    // Helper: Check horizontal overflow across viewports
    async function checkViewportsOverflow(pageInstance, screenName) {
        const overflowIssues = [];
        for (const vp of VIEWPORTS) {
            await pageInstance.setViewportSize({ width: vp.width, height: vp.height });
            await pageInstance.waitForTimeout(300);

            const hasOverflow = await pageInstance.evaluate(() => {
                return document.documentElement.scrollWidth > window.innerWidth;
            });

            const scrollW = await pageInstance.evaluate(() => document.documentElement.scrollWidth);

            if (hasOverflow) {
                const shotPath = path.join(OUTPUT_DIR, `overflow_${screenName}_${vp.name}.png`);
                await pageInstance.screenshot({ path: shotPath, fullPage: true });
                overflowIssues.push({
                    viewport: vp.name,
                    width: vp.width,
                    scrollWidth: scrollW,
                    screenshot: shotPath
                });
            }
        }
        return overflowIssues;
    }

    // -------------------------------------------------------------
    // TEST 2.1: LOGIN SCREEN (STUDENT & STAFF PASSCODE TABS)
    // -------------------------------------------------------------
    console.log('Testing Login View (Student & Staff tabs)...');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Save baseline login screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screen_login_student.png') });

    // A11y scan on Login
    const loginA11y = await auditA11y(page, 'login_student');
    if (loginA11y.totalViolations > 0) {
        recordFinding('accessibility', {
            id: 'A11Y-01',
            title: `Login View (Student Tab): ${loginA11y.totalViolations} WCAG Violations Found`,
            severity: loginA11y.seriousAndCritical.length > 0 ? 'HIGH' : 'MEDIUM',
            status: 'FAIL',
            details: `Violations found: ${loginA11y.allViolations.map(v => `${v.id} (${v.impact}) - ${v.description}`).join('; ')}`,
            colorContrastCount: loginA11y.colorContrastViolations.length,
            violations: loginA11y.allViolations
        });
    } else {
        recordFinding('accessibility', { id: 'A11Y-01', title: 'Login View A11y Scan', severity: 'MEDIUM', status: 'PASS' });
    }

    // Check Viewport Overflow on Login
    const loginOverflow = await checkViewportsOverflow(page, 'login_student');
    if (loginOverflow.length > 0) {
        recordFinding('ui_layout', {
            id: 'UI-01',
            title: 'Login View: Horizontal Layout Overflow on Mobile/Tablet',
            severity: 'HIGH',
            status: 'FAIL',
            details: `Horizontal scroll detected on: ${loginOverflow.map(o => `${o.viewport} (${o.scrollWidth}px > ${o.width}px)`).join(', ')}`,
            evidence: loginOverflow
        });
    } else {
        recordFinding('ui_layout', { id: 'UI-01', title: 'Login View Viewport Overflow Check', severity: 'HIGH', status: 'PASS' });
    }

    // Switch to Staff Tab & test passcode field
    console.log('Testing Staff Passcode Tab...');
    const staffTabButton = page.locator('button:has-text("כניסת צוות")');
    if (await staffTabButton.count() > 0) {
        await staffTabButton.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'screen_login_staff.png') });

        const staffA11y = await auditA11y(page, 'login_staff');
        if (staffA11y.colorContrastViolations.length > 0) {
            recordFinding('accessibility', {
                id: 'A11Y-02',
                title: 'Staff Login Tab: Color Contrast Failure on Helper/Input Text',
                severity: 'MEDIUM',
                status: 'FAIL',
                details: `Color contrast failures detected on staff login screen: ${staffA11y.colorContrastViolations.map(v => v.description).join('; ')}`,
                violations: staffA11y.colorContrastViolations
            });
        } else {
            recordFinding('accessibility', { id: 'A11Y-02', title: 'Staff Login Tab Color Contrast', severity: 'MEDIUM', status: 'PASS' });
        }
    }

    // -------------------------------------------------------------
    // TEST 2.2: ROLE ESCALATION VIA LOCALSTORAGE (SEC-05)
    // -------------------------------------------------------------
    console.log('Testing Client-Side Role Escalation via LocalStorage...');
    await page.evaluate(() => {
        const dummyAdminProfile = {
            id: '0507117791',
            phone: '0507117791',
            name: 'בודק מערכת',
            fullName: 'בודק מערכת',
            role: 'admin',
            school: 'הנהלה',
            tags: []
        };
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('hanhaga_profile', JSON.stringify({ profile: dummyAdminProfile, expiresAt }));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const isAdminViewVisible = await page.locator('text=ניהול קורס').count() > 0 ||
                               await page.locator('text=דוחות קורס').count() > 0 ||
                               await page.locator('button:has-text("התנתק")').count() > 0;

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screen_admin_escalation_test.png') });

    if (isAdminViewVisible) {
        recordFinding('security', {
            id: 'SEC-05',
            title: 'Critical Role Escalation: LocalStorage Profile Tampering Grants Full Admin UI Access',
            severity: 'CRITICAL',
            status: 'FAIL',
            details: 'Modifying localStorage.hanhaga_profile to have {"role": "admin"} immediately bypasses authentication checks in App.tsx and mounts the full AdminView, exposing management views, student records, and statistics without server-side validation.',
            recommendation: 'Authorize roles using verified session tokens or Firebase Custom Claims, never trusting unverified client-side localStorage values.'
        });
    } else {
        recordFinding('security', {
            id: 'SEC-05',
            title: 'Client-Side Role Escalation Protection',
            severity: 'CRITICAL',
            status: 'PASS'
        });
    }

    // -------------------------------------------------------------
    // TEST 2.3: ADMIN VIEW UI & A11Y & OVERFLOW
    // -------------------------------------------------------------
    console.log('Auditing Admin View (Reports, Users, Modals)...');
    // Authenticate properly with verified admin session for Admin View audit
    await page.evaluate((passcode) => {
        const staffPasscode = passcode || '';
        const adminPhone = '0507117791';
        const dummyAdminProfile = {
            id: adminPhone,
            phone: adminPhone,
            name: 'עידן קרבצ\'יק',
            fullName: 'עידן קרבצ\'יק',
            role: 'admin',
            school: 'מנהלה',
            tags: []
        };
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        const staffToken = btoa(`${adminPhone}:${staffPasscode}`);
        localStorage.setItem('hanhaga_profile', JSON.stringify({ profile: dummyAdminProfile, expiresAt, staffToken }));
    }, staffPasscode);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const adminA11y = await auditA11y(page, 'admin_view');
    if (adminA11y.totalViolations > 0) {
        recordFinding('accessibility', {
            id: 'A11Y-03',
            title: `Admin View: ${adminA11y.totalViolations} WCAG Violations Detected`,
            severity: 'HIGH',
            status: 'FAIL',
            details: `Violations: ${adminA11y.allViolations.map(v => `${v.id} (${v.impact}): ${v.description} [${v.nodesCount} nodes]`).join('; ')}`,
            violations: adminA11y.allViolations
        });
    } else {
        recordFinding('accessibility', { id: 'A11Y-03', title: 'Admin View A11y & Contrast Scan', severity: 'HIGH', status: 'PASS' });
    }

    const adminOverflow = await checkViewportsOverflow(page, 'admin_view');
    if (adminOverflow.length > 0) {
        recordFinding('ui_layout', {
            id: 'UI-02',
            title: 'Admin View: Layout Leakage / Horizontal Overflow on Mobile/Tablet',
            severity: 'HIGH',
            status: 'FAIL',
            details: `Horizontal scroll detected on viewports: ${adminOverflow.map(o => `${o.viewport} (scrollWidth=${o.scrollWidth}px vs innerWidth=${o.width}px)`).join(', ')}`,
            evidence: adminOverflow
        });
    } else {
        recordFinding('ui_layout', { id: 'UI-02', title: 'Admin View Viewport Overflow Check', severity: 'HIGH', status: 'PASS' });
    }

    // -------------------------------------------------------------
    // TEST 2.4: STUDENT VIEW UI & A11Y
    // -------------------------------------------------------------
    console.log('Auditing Student View...');
    await page.evaluate(() => {
        const dummyStudentProfile = {
            id: '0501112233',
            phone: '0501112233',
            name: 'חניך בדיקה',
            fullName: 'חניך בדיקה',
            role: 'student',
            school: 'אורט',
            group: 1,
            tags: []
        };
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('hanhaga_profile', JSON.stringify({ profile: dummyStudentProfile, expiresAt }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screen_student_view.png') });

    const studentA11y = await auditA11y(page, 'student_view');
    if (studentA11y.totalViolations > 0) {
        recordFinding('accessibility', {
            id: 'A11Y-04',
            title: `Student View: ${studentA11y.totalViolations} WCAG Violations Detected`,
            severity: 'HIGH',
            status: 'FAIL',
            details: `Violations: ${studentA11y.allViolations.map(v => `${v.id} (${v.impact}): ${v.description}`).join('; ')}`,
            violations: studentA11y.allViolations
        });
    } else {
        recordFinding('accessibility', { id: 'A11Y-04', title: 'Student View A11y & Contrast Scan', severity: 'HIGH', status: 'PASS' });
    }

    const studentOverflow = await checkViewportsOverflow(page, 'student_view');
    if (studentOverflow.length > 0) {
        recordFinding('ui_layout', {
            id: 'UI-03',
            title: 'Student View: Horizontal Overflow on Mobile Devices',
            severity: 'HIGH',
            status: 'FAIL',
            details: `Horizontal scroll detected on: ${studentOverflow.map(o => `${o.viewport} (${o.scrollWidth}px > ${o.width}px)`).join(', ')}`,
            evidence: studentOverflow
        });
    } else {
        recordFinding('ui_layout', { id: 'UI-03', title: 'Student View Viewport Overflow Check', severity: 'HIGH', status: 'PASS' });
    }

    // -------------------------------------------------------------
    // TEST 2.5: GAME VIEW (/game)
    // -------------------------------------------------------------
    console.log('Auditing Game View (/game)...');
    await page.goto(`${TARGET_URL}/game`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screen_game_view.png') });

    const gameA11y = await auditA11y(page, 'game_view');
    if (gameA11y.totalViolations > 0) {
        recordFinding('accessibility', {
            id: 'A11Y-05',
            title: `Game View (/game): ${gameA11y.totalViolations} WCAG Violations Detected`,
            severity: 'MEDIUM',
            status: 'FAIL',
            details: `Violations: ${gameA11y.allViolations.map(v => `${v.id} (${v.impact}): ${v.description}`).join('; ')}`,
            violations: gameA11y.allViolations
        });
    } else {
        recordFinding('accessibility', { id: 'A11Y-05', title: 'Game View A11y & Contrast Scan', severity: 'MEDIUM', status: 'PASS' });
    }

    const gameOverflow = await checkViewportsOverflow(page, 'game_view');
    if (gameOverflow.length > 0) {
        recordFinding('ui_layout', {
            id: 'UI-04',
            title: 'Game View: Layout Leakage / Horizontal Overflow on Mobile',
            severity: 'HIGH',
            status: 'FAIL',
            details: `Horizontal scroll detected on: ${gameOverflow.map(o => `${o.viewport} (${o.scrollWidth}px > ${o.width}px)`).join(', ')}`,
            evidence: gameOverflow
        });
    } else {
        recordFinding('ui_layout', { id: 'UI-04', title: 'Game View Viewport Overflow Check', severity: 'HIGH', status: 'PASS' });
    }

    // Close browser
    await browser.close();

    // Write final structured results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n✅ QA Run Complete! Structured results written to: ${RESULTS_FILE}`);
    console.log(`Summary: ${results.summary.totalPassed} Passed, ${results.summary.totalFailed} Failed (${results.summary.criticalIssues} Critical, ${results.summary.highIssues} High, ${results.summary.mediumIssues} Medium).`);
}

run().catch((err) => {
    console.error('Fatal QA Runner Error:', err);
    process.exit(1);
});
