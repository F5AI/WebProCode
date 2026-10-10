/* Standalone HTML smoke test. Run `npm run preview:export` first, then:
 *   node tests/offline-preview.cjs
 * Uses an intercepted document origin and blocks all other network requests.
 * This does not verify native file:// behavior, accounts or real payments.
 * Set CHROMIUM_PATH on desktop when /usr/bin/chromium is unavailable.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const repository = path.resolve(__dirname, '..');
const previewPath = path.join(repository, 'website-preview.html');
const artifactDir = path.join(repository, '.playwright');
const origin = 'http://offline-preview.test';
const errors = [];
const requests = [];

async function navigate(page, destination) {
  const mobile = await page.locator('.mobile-bottom-nav').isVisible();
  const nav = page.locator(mobile ? '.mobile-bottom-nav' : '.main-nav');
  const labels = mobile
    ? { discover: /^Khám phá$/, roadmap: /^Lộ trình$/, saved: /^Đã lưu/ }
    : { discover: /^Khám phá$/, roadmap: /^Lộ trình làm phim/, saved: /^Đã lưu/ };
  await nav.getByRole('button', { name: labels[destination] }).click();
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    dialogs: [...document.querySelectorAll('.df-dialog')].map(element => ({ width: element.clientWidth, scroll: element.scrollWidth })),
  }));
  assert.ok(dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport,
    `${label}: document overflow ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.dialogs.every(dialog => dialog.scroll <= dialog.width),
    `${label}: dialog overflow ${JSON.stringify(dimensions.dialogs)}`);
}

(async () => {
  const html = await fs.readFile(previewPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('website-preview.html is missing. Run npm run preview:export first.');
    throw error;
  });
  const seed = JSON.parse(await fs.readFile(path.join(repository, 'server', 'content.json'), 'utf8'));
  const expectedCount = (Array.isArray(seed) ? seed : seed.resources).length;
  assert.ok(expectedCount >= 4, 'Library must cover the film production stages.');
  await fs.mkdir(artifactDir, { recursive: true });

  let browser, context;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox'],
    });
    context = await browser.newContext({ acceptDownloads: true });
    await context.route('**/*', async route => {
      const request = route.request();
      requests.push({ method: request.method(), url: request.url(), navigation: request.isNavigationRequest() });
      if (new URL(request.url()).origin === origin && request.isNavigationRequest() && request.method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
      } else {
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'tablet', width: 820, height: 1180 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'mobile-small', width: 360, height: 800 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.locator('.resource-card').first().waitFor();
      assert.equal(await page.locator('.resource-card').count(), expectedCount);
      assert.ok(await page.locator('#preview-banner').isVisible());
      const resources = await page.evaluate(async () => (await (await fetch('/api/resources')).json()).resources);
      assert.equal(resources.length, expectedCount, 'Export includes the seed library.');
      for (const image of await page.locator('main img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(element => element.decode());
        assert.ok(await image.evaluate(element => element.complete && element.naturalWidth > 0));
      }
      await noOverflow(page, `offline ${viewport.name} library`);

      await page.getByRole('group', { name: 'Lọc theo chủ đề' }).getByRole('button', { name: 'Video', exact: true }).click();
      assert.equal(await page.locator('.resource-card').count(), resources.filter(resource => resource.category === 'Video').length);
      await page.getByRole('group', { name: 'Lọc theo chủ đề' }).getByRole('button', { name: 'Tất cả', exact: true }).click();
      const format = page.getByRole('combobox', { name: 'Loại tài nguyên' });
      if (await format.isVisible()) {
        await format.selectOption('workflow');
        assert.equal(await page.locator('.resource-card').count(), resources.filter(resource => resource.type === 'workflow').length);
        await format.selectOption('all');
      }
      await page.getByRole('searchbox', { name: 'Tìm kiếm tài nguyên' }).fill('kich ban');
      assert.ok(await page.locator('.resource-card').count() > 0, 'Vietnamese search accepts unaccented text.');
      await page.getByRole('searchbox', { name: 'Tìm kiếm tài nguyên' }).fill('missing-offline-xyz');
      assert.equal(await page.locator('.resource-card').count(), 0);
      await page.getByRole('button', { name: /Xóa tìm kiếm/ }).click();
      await navigate(page, 'roadmap');
      assert.equal(await page.locator('.roadmap-stage').count(), 4);
      await page.locator('.stage-resources button').first().click();
      await page.getByRole('dialog').waitFor();
      await page.locator('.df-resource-article').waitFor();
      await noOverflow(page, `offline ${viewport.name} resource dialog`);
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
      console.log(`PASS offline ${viewport.name}: ${expectedCount} resources, embedded images, filters, search, roadmap, dialog, no overflow`);
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.locator('.resource-card').first().locator('.save-button').click();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.resource-card').first().locator('.save-button').getAttribute('aria-pressed'), 'true');
    await navigate(page, 'saved');
    assert.equal(await page.locator('.resource-card').count(), 1);
    await page.locator('.resource-card .save-button').click();
    assert.equal(await page.locator('.resource-card').count(), 0);

    const resources = await page.evaluate(async () => (await (await fetch('/api/resources')).json()).resources);
    const sample = resources.find(resource => resource.freeDownloads.length && resource.premiumDownloads.length);
    assert.ok(sample, 'Need a resource with both public and locked downloads.');
    await page.goto(`${origin}/?resource=${encodeURIComponent(sample.id)}`, { waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: sample.title }).waitFor();
    const pending = page.waitForEvent('download');
    await page.locator('.df-download-group a').first().click();
    const download = await pending;
    const content = await fs.readFile(await download.path());
    assert.ok(content.length > 500, 'Downloaded practice content is substantive.');
    assert.match(download.suggestedFilename(), /\.html$/, 'Preserves a real filename.');
    assert.match(content.toString('utf8'), /<!doctype html|<html/i);
    await download.saveAs(path.join(artifactDir, 'offline-free-download.html'));
    await download.delete();

    const writes = await page.evaluate(async () => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'never-created@example.test' }),
      });
      return { status: response.status, body: await response.json(), session: await (await fetch('/api/session')).json() };
    });
    assert.equal(writes.status, 503);
    assert.ok(writes.body.error.includes('triển khai'));
    assert.equal(writes.session.user, null);
    assert.ok(sample.premiumDownloads.every(resource => resource.locked && resource.url === null));
    assert.deepEqual(errors, [], 'No browser runtime or console errors.');
    assert.ok(requests.every(request => request.method === 'GET' && request.navigation
      && new URL(request.url).origin === origin && !new URL(request.url).pathname.startsWith('/api/')),
    `No external/API/asset requests: ${JSON.stringify(requests)}`);
    console.log('PASS offline: saved collection persists, actual free HTML download, premium locked, writes rejected, null session, no network API/assets or browser errors');
    console.log(`PASS intercepted offline document; ${requests.length} document navigations. Native file:// was not tested. Artifact: ${artifactDir}`);
  } finally {
    try {
      if (context) await context.close();
    } finally {
      if (browser) await browser.close();
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
