import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp, createAdmin } from '../server/index.mjs';

async function fixture(t, env = {}, withDist = false) {
  const root = mkdtempSync(path.join(tmpdir(), 'f5ai-backend-'));
  if (withDist) {
    mkdirSync(path.join(root, 'dist', 'assets'), { recursive: true });
    writeFileSync(path.join(root, 'dist', 'index.html'), '<!doctype html><div id="root"></div>');
    writeFileSync(path.join(root, 'dist', 'assets', 'app-abc123.js'), 'console.log(1)');
  }
  const contentPath = path.join(root, 'content.json');
  const assetsPath = path.join(root, 'assets');
  mkdirSync(path.join(assetsPath, 'free'), { recursive: true });
  mkdirSync(path.join(assetsPath, 'premium'), { recursive: true });
  writeFileSync(path.join(assetsPath, 'free', 'free.html'), '<h1>Free guide</h1>');
  writeFileSync(path.join(assetsPath, 'premium', 'premium.json'), '{"workflow":"premium"}');
  writeFileSync(path.join(root, 'private.txt'), 'private file');
  writeFileSync(contentPath, JSON.stringify([
    { id: 'test', title: 'A useful guide', type: 'workflow', sections: [{ title: 'Full free guide', body: 'Everything needed to start.' }], freeDownloads: [{ name: 'Free guide', file: 'free.html', mime: 'text/html' }], premiumDownloads: [{ name: 'Premium workflow', file: 'premium.json', mime: 'application/json' }] },
    { id: 'unsafe', title: 'Unsafe fixture', freeDownloads: [{ name: 'Outside root', file: '../../private.txt', mime: 'text/plain' }] },
  ]));
  const app = createApp({ dbPath: path.join(root, 'test.sqlite'), contentPath, assetsPath, distPath: path.join(root, 'dist'), env });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    app.locals.close();
    rmSync(root, { recursive: true, force: true });
  });
  const request = async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (options.body) headers['Content-Type'] = 'application/json';
    if (options.cookie) headers.Cookie = options.cookie;
    const response = await fetch(`${base}${endpoint}`, { method: options.method || 'GET', headers, body: options.form || (options.body ? JSON.stringify(options.body) : undefined) });
    const type = response.headers.get('content-type') || '';
    const body = type.includes('application/json') ? await response.json() : await response.text();
    return { status: response.status, body, cookie: response.headers.getSetCookie().at(-1)?.split(';')[0], headers: response.headers };
  };
  return { app, request, root, contentPath, assetsPath, base };
}

const registerBody = { name: 'Người học', email: 'learner@example.com', password: 'long-user-password' };
const bankEnv = { BANK_NAME: 'Test Bank', BANK_ACCOUNT: '123456789', BANK_ACCOUNT_NAME: 'TEST OWNER' };

test('registration persists a hashed password, safe session, and login/logout', async (t) => {
  const { app, request } = await fixture(t);
  const invalid = await request('/api/auth/register', { method: 'POST', body: { ...registerBody, password: 'short' } });
  assert.equal(invalid.status, 400);
  const registered = await request('/api/auth/register', { method: 'POST', body: { ...registerBody, role: 'admin' } });
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.role, 'user');
  assert.equal(registered.body.user.isMember, false);
  const stored = app.locals.db.prepare('SELECT * FROM users WHERE email = ?').get(registerBody.email);
  assert.match(stored.password_hash, /^scrypt:/);
  assert.notEqual(stored.password_hash, registerBody.password);
  assert.equal('password_hash' in registered.body.user, false);
  const sessionCookie = registered.headers.get('set-cookie');
  assert.match(sessionCookie, /HttpOnly/);
  assert.match(sessionCookie, /SameSite=Lax/);
  const session = await request('/api/session', { cookie: registered.cookie });
  assert.equal(session.body.user.email, registerBody.email);
  const duplicate = await request('/api/auth/register', { method: 'POST', body: registerBody });
  assert.equal(duplicate.status, 409);
  const denied = await request('/api/auth/login', { method: 'POST', body: { email: registerBody.email, password: 'incorrect' } });
  assert.equal(denied.status, 401);
  const login = await request('/api/auth/login', { method: 'POST', body: { email: 'LEARNER@example.com', password: registerBody.password } });
  assert.equal(login.status, 200);
  await request('/api/auth/logout', { method: 'POST', cookie: login.cookie });
  const loggedOut = await request('/api/session', { cookie: login.cookie });
  assert.equal(loggedOut.body.user, null);
});

