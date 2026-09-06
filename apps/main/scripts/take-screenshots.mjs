import { chromium } from '@playwright/test';
import path from 'node:path';

const ARTIFACT_DIR = 'C:\\Users\\jnux9\\.gemini\\antigravity\\brain\\07616a41-73e8-443d-8072-ca4346f5d06f';

async function run() {
  console.log('🚀 Launching browser via Playwright...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.log('Falling back to system chrome channel...');
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
  }

  // 1. Portrait Registration Screen
  console.log('📸 1. Capturing Registration Screen (Portrait)...');
  const contextPortrait = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14 / Pixel
    isMobile: true,
    hasTouch: true,
  });
  const pagePortrait = await contextPortrait.newPage();
  await pagePortrait.goto('http://localhost:5173/game', { waitUntil: 'domcontentloaded' });
  await pagePortrait.waitForSelector('input[placeholder="שם הקבוצה"]');
  await pagePortrait.waitForTimeout(500);
  const shot1 = path.join(ARTIFACT_DIR, 'screen_1_registration_portrait.png');
  await pagePortrait.screenshot({ path: shot1 });
  console.log('Saved:', shot1);

  // 2. Landscape Registration & Game Start
  console.log('📸 2. Capturing Registration Screen (Landscape)...');
  const contextLandscape = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await contextLandscape.newPage();
  await page.goto('http://localhost:5173/game', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="שם הקבוצה"]');

  // Fill in Team Name & Members
  await page.fill('input[placeholder="שם הקבוצה"]', 'סיירת התפוז');
  await page.fill('input[placeholder="שם משתתף/ת"]', 'איתמר');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(200);

  await page.fill('input[placeholder="שם משתתף/ת"]', 'רוני');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(200);

  const shot2 = path.join(ARTIFACT_DIR, 'screen_2_registration_filled.png');
  await page.screenshot({ path: shot2 });
  console.log('Saved:', shot2);

  // 3. Click Start Game -> Main Game Screen
  console.log('📸 3. Capturing Main Game Navigation Screen...');
  await page.click('button:has-text("התחל")');
  await page.waitForSelector('button:has-text("סרוק ברקוד")');
  await page.waitForTimeout(600);

  const shot3 = path.join(ARTIFACT_DIR, 'screen_3_main_game_screen.png');
  await page.screenshot({ path: shot3 });
  console.log('Saved:', shot3);

  // 4. Click Scan Barcode Button -> Scanner Modal
  console.log('📸 4. Capturing Barcode Scanner Modal...');
  await page.click('button:has-text("סרוק ברקוד")');
  await page.waitForTimeout(800);

  const shot4 = path.join(ARTIFACT_DIR, 'screen_4_scanner_modal.png');
  await page.screenshot({ path: shot4 });
  console.log('Saved:', shot4);

  // Close scanner
  await page.click('button:has(svg.lucide-x)');
  await page.waitForTimeout(400);

  // 5. Simulate scanning station 1 to open 3 Questions Quiz
  console.log('📸 5. Simulating Station Scan & Opening Quiz Modal...');
  await page.evaluate(() => {
    const saved = localStorage.getItem('hanhaga_game_session_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.activeStationId = 'station-1';
      localStorage.setItem('hanhaga_game_session_v1', JSON.stringify(parsed));
      window.location.reload();
    }
  });
  await page.waitForSelector('text=חצר הראשונים ומגדל המים');
  await page.waitForTimeout(600);

  const shot5 = path.join(ARTIFACT_DIR, 'screen_5_quiz_question.png');
  await page.screenshot({ path: shot5 });
  console.log('Saved:', shot5);

  // 6. Answer the 3 questions
  console.log('📸 6. Answering questions to trigger Checkmark V...');
  // Q1
  await page.click('button:has-text("1929")');
  await page.waitForTimeout(300);
  // Q2
  await page.click('button:has-text("הברונית חנה מרוטשילד")');
  await page.waitForTimeout(300);
  // Q3
  await page.click('button:has-text("אגירת מים וחלוקתם לפרדסים ולבתי התושבים")');
  await page.waitForTimeout(300);

  const shot6 = path.join(ARTIFACT_DIR, 'screen_6_checkmark_animation.png');
  await page.screenshot({ path: shot6 });
  console.log('Saved:', shot6);

  // 7. Complete all stations and view Summary Screen
  console.log('📸 7. Capturing Final Summary Screen...');
  await page.evaluate(() => {
    const saved = localStorage.getItem('hanhaga_game_session_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.status = 'completed';
      parsed.activeStationId = null;
      parsed.totalScore = 1500;
      parsed.elapsedSeconds = 542; // 09:02
      parsed.completedStationIds = ['station-1', 'station-2', 'station-3', 'station-4', 'station-5'];
      localStorage.setItem('hanhaga_game_session_v1', JSON.stringify(parsed));
      window.location.reload();
    }
  });
  await page.waitForSelector('text=סיום המשחק');
  await page.waitForTimeout(600);

  const shot7 = path.join(ARTIFACT_DIR, 'screen_7_final_summary.png');
  await page.screenshot({ path: shot7 });
  console.log('Saved:', shot7);

  await browser.close();
  console.log('🎉 All 7 screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
