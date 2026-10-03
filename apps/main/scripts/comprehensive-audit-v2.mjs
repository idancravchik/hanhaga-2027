import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = 'C:\\Users\\jnux9\\.gemini\\antigravity\\brain\\47c3e6a2-3476-4fed-9d90-5c58bc2847dd';
const BASE_URL = 'http://localhost:5173';

const logResults = {
  consoleErrors: [],
  a11yViolations: {},
  overflows: [],
  testedInteractions: [],
  discoveredUsers: [],
  discoveredExams: []
};

async function runFullAudit() {
  console.log('🚀 Starting Comprehensive Senior Frontend UI/UX Audit...');
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const setupPage = async (context, name) => {
    const page = await context.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logResults.consoleErrors.push(`[${name}] ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      logResults.consoleErrors.push(`[${name} CRASH] ${err.message}`);
    });
    return page;
  };

  const auditPageA11y = async (page, pageName) => {
    try {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      logResults.a11yViolations[pageName] = results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodesCount: v.nodes.length,
        helpUrl: v.helpUrl,
        targets: v.nodes.slice(0, 3).map(n => n.target.join(' > '))
      }));
      console.log(`♿ A11y Audit for [${pageName}]: ${results.violations.length} violations found.`);
    } catch (e) {
      console.warn(`Axe failed for ${pageName}:`, e.message);
    }
  };

  const checkOverflow = async (page, name, vp) => {
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth;
    });
    if (isOverflowing) {
      logResults.overflows.push({ page: name, viewport: vp });
      console.log(`⚠️ Overflow detected on [${name}] at viewport ${vp}`);
    }
  };

  // ----------------------------------------------------
  // 1. LOGIN SCREEN AUDIT (Desktop & Mobile)
  // ----------------------------------------------------
  console.log('--- 1. Auditing Login Screen ---');
  const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pLogin = await setupPage(ctxDesktop, 'Login Desktop');
  await pLogin.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await pLogin.waitForTimeout(1000);

  await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '01_login_desktop.png') });
  await checkOverflow(pLogin, 'Login Desktop', '1440x900');
  await auditPageA11y(pLogin, 'Login Desktop');

  // Mobile Login View
  const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pLoginMobile = await setupPage(ctxMobile, 'Login Mobile');
  await pLoginMobile.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await pLoginMobile.waitForTimeout(1000);
  await pLoginMobile.screenshot({ path: path.join(ARTIFACT_DIR, '02_login_mobile.png') });
  await checkOverflow(pLoginMobile, 'Login Mobile', '390x844');

  // Test Staff Tab Switching
  console.log('Switching to Staff tab on Login...');
  await pLogin.click('button:has-text("כניסת צוות")');
  await pLogin.waitForTimeout(500);
  await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '03_login_staff_tab.png') });
  logResults.testedInteractions.push('Login tab switched to Staff');

  // ----------------------------------------------------
  // 2. LOGGING IN AS ADMIN (עידן קרבצ'יק)
  // ----------------------------------------------------
  console.log('--- 2. Logging in as Admin ---');
  await pLogin.fill('#staff-name', "עידן קרבצ'יק");
  await pLogin.fill('#staff-phone', "0507117791");
  await pLogin.fill('#staff-passcode', "idanaviv100");
  await pLogin.click('button[type="submit"]');
  await pLogin.waitForTimeout(2500);

  const adminHeaderExists = await pLogin.locator('text=ניהול קורס').isVisible();
  console.log('Admin login status:', adminHeaderExists ? 'SUCCESS' : 'FAILED');
  logResults.testedInteractions.push(`Admin login: ${adminHeaderExists ? 'SUCCESS' : 'FAILED'}`);

  if (adminHeaderExists) {
    // 2.1 Admin Reports (Default view)
    console.log('Auditing Admin Reports Subview...');
    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '04_admin_reports_desktop.png') });
    await checkOverflow(pLogin, 'Admin Reports', '1440x900');
    await auditPageA11y(pLogin, 'Admin Reports');

    // Test Search & Department Filter in Reports
    await pLogin.fill('input[placeholder="שם או טלפון..."]', 'א');
    await pLogin.waitForTimeout(300);
    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '05_admin_reports_filtered.png') });
    await pLogin.fill('input[placeholder="שם או טלפון..."]', '');

    // 2.2 Admin Analytics Subview
    console.log('Auditing Admin Analytics Subview...');
    await pLogin.click('button:has-text("אנליטיקה")');
    await pLogin.waitForTimeout(800);
    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '06_admin_analytics_desktop.png') });
    await auditPageA11y(pLogin, 'Admin Analytics');

    // 2.3 Admin Users Subview
    console.log('Auditing Admin Users Subview...');
    await pLogin.click('button:has-text("משתמשים")');
    await pLogin.waitForTimeout(800);
    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '07_admin_users_desktop.png') });
    await auditPageA11y(pLogin, 'Admin Users Table');

    // Discover some registered users from the table
    const userNames = await pLogin.locator('span.font-medium.text-\\[15px\\]').allInnerTexts();
    console.log('Discovered users count:', userNames.length, 'Samples:', userNames.slice(0, 5));
    logResults.discoveredUsers = userNames.slice(0, 10);

    // Test User Add Modal
    const addUserBtn = pLogin.locator('button:has-text("הוסף משתמש")');
    if (await addUserBtn.isVisible()) {
      await addUserBtn.click();
      await pLogin.waitForTimeout(600);
      await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '08_admin_add_user_modal.png') });
      await auditPageA11y(pLogin, 'UserFormModal');

      // Test School Dropdown inside modal
      const schoolInput = pLogin.locator('input[placeholder="חפש ובחר בית ספר..."]');
      if (await schoolInput.isVisible()) {
        await schoolInput.click();
        await pLogin.waitForTimeout(400);
        await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '09_admin_user_school_dropdown.png') });
      }

      // Close modal
      await pLogin.click('button:has-text("ביטול")');
      await pLogin.waitForTimeout(400);
    }

    // 2.4 Admin Exams Subview
    console.log('Auditing Admin Exams Subview...');
    await pLogin.click('button:has-text("מבחנים")');
    await pLogin.waitForTimeout(800);
    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '10_admin_exams_desktop.png') });
    await auditPageA11y(pLogin, 'Admin Exams');

    // Test Exam Builder Modal
    const addExamBtn = pLogin.locator('button:has-text("צור מבחן חדש")');
    if (await addExamBtn.isVisible()) {
      await addExamBtn.click();
      await pLogin.waitForTimeout(600);
      await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '11_admin_exam_builder_modal.png') });
      await auditPageA11y(pLogin, 'ExamBuilderModal');

      // Close modal
      await pLogin.click('button:has-text("ביטול")');
      await pLogin.waitForTimeout(400);
    }

    // 2.5 Admin Events Subview
    console.log('Auditing Admin Events Subview...');
    await pLogin.click('button:has-text("לוח אירועים")');
    await pLogin.waitForTimeout(800);
    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '12_admin_events_desktop.png') });
    await auditPageA11y(pLogin, 'Admin Events');

    // Open Attendance Report Table if button exists
    const attBtn = pLogin.locator('button:has-text("הזן נוכחות")').first();
    if (await attBtn.isVisible()) {
      await attBtn.click();
      await pLogin.waitForTimeout(600);
      await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '13_admin_attendance_report_table.png') });
      await auditPageA11y(pLogin, 'AttendanceReportTable');

      // Close attendance table
      const closeAttBtn = pLogin.locator('button:has-text("סגור")');
      if (await closeAttBtn.isVisible()) {
        await closeAttBtn.click();
        await pLogin.waitForTimeout(400);
      }
    }

    // Mobile Admin View Screenshot
    console.log('Capturing Admin Mobile experience...');
    await pLoginMobile.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await pLoginMobile.waitForTimeout(1000);
    await pLoginMobile.click('button:has-text("כניסת צוות")');
    await pLoginMobile.fill('#staff-name', "עידן קרבצ'יק");
    await pLoginMobile.fill('#staff-phone', "0507117791");
    await pLoginMobile.fill('#staff-passcode', "idanaviv100");
    await pLoginMobile.click('button[type="submit"]');
    await pLoginMobile.waitForTimeout(2000);
    await pLoginMobile.screenshot({ path: path.join(ARTIFACT_DIR, '14_admin_reports_mobile.png') });
    await checkOverflow(pLoginMobile, 'Admin Reports Mobile', '390x844');
  }

  // ----------------------------------------------------
  // 3. LOGGING IN AS INSTRUCTOR & AUDITING INSTRUCTOR VIEW
  // ----------------------------------------------------
  console.log('--- 3. Testing Instructor / Staff View ---');
  // From Admin Users tab, let's see if there is an instructor registered or let's create a temporary instructor or test instructor login
  // Let's check users from pLogin
  await pLogin.click('button:has-text("משתמשים")');
  await pLogin.waitForTimeout(500);

  // Filter role to instructor
  const roleFilterSelect = pLogin.locator('select').nth(1);
  if (await roleFilterSelect.isVisible()) {
    await roleFilterSelect.selectOption('instructor');
    await pLogin.waitForTimeout(500);
  }

  const instructorCard = pLogin.locator('div.p-4.hover\\:bg-\\[\\#f8f9fa\\]').first();
  let instructorPhone = '';
  let instructorName = '';

  if (await instructorCard.isVisible()) {
    const textContent = await instructorCard.innerText();
    console.log('Found instructor in system:', textContent.split('\n')[0]);
    // Extract phone and name
    const lines = textContent.split('\n').filter(Boolean);
  // Fallback if not parsed
  if (!instructorName || !instructorPhone) {
    instructorName = "מדריך כללי";
    instructorPhone = "0123456789";
  }

  console.log(`Testing Instructor login with ${instructorName} (${instructorPhone})...`);
  // Logout admin
  await pLogin.click('button:has-text("התנתק")');
  await pLogin.waitForTimeout(1000);

  // Login as Instructor
  await pLogin.click('button:has-text("כניסת צוות")');
  await pLogin.fill('#staff-name', instructorName);
  await pLogin.fill('#staff-phone', instructorPhone);
  await pLogin.fill('#staff-passcode', 'idanaviv100');
  await pLogin.click('button[type="submit"]');
  await pLogin.waitForTimeout(2000);

  await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '15_instructor_students_desktop.png') });
  await checkOverflow(pLogin, 'Instructor Students', '1440x900');
  await auditPageA11y(pLogin, 'Instructor Students');

  // Test expanding first student card
  const studentCardHeader = pLogin.locator('div.cursor-pointer').first();
  if (await studentCardHeader.isVisible()) {
    await studentCardHeader.click();
    await pLogin.waitForTimeout(500);
    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '16_instructor_student_expanded.png') });
  }

  // Test clicking "תיק חניך"
  const studentModalBtn = pLogin.locator('button:has-text("תיק חניך")').first();
  if (await studentModalBtn.isVisible()) {
    await studentModalBtn.click();
    await pLogin.waitForTimeout(600);
    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '17_instructor_student_modal.png') });
    await auditPageA11y(pLogin, 'StudentProfileModal');

    // Close modal
    const closeBtn = pLogin.locator('button[aria-label="סגור חלון"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await pLogin.waitForTimeout(400);
    }
  }

  // Test Instructor Meetings tab
  const meetingsBtn = pLogin.locator('button:has-text("נוכחות במפגשים")');
  if (await meetingsBtn.isVisible()) {
    await meetingsBtn.click();
    await pLogin.waitForTimeout(500);
    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '18_instructor_meetings_tab.png') });
    await auditPageA11y(pLogin, 'Instructor Meetings');
  }

  // ----------------------------------------------------
  // 4. LOGGING IN AS STUDENT & AUDITING STUDENT VIEW
  // ----------------------------------------------------
  console.log('--- 4. Testing Student Login & View ---');
  // Logout instructor
  await pLogin.click('button[title="התנתקות"], button:has-text("התנתק")');
  await pLogin.waitForTimeout(1000);

  let studentName = "רינת לינדנר כהן";
  let studentPhone = "0504704260";

  console.log(`Logging in as student: ${studentName} / ${studentPhone}...`);
  await pLogin.click('button:has-text("כניסת חניכים")');
  await pLogin.fill('#student-name', studentName);
  await pLogin.fill('#student-phone', studentPhone);
  await pLogin.click('button[type="submit"]');
  await pLogin.waitForTimeout(2000);

    await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '19_student_view_desktop.png') });
    await checkOverflow(pLogin, 'Student View Desktop', '1440x900');
    await auditPageA11y(pLogin, 'Student View Desktop');

    // Test clicking on an exam card to view exam details
    const examCard = pLogin.locator('div.bg-white.rounded-\\[24px\\].border').nth(1);
    if (await examCard.isVisible()) {
      await examCard.click();
      await pLogin.waitForTimeout(600);
      await pLogin.screenshot({ path: path.join(ARTIFACT_DIR, '20_student_exam_detail.png') });
      await auditPageA11y(pLogin, 'Student Exam Detail');

      // Click Back button
      const backBtn = pLogin.locator('button:has-text("חזרה")');
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await pLogin.waitForTimeout(400);
      }
    }

    // Student Mobile View
    console.log('Capturing Student Mobile experience...');
    await pLoginMobile.evaluate(() => localStorage.clear());
    await pLoginMobile.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await pLoginMobile.waitForTimeout(1000);
    await pLoginMobile.click('button:has-text("כניסת חניכים")');
    await pLoginMobile.fill('#student-name', studentName);
    await pLoginMobile.fill('#student-phone', studentPhone);
    await pLoginMobile.click('button[type="submit"]');
    await pLoginMobile.waitForTimeout(2000);
    await pLoginMobile.screenshot({ path: path.join(ARTIFACT_DIR, '21_student_view_mobile.png') });
    await checkOverflow(pLoginMobile, 'Student View Mobile', '390x844');
  }

  // ----------------------------------------------------
  // 5. GAME VIEW AUDIT (/game)
  // ----------------------------------------------------
  console.log('--- 5. Auditing Game View (/game) ---');
  const pGame = await setupPage(ctxMobile, 'Game View Mobile');
  await pGame.goto(`${BASE_URL}/game`, { waitUntil: 'domcontentloaded' });
  await pGame.waitForTimeout(1500);

  // 5.1 Registration Portrait
  await pGame.screenshot({ path: path.join(ARTIFACT_DIR, '22_game_registration_portrait.png') });
  await checkOverflow(pGame, 'Game Registration', '390x844');
  await auditPageA11y(pGame, 'Game Registration');

  // 5.2 Registration Landscape
  const ctxGameLandscape = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const pGameLand = await setupPage(ctxGameLandscape, 'Game View Landscape');
  await pGameLand.goto(`${BASE_URL}/game`, { waitUntil: 'domcontentloaded' });
  await pGameLand.waitForTimeout(1000);
  await pGameLand.screenshot({ path: path.join(ARTIFACT_DIR, '23_game_registration_landscape.png') });

  // 5.3 Fill Team and Start Game
  console.log('Filling Team details and starting game...');
  await pGame.fill('input[placeholder="שם הקבוצה"]', 'סיירת הדר');
  await pGame.fill('input[placeholder="שם משתתף/ת"]', 'דניאל');
  await pGame.click('button[type="submit"]');
  await pGame.waitForTimeout(300);

  await pGame.click('button:has-text("התחל")');
  await pGame.waitForTimeout(1000);
  await pGame.screenshot({ path: path.join(ARTIFACT_DIR, '24_game_main_screen.png') });
  await auditPageA11y(pGame, 'Game Main Screen');

  // 5.4 Scan Modal
  const scanBtn = pGame.locator('button:has-text("סרוק ברקוד")');
  if (await scanBtn.isVisible()) {
    await scanBtn.click();
    await pGame.waitForTimeout(800);
    await pGame.screenshot({ path: path.join(ARTIFACT_DIR, '25_game_scanner_modal.png') });
    await auditPageA11y(pGame, 'Game Scanner Modal');

    // Close scanner
    const closeScanner = pGame.locator('button:has(svg.lucide-x)');
    if (await closeScanner.isVisible()) {
      await closeScanner.click();
      await pGame.waitForTimeout(400);
    }
  }

  await browser.close();

  // Save full JSON summary
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'comprehensive_audit_results.json'), JSON.stringify(logResults, null, 2), 'utf-8');
  console.log('🎉 Comprehensive Audit Finished! All screenshots and JSON data stored in artifact directory.');
}

runFullAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