test('free content and files work while premium files remain protected', async (t) => {
  const { request } = await fixture(t);
  const list = await request('/api/resources');
  assert.equal(list.status, 200);
  assert.equal('sections' in list.body.resources[0], false, 'list payload is a summary');
  const detail = await request('/api/resources/test');
  assert.equal(detail.body.resource.sections[0].body, 'Everything needed to start.');
  assert.equal(list.body.resources[0].premiumDownloads[0].url, null);
  assert.equal('file' in list.body.resources[0].freeDownloads[0], false);
  const free = await request('/api/downloads/test/free/0');
  assert.equal(free.status, 200);
  assert.match(free.headers.get('content-disposition'), /attachment/);
  assert.match(free.body, /Free guide/);
  const anonymous = await request('/api/downloads/test/premium/0');
  assert.equal(anonymous.status, 401);
  const account = await request('/api/auth/register', { method: 'POST', body: registerBody });
  const basic = await request('/api/downloads/test/premium/0', { cookie: account.cookie });
  assert.equal(basic.status, 403);
  const traversal = await request('/api/downloads/unsafe/free/0');
  assert.equal(traversal.status, 404);
});

test('unconfigured payments stay unavailable and club interest is real and idempotent', async (t) => {
  const { app, request } = await fixture(t);
  const config = await request('/api/membership/config');
  assert.equal(config.body.paymentConfigured, false);
  assert.equal(config.body.bank, null);
  const configured = await fixture(t, bankEnv);
  const anonymousBank = await configured.request('/api/membership/config');
  assert.equal(anonymousBank.body.paymentConfigured, true);
  assert.equal(anonymousBank.body.bank, null, 'bank details only for signed-in users');
  const account = await request('/api/auth/register', { method: 'POST', body: registerBody });
  const order = await request('/api/membership/orders', { method: 'POST', cookie: account.cookie });
  assert.equal(order.status, 503);
  assert.equal(app.locals.db.prepare('SELECT COUNT(*) AS count FROM membership_orders').get().count, 0);
  const anonymousInterest = await request('/api/membership/interest', { method: 'POST' });
  assert.equal(anonymousInterest.status, 401);
  const first = await request('/api/membership/interest', { method: 'POST', cookie: account.cookie });
  const again = await request('/api/membership/interest', { method: 'POST', cookie: account.cookie });
  assert.equal(first.body.registered, true);
  assert.equal(first.body.createdAt, again.body.createdAt);
  assert.equal(app.locals.db.prepare('SELECT COUNT(*) AS count FROM membership_interests').get().count, 1);
  const ownConfig = await request('/api/membership/config', { cookie: account.cookie });
  assert.equal(ownConfig.body.interested, true);
});

