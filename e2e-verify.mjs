/**
 * Full End-to-End Playwright Verification (Desktop 1440x900 & Mobile 390x844)
 * Tests:
 * 1. Door-opening transition -> 8-seat cabin map
 * 2. Green seat selection -> POV preview update
 * 3. Booking submission -> green checkmark motion graphic -> black curtain
 * 4. Full Apple Maps 3D trailer playback up to "Ben arrivati a Roma"
 * 5. Returning to cabin and switching to a different free seat while verifying old seat is released
 * 6. Zero console errors, 0px horizontal overflow, >=16px mobile input font sizes
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const URL = process.argv[2] || 'http://localhost:4174';
const outDir = '/home/antigravity/qa-reports/e2e';
fs.mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

async function runFlowForViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.width <= 400 ? 2 : 1,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('response', (res) => {
    // Allow MapLibre external tiles minor retries without failing on 204/etc, flag real 4xx/5xx
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(350);

  // Verify Act I strict 100dvh, zero overflow, and real caravelle-side.jpg loaded
  const act1Check = await page.evaluate(() => {
    const img = document.querySelector('img[src*="caravelle-side.jpg"]');
    return {
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      heightDelta: document.documentElement.scrollHeight - window.innerHeight,
      photoLoaded: Boolean(img && img.complete && img.naturalWidth > 0),
    };
  });
  if (act1Check.overflowX > 0) {
    throw new Error(`[${vp.name}] Act I horizontal overflow: ${act1Check.overflowX}px`);
  }
  if (!act1Check.photoLoaded) {
    throw new Error(`[${vp.name}] Real photograph caravelle-side.jpg failed to load!`);
  }
  await page.screenshot({ path: path.join(outDir, `${vp.name}-01-act1-exterior.png`) });

  // 1. Click primary door-opening CTA ("Apri il portellone") and wait for door slide + zoom -> Act II cabin
  await page.getByTestId('open-door-cta').click();
  await page.getByTestId('act-two-cabin').waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(450);

  // Verify Sketchfab "Modello 3D" toggle opens & closes cleanly
  await page.getByTestId('toggle-3d-model-btn').click();
  await page.getByTestId('sketchfab-3d-panel').waitFor({ state: 'visible', timeout: 3000 });
  const hasSketchfab = await page
    .locator('iframe[src*="sketchfab.com/models/ee2e1e8000db4deabaf59bae97eddecf"]')
    .count();
  if (hasSketchfab === 0) {
    throw new Error(`[${vp.name}] Sketchfab 3D iframe missing!`);
  }
  await page.getByTestId('toggle-3d-model-btn').click();
  await page.waitForTimeout(250);

  // Verify 8 passenger seats + locked driver seat are present
  const seatIds = ['F1', 'F2', 'M1', 'M2', 'M3', 'R1', 'R2', 'R3'];
  for (const id of seatIds) {
    const visible = await page.getByTestId(`seat-btn-${id}`).isVisible();
    if (!visible) throw new Error(`[${vp.name}] Seat ${id} not visible!`);
  }
  const driverLocked = await page.getByTestId('driver-seat-locked').isVisible();
  if (!driverLocked) throw new Error(`[${vp.name}] Driver seat not visible!`);

  // Verify already-booked seat (M1 Dani) cannot be overwritten
  await page.getByTestId('seat-btn-M1').click();
  await page.waitForTimeout(200);
  const bookBtnOnOccupied = await page.getByTestId('book-seat-btn').count();
  if (bookBtnOnOccupied !== 0) {
    throw new Error(`[${vp.name}] Occupied seat M1 should NOT allow booking overwrite!`);
  }

  // 2. Select available seat F2 -> verify emerald green selection & POV preview update
  await page.getByTestId('seat-btn-F2').click();
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="seat-btn-F2"]');
    return el && el.getAttribute('data-seat-state') === 'selected' && getComputedStyle(el).backgroundColor === 'rgb(16, 185, 129)';
  }, null, { timeout: 5000 });
  const povTextF2 = await page.getByTestId('seat-pov-preview').textContent();
  if (!povTextF2?.includes('F2')) {
    throw new Error(`[${vp.name}] F2 POV mismatch: ${povTextF2}`);
  }
  await page.screenshot({ path: path.join(outDir, `${vp.name}-02-act2-cabin-f2.png`) });

  // Also test clicking M3 to verify POV switches dynamically to Middle Row sliding door POV
  await page.getByTestId('seat-btn-M3').click();
  await page.waitForTimeout(200);
  const povTextM3 = await page.getByTestId('seat-pov-preview').textContent();
  if (!povTextM3?.includes('M3') || !povTextM3?.includes('portellone')) {
    throw new Error(`[${vp.name}] M3 POV did not update cleanly: ${povTextM3}`);
  }

  // Click back to F2 and click "Prenota"
  await page.getByTestId('seat-btn-F2').click();
  await page.getByTestId('book-seat-btn').click();
  await page.getByTestId('booking-modal').waitFor({ state: 'visible', timeout: 4000 });

  // Verify >=16px font-size on all inputs
  const inputSizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input')).map((i) => parseFloat(getComputedStyle(i).fontSize))
  );
  if (inputSizes.some((sz) => sz < 16)) {
    throw new Error(`[${vp.name}] Found input with font-size < 16px: ${JSON.stringify(inputSizes)}`);
  }

  // Fill Italian booking form
  await page.fill('#booking-first-name', 'Luca');
  await page.fill('#booking-last-name', 'Verdi');
  await page.getByRole('button', { name: 'Pomarolo (TN)' }).click();
  await page.screenshot({ path: path.join(outDir, `${vp.name}-03-booking-modal.png`) });

  // 3. Submit -> verify animated green checkmark motion graphic -> then black curtain
  await page.getByTestId('confirm-booking-submit').click();
  await page.getByTestId('booking-success-checkmark').waitFor({ state: 'visible', timeout: 4000 });
  await page.screenshot({ path: path.join(outDir, `${vp.name}-04-checkmark.png`) });

  // Wait for cinematic black curtain (#050507)
  await page.getByTestId('black-curtain').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outDir, `${vp.name}-05-black-curtain.png`) });

  // 4. Launch Google Maps Style 3D Trailer -> watch continuous playback and verify zero 360° spins
  await page.getByTestId('launch-trailer-btn').click();
  await page.getByTestId('act-three-trailer').waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: path.join(outDir, `${vp.name}-06-trailer-trento.png`) });

  // Verify key pickup overlays & highway entry sequence
  await page.getByTestId('jump-stop-tappa-1').click();
  await page
    .getByTestId('trailer-stop-overlay')
    .filter({ hasText: 'Si prende Dani' })
    .waitFor({ state: 'visible', timeout: 5000 });

  await page.getByTestId('jump-stop-autostrada').click();
  await page
    .getByTestId('trailer-stop-overlay')
    .filter({ hasText: 'Ingresso in Autostrada' })
    .waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, `${vp.name}-07-trailer-highway.png`) });

  // Jump to Cesena and play at 2x to let trailer naturally finish on Zagarolo -> "Ben arrivati a Roma"
  await page.getByTestId('trailer-speed-btn').click(); // 2x speed
  await page.getByTestId('jump-stop-tappa-4').click();
  await page
    .getByTestId('trailer-stop-overlay')
    .filter({ hasText: 'Si prende Taio' })
    .waitFor({ state: 'visible', timeout: 5000 });

  // Wait for trailer to reach Zagarolo and render the monumental "Ben arrivati a Roma" end card
  await page.getByTestId('finale-end-card').waitFor({ state: 'visible', timeout: 14000 });
  const navTelemetry = await page.evaluate(() => window.__CARAVELLE_NAV_TELEMETRY__);
  if (!navTelemetry || navTelemetry.maxBearingDelta > 10) {
    throw new Error(`[${vp.name}] Unstable camera bearing detected: ${JSON.stringify(navTelemetry)}`);
  }
  const finaleText = await page.getByTestId('finale-end-card').textContent();
  if (!finaleText?.includes('Ben arrivati a') || !finaleText?.includes('Roma')) {
    throw new Error(`[${vp.name}] Finale card missing "Ben arrivati a Roma": ${finaleText}`);
  }
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(outDir, `${vp.name}-08-trailer-finale.png`) });

  // 5. Return to Cabin from Finale and switch seat from F2 -> R3 while verifying F2 is released!
  await page.getByTestId('finale-back-cabin-btn').click();
  await page.getByTestId('act-two-cabin').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(350);

  // Confirm F2 is currently owned by user ("mine")
  const beforeSwitchF2 = await page.getByTestId('seat-btn-F2').getAttribute('data-seat-state');
  if (beforeSwitchF2 !== 'mine') {
    throw new Error(`[${vp.name}] Expected F2 to be 'mine' after returning from trailer, got ${beforeSwitchF2}`);
  }

  // Click free seat R3 -> verify POV preview + green "Sposta qui il mio posto" button
  await page.getByTestId('seat-btn-R3').click();
  await page.waitForTimeout(250);
  const switchBtnVisible = await page.getByTestId('switch-seat-btn').isVisible();
  if (!switchBtnVisible) {
    throw new Error(`[${vp.name}] Switch seat button ("Sposta qui il mio posto") not visible on free seat R3!`);
  }
  await page.screenshot({ path: path.join(outDir, `${vp.name}-09-switch-seat-preview.png`) });

  // Click "Sposta qui il mio posto" -> verify R3 becomes 'mine', F2 becomes 'free', and Luca/Pomarolo preserved!
  await page.getByTestId('switch-seat-btn').click();
  await page.waitForTimeout(350);

  const afterSwitchR3 = await page.getByTestId('seat-btn-R3').getAttribute('data-seat-state');
  const afterSwitchF2 = await page.getByTestId('seat-btn-F2').getAttribute('data-seat-state');
  const bannerText = await page.getByTestId('my-booking-banner').textContent();

  if (afterSwitchR3 !== 'mine' || afterSwitchF2 !== 'free') {
    throw new Error(`[${vp.name}] Seat switch failed: R3=${afterSwitchR3}, F2=${afterSwitchF2}`);
  }
  if (!bannerText?.includes('R3') || !bannerText?.includes('Luca') || !bannerText?.includes('Pomarolo')) {
    throw new Error(`[${vp.name}] Preserved passenger info mismatch after switch: ${bannerText}`);
  }

  // Verify zero horizontal overflow in Act II after switch
  const finalOverflowX = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  );
  if (finalOverflowX > 0) {
    throw new Error(`[${vp.name}] Final horizontal overflow: ${finalOverflowX}px`);
  }

  // Also test "Libera il mio posto" releases R3 cleanly
  await page.getByTestId('release-seat-btn').click();
  await page.waitForTimeout(300);
  const afterReleaseR3 = await page.getByTestId('seat-btn-R3').getAttribute('data-seat-state');
  if (afterReleaseR3 !== 'selected' && afterReleaseR3 !== 'free') {
    throw new Error(`[${vp.name}] Release seat failed: R3=${afterReleaseR3}`);
  }

  if (consoleErrors.length > 0) {
    throw new Error(`[${vp.name}] Console errors: ${consoleErrors.join(' | ')}`);
  }
  if (failedRequests.length > 0) {
    throw new Error(`[${vp.name}] Failed network requests: ${failedRequests.join(' | ')}`);
  }

  await context.close();
  console.log(`PASS [${vp.name} (${vp.width}x${vp.height})]: Full E2E flow verified with 0 errors and 0px overflow.`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });

  try {
    for (const vp of VIEWPORTS) {
      await runFlowForViewport(browser, vp);
    }
    console.log('ALL E2E FLOWS PASSED!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('E2E FAILURE:', err.message);
  process.exit(1);
});
