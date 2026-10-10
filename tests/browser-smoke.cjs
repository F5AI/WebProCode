/* Run with `node tests/browser-smoke.cjs`; requires Playwright and Chromium. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const baseURL = process.env.BROWSER_BASE_URL || 'http://127.0.0.1:5173';
const artifactDir = path.resolve(__dirname, '..', '.playwright');
const testIdentity = `browser-${Date.now()}`;
const email = `${testIdentity}@example.test`;
const password = 'BrowserSmoke123!';
const browserErrors = [];

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    dialogs: [...document.querySelectorAll('.df-dialog')].map((element) => ({ width: element.clientWidth, scroll: element.scrollWidth })),
  }));
  assert.ok(dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport,
    `${label}: horizontal overflow ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.dialogs.every((dialog) => dialog.scroll <= dialog.width),
    `${label}: inner dialog overflow ${JSON.stringify(dimensions.dialogs)}`);
}

async function ready(page) {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.locator('.resource-card').first().waitFor();
}

async function navigate(page, destination) {
  const mobile = await page.locator('.mobile-bottom-nav').isVisible();
  const nav = page.locator(mobile ? '.mobile-bottom-nav' : '.main-nav');
  const labels = mobile
    ? { discover: /^Khám phá$/, roadmap: /^Lộ trình$/, saved: /^Đã lưu/ }
    : { discover: /^Khám phá$/, roadmap: /^Lộ trình làm phim/, saved: /^Đã lưu/ };
  await nav.getByRole('button', { name: labels[destination] }).click();
}

(async () => {
  await fs.mkdir(artifactDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const context = await browser.newContext({ baseURL, acceptDownloads: true });
    context.on('page', (page) => {
      page.on('pageerror', (error) => browserErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') browserErrors.push(message.text());
      });
    });
    const resourceResponse = await context.request.get('/api/resources');
    assert.equal(resourceResponse.status(), 200);
    const { resources } = await resourceResponse.json();
    assert.ok(resources.length >= 4, 'Library must cover the film production stages.');

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'tablet', width: 820, height: 1180 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'mobile-small', width: 360, height: 800 },
    ]) {
      const page = await context.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await ready(page);
      assert.equal(await page.locator('.resource-card').count(), resources.length);
      for (const image of await page.locator('main img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((element) => element.decode());
        assert.ok(await image.evaluate((element) => element.complete && element.naturalWidth > 0),
          `${viewport.name}: image must load`);
      }
      await noOverflow(page, `${viewport.name} library`);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(artifactDir, `${viewport.name}.png`), fullPage: true, animations: 'disabled' });

      await page.getByRole('group', { name: 'Lọc theo chủ đề' }).getByRole('button', { name: 'Video', exact: true }).click();
      assert.equal(await page.locator('.resource-card').count(), resources.filter((item) => item.category === 'Video').length);
      await page.getByRole('group', { name: 'Lọc theo chủ đề' }).getByRole('button', { name: 'Tất cả', exact: true }).click();
      const format = page.getByRole('combobox', { name: 'Loại tài nguyên' });
      if (await format.isVisible()) {
        await format.selectOption('workflow');
        assert.equal(await page.locator('.resource-card').count(), resources.filter((item) => item.type === 'workflow').length);
        await format.selectOption('all');
      }
      await page.getByRole('searchbox', { name: 'Tìm kiếm tài nguyên' }).fill('kich ban');
      assert.ok(await page.locator('.resource-card').count() > 0, 'Search accepts Vietnamese without accents.');
      await page.getByRole('searchbox', { name: 'Tìm kiếm tài nguyên' }).fill('missing-resource-xyz');
      assert.equal(await page.locator('.resource-card').count(), 0);
      await page.getByRole('button', { name: /Xóa tìm kiếm/ }).click();

      await navigate(page, 'roadmap');
      assert.equal(await page.locator('.roadmap-stage').count(), 4);
      await noOverflow(page, `${viewport.name} roadmap`);
      await page.locator('.stage-resources button').first().click();
      await page.getByRole('dialog').waitFor();
      await page.locator('.df-resource-article').waitFor();
      await noOverflow(page, `${viewport.name} resource dialog`);
      if (viewport.name === 'mobile') {
        await page.screenshot({ path: path.join(artifactDir, 'mobile-resource.png'), animations: 'disabled' });
      }
      assert.ok(new URL(page.url()).searchParams.get('resource'), 'Opening resource gives a shareable URL.');
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(new URL(page.url()).searchParams.get('resource'), null);
      if (await page.getByRole('button', { name: 'Mở menu', exact: true }).isVisible()) {
        await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
        assert.ok(await page.locator('.sidebar').isVisible());
        await page.locator('.sidebar').getByRole('button', { name: 'Đóng menu', exact: true }).click();
      }
      await page.close();
      console.log(`PASS ${viewport.name}: images, filters, search, roadmap, resource dialog, overflow`);
    }

    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await ready(page);
    const firstCard = page.locator('.resource-card').first();
    const title = await firstCard.locator('h3').innerText();
    await firstCard.locator('.save-button').click();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.resource-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).locator('.save-button').getAttribute('aria-pressed'), 'true');
    await navigate(page, 'saved');
    assert.equal(await page.locator('.resource-card').count(), 1);
    await page.locator('.resource-card .save-button').click();
    assert.equal(await page.locator('.resource-card').count(), 0);
    console.log('PASS saving persists across reload; saved collection removes entries');

    const sample = resources.find((item) => item.freeDownloads?.length && item.premiumDownloads?.length);
    assert.ok(sample, 'Need a sample with both free and premium downloads.');
    await page.goto(`${baseURL}/?resource=${encodeURIComponent(sample.id)}`, { waitUntil: 'networkidle' });
    await page.getByRole('dialog', { name: sample.title }).waitFor();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.df-download-group a').first().click();
    const download = await downloadPromise;
    const file = path.join(artifactDir, 'free-download-' + path.basename(download.suggestedFilename()));
    await download.saveAs(file);
    const content = await fs.readFile(file, 'utf8');
    assert.ok(content.length > 500 && /<!doctype html|<html|shot|workflow/i.test(content), 'Free download contains actual practice content.');
    assert.equal((await context.request.get(`/api/downloads/${sample.id}/premium/0`)).status(), 401);
    await page.keyboard.press('Escape');
    console.log('PASS direct resource URL, real free download, guest premium access denied');

    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Tên của bạn' }).fill(testIdentity);
    await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
    await dialog.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await dialog.getByRole('button', { name: 'Tạo tài khoản miễn phí', exact: true }).click();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
    let session = await (await context.request.get('/api/session')).json();
    assert.equal(session.user.email, email);
    assert.equal(session.user.isMember, false);
    assert.equal((await context.request.get(`/api/downloads/${sample.id}/premium/0`)).status(), 403);
    console.log(`PASS registration; synthetic test account ${email}`);

    await page.locator('.club-nav').click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Nhận thông báo mở cửa', exact: true }).click();
    await dialog.getByRole('status').filter({ hasText: 'Đã lưu đăng ký quan tâm' }).waitFor();
    assert.equal((await context.request.post('/api/membership/interest', { data: {} })).status(), 200);
    assert.equal((await context.request.post('/api/membership/interest', { data: {} })).status(), 200);
    assert.equal((await (await context.request.get('/api/membership/config')).json()).interested, true);
    session = await (await context.request.get('/api/session')).json();
    assert.equal(session.user.isMember, false, 'Interest must not activate a paid membership.');
    assert.equal((await context.request.get(`/api/downloads/${sample.id}/premium/0`)).status(), 403);
    await page.keyboard.press('Escape');
    await page.locator('.club-nav').click();
    await page.getByRole('dialog').getByRole('status').filter({ hasText: 'Đã lưu đăng ký quan tâm' }).waitFor();
    await page.keyboard.press('Escape');
    console.log('PASS membership interest persists, is idempotent, and does not grant premium access');

    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor();
    assert.equal((await (await context.request.get('/api/session')).json()).user, null);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
    await dialog.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await dialog.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
    assert.equal((await (await context.request.get('/api/session')).json()).user.email, email);
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor();
    console.log('PASS logout and login');

    assert.deepEqual(browserErrors, [], 'No browser runtime or console errors.');
    console.log(`PASS browser smoke. Screenshots and download saved in ${artifactDir}`);
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