test('membership activates only after admin approval and repeated approval adds no time', async (t) => {
  const { app, request } = await fixture(t, bankEnv);
  const account = await request('/api/auth/register', { method: 'POST', body: registerBody });
  const order = await request('/api/membership/orders', { method: 'POST', cookie: account.cookie });
  assert.equal(order.status, 201);
  assert.equal(order.body.order.amount, 199000);
  assert.equal(order.body.order.status, 'pending');
  assert.equal(order.body.payment.bank.account, bankEnv.BANK_ACCOUNT);
  const duplicate = await request('/api/membership/orders', { method: 'POST', cookie: account.cookie });
  assert.equal(duplicate.body.order.id, order.body.order.id);
  const racer = await request('/api/auth/register', { method: 'POST', body: { ...registerBody, email: 'racer@example.com' } });
  const raced = await Promise.all([1, 2, 3].map(() => request('/api/membership/orders', { method: 'POST', cookie: racer.cookie })));
  assert.equal(new Set(raced.map((item) => item.body.order.id)).size, 1, 'concurrent clicks create one pending order');
  assert.equal(app.locals.db.prepare("SELECT COUNT(*) AS count FROM membership_orders WHERE user_id = ? AND status = 'pending'").get(racer.body.user.id).count, 1);
  const unauthorized = await request(`/api/admin/orders/${order.body.order.id}/approve`, { method: 'POST', cookie: account.cookie });
  assert.equal(unauthorized.status, 403);
  createAdmin(app.locals.db, { F5AI_ADMIN_EMAIL: 'admin@example.com', F5AI_ADMIN_PASSWORD: 'long-admin-password' });
  const admin = await request('/api/auth/login', { method: 'POST', body: { email: 'admin@example.com', password: 'long-admin-password' } });
  const approved = await request(`/api/admin/orders/${order.body.order.id}/approve`, { method: 'POST', cookie: admin.cookie });
  assert.equal(approved.body.user.isMember, true);
  assert.equal(approved.body.order.status, 'approved');
  const repeated = await request(`/api/admin/orders/${order.body.order.id}/approve`, { method: 'POST', cookie: admin.cookie });
  assert.equal(repeated.body.alreadyApproved, true);
  assert.equal(repeated.body.user.memberUntil, approved.body.user.memberUntil);
  const premium = await request('/api/downloads/test/premium/0', { cookie: account.cookie });
  assert.equal(premium.status, 200);
  assert.equal(premium.body.workflow, 'premium');
  const detail = await request('/api/resources/test', { cookie: account.cookie });
  assert.equal(detail.body.resource.premiumDownloads[0].url, '/api/downloads/test/premium/0');
  const otherAccount = await request('/api/auth/register', { method: 'POST', body: { ...registerBody, email: 'second@example.com' } });
  const ownOrders = await request('/api/membership/orders', { cookie: otherAccount.cookie });
  assert.deepEqual(ownOrders.body.orders, []);
  await request('/api/membership/interest', { method: 'POST', cookie: account.cookie });
  const interests = await request('/api/admin/interests', { cookie: admin.cookie });
  assert.equal(interests.body.interests[0].user.email, registerBody.email);
  app.locals.db.prepare('UPDATE users SET member_until = ? WHERE id = ?').run('2020-01-01T00:00:00.000Z', account.body.user.id);
  const expired = await request('/api/downloads/test/premium/0', { cookie: account.cookie });
  assert.equal(expired.status, 403);
});

test('cross-origin writes and abusive login traffic are rejected', async (t) => {
  const { request, base } = await fixture(t);
  const foreign = await request('/api/auth/register', { method: 'POST', headers: { Origin: 'https://attacker.example' }, body: registerBody });
  assert.equal(foreign.status, 403);
  const tlsPreview = await request('/api/auth/logout', { method: 'POST', headers: { Origin: base.replace('http:', 'https:') } });
  assert.equal(tlsPreview.status, 200);
  const owner = await request('/api/auth/register', { method: 'POST', body: registerBody });
  assert.equal(owner.status, 201);
  // Per-account lock: ten wrong passwords for one email block further wrong guesses, but the real owner still signs in.
  for (let index = 0; index < 10; index += 1) {
    const denied = await request('/api/auth/login', { method: 'POST', body: { email: registerBody.email, password: 'wrong-password' } });
    assert.equal(denied.status, 401);
  }
  const lockedEmail = await request('/api/auth/login', { method: 'POST', body: { email: 'LEARNER@example.com', password: 'wrong-password' } });
  assert.equal(lockedEmail.status, 429);
  const ownerLogin = await request('/api/auth/login', { method: 'POST', body: { email: registerBody.email, password: registerBody.password } });
  assert.equal(ownerLogin.status, 200, 'correct password is never locked out by an attacker');
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'other@example.com', password: 'wrong-password' } })).status, 401);
  // Per-IP lock counts failures only: fifty wrong guesses across many emails from one address, then 429.
  let failures = 12;
  for (; failures < 50; failures += 1) {
    const denied = await request('/api/auth/login', { method: 'POST', body: { email: `user${failures}@example.com`, password: 'wrong-password' } });
    assert.equal(denied.status, 401, `failure ${failures}`);
  }
  const limited = await request('/api/auth/login', { method: 'POST', body: { email: 'another@example.com', password: 'wrong-password' } });
  assert.equal(limited.status, 429);
  // Successful logins from that address were never counted, and registrations have their own counter.
  const stillRegisters = await request('/api/auth/register', { method: 'POST', body: { ...registerBody, email: 'fresh@example.com' } });
  assert.equal(stillRegisters.status, 201);
  const crossSite = await request('/api/auth/logout', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(crossSite.status, 403);
});

