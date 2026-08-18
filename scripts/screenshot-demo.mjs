// One-off script: drives the JourZy chat to generate a real Paris itinerary
// and captures README demo screenshots. Not part of the app; run manually
// via `node scripts/screenshot-demo.mjs` with both dev servers up.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const DOCS_DIR = path.resolve(import.meta.dirname, '..', 'docs');
fs.mkdirSync(DOCS_DIR, { recursive: true });

const shot = async (page, name) => {
  const file = path.join(DOCS_DIR, name);
  await page.screenshot({ path: file });
  console.log('saved', file);
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  await page.goto('http://localhost:5173');
  await page.waitForSelector('textarea', { timeout: 30000 });
  // Let the bootstrap greeting finish before screenshotting/typing.
  await page.waitForFunction(() => {
    const ta = document.querySelector('textarea');
    return ta && !ta.disabled;
  }, { timeout: 30000 });

  const send = async (text) => {
    await page.fill('textarea', text);
    await page.keyboard.press('Enter');
  };

  await send(
    "Hi! I'm Linh. I want to plan a 5-day solo trip to Paris, France, arriving March 10 2026 and leaving " +
    "March 15 2026. Moderate budget. I love art museums, historic architecture, and local food."
  );
  // Wait for JourZy's reply so the onboarding screenshot shows a real
  // back-and-forth exchange instead of just the opening greeting.
  await page.waitForFunction(() => {
    const spinner = document.querySelector('.animate-pulse');
    return !spinner;
  }, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, 'demo-onboarding.png');

  await send("Please build my itinerary now.");

  // Give the conversational planner a few turns in case it asks a follow-up
  // before it has enough to generate (it emits isReady itself once satisfied).
  for (let i = 0; i < 4; i++) {
    const built = await page.locator('button:has-text("Plan another trip")').count();
    if (built > 0) break;
    const stillThinking = await page.locator('text=Building your itinerary').count()
      + await page.locator('svg.animate-spin').count();
    if (stillThinking > 0) {
      await page.waitForFunction(() => {
        const spinner = document.querySelector('.animate-spin');
        return !spinner;
      }, { timeout: 120000 }).catch(() => {});
      break;
    }
    await send("Yes, that sounds great — go ahead and generate it.");
    await page.waitForTimeout(3000);
  }

  // Wait for either the plan screen to auto-open, or the "generating" spinner
  // to finish and produce the plan view.
  await page.waitForSelector('text=Directions', { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Dismiss the guest "log in to save" notice so it doesn't clutter the
  // portfolio screenshots — real behavior, just not the cleanest to show.
  const dismissNotice = page.locator('button:near(:text("Log in to save"))').first();
  if (await dismissNotice.count() > 0) await dismissNotice.click().catch(() => {});

  await page.evaluate(() => window.scrollTo(0, 0));
  const scrollContainer = page.locator('.jz-scroll');
  if (await scrollContainer.count() > 0) await scrollContainer.first().evaluate((el) => el.scrollTo(0, 0));
  await page.waitForTimeout(300);

  await shot(page, 'demo-itinerary.png');

  const prepTab = page.locator('button:has-text("Prep")');
  if (await prepTab.count() > 0) {
    await prepTab.first().click();
    await page.waitForTimeout(2500); // live weather fetch
    await shot(page, 'demo-weather.png');
  } else {
    console.log('Prep tab not found — plan may not have opened');
  }

  await browser.close();
})();
