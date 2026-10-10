/* Isolated CMS + membership browser test. Run after `npm run build`.
 * All accounts, payment details, uploaded files and SQLite data are test fixtures.
 * No payment is sent and the development database is never opened.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { once } = require('node:events');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const artifactDir = path.resolve(__dirname, '..', '.playwright');
const articleTitle = 'Kiểm thử: sản xuất phim AI';
const editedTitle = `${articleTitle} — đã cập nhật`;
const testPassword = crypto.randomBytes(20).toString('base64url');
const adminEmail = 'admin-browser@example.test';
const memberEmail = 'member-browser@example.test';
const errors = [];

async function login(page, email) {
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await dialog.getByLabel('Mật khẩu', { exact: true }).fill(testPassword);
  await dialog.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
}

async function register(page) {
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Tên của bạn' }).fill('Thành viên kiểm thử');
  await dialog.getByRole('textbox', { name: 'Email', exact: true }).fill(memberEmail);
  await dialog.getByLabel('Mật khẩu', { exact: true }).fill(testPassword);
  await dialog.getByRole('button', { name: 'Tạo tài khoản miễn phí', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
}

async function uploadHtml(editor, tier) {
  const files = editor.locator('.df-cms-files').filter({ has: editor.page().getByRole('heading', { name: tier === 'free' ? 'File miễn phí' : 'File cao cấp', exact: true }) });
  await files.locator('input[type=file]').setInputFiles({
    name: `${tier}-practice.html`,
    mimeType: 'text/html',
    buffer: Buffer.from(`<!doctype html><html lang="vi"><meta charset="utf-8"><title>Practice fixture</title><h1>${tier.toUpperCase()}_PRACTICE_CONTENT</h1><p>Hướng dẫn thực hành kiểm thử từ đầu đến cuối.</p></html>`),
  });
  await files.locator('.df-cms-file').waitFor();
}

async function downloadContains(page, link, marker) {
  const pending = page.waitForEvent('download');
  await link.click();
  const download = await pending;
  const content = await fs.readFile(await download.path(), 'utf8');
  assert.ok(content.includes(marker), `Downloaded file contains ${marker}`);
}

async function videoPlays(video) {
  await video.waitFor();
  await video.evaluate((element) => new Promise((resolve, reject) => {
    if (element.readyState >= 1) return resolve();
    element.addEventListener('loadedmetadata', resolve, { once: true });
    element.addEventListener('error', () => reject(new Error('Uploaded video failed to load')), { once: true });
  }));
  const duration = await video.evaluate((element) => element.duration);
  assert.ok(Number.isFinite(duration) && duration >= 0.9 && duration <= 1.3, 'Video metadata has actual one-second content.');
  await video.evaluate((element) => element.play());
  await video.page().waitForFunction((selector) => document.querySelector(selector)?.currentTime > 0.1, await video.evaluate((element) => {
    element.dataset.browserSmokeVideo = 'active';
    return '[data-browser-smoke-video="active"]';
  }));
  await video.evaluate((element) => { element.pause(); delete element.dataset.browserSmokeVideo; });
}

(async () => {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'f5ai-admin-browser-'));
  let browser, server, app;
  try {
    const { createApp, createAdmin } = await import('../server/index.mjs');
    const env = {
      NODE_ENV: 'test',
      BANK_NAME: 'TEST BANK — FIXTURE ONLY',
      BANK_ACCOUNT: '000000000',
      BANK_ACCOUNT_NAME: 'TEST FIXTURE OWNER',
    };
    app = createApp({ dbPath: path.join(fixtureRoot, 'test.sqlite'), uploadsPath: path.join(fixtureRoot, 'uploads'), env });
    createAdmin(app.locals.db, { F5AI_ADMIN_EMAIL: adminEmail, F5AI_ADMIN_PASSWORD: testPassword });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const baseURL = `http://127.0.0.1:${server.address().port}`;
    const videoPath = path.join(fixtureRoot, 'one-second.mp4');
    let hasVideo = false;
    try {
      execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=128x72:rate=24', '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', videoPath]);
      hasVideo = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      console.log('SKIP video fixture: ffmpeg is unavailable');
    }
    await fs.mkdir(artifactDir, { recursive: true });
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const observe = (context) => context.on('page', (page) => {
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    });
    const adminContext = await browser.newContext({ baseURL, acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
    const guestContext = await browser.newContext({ baseURL, acceptDownloads: true, viewport: { width: 390, height: 844 } });
    const memberContext = await browser.newContext({ baseURL, acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
    [adminContext, guestContext, memberContext].forEach(observe);
    const admin = await adminContext.newPage();
    await admin.goto(baseURL, { waitUntil: 'networkidle' });
    await login(admin, adminEmail);
    await admin.getByRole('button', { name: 'Quản lý Studio', exact: true }).click();
    const adminDialog = admin.getByRole('dialog', { name: 'Quản lý Studio', exact: true });
    await adminDialog.getByRole('button', { name: 'Tài nguyên', exact: true }).click();
    await adminDialog.getByRole('button', { name: 'Thêm tài nguyên', exact: true }).click();
    const editor = adminDialog.locator('.df-cms-editor');
    await editor.getByRole('textbox', { name: 'Tiêu đề', exact: true }).fill(articleTitle);
    await editor.getByRole('textbox', { name: 'Mô tả ngắn', exact: true }).fill('Bài kiểm thử hướng dẫn trọn quy trình sản xuất phim AI 3 phút.');
    await editor.getByRole('combobox', { name: 'Loại tài nguyên', exact: true }).selectOption('video');
    await editor.getByRole('combobox', { name: 'Chủ đề', exact: true }).selectOption('Video');
    await editor.getByRole('spinbutton', { name: 'Vị trí trong lộ trình', exact: true }).fill('9');
    await editor.getByRole('textbox', { name: 'Tiêu đề phần', exact: true }).fill('Chuẩn bị và làm bản cơ bản');
    await editor.getByRole('textbox', { name: 'Hướng dẫn', exact: true }).fill('Tạo ý tưởng, kịch bản, nhân vật, môi trường và shotlist. Tải file cơ bản để thực hành đầy đủ.');
    await editor.getByRole('button', { name: 'Thêm phần hướng dẫn', exact: true }).click();
    await editor.getByRole('textbox', { name: 'Tiêu đề phần', exact: true }).nth(1).fill('Hoàn thiện và xuất bản');
    await editor.getByRole('textbox', { name: 'Hướng dẫn', exact: true }).nth(1).fill('Ghép cảnh, kiểm tra âm thanh và phụ đề, rồi xuất phim H.264 dài 3 phút.');
    await editor.getByRole('textbox', { name: 'Lợi ích của bản cao cấp', exact: true }).fill('Workflow cao cấp giảm thao tác lặp và tự động hóa quy trình.');
    await uploadHtml(editor, 'free');
    await uploadHtml(editor, 'premium');
    if (hasVideo) {
      for (const [tier, heading] of [['free', 'Video miễn phí / phần xem trước'], ['premium', 'Video đầy đủ dành cho thành viên']]) {
        const video = editor.locator('.df-cms-video').filter({ has: admin.getByRole('heading', { name: heading, exact: true }) });
        await video.locator('input[type=file]').setInputFiles(videoPath);
        await video.getByText(`Đã đính kèm video ${tier === 'free' ? 'miễn phí' : 'cao cấp'}`, { exact: true }).waitFor();
      }
    }
    const createdResponse = admin.waitForResponse((response) => response.url().endsWith('/api/admin/resources') && response.request().method() === 'POST');
    await editor.getByRole('button', { name: 'Đăng tài nguyên', exact: true }).click();
    const created = await createdResponse;
    assert.equal(created.status(), 201);
    const { resource } = await created.json();
    const resourceId = resource.id;
    await adminDialog.getByRole('status').filter({ hasText: 'Đã đăng' }).waitFor();
    await adminDialog.evaluate((element) => { element.scrollTop = 0; });
    await admin.screenshot({ path: path.join(artifactDir, 'admin-desktop.png'), animations: 'disabled' });
    await admin.setViewportSize({ width: 390, height: 844 });
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth), 390, 'Admin modal fits mobile.');
    assert.ok(await adminDialog.evaluate((element) => element.scrollWidth <= element.clientWidth), 'Admin dialog has no inner horizontal overflow.');
    await adminDialog.evaluate((element) => { element.scrollTop = 0; });
    await admin.screenshot({ path: path.join(artifactDir, 'admin-mobile.png'), animations: 'disabled' });
    await admin.setViewportSize({ width: 1440, height: 1000 });
    console.log(`PASS CMS: published article, two sections, free/premium HTML uploads${hasVideo ? ', free/premium MP4 uploads' : ''}; admin fits mobile`);

    const guest = await guestContext.newPage();
    await guest.goto(baseURL, { waitUntil: 'networkidle' });
    await guest.getByRole('searchbox', { name: 'Tìm kiếm tài nguyên' }).fill(articleTitle);
    assert.equal(await guest.locator('.resource-card').count(), 1);
    await guest.locator('.card-title').click();
    const publicDialog = guest.getByRole('dialog', { name: articleTitle, exact: true });
    await publicDialog.locator('.df-guide-section').last().waitFor();
    assert.equal(await publicDialog.locator('.df-guide-section').count(), 2);
    await downloadContains(guest, publicDialog.locator('.df-download-group a').first(), 'FREE_PRACTICE_CONTENT');
    assert.equal((await guestContext.request.get(`/api/downloads/${resourceId}/premium/0`)).status(), 401);
    assert.equal((await guestContext.request.get(`/api/videos/${resourceId}/premium`)).status(), 401);
    if (hasVideo) {
      assert.equal(await publicDialog.locator('.df-locked-video').count(), 1);
      await videoPlays(publicDialog.locator('video'));
    }
    console.log('PASS public resource: discoverable article, sections, real free download, preview playback, protected premium assets');

    const member = await memberContext.newPage();
    await member.goto(baseURL, { waitUntil: 'networkidle' });
    await register(member);
    await member.locator('.club-nav').click();
    const membershipDialog = member.getByRole('dialog');
    const orderResponse = member.waitForResponse((response) => response.url().endsWith('/api/membership/orders') && response.request().method() === 'POST');
    await membershipDialog.getByRole('button', { name: 'Tạo yêu cầu tham gia', exact: true }).click();
    const orderResult = await orderResponse;
    assert.equal(orderResult.status(), 201);
    const { order } = await orderResult.json();
    await membershipDialog.getByRole('heading', { name: 'Thông tin chuyển khoản', exact: true }).waitFor();
    assert.ok((await membershipDialog.innerText()).includes('TEST BANK — FIXTURE ONLY'));
    assert.equal((await memberContext.request.get(`/api/downloads/${resourceId}/premium/0`)).status(), 403);
    assert.equal((await memberContext.request.get(`/api/videos/${resourceId}/premium`)).status(), 403);
    await adminDialog.getByRole('button', { name: 'Thành viên & thanh toán', exact: true }).click();
    await adminDialog.getByRole('button', { name: 'Làm mới', exact: true }).click();
    const orderCard = adminDialog.locator('.df-admin-order').filter({ hasText: order.reference });
    await orderCard.getByRole('button', { name: 'Xác nhận chuyển khoản', exact: true }).click();
    await orderCard.getByRole('button', { name: 'Đã nhận, mở quyền', exact: true }).click();
    await adminDialog.getByRole('status').filter({ hasText: `Đã xác nhận ${order.reference}` }).waitFor();
    await membershipDialog.getByRole('button', { name: 'Kiểm tra trạng thái thanh toán', exact: true }).click();
    await membershipDialog.getByRole('heading', { name: 'Bạn đang là thành viên câu lạc bộ.', exact: true }).waitFor();
    const session = await (await memberContext.request.get('/api/session')).json();
    assert.equal(session.user.isMember, true);
    await member.keyboard.press('Escape');
    await member.goto(`${baseURL}/?resource=${resourceId}`, { waitUntil: 'networkidle' });
    const premiumDialog = member.getByRole('dialog', { name: articleTitle, exact: true });
    await premiumDialog.locator('.df-premium-downloads a').waitFor();
    await downloadContains(member, premiumDialog.locator('.df-premium-downloads a').first(), 'PREMIUM_PRACTICE_CONTENT');
    if (hasVideo) await videoPlays(premiumDialog.locator('.df-premium-video video'));
    console.log('PASS membership: test transfer request, explicit admin approval, refreshed paid membership, real premium HTML download and full-video playback');

    await adminDialog.getByRole('button', { name: 'Tài nguyên', exact: true }).click();
    await adminDialog.getByRole('button', { name: `Sửa ${articleTitle}`, exact: true }).click();
    await editor.getByRole('textbox', { name: 'Tiêu đề', exact: true }).fill(editedTitle);
    await editor.getByRole('textbox', { name: 'Hướng dẫn', exact: true }).first().fill('Nội dung hướng dẫn cập nhật đã được lưu bền vững.');
    await editor.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await adminDialog.getByRole('status').filter({ hasText: 'Đã cập nhật' }).waitFor();
    await guest.reload({ waitUntil: 'networkidle' });
    await guest.getByRole('dialog', { name: editedTitle, exact: true }).waitFor();
    await guest.getByText('Nội dung hướng dẫn cập nhật đã được lưu bền vững.', { exact: true }).waitFor();
    await adminDialog.getByRole('button', { name: `Gỡ ${editedTitle}`, exact: true }).click();
    const resourceRow = adminDialog.locator('.df-cms-resource').filter({ hasText: editedTitle });
    await resourceRow.getByRole('button', { name: 'Gỡ tài nguyên', exact: true }).click();
    await adminDialog.getByRole('status').filter({ hasText: 'Đã gỡ' }).waitFor();
    assert.equal((await guestContext.request.get(`/api/resources/${resourceId}`)).status(), 404);
    assert.equal((await guestContext.request.get(`/api/downloads/${resourceId}/free/0`)).status(), 404);
    assert.equal((await memberContext.request.get(`/api/downloads/${resourceId}/premium/0`)).status(), 404);
    assert.equal(app.locals.db.prepare('SELECT deleted FROM resource_entries WHERE id = ?').get(resourceId).deleted, 1);
    await guest.goto(baseURL, { waitUntil: 'networkidle' });
    await guest.getByRole('searchbox', { name: 'Tìm kiếm tài nguyên' }).fill(editedTitle);
    assert.equal(await guest.locator('.resource-card').count(), 0);
    console.log('PASS CMS: edit persists after reload; confirmed removal hides resource and denies old download links');
    assert.deepEqual(errors, [], 'No browser runtime or console errors.');
    console.log(`PASS isolated admin/browser workflow. SQLite and all fixtures removed; screenshots in ${artifactDir}.`);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    app?.locals.close();
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