test('production mode no longer trusts development origins and sends hardened headers', async (t) => {
  const { request } = await fixture(t, { NODE_ENV: 'production', COOKIE_SECURE: 'false', APP_ORIGIN: 'http://localhost:5173' });
  const devOrigin = await request('/api/auth/register', { method: 'POST', headers: { Origin: 'http://localhost:5173' }, body: registerBody });
  assert.equal(devOrigin.status, 403, 'an http APP_ORIGIN copied from .env.example is ignored in production');
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body.checks, { database: 'ok', uploads: 'ok' });
  assert.match(health.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(health.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(health.headers.get('x-frame-options'), 'DENY');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal(health.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(health.headers.get('strict-transport-security'), null, 'HSTS only over TLS or with an https APP_ORIGIN');
  const proxied = await fixture(t, { NODE_ENV: 'production', COOKIE_SECURE: 'off', APP_ORIGIN: 'https://studio.example', TRUST_PROXY: 'true' });
  assert.match((await proxied.request('/api/health')).headers.get('strict-transport-security'), /max-age=/);
  assert.throws(() => createApp({ dbPath: ':memory:', env: { COOKIE_SECURE: 'maybe' } }), /COOKIE_SECURE/);
  const registered = await request('/api/auth/register', { method: 'POST', body: registerBody });
  assert.equal(registered.status, 201);
  assert.doesNotMatch(registered.headers.get('set-cookie'), /Secure/, 'COOKIE_SECURE=false allows plain-HTTP demos');
  const fileResponse = await request('/api/downloads/test/free/0');
  assert.match(fileResponse.headers.get('content-disposition'), /filename="Free guide.html"/);
  assert.equal(fileResponse.headers.get('cache-control'), 'no-store');
});

test('plan price and duration come from configuration', async (t) => {
  const { request } = await fixture(t, { ...bankEnv, PLAN_PRICE: '149000', PLAN_DAYS: '45' });
  const config = await request('/api/membership/config');
  assert.equal(config.body.price, 149000);
  assert.equal(config.body.durationDays, 45);
  const account = await request('/api/auth/register', { method: 'POST', body: registerBody });
  const order = await request('/api/membership/orders', { method: 'POST', cookie: account.cookie });
  assert.equal(order.body.order.amount, 149000);
  assert.equal(order.body.order.durationDays, 45);
  const broken = await fixture(t, { PLAN_PRICE: 'free' });
  assert.equal((await broken.request('/api/membership/config')).body.price, 199000);
});

test('production build is served with long-lived hashed assets and a revalidated shell', async (t) => {
  const { request } = await fixture(t, {}, true);
  const shell = await request('/lo-trinh');
  assert.equal(shell.status, 200);
  assert.match(shell.body, /<div id="root">/);
  assert.equal(shell.headers.get('cache-control'), 'no-cache');
  const asset = await request('/assets/app-abc123.js');
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  const index = await request('/index.html');
  assert.equal(index.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  assert.equal((await request('/missing-file.png')).status, 404);
  assert.equal((await request('/api/unknown')).status, 404);
});

test('admin bootstrap requires explicit secure configuration', async (t) => {
  const { app } = await fixture(t);
  assert.throws(() => createAdmin(app.locals.db, {}), /Configure F5AI_ADMIN_EMAIL/);
  assert.equal(app.locals.db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count, 0);
});

async function loginAdmin(app, request) {
  createAdmin(app.locals.db, { F5AI_ADMIN_EMAIL: 'admin@example.com', F5AI_ADMIN_PASSWORD: 'long-admin-password' });
  const result = await request('/api/auth/login', { method: 'POST', body: { email: 'admin@example.com', password: 'long-admin-password' } });
  return result.cookie;
}

test('admin authoring creates, edits and persistently hides seed resources without rewriting seed files', async (t) => {
  const { app, request, root, contentPath, assetsPath } = await fixture(t);
  const original = readFileSync(contentPath, 'utf8');
  const anonymous = await request('/api/admin/resources');
  assert.equal(anonymous.status, 401);
  const account = await request('/api/auth/register', { method: 'POST', body: registerBody });
  const denied = await request('/api/admin/resources', { cookie: account.cookie });
  assert.equal(denied.status, 403);
  const adminCookie = await loginAdmin(app, request);
  const authoring = await request('/api/admin/resources', { cookie: adminCookie });
  assert.equal(authoring.body.resources[0].freeDownloads[0].file, 'free.html');
  const created = await request('/api/admin/resources', { method: 'POST', cookie: adminCookie, body: { resource: { title: 'Tài nguyên của tác giả', type: 'guide', sections: [{ title: 'Bước 1', body: 'Bắt đầu ở đây.' }] } } });
  assert.equal(created.status, 201);
  assert.match(created.body.resource.id, /^tai-nguyen-cua-tac-gia-/);
  const duplicate = await request('/api/admin/resources', { method: 'POST', cookie: adminCookie, body: { resource: created.body.resource } });
  assert.equal(duplicate.status, 409);
  const updated = await request('/api/admin/resources/test', { method: 'PUT', cookie: adminCookie, body: { resource: { title: 'Updated seed guide', sections: [{ title: 'Full guide', body: 'An edited lesson.' }] } } });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.resource.freeDownloads[0].file, 'free.html');
  const detail = await request('/api/resources/test');
  assert.equal(detail.body.resource.title, 'Updated seed guide');
  for (const resource of [
    { title: 'Unsafe URL', videoUrl: 'javascript:alert(1)' },
    { title: 'Plain HTTP image', image: 'http://example.com/cover.png' },
    { title: 'Wrong category', category: 'invalid' },
    { title: 'Unsafe file', freeDownloads: [{ name: 'Private', file: '../../private.txt' }] },
  ]) {
    const invalid = await request('/api/admin/resources', { method: 'POST', cookie: adminCookie, body: { resource } });
    assert.equal(invalid.status, 400);
  }
  const deleted = await request('/api/admin/resources/test', { method: 'DELETE', cookie: adminCookie });
  assert.equal(deleted.body.deleted, true);
  assert.equal((await request('/api/resources/test')).status, 404);
  assert.equal(readFileSync(contentPath, 'utf8'), original);
  const reopened = createApp({ dbPath: path.join(root, 'test.sqlite'), contentPath, assetsPath, distPath: path.join(root, 'dist'), env: {} });
  const secondServer = reopened.listen(0, '127.0.0.1');
  await once(secondServer, 'listening');
  try {
    const persisted = await fetch(`http://127.0.0.1:${secondServer.address().port}/api/resources`);
    const data = await persisted.json();
    assert.equal(data.resources.some((resource) => resource.id === 'test'), false);
    assert.equal(data.resources.some((resource) => resource.id === created.body.resource.id), true);
  } finally {
    await new Promise((resolve) => secondServer.close(resolve));
    reopened.locals.close();
  }
});

test('admin uploads become gated downloads and range-enabled free/premium videos', async (t) => {
  const { app, request, root } = await fixture(t);
  const adminCookie = await loginAdmin(app, request);
  const account = await request('/api/auth/register', { method: 'POST', body: registerBody });
  const form = (name, content = 'Example file', mime = 'application/octet-stream') => {
    const data = new FormData();
    data.append('file', new Blob([Buffer.isBuffer(content) ? new Uint8Array(content) : content], { type: mime }), name);
    return data;
  };
  const anonymousUpload = await request('/api/admin/uploads?tier=free', { method: 'POST', form: form('guide.html') });
  assert.equal(anonymousUpload.status, 401);
  const deniedUpload = await request('/api/admin/uploads?tier=free', { method: 'POST', cookie: account.cookie, form: form('guide.html') });
  assert.equal(deniedUpload.status, 403);
  const unsupported = await request('/api/admin/uploads?tier=free', { method: 'POST', cookie: adminCookie, form: form('bad.exe') });
  assert.equal(unsupported.status, 400);
  const wrongTier = await request('/api/admin/uploads?tier=../../outside', { method: 'POST', cookie: adminCookie, form: form('guide.html') });
  assert.equal(wrongTier.status, 400);
  const uploaded = await request('/api/admin/uploads?tier=free', { method: 'POST', cookie: adminCookie, form: form('guide.html', '<h1>Uploaded guide</h1>', 'text/html') });
  assert.equal(uploaded.status, 201);
  assert.match(uploaded.body.file, /^upload-[a-f0-9-]+\.html$/);
  assert.equal(uploaded.body.mime, 'text/html');
  // A renamed text file must not pass as a video; real container signatures do.
  const disguised = await request('/api/admin/uploads?tier=free', { method: 'POST', cookie: adminCookie, form: form('preview.mp4', '0123456789') });
  assert.equal(disguised.status, 400);
  assert.equal(readdirSync(path.join(root, 'uploads', 'free')).filter((name) => name.endsWith('.mp4')).length, 0, 'rejected upload is removed from disk');
  const mp4Bytes = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.from('0123456789')]);
  const webmBytes = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('abcdefghij')]);
  const freeVideo = await request('/api/admin/uploads?tier=free', { method: 'POST', cookie: adminCookie, form: form('preview.mp4', mp4Bytes) });
  assert.equal(freeVideo.status, 201);
  const premiumVideo = await request('/api/admin/uploads?tier=premium', { method: 'POST', cookie: adminCookie, form: form('full.webm', webmBytes) });
  assert.equal(premiumVideo.status, 201);
  const fakeHtml = await request('/api/admin/uploads?tier=free', { method: 'POST', cookie: adminCookie, form: form('page.html', Buffer.from([0x4d, 0x5a, 0, 0, 1, 2])) });
  assert.equal(fakeHtml.status, 400);
  const created = await request('/api/admin/resources', { method: 'POST', cookie: adminCookie, body: { resource: {
    id: 'uploaded', title: 'Lesson with video', type: 'video',
    freeDownloads: [{ name: 'Uploaded guide', file: uploaded.body.file }],
    freeVideoFile: freeVideo.body.file, premiumVideoFile: premiumVideo.body.file,
  } } });
  assert.equal(created.status, 201);
  const freeDownload = await request('/api/downloads/uploaded/free/0');
  assert.equal(freeDownload.status, 200);
  assert.match(freeDownload.body, /Uploaded guide/);
  const publicDetail = await request('/api/resources/uploaded');
  assert.equal(publicDetail.body.resource.videoUrl, '/api/videos/uploaded/free');
  assert.equal(publicDetail.body.resource.premiumVideoAvailable, true);
  assert.equal(publicDetail.body.resource.premiumVideoUrl, null);
  const freeRange = await request('/api/videos/uploaded/free', { headers: { Range: 'bytes=12-15' } });
  assert.equal(freeRange.status, 206);
  assert.equal(freeRange.body, '0123');
  assert.equal((await request('/api/videos/uploaded/premium')).status, 401);
  assert.equal((await request('/api/videos/uploaded/premium', { cookie: account.cookie })).status, 403);
  const memberVideo = await request('/api/videos/uploaded/premium', { cookie: adminCookie });
  assert.equal(memberVideo.status, 200);
  assert.equal(memberVideo.body.slice(-10), 'abcdefghij');
  assert.equal(memberVideo.headers.get('cache-control'), 'private, no-store');
  const mismatchedTier = await request('/api/admin/resources', { method: 'POST', cookie: adminCookie, body: { resource: { title: 'Wrong tier', freeVideoFile: premiumVideo.body.file } } });
  assert.equal(mismatchedTier.status, 400);
  const uploadedPath = path.join(root, 'uploads', 'free', uploaded.body.file);
  unlinkSync(uploadedPath);
  try {
    symlinkSync(path.join(root, 'private.txt'), uploadedPath);
  } catch (error) {
    if (error.code !== 'EPERM') throw error;
    // Windows without Developer Mode cannot create symlinks; the server-side check still runs on other platforms.
    writeFileSync(uploadedPath, 'placeholder');
    return;
  }
  assert.equal((await request('/api/downloads/uploaded/free/0')).status, 404);
});
