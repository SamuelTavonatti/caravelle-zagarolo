/**
 * Full End-to-End Playwright Verification (Desktop 1440x900 & Mobile 390x844)
 * Verifies:
 * 1. Three.js 3D Studio Render of VW Caravelle T5 + 8/8 DISPONIBILI + real 3D door slide -> overhead transition
 * 2. Centered Top-Down Cabin (NO POV box), exact Front Row aisle gap (Driver | gap | F1 F2), 8/8 free seats
 * 3. Sketchfab "Modello 3D" toggle, emerald selection, booking with Via Gocciadoro 1 chip, green checkmark, black curtain
 * 4. Google Maps Navigation 3D trailer starting from Via Gocciadoro 1, Trento -> Dani -> A22 -> Taio -> "Ben arrivati a Roma"
 *    with smooth camera bearing (maxBearingDelta < 10°, zero 360° spins)
 * 5. Return to cabin -> atomic seat switch F2 -> R3 -> release back to 8/8 DISPONIBILI
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const URL = process.argv[2] || 'http://localhost:4175/caravelle-zagarolo/';
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
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1800);

  // 1. Verify Act I photorealistic real-world backdrop, Sketchfab 3D hero iframe, 8/8 DISPONIBILI, and zero overflow
  const act1Check = await page.evaluate(() => {
    const bg = document.querySelector('[data-testid="real-world-backdrop"]');
    const iframe = document.querySelector('[data-testid="sketchfab-hero-iframe"]');
    const avail = document.querySelector('[data-testid="hero-availability-badge"]')?.textContent || '';
    return {
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      backdropLoaded: Boolean(bg && bg.complete && bg.naturalWidth > 0),
      sketchfabPresent: Boolean(iframe && iframe.getAttribute('src')?.includes('ee2e1e8000db4deabaf59bae97eddecf')),
      avail,
    };
  });
  if (act1Check.overflowX > 0) {
    throw new Error(`[${vp.name}] Act I horizontal overflow: ${act1Check.overflowX}px`);
  }
  if (!act1Check.backdropLoaded) {
    throw new Error(`[${vp.name}] Real-world backdrop image failed to load!`);
  }
  if (!act1Check.sketchfabPresent) {
    throw new Error(`[${vp.name}] Sketchfab 3D hero iframe missing!`);
  }
  if (!act1Check.avail.includes('8/8')) {
    throw new Error(`[${vp.name}] Expected 8/8 DISPONIBILI on fresh load, got: ${act1Check.avail}`);
  }
  await page.screenshot({ path: path.join(outDir, `${vp.name}-01-act1-sketchfab-realworld.png`) });

  // Trigger 3D sliding door + 90° overhead camera transition -> Act II
  await page.getByTestId('open-door-cta').click();
  await page.getByTestId('act-two-cabin').waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(400);

  // 2. Verify NO POV box, exact front-row aisle gap, and ALL 8 seats start FREE
  const povCount = await page.getByTestId('seat-pov-preview').count();
  if (povCount !== 0) {
    throw new Error(`[${vp.name}] Right-side POV box should be removed, found ${povCount}`);
  }
  const aisleVisible = await page.getByTestId('front-row-aisle').isVisible();
  if (!aisleVisible) {
    throw new Error(`[${vp.name}] Front-row center aisle gap missing!`);
  }
  const cabinAvail = await page.getByTestId('cabin-availability-count').textContent();
  if (!cabinAvail?.includes('8/8')) {
    throw new Error(`[${vp.name}] Expected 8/8 DISPONIBILI in cabin, got: ${cabinAvail}`);
  }

  const seatIds = ['F1', 'F2', 'M1', 'M2', 'M3', 'R1', 'R2', 'R3'];
  for (const id of seatIds) {
    const btn = page.getByTestId(`seat-btn-${id}`);
    const state = await btn.getAttribute('data-seat-state');
    if (state === 'occupied') {
      throw new Error(`[${vp.name}] Seat ${id} should start FREE, not occupied!`);
    }
  }

  // Verify Sketchfab "Modello 3D" toggle opens & closes cleanly
  await page.getByTestId('toggle-3d-model-btn').click();
  await page.getByTestId('sketchfab-3d-panel').waitFor({ state: 'visible', timeout: 3000 });
  await page.getByTestId('toggle-3d-model-btn').click();
  await page.waitForTimeout(200);

  // Select F2 -> verify emerald green selection
  await page.getByTestId('seat-btn-F2').click();
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="seat-btn-F2"]');
    return (
      el &&
      el.getAttribute('data-seat-state') === 'selected' &&
      getComputedStyle(el).backgroundColor === 'rgb(16, 185, 129)'
    );
  }, null, { timeout: 5000 });
  await page.screenshot({ path: path.join(outDir, `${vp.name}-02-act2-cabin-f2.png`) });

  // Open booking modal, check >=16px inputs, pick Via Gocciadoro 1 chip
  await page.getByTestId('book-seat-btn').click();
  await page.getByTestId('booking-modal').waitFor({ state: 'visible', timeout: 4000 });

  const inputSizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input')).map((i) => parseFloat(getComputedStyle(i).fontSize))
  );
  if (inputSizes.some((sz) => sz < 16)) {
    throw new Error(`[${vp.name}] Found input with font-size < 16px: ${JSON.stringify(inputSizes)}`);
  }

  await page.fill('#booking-first-name', 'Luca');
  await page.fill('#booking-last-name', 'Verdi');
  await page.getByRole('button', { name: 'Via Gocciadoro 1, Trento' }).click();

  // Submit -> green checkmark -> black curtain
  await page.getByTestId('confirm-booking-submit').click();
  await page.getByTestId('booking-success-checkmark').waitFor({ state: 'visible', timeout: 4000 });
  await page.getByTestId('black-curtain').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(300);

  // 3. Launch Google Maps Style 3D Trailer starting from Via Gocciadoro 1, Trento
  await page.getByTestId('launch-trailer-btn').click();
  await page.getByTestId('act-three-trailer').waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(2600);
  const startBanner = await page.locator('header').textContent();
  if (!startBanner?.includes('Gocciadoro')) {
    throw new Error(`[${vp.name}] Expected Via Gocciadoro 1 departure, got: ${startBanner}`);
  }
  await page.screenshot({ path: path.join(outDir, `${vp.name}-06-trailer-gocciadoro.png`) });

  // Verify pickup overlays & highway entry
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

  await page.getByTestId('trailer-speed-btn').click(); // 2x
  await page.getByTestId('jump-stop-tappa-4').click();
  await page
    .getByTestId('trailer-stop-overlay')
    .filter({ hasText: 'Si prende Taio' })
    .waitFor({ state: 'visible', timeout: 5000 });

  await page.getByTestId('finale-end-card').waitFor({ state: 'visible', timeout: 14000 });
  const navTelemetry = await page.evaluate(() => window.__CARAVELLE_NAV_TELEMETRY__);
  if (!navTelemetry || navTelemetry.maxBearingDelta > 10) {
    throw new Error(`[${vp.name}] Unstable camera bearing: ${JSON.stringify(navTelemetry)}`);
  }
  const [startLng, startLat] = navTelemetry.startCoordinate || [];
  if (Math.abs(startLng - 11.12779748962075) > 1e-6 || Math.abs(startLat - 46.05847124366229) > 1e-6) {
    throw new Error(`[${vp.name}] Exact start coordinate mismatch: ${JSON.stringify(navTelemetry.startCoordinate)}`);
  }

  // 4. Return to cabin, switch F2 -> R3, then release back to 8/8 DISPONIBILI
  await page.getByTestId('finale-back-cabin-btn').click();
  await page.getByTestId('act-two-cabin').waitFor({ state: 'visible', timeout: 5000 });

  await page.getByTestId('seat-btn-R3').click();
  await page.getByTestId('switch-seat-btn').click();
  await page.waitForTimeout(300);

  const afterSwitchR3 = await page.getByTestId('seat-btn-R3').getAttribute('data-seat-state');
  const afterSwitchF2 = await page.getByTestId('seat-btn-F2').getAttribute('data-seat-state');
  if (afterSwitchR3 !== 'mine' || afterSwitchF2 !== 'free') {
    throw new Error(`[${vp.name}] Seat switch failed: R3=${afterSwitchR3}, F2=${afterSwitchF2}`);
  }

  await page.getByTestId('release-seat-btn').click();
  await page.waitForTimeout(300);
  const finalAvail = await page.getByTestId('cabin-availability-count').textContent();
  if (!finalAvail?.includes('8/8')) {
    throw new Error(`[${vp.name}] Expected 8/8 DISPONIBILI after release, got: ${finalAvail}`);
  }

  const finalOverflowX = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  );
  if (finalOverflowX > 0) {
    throw new Error(`[${vp.name}] Final horizontal overflow: ${finalOverflowX}px`);
  }

  if (consoleErrors.length > 0) {
    throw new Error(`[${vp.name}] Console errors: ${consoleErrors.join(' | ')}`);
  }
  if (failedRequests.length > 0) {
    throw new Error(`[${vp.name}] Failed network requests: ${failedRequests.join(' | ')}`);
  }

  await context.close();
  console.log(
    `PASS [${vp.name} (${vp.width}x${vp.height})]: 3D studio, 8/8 free cabin, front aisle, Via Gocciadoro route, maxBearingDelta=${navTelemetry.maxBearingDelta.toFixed(2)}°.`
  );
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
