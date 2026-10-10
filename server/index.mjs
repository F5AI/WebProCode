import express from 'express';
import multer from 'multer';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, lstatSync, realpathSync, unlinkSync, statSync, openSync, readSync, closeSync, accessSync, constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, hashPassword, hashPasswordAsync, verifyPasswordAsync, publicUser } from './db.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const SESSION_COOKIE = 'f5ai_session';
const SESSION_DAYS = 7;
const DEFAULT_PLAN_PRICE = 199000;
const DEFAULT_PLAN_DAYS = 30;
const UPLOAD_MAX_BYTES = 100 * 1024 * 1024;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const REGISTRATIONS_PER_IP = 30;
const LOGIN_FAILURES_PER_IP = 50;
const LOGIN_FAILURES_PER_EMAIL = 10;
const LIMITER_MAX_KEYS = 5000;
const FILE_TYPES = {
  '.html': 'text/html', '.md': 'text/markdown', '.csv': 'text/csv', '.srt': 'application/x-subrip',
  '.json': 'application/json', '.pdf': 'application/pdf', '.zip': 'application/zip', '.txt': 'text/plain',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.py': 'text/x-python',
};
const VIDEO_EXTENSIONS = ['.mp4', '.webm'];
const TEXT_EXTENSIONS = ['.html', '.md', '.csv', '.srt', '.json', '.txt', '.py'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: https:",
  "media-src 'self' https: blob:",
  "connect-src 'self'",
].join('; ');

const digest = (value) => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
// Public assets referenced by URL must be HTTPS: the CSP only allows https: for images and media, and the site itself is served over HTTPS.
const isHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
};
const booleanEnv = (name, value, fallback) => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`${name} must be 1/0, true/false, yes/no or on/off (got "${value}").`);
};
const clientError = (message, status = 400) => Object.assign(new Error(message), { status, expose: true });
const positiveInteger = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

function cookieValue(req) {
  const part = (req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  if (!part) return null;
  try { return decodeURIComponent(part.slice(SESSION_COOKIE.length + 1)); } catch { return null; }
}

function orderPayload(row) {
  return {
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    durationDays: row.duration_days,
    reference: row.reference,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    ...(row.user_name ? { user: { id: row.user_id, name: row.user_name, email: row.user_email } } : {}),
  };
}

// Human-readable attachment name: the display name plus the real extension, never the storage path.
function downloadName(item) {
  const extension = path.extname(item.file).toLowerCase();
  const base = String(item.name || '').replace(/[\x00-\x1f\x7f"\\/:*?<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!base) return path.basename(item.file);
  return base.toLowerCase().endsWith(extension) ? base : `${base}${extension}`;
}

// Cheap content check so an extension cannot disguise another file type. Text formats must look like text.
function matchesExtension(filename, extension) {
  const header = Buffer.alloc(4096);
  const handle = openSync(filename, 'r');
  let length = 0;
  try { length = readSync(handle, header, 0, header.length, 0); } finally { closeSync(handle); }
  const bytes = header.subarray(0, length);
  if (extension === '.mp4') return length >= 12 && bytes.toString('latin1', 4, 8) === 'ftyp';
  if (extension === '.webm') return length >= 4 && bytes.readUInt32BE(0) === 0x1a45dfa3;
  if (extension === '.pdf') return bytes.toString('latin1', 0, 5) === '%PDF-';
  if (extension === '.zip') return length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2]);
  if (TEXT_EXTENSIONS.includes(extension)) return !bytes.includes(0);
  return false;
}

// Fixed-window counter per key, kept in memory. Good enough for one instance; see TECHNICAL.md for scaling.
function createLimiter(limit) {
  const records = new Map();
  const sweep = (time) => { for (const [key, value] of records) if (value.until <= time) records.delete(key); };
  const record = (key, time) => {
    const previous = records.get(key);
    const current = previous && time < previous.until ? previous : { count: 0, until: time + RATE_WINDOW_MS };
    records.set(key, current);
    if (records.size > LIMITER_MAX_KEYS) sweep(time);
    while (records.size > LIMITER_MAX_KEYS) records.delete(records.keys().next().value);
    return current;
  };
  return {
    blocked: (key) => { const entry = records.get(key); return Boolean(entry && Date.now() < entry.until && entry.count >= limit); },
    hit: (key) => { const time = Date.now(); const entry = record(key, time); entry.count += 1; return entry.count > limit; },
    clear: (key) => records.delete(key),
  };
}

export function createApp(options = {}) {
  const env = options.env || process.env;
  const production = env.NODE_ENV === 'production';
  const secureCookies = booleanEnv('COOKIE_SECURE', env.COOKIE_SECURE, production);
  const trustProxy = booleanEnv('TRUST_PROXY', env.TRUST_PROXY, false);
  const appOrigin = String(env.APP_ORIGIN || '').trim();
  const httpsOrigin = appOrigin.startsWith('https://');
  // In production only an HTTPS APP_ORIGIN is trusted; a leftover http://localhost value from .env.example is ignored.
  const trustedAppOrigin = !production || httpsOrigin ? appOrigin : '';
  if (production && appOrigin && !httpsOrigin) console.warn('APP_ORIGIN is not https:// and is ignored in production.');
  if (production && httpsOrigin && !trustProxy) console.warn('APP_ORIGIN is https:// but TRUST_PROXY is off: behind a reverse proxy every visitor shares one IP for rate limiting and HTTPS is not detected.');
  const planPrice = positiveInteger(env.PLAN_PRICE, DEFAULT_PLAN_PRICE);
  const planDays = positiveInteger(env.PLAN_DAYS, DEFAULT_PLAN_DAYS);
  const dbPath = options.dbPath || env.DATABASE_PATH || path.join(directory, '../.data/club.sqlite');
  const db = openDatabase(dbPath);
  const contentPath = options.contentPath || path.join(directory, 'content.json');
  const assetsPath = options.assetsPath || path.join(directory, 'assets');
  const uploadsPath = options.uploadsPath || path.join(dbPath === ':memory:' ? path.join(directory, '../.data') : path.dirname(dbPath), 'uploads');
  for (const tier of ['free', 'premium']) mkdirSync(path.join(uploadsPath, tier), { recursive: true });
  const app = express();
  app.disable('x-powered-by');
  if (trustProxy) app.set('trust proxy', 1);
  app.locals.db = db;
  app.locals.close = () => db.close();

  const statements = {
    session: db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?`),
    overrides: db.prepare('SELECT id, payload, deleted FROM resource_entries'),
    upload: db.prepare('SELECT file FROM uploads WHERE file = ? AND tier = ?'),
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  };

  app.use(express.json({ limit: '2mb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (production && (req.secure || httpsOrigin)) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      const fetchSite = req.headers['sec-fetch-site'];
      // HTTPS preview proxies terminate TLS before forwarding to the Node server, so the same host over https stays valid.
      const allowed = new Set([`${req.protocol}://${req.get('host')}`, `https://${req.get('host')}`, trustedAppOrigin, ...(production ? [] : DEV_ORIGINS)].filter(Boolean));
      if (origin && !allowed.has(origin) || fetchSite === 'cross-site') {
        return res.status(403).json({ error: 'Yêu cầu không hợp lệ. Vui lòng thao tác từ website.' });
      }
    }
    next();
  });
  app.use('/api', (req, res, next) => {
    const token = cookieValue(req);
    req.user = null;
    if (token && token.length < 200) req.user = publicUser(statements.session.get(digest(token), now()));
    next();
  });

  // Registration counts every attempt per IP. Login counts only failures (per IP and per email) so a shared office
  // or proxy address is not locked out by people who simply sign in a lot.
  const registerLimiter = createLimiter(REGISTRATIONS_PER_IP);
  const loginIpLimiter = createLimiter(LOGIN_FAILURES_PER_IP);
  const emailLimiter = createLimiter(LOGIN_FAILURES_PER_EMAIL);
  const tooMany = (res) => res.status(429).json({ error: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
  const registerRateLimit = (req, res, next) => registerLimiter.hit(`${req.ip}:register`) ? tooMany(res) : next();
  const requireUser = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
  const requireAdmin = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Chỉ quản trị viên được thực hiện thao tác này.' });
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' };
  const setSession = (res, userId) => {
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
    const token = randomBytes(32).toString('base64url');
    const maxAge = SESSION_DAYS * 24 * 60 * 60 * 1000;
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(digest(token), userId, new Date(Date.now() + maxAge).toISOString());
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge });
  };
  const dropSession = (req) => {
    const token = cookieValue(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token));
  };
  const clearSession = (req, res) => {
    dropSession(req);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
  };

  // The seed file is parsed once per modification; admin overrides live in SQLite and are merged on each read.
  let seedCache = { mtimeMs: -1, resources: [] };
  const seedResources = () => {
    const mtimeMs = statSync(contentPath).mtimeMs;
    if (mtimeMs !== seedCache.mtimeMs) {
      const parsed = JSON.parse(readFileSync(contentPath, 'utf8'));
      seedCache = { mtimeMs, resources: Array.isArray(parsed) ? parsed : parsed.resources };
    }
    return seedCache.resources;
  };
  // Merged catalogue (seed + overrides) is built once and reused until an admin writes or the seed file changes,
  // so video seeks and download clicks do not re-parse every article.
  let catalogue = null;
  const invalidateCatalogue = () => { catalogue = null; };
  const catalogueMap = () => {
    const seed = seedResources();
    if (catalogue && catalogue.seed === seed) return catalogue.map;
    const map = new Map(seed.map((item) => [item.id, item]));
    for (const row of statements.overrides.all()) {
      if (row.deleted) map.delete(row.id);
      else map.set(row.id, JSON.parse(row.payload));
    }
    catalogue = { seed, map };
    return map;
  };
  const resources = () => [...catalogueMap().values()];
  const findResource = (id) => catalogueMap().get(id) || null;
  const resolveFile = (file, tier) => {
    if (typeof file !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(file)) return null;
    const root = path.resolve(statements.upload.get(file, tier) ? uploadsPath : assetsPath, tier);
    const filename = path.resolve(root, file);
    if (!filename.startsWith(`${root}${path.sep}`) || !existsSync(filename)) return null;
    // Only regular files inside the tier directory are served; symlinks pointing elsewhere are refused.
    const stats = lstatSync(filename);
    if (!stats.isFile() || stats.isSymbolicLink() || !realpathSync(filename).startsWith(`${realpathSync(root)}${path.sep}`)) return null;
    return filename;
  };
  const resourcePayload = (resource, user, { summary = false } = {}) => {
    const allowed = Boolean(user?.isMember);
    const download = (item, tier, index) => ({
      name: item.name,
      mime: item.mime,
      url: tier === 'free' || allowed ? `/api/downloads/${encodeURIComponent(resource.id)}/${tier}/${index}` : null,
      locked: tier === 'premium' && !allowed,
    });
    const hasPremium = Boolean(resource.premiumDownloads?.length || resource.premiumVideoFile);
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      category: resource.category,
      image: resource.image,
      duration: resource.duration,
      level: resource.level,
      author: resource.author || 'F5 AI',
      sections: summary ? undefined : resource.sections || [],
      freeDownloads: (resource.freeDownloads || []).map((item, index) => download(item, 'free', index)),
      premiumDownloads: (resource.premiumDownloads || []).map((item, index) => download(item, 'premium', index)),
      premiumBenefit: resource.premiumBenefit,
      videoUrl: resource.freeVideoFile ? `/api/videos/${encodeURIComponent(resource.id)}/free` : resource.videoUrl || null,
      premiumVideoUrl: resource.premiumVideoFile && allowed ? `/api/videos/${encodeURIComponent(resource.id)}/premium` : null,
      premiumVideoAvailable: Boolean(resource.premiumVideoFile),
      featured: Boolean(resource.featured),
      step: resource.step,
      hasPremium,
      premiumAvailable: allowed,
      isLocked: hasPremium && !allowed,
    };
  };
  const validateResource = (input, existing = null) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw clientError('Dữ liệu tài nguyên không hợp lệ.');
    const value = { ...existing, ...input };
    const string = (field, fallback, max, minimum = 0) => {
      const result = value[field] ?? fallback;
      if (typeof result !== 'string' || result.trim().length < minimum || result.length > max) throw clientError(`Trường ${field} không hợp lệ.`);
      return result.trim();
    };
    const title = string('title', '', 200, 3);
    const generated = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'tai-nguyen';
    const id = existing?.id || value.id || `${generated}-${randomBytes(3).toString('hex')}`;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(id) || existing && value.id !== existing.id) throw clientError('Mã tài nguyên không hợp lệ hoặc đã bị thay đổi.');
    const type = value.type || 'guide';
    const category = value.category || 'Kịch bản';
    if (!['guide', 'video', 'workflow'].includes(type)) throw clientError('Loại tài nguyên không hợp lệ.');
    if (!['Kịch bản', 'Nhân vật', 'Bối cảnh', 'Video', 'Hậu kỳ'].includes(category)) throw clientError('Danh mục không hợp lệ.');
    const image = string('image', '/images/hero.png', 2000);
    const localImage = /^\/images\/[A-Za-z0-9._/-]+$/.test(image) && path.posix.normalize(image) === image;
    if (!localImage && !isHttpsUrl(image)) throw clientError('Ảnh cần dùng đường dẫn /images/ hoặc URL https.');
    const sections = value.sections ?? [];
    if (!Array.isArray(sections) || sections.length > 50 || sections.some((item) => !item || typeof item.title !== 'string' || item.title.length > 200 || typeof item.body !== 'string' || item.body.length > 20000)) throw clientError('Các phần bài viết không hợp lệ.');
    const downloads = (tier) => {
      const items = value[`${tier}Downloads`] ?? [];
      if (!Array.isArray(items) || items.length > 30) throw clientError('Danh sách tệp không hợp lệ.');
      return items.map((item) => {
        if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 200 || !resolveFile(item.file, tier)) throw clientError(`Tệp ${tier} chưa có hoặc không hợp lệ. Hãy tải tệp lên trước.`);
        const mime = FILE_TYPES[path.extname(item.file).toLowerCase()] || 'application/octet-stream';
        return { name: item.name.trim(), file: item.file, mime };
      });
    };
    const videoFile = (field, tier) => {
      const file = value[field];
      if (!file) return null;
      if (typeof file !== 'string' || !VIDEO_EXTENSIONS.includes(path.extname(file).toLowerCase()) || !resolveFile(file, tier)) throw clientError(`Tệp video ${tier} không hợp lệ.`);
      return file;
    };
    const videoUrl = value.videoUrl || null;
    if (videoUrl !== null && (typeof videoUrl !== 'string' || videoUrl.length > 2000 || !isHttpsUrl(videoUrl) && !/^\/api\/videos\/[A-Za-z0-9_-]+\/(free|premium)$/.test(videoUrl))) throw clientError('URL video cần dùng https hoặc video được tải lên website.');
    const step = value.step ?? 1;
    if (!Number.isInteger(step) || step < 1 || step > 99) throw clientError('Bước trong lộ trình cần là số từ 1 đến 99.');
    return {
      id, title, description: string('description', '', 1000), type, category, image,
      duration: string('duration', '10 phút', 100), level: string('level', 'Cơ bản', 100), author: string('author', 'F5 AI', 100),
      sections: sections.map(({ title, body }) => ({ title, body })),
      freeDownloads: downloads('free'), premiumDownloads: downloads('premium'),
      premiumBenefit: string('premiumBenefit', '', 1000), videoUrl,
      freeVideoFile: videoFile('freeVideoFile', 'free'), premiumVideoFile: videoFile('premiumVideoFile', 'premium'),
      featured: Boolean(value.featured), step,
    };
  };
  const saveResource = (resource) => {
    const time = now();
    db.prepare(`INSERT INTO resource_entries (id, payload, deleted, created_at, updated_at) VALUES (?, ?, 0, ?, ?)
      ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, deleted = 0, updated_at = excluded.updated_at`).run(resource.id, JSON.stringify(resource), time, time);
    invalidateCatalogue();
  };
  const config = (user = null) => {
    const bank = {
      name: String(env.BANK_NAME || '').trim(),
      account: String(env.BANK_ACCOUNT || '').trim(),
      accountName: String(env.BANK_ACCOUNT_NAME || '').trim(),
    };
    const paymentConfigured = Object.values(bank).every(Boolean);
    const interest = user ? db.prepare('SELECT created_at FROM membership_interests WHERE user_id = ?').get(user.id) : null;
    // Bank details are shown only to signed-in users, which is when the UI needs them; anonymous scrapers get nothing to phish with.
    return { price: planPrice, currency: 'VND', durationDays: planDays, paymentConfigured, bank: paymentConfigured && user ? bank : null, interested: Boolean(interest) };
  };
  const gatePremium = (req, res, tier, loginMessage, memberMessage) => {
    if (tier !== 'premium') return true;
    if (!req.user) { res.status(401).json({ error: loginMessage }); return false; }
    if (!req.user.isMember) { res.status(403).json({ error: memberMessage }); return false; }
    return true;
  };

  app.get('/api/health', (req, res) => {
    const checks = { database: 'ok', uploads: 'ok' };
    try { db.prepare('SELECT 1').get(); } catch { checks.database = 'error'; }
    try { accessSync(path.join(uploadsPath, 'free'), fsConstants.W_OK); } catch { checks.uploads = 'error'; }
    const healthy = Object.values(checks).every((value) => value === 'ok');
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks });
  });
  app.get('/api/session', (req, res) => res.json({ user: req.user }));
  app.post('/api/auth/register', registerRateLimit, async (req, res) => {
    const { name, email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Vui lòng nhập tên và địa chỉ email hợp lệ.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Mật khẩu cần từ 8 đến 128 ký tự.' });
    const duplicate = () => res.status(409).json({ error: 'Email này đã được đăng ký. Bạn có thể đăng nhập.' });
    if (statements.userByEmail.get(normalizedEmail)) return duplicate();
    const id = randomUUID();
    const passwordHash = await hashPasswordAsync(password);
    try { db.prepare('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(id, name.trim(), normalizedEmail, passwordHash, now()); }
    catch (error) { if (String(error.code).startsWith('SQLITE_CONSTRAINT')) return duplicate(); throw error; }
    setSession(res, id);
    res.status(201).json({ user: publicUser(statements.userById.get(id)) });
  });
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128 || email.length > 254) return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu.' });
    const normalizedEmail = email.trim().toLowerCase();
    const emailKey = `${normalizedEmail}:login`;
    const ipKey = `${req.ip}:login`;
    const user = statements.userByEmail.get(normalizedEmail);
    // Hash even unknown accounts so the response time does not reveal whether an email exists.
    const fallback = 'scrypt:unknown-account:45cce881044281bc2543df955e079d435b9376a637b014c33a099f173f742f53915f239270bb0d4287fae7d5e96e05b8d96a94664b7ffce2e96d741e02757879';
    const verified = await verifyPasswordAsync(password, user?.password_hash || fallback);
    if (!user || !verified) {
      // A locked email or address still gets 429 only for wrong passwords: the real owner with the right password is never shut out.
      const limited = emailLimiter.hit(emailKey) | loginIpLimiter.hit(ipKey);
      return limited ? tooMany(res) : res.status(401).json({ error: 'Email hoặc mật khẩu chưa đúng.' });
    }
    if (loginIpLimiter.blocked(ipKey) && emailLimiter.blocked(emailKey)) return tooMany(res);
    emailLimiter.clear(emailKey);
    dropSession(req);
    setSession(res, user.id);
    res.json({ user: publicUser(user) });
  });
  app.post('/api/auth/logout', (req, res) => { clearSession(req, res); res.json({ user: null }); });

  app.get('/api/resources', (req, res) => res.json({ resources: resources().map((resource) => resourcePayload(resource, req.user, { summary: true })) }));
  app.get('/api/resources/:id', (req, res) => {
    const resource = findResource(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Không tìm thấy tài nguyên này.' });
    res.json({ resource: resourcePayload(resource, req.user) });
  });
  app.get('/api/downloads/:resourceId/:tier/:index', (req, res) => {
    const { resourceId, tier, index } = req.params;
    if (!['free', 'premium'].includes(tier) || !/^\d{1,3}$/.test(index)) return res.status(404).json({ error: 'Không tìm thấy tệp.' });
    if (!gatePremium(req, res, tier, 'Đăng nhập để tải tài nguyên cao cấp.', 'Tài nguyên này dành cho thành viên câu lạc bộ.')) return;
    const item = findResource(resourceId)?.[`${tier}Downloads`]?.[Number(index)];
    if (!item?.file) return res.status(404).json({ error: 'Không tìm thấy tệp.' });
    const filename = resolveFile(item.file, tier);
    if (!filename) return res.status(404).json({ error: 'Tệp chưa sẵn sàng.' });
    res.type(item.mime || 'application/octet-stream');
    res.download(filename, downloadName(item), { cacheControl: false }, (error) => {
      if (error && !res.headersSent) res.status(500).json({ error: 'Chưa thể tải tệp. Vui lòng thử lại.' });
    });
  });
  app.get('/api/videos/:resourceId/:tier', (req, res) => {
    const { resourceId, tier } = req.params;
    if (!['free', 'premium'].includes(tier)) return res.status(404).json({ error: 'Không tìm thấy video.' });
    if (!gatePremium(req, res, tier, 'Đăng nhập để xem video cao cấp.', 'Video này dành cho thành viên câu lạc bộ.')) return;
    const file = findResource(resourceId)?.[`${tier}VideoFile`];
    const extension = typeof file === 'string' ? path.extname(file).toLowerCase() : '';
    const filename = VIDEO_EXTENSIONS.includes(extension) ? resolveFile(file, tier) : null;
    if (!filename) return res.status(404).json({ error: 'Video chưa được tải lên.' });
    // Members may seek inside the video, but intermediaries must not keep gated copies.
    res.setHeader('Cache-Control', tier === 'premium' ? 'private, no-store' : 'private, max-age=0, must-revalidate');
    res.type(FILE_TYPES[extension]);
    res.sendFile(filename, { cacheControl: false });
  });

  const uploader = multer({
    storage: multer.diskStorage({
      destination: (req, file, callback) => callback(null, path.join(uploadsPath, req.query.tier)),
      filename: (req, file, callback) => callback(null, `upload-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: UPLOAD_MAX_BYTES, files: 1, fields: 0 },
    fileFilter: (req, file, callback) => FILE_TYPES[path.extname(file.originalname).toLowerCase()] ? callback(null, true) : callback(clientError('Định dạng tệp chưa được hỗ trợ.')),
  });
  const discard = (file) => { try { unlinkSync(file.path); } catch { /* already gone */ } };
  app.post('/api/admin/uploads', requireUser, requireAdmin, (req, res, next) => {
    if (!['free', 'premium'].includes(req.query.tier)) return res.status(400).json({ error: 'Chọn tier free hoặc premium.' });
    uploader.single('file')(req, res, next);
  }, (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn tệp để tải lên.' });
    if (!req.file.size) { discard(req.file); return res.status(400).json({ error: 'Tệp tải lên đang trống.' }); }
    const file = req.file.filename;
    const extension = path.extname(file).toLowerCase();
    if (!matchesExtension(req.file.path, extension)) { discard(req.file); return res.status(400).json({ error: 'Nội dung tệp không khớp với định dạng của tên tệp. Hãy kiểm tra lại tệp.' }); }
    const name = path.basename(req.file.originalname).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    const mime = FILE_TYPES[extension];
    try { db.prepare('INSERT INTO uploads (file, tier, name, mime, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(file, req.query.tier, name, mime, now(), req.user.id); }
    catch (error) { discard(req.file); throw error; }
    res.status(201).json({ file, name, mime, tier: req.query.tier });
  });
  app.get('/api/admin/resources', requireUser, requireAdmin, (req, res) => res.json({ resources: resources().map((resource) => ({ ...resource, author: resource.author || 'F5 AI' })) }));
  app.post('/api/admin/resources', requireUser, requireAdmin, (req, res) => {
    const resource = validateResource(req.body?.resource);
    if (findResource(resource.id)) return res.status(409).json({ error: 'Mã tài nguyên đã tồn tại.' });
    saveResource(resource);
    res.status(201).json({ resource });
  });
  app.put('/api/admin/resources/:id', requireUser, requireAdmin, (req, res) => {
    const existing = findResource(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài nguyên.' });
    const resource = validateResource(req.body?.resource, existing);
    saveResource(resource);
    res.json({ resource });
  });
  app.delete('/api/admin/resources/:id', requireUser, requireAdmin, (req, res) => {
    const existing = findResource(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài nguyên.' });
    saveResource(existing);
    db.prepare('UPDATE resource_entries SET deleted = 1, updated_at = ? WHERE id = ?').run(now(), existing.id);
    invalidateCatalogue();
    res.json({ deleted: true });
  });

  app.get('/api/membership/config', (req, res) => res.json(config(req.user)));
  app.post('/api/membership/interest', requireUser, (req, res) => {
    db.prepare('INSERT OR IGNORE INTO membership_interests (id, user_id, created_at) VALUES (?, ?, ?)').run(randomUUID(), req.user.id, now());
    const interest = db.prepare('SELECT * FROM membership_interests WHERE user_id = ?').get(req.user.id);
    res.json({ registered: true, interested: true, createdAt: interest.created_at });
  });
  app.get('/api/admin/interests', requireUser, requireAdmin, (req, res) => {
    const rows = db.prepare(`SELECT membership_interests.*, users.name AS user_name, users.email AS user_email FROM membership_interests
      JOIN users ON users.id = membership_interests.user_id ORDER BY membership_interests.created_at DESC`).all();
    res.json({ interests: rows.map((row) => ({ id: row.id, user: { id: row.user_id, name: row.user_name, email: row.user_email }, createdAt: row.created_at })) });
  });
  app.get('/api/membership/orders', requireUser, (req, res) => {
    const rows = db.prepare('SELECT * FROM membership_orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ orders: rows.map(orderPayload) });
  });
  app.post('/api/membership/orders', requireUser, (req, res) => {
    const payment = config(req.user);
    if (!payment.paymentConfigured) return res.status(503).json({ error: 'Đăng ký trả phí đang được chuẩn bị. Chủ website cần cấu hình thông tin chuyển khoản trước khi nhận thanh toán.', paymentConfigured: false });
    const pending = db.prepare("SELECT * FROM membership_orders WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(req.user.id);
    if (pending) return res.json({ order: orderPayload(pending), payment });
    const id = randomUUID();
    const reference = `F5AI${randomBytes(6).toString('hex').toUpperCase()}`;
    try { db.prepare('INSERT INTO membership_orders (id, user_id, amount, currency, duration_days, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, req.user.id, planPrice, 'VND', planDays, reference, now()); }
    catch (error) {
      // Two clicks at once: the partial unique index keeps one pending order per user; hand back the existing one.
      if (!String(error.code).startsWith('SQLITE_CONSTRAINT')) throw error;
      const existing = db.prepare("SELECT * FROM membership_orders WHERE user_id = ? AND status = 'pending' LIMIT 1").get(req.user.id);
      return res.json({ order: orderPayload(existing), payment });
    }
    res.status(201).json({ order: orderPayload(db.prepare('SELECT * FROM membership_orders WHERE id = ?').get(id)), payment });
  });
  app.get('/api/admin/orders', requireUser, requireAdmin, (req, res) => {
    const rows = db.prepare(`SELECT membership_orders.*, users.name AS user_name, users.email AS user_email FROM membership_orders
      JOIN users ON users.id = membership_orders.user_id ORDER BY membership_orders.created_at DESC`).all();
    res.json({ orders: rows.map(orderPayload) });
  });
  app.post('/api/admin/orders/:id/approve', requireUser, requireAdmin, (req, res) => {
    let result;
    db.exec('BEGIN IMMEDIATE');
    try {
      const order = db.prepare('SELECT * FROM membership_orders WHERE id = ?').get(req.params.id);
      if (!order) { db.exec('ROLLBACK'); return res.status(404).json({ error: 'Không tìm thấy yêu cầu đăng ký.' }); }
      const user = statements.userById.get(order.user_id);
      const alreadyApproved = order.status === 'approved';
      if (!alreadyApproved) {
        const start = Math.max(Date.now(), Date.parse(user.member_until || '') || 0);
        const memberUntil = new Date(start + order.duration_days * 24 * 60 * 60 * 1000).toISOString();
        db.prepare('UPDATE users SET member_until = ? WHERE id = ?').run(memberUntil, user.id);
        db.prepare("UPDATE membership_orders SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ? AND status = 'pending'").run(now(), req.user.id, order.id);
      }
      result = {
        order: orderPayload(db.prepare('SELECT * FROM membership_orders WHERE id = ?').get(order.id)),
        user: publicUser(statements.userById.get(user.id)),
        alreadyApproved,
      };
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    res.json(result);
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Không tìm thấy chức năng này.' }));
  const distPath = options.distPath || path.join(directory, '../dist');
  if (existsSync(path.join(distPath, 'index.html'))) {
    // Vite emits content-hashed files under /assets, so they can be cached for a year; index.html must always revalidate.
    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, filename) => {
        const hashed = path.relative(distPath, filename).split(path.sep)[0] === 'assets';
        res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
      },
    }));
    app.get('/{*path}', (req, res) => {
      if (path.extname(req.path)) return res.status(404).type('text').send('Không tìm thấy tệp này.');
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không hợp lệ.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu gửi lên quá lớn.' });
    if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Tệp tối đa 100 MB.' : 'Tệp tải lên không hợp lệ. Mỗi lần chỉ gửi một tệp.' });
    if (error.expose && error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message });
    if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: 'Yêu cầu không hợp lệ.' });
    console.error(`Request failed: ${req.method} ${req.path} -> ${error.code || error.name || 'Error'}: ${error.message}`);
    res.status(500).json({ error: 'Có lỗi khi xử lý yêu cầu. Vui lòng thử lại.' });
  });
  return app;
}

export function createAdmin(db, env = process.env) {
  const email = String(env.F5AI_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = env.F5AI_ADMIN_PASSWORD;
  if (!EMAIL_PATTERN.test(email) || typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new Error('Configure F5AI_ADMIN_EMAIL and F5AI_ADMIN_PASSWORD (12–128 characters) securely before creating an admin.');
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?").run(hashPassword(password), existing.id);
    // A password reset must also end every session that was opened with the old password.
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  }
  else db.prepare("INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)").run(randomUUID(), 'Quản trị viên', email, hashPassword(password), now());
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--create-admin')) {
    const db = openDatabase(process.env.DATABASE_PATH || path.join(directory, '../.data/club.sqlite'));
    try { createAdmin(db); console.log('Admin account configured.'); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
    finally { db.close(); }
  } else {
    const app = createApp();
    const port = Number(process.env.PORT || 3001);
    const host = process.env.HOST || '0.0.0.0';
    const server = app.listen(port, host, () => console.log(`F5 AI Studio server listening on http://${host === '0.0.0.0' ? 'localhost' : host}:${port} (${process.env.NODE_ENV || 'development'})`));
    const shutdown = () => { server.close(() => { app.locals.close(); process.exit(0); }); server.closeAllConnections?.(); };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }
}
