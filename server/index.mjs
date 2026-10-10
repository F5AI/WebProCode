import express from 'express';
import multer from 'multer';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, lstatSync, realpathSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, hashPassword, verifyPassword, publicUser } from './db.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const SESSION_COOKIE = 'f5ai_session';
const SESSION_DAYS = 7;
const PLAN_PRICE = 199000;
const PLAN_DAYS = 30;
const FILE_TYPES = {
  '.html': 'text/html', '.md': 'text/markdown', '.csv': 'text/csv', '.srt': 'application/x-subrip',
  '.json': 'application/json', '.pdf': 'application/pdf', '.zip': 'application/zip', '.txt': 'text/plain',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.py': 'text/x-python',
};
const digest = (value) => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
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

export function createApp(options = {}) {
  const env = options.env || process.env;
  const dbPath = options.dbPath || env.DATABASE_PATH || path.join(directory, '../.data/club.sqlite');
  const db = openDatabase(dbPath);
  const contentPath = options.contentPath || path.join(directory, 'content.json');
  const assetsPath = options.assetsPath || path.join(directory, 'assets');
  const uploadsPath = options.uploadsPath || path.join(dbPath === ':memory:' ? path.join(directory, '../.data') : path.dirname(dbPath), 'uploads');
  for (const tier of ['free', 'premium']) mkdirSync(path.join(uploadsPath, tier), { recursive: true });
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.locals.db = db;
  app.locals.close = () => db.close();

  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    const origin = req.headers.origin;
    if (origin && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // HTTPS preview proxies terminate TLS before forwarding to the Node server.
      const allowed = new Set([`${req.protocol}://${req.get('host')}`, `https://${req.get('host')}`, env.APP_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean));
      if (!allowed.has(origin)) return res.status(403).json({ error: 'Yêu cầu không hợp lệ. Vui lòng thao tác từ website.' });
    }
    next();
  });
  app.use('/api', (req, res, next) => {
    const token = cookieValue(req);
    req.user = null;
    if (token && token.length < 200) {
      const row = db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(digest(token), now());
      req.user = publicUser(row);
    }
    next();
  });

  const attempts = new Map();
  const rateLimit = (req, res, next) => {
    const key = `${req.ip}:auth`;
    const time = Date.now();
    const previous = attempts.get(key);
    const record = previous && time < previous.until ? previous : { count: 0, until: time + 15 * 60 * 1000 };
    record.count += 1;
    attempts.set(key, record);
    if (attempts.size > 10000) for (const [key, value] of attempts) if (value.until < time) attempts.delete(key);
    if (record.count > 30) return res.status(429).json({ error: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
    next();
  };
  const requireUser = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
  const requireAdmin = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Chỉ quản trị viên được thực hiện thao tác này.' });
  const setSession = (res, userId) => {
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
    const token = randomBytes(32).toString('base64url');
    const maxAge = SESSION_DAYS * 24 * 60 * 60 * 1000;
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(digest(token), userId, new Date(Date.now() + maxAge).toISOString());
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', maxAge, path: '/' });
  };
  const clearSession = (req, res) => {
    const token = cookieValue(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token));
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', path: '/' });
  };
  const resources = () => {
    const parsed = JSON.parse(readFileSync(contentPath, 'utf8'));
    const merged = new Map((Array.isArray(parsed) ? parsed : parsed.resources).map((item) => [item.id, item]));
    for (const row of db.prepare('SELECT id, payload, deleted FROM resource_entries').all()) {
      if (row.deleted) merged.delete(row.id);
      else merged.set(row.id, JSON.parse(row.payload));
    }
    return [...merged.values()];
  };
  const resolveFile = (file, tier) => {
    if (typeof file !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(file)) return null;
    const upload = db.prepare('SELECT * FROM uploads WHERE file = ? AND tier = ?').get(file, tier);
    const root = path.resolve(upload ? uploadsPath : assetsPath, tier);
    const filename = path.resolve(root, file);
    if (!filename.startsWith(`${root}${path.sep}`) || !existsSync(filename)) return null;
    // Uploaded assets are regular files only; never follow a symlink outside their tier.
    if (!lstatSync(filename).isFile() || lstatSync(filename).isSymbolicLink() || !realpathSync(filename).startsWith(`${realpathSync(root)}${path.sep}`)) return null;
    return filename;
  };
  const resourcePayload = (resource, user) => {
    const allowed = Boolean(user?.isMember);
    const download = (item, tier, index) => ({
      name: item.name,
      mime: item.mime,
      url: tier === 'free' || allowed ? `/api/downloads/${encodeURIComponent(resource.id)}/${tier}/${index}` : null,
      locked: tier === 'premium' && !allowed,
    });
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
      sections: resource.sections || [],
      freeDownloads: (resource.freeDownloads || []).map((item, index) => download(item, 'free', index)),
      premiumDownloads: (resource.premiumDownloads || []).map((item, index) => download(item, 'premium', index)),
      premiumBenefit: resource.premiumBenefit,
      videoUrl: resource.freeVideoFile ? `/api/videos/${encodeURIComponent(resource.id)}/free` : resource.videoUrl || null,
      premiumVideoUrl: resource.premiumVideoFile && allowed ? `/api/videos/${encodeURIComponent(resource.id)}/premium` : null,
      premiumVideoAvailable: Boolean(resource.premiumVideoFile),
      featured: Boolean(resource.featured),
      step: resource.step,
      hasPremium: Boolean(resource.premiumDownloads?.length || resource.premiumVideoFile),
      premiumAvailable: allowed,
      isLocked: Boolean(resource.premiumDownloads?.length || resource.premiumVideoFile) && !allowed,
    };
  };
  const validateResource = (input, existing = null) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Dữ liệu tài nguyên không hợp lệ.');
    const value = { ...existing, ...input };
    const string = (field, fallback, max, minimum = 0) => {
      const result = value[field] ?? fallback;
      if (typeof result !== 'string' || result.trim().length < minimum || result.length > max) throw new Error(`Trường ${field} không hợp lệ.`);
      return result.trim();
    };
    const title = string('title', '', 200, 3);
    const generated = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'tai-nguyen';
    const id = existing?.id || value.id || `${generated}-${randomBytes(3).toString('hex')}`;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(id) || existing && value.id !== existing.id) throw new Error('Mã tài nguyên không hợp lệ hoặc đã bị thay đổi.');
    const type = value.type || 'guide';
    const category = value.category || 'Kịch bản';
    if (!['guide', 'video', 'workflow'].includes(type)) throw new Error('Loại tài nguyên không hợp lệ.');
    if (!['Kịch bản', 'Nhân vật', 'Bối cảnh', 'Video', 'Hậu kỳ'].includes(category)) throw new Error('Danh mục không hợp lệ.');
    const image = string('image', '/images/hero.png', 2000);
    const localImage = /^\/images\/[A-Za-z0-9._/-]+$/.test(image) && path.posix.normalize(image) === image;
    if (!localImage && !isHttpUrl(image)) throw new Error('Ảnh cần dùng đường dẫn /images/ hoặc URL http(s).');
    const sections = value.sections ?? [];
    if (!Array.isArray(sections) || sections.length > 50 || sections.some((item) => !item || typeof item.title !== 'string' || item.title.length > 200 || typeof item.body !== 'string' || item.body.length > 20000)) throw new Error('Các phần bài viết không hợp lệ.');
    const downloads = (tier) => {
      const items = value[`${tier}Downloads`] ?? [];
      if (!Array.isArray(items) || items.length > 30) throw new Error('Danh sách tệp không hợp lệ.');
      return items.map((item) => {
        if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 200 || !resolveFile(item.file, tier)) throw new Error(`Tệp ${tier} chưa có hoặc không hợp lệ. Hãy tải tệp lên trước.`);
        const mime = FILE_TYPES[path.extname(item.file).toLowerCase()] || 'application/octet-stream';
        return { name: item.name.trim(), file: item.file, mime };
      });
    };
    const videoFile = (field, tier) => {
      const file = value[field];
      if (!file) return null;
      if (typeof file !== 'string' || !['.mp4', '.webm'].includes(path.extname(file).toLowerCase()) || !resolveFile(file, tier)) throw new Error(`Tệp video ${tier} không hợp lệ.`);
      return file;
    };
    const videoUrl = value.videoUrl || null;
    if (videoUrl !== null && (typeof videoUrl !== 'string' || videoUrl.length > 2000 || !isHttpUrl(videoUrl) && !/^\/api\/videos\/[A-Za-z0-9_-]+\/(free|premium)$/.test(videoUrl))) throw new Error('URL video cần dùng http(s) hoặc video được tải lên website.');
    const step = value.step ?? 1;
    if (!Number.isInteger(step) || step < 1 || step > 99) throw new Error('Bước trong lộ trình cần là số từ 1 đến 99.');
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
  };
  const config = (user = null) => {
    const bank = {
      name: String(env.BANK_NAME || '').trim(),
      account: String(env.BANK_ACCOUNT || '').trim(),
      accountName: String(env.BANK_ACCOUNT_NAME || '').trim(),
    };
    const paymentConfigured = Object.values(bank).every(Boolean);
    const interest = user ? db.prepare('SELECT created_at FROM membership_interests WHERE user_id = ?').get(user.id) : null;
    return { price: PLAN_PRICE, currency: 'VND', durationDays: PLAN_DAYS, paymentConfigured, bank: paymentConfigured ? bank : null, interested: Boolean(interest) };
  };

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/session', (req, res) => res.json({ user: req.user }));
  app.post('/api/auth/register', rateLimit, (req, res) => {
    const { name, email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Vui lòng nhập tên và địa chỉ email hợp lệ.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Mật khẩu cần từ 8 đến 128 ký tự.' });
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)) return res.status(409).json({ error: 'Email này đã được đăng ký. Bạn có thể đăng nhập.' });
    const id = randomUUID();
    db.prepare('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(id, name.trim(), normalizedEmail, hashPassword(password), now());
    setSession(res, id);
    res.status(201).json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
  });
  app.post('/api/auth/login', rateLimit, (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128 || email.length > 254) return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    // Hash even unknown accounts so the response time does not reveal whether an email exists.
    const fallback = 'scrypt:unknown-account:45cce881044281bc2543df955e079d435b9376a637b014c33a099f173f742f53915f239270bb0d4287fae7d5e96e05b8d96a94664b7ffce2e96d741e02757879';
    const verified = verifyPassword(password, user?.password_hash || fallback);
    if (!user || !verified) return res.status(401).json({ error: 'Email hoặc mật khẩu chưa đúng.' });
    clearSession(req, res);
    setSession(res, user.id);
    res.json({ user: publicUser(user) });
  });
  app.post('/api/auth/logout', (req, res) => { clearSession(req, res); res.json({ user: null }); });

  app.get('/api/resources', (req, res) => res.json({ resources: resources().map((resource) => resourcePayload(resource, req.user)) }));
  app.get('/api/resources/:id', (req, res) => {
    const resource = resources().find((item) => item.id === req.params.id);
    if (!resource) return res.status(404).json({ error: 'Không tìm thấy tài nguyên này.' });
    res.json({ resource: resourcePayload(resource, req.user) });
  });
  app.get('/api/downloads/:resourceId/:tier/:index', (req, res) => {
    const { resourceId, tier, index } = req.params;
    if (!['free', 'premium'].includes(tier) || !/^\d+$/.test(index)) return res.status(404).json({ error: 'Không tìm thấy tệp.' });
    if (tier === 'premium' && !req.user) return res.status(401).json({ error: 'Đăng nhập để tải tài nguyên cao cấp.' });
    if (tier === 'premium' && !req.user?.isMember) return res.status(403).json({ error: 'Tài nguyên này dành cho thành viên câu lạc bộ.' });
    const resource = resources().find((item) => item.id === resourceId);
    const item = resource?.[`${tier}Downloads`]?.[Number(index)];
    if (!item?.file) return res.status(404).json({ error: 'Không tìm thấy tệp.' });
    const filename = resolveFile(item.file, tier);
    if (!filename) return res.status(404).json({ error: 'Tệp chưa sẵn sàng.' });
    res.type(item.mime || 'application/octet-stream');
    res.download(filename, path.basename(item.file), (error) => {
      if (error && !res.headersSent) res.status(500).json({ error: 'Chưa thể tải tệp. Vui lòng thử lại.' });
    });
  });
  app.get('/api/videos/:resourceId/:tier', (req, res) => {
    const { resourceId, tier } = req.params;
    if (!['free', 'premium'].includes(tier)) return res.status(404).json({ error: 'Không tìm thấy video.' });
    if (tier === 'premium' && !req.user) return res.status(401).json({ error: 'Đăng nhập để xem video cao cấp.' });
    if (tier === 'premium' && !req.user?.isMember) return res.status(403).json({ error: 'Video này dành cho thành viên câu lạc bộ.' });
    const resource = resources().find((item) => item.id === resourceId);
    const file = resource?.[`${tier}VideoFile`];
    const filename = file && ['.mp4', '.webm'].includes(path.extname(file).toLowerCase()) ? resolveFile(file, tier) : null;
    if (!filename) return res.status(404).json({ error: 'Video chưa được tải lên.' });
    res.type(FILE_TYPES[path.extname(file).toLowerCase()]);
    res.sendFile(filename);
  });

  const uploader = multer({
    storage: multer.diskStorage({
      destination: (req, file, callback) => callback(null, path.join(uploadsPath, req.query.tier)),
      filename: (req, file, callback) => callback(null, `upload-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 0 },
    fileFilter: (req, file, callback) => FILE_TYPES[path.extname(file.originalname).toLowerCase()] ? callback(null, true) : callback(Object.assign(new Error('Định dạng tệp chưa được hỗ trợ.'), { status: 400 })),
  });
  app.post('/api/admin/uploads', requireUser, requireAdmin, (req, res, next) => {
    if (!['free', 'premium'].includes(req.query.tier)) return res.status(400).json({ error: 'Chọn tier free hoặc premium.' });
    uploader.single('file')(req, res, next);
  }, (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn tệp để tải lên.' });
    if (!req.file.size) { unlinkSync(req.file.path); return res.status(400).json({ error: 'Tệp tải lên đang trống.' }); }
    const file = req.file.filename;
    const name = path.basename(req.file.originalname).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    const mime = FILE_TYPES[path.extname(file).toLowerCase()];
    try { db.prepare('INSERT INTO uploads (file, tier, name, mime, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(file, req.query.tier, name, mime, now(), req.user.id); }
    catch (error) { unlinkSync(req.file.path); throw error; }
    res.status(201).json({ file, name, mime, tier: req.query.tier });
  });
  app.get('/api/admin/resources', requireUser, requireAdmin, (req, res) => res.json({ resources: resources().map((resource) => ({ ...resource, author: resource.author || 'F5 AI' })) }));
  app.post('/api/admin/resources', requireUser, requireAdmin, (req, res) => {
    let resource;
    try { resource = validateResource(req.body?.resource); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    if (resources().some((item) => item.id === resource.id)) return res.status(409).json({ error: 'Mã tài nguyên đã tồn tại.' });
    saveResource(resource);
    res.status(201).json({ resource });
  });
  app.put('/api/admin/resources/:id', requireUser, requireAdmin, (req, res) => {
    const existing = resources().find((item) => item.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài nguyên.' });
    let resource;
    try { resource = validateResource(req.body?.resource, existing); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    saveResource(resource);
    res.json({ resource });
  });
  app.delete('/api/admin/resources/:id', requireUser, requireAdmin, (req, res) => {
    const existing = resources().find((item) => item.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài nguyên.' });
    saveResource(existing);
    db.prepare('UPDATE resource_entries SET deleted = 1, updated_at = ? WHERE id = ?').run(now(), existing.id);
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
    db.prepare('INSERT INTO membership_orders (id, user_id, amount, currency, duration_days, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, req.user.id, PLAN_PRICE, 'VND', PLAN_DAYS, reference, now());
    res.status(201).json({ order: orderPayload(db.prepare('SELECT * FROM membership_orders WHERE id = ?').get(id)), payment });
  });
  app.get('/api/admin/orders', requireUser, requireAdmin, (req, res) => {
    const rows = db.prepare(`SELECT membership_orders.*, users.name AS user_name, users.email AS user_email FROM membership_orders
      JOIN users ON users.id = membership_orders.user_id ORDER BY membership_orders.created_at DESC`).all();
    res.json({ orders: rows.map(orderPayload) });
  });
  app.post('/api/admin/orders/:id/approve', requireUser, requireAdmin, (req, res) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const order = db.prepare('SELECT * FROM membership_orders WHERE id = ?').get(req.params.id);
      if (!order) { db.exec('ROLLBACK'); return res.status(404).json({ error: 'Không tìm thấy yêu cầu đăng ký.' }); }
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id);
      const alreadyApproved = order.status === 'approved';
      if (!alreadyApproved) {
        const start = Math.max(Date.now(), Date.parse(user.member_until || '') || 0);
        const memberUntil = new Date(start + order.duration_days * 24 * 60 * 60 * 1000).toISOString();
        db.prepare('UPDATE users SET member_until = ? WHERE id = ?').run(memberUntil, user.id);
        db.prepare("UPDATE membership_orders SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ? AND status = 'pending'").run(now(), req.user.id, order.id);
      }
      const updatedOrder = db.prepare('SELECT * FROM membership_orders WHERE id = ?').get(order.id);
      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      db.exec('COMMIT');
      res.json({ order: orderPayload(updatedOrder), user: publicUser(updatedUser), alreadyApproved });
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Không tìm thấy chức năng này.' }));
  const distPath = options.distPath || path.join(directory, '../dist');
  if (existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không hợp lệ.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu gửi lên quá lớn.' });
    if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Tệp tối đa 100 MB.' : 'Tệp tải lên không hợp lệ. Mỗi lần chỉ gửi một tệp.' });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error(`Request failed: ${error.code || error.name || 'Error'}`);
    res.status(500).json({ error: 'Có lỗi khi xử lý yêu cầu. Vui lòng thử lại.' });
  });
  return app;
}

export function createAdmin(db, env = process.env) {
  const email = String(env.F5AI_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = env.F5AI_ADMIN_PASSWORD;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new Error('Configure F5AI_ADMIN_EMAIL and F5AI_ADMIN_PASSWORD (12–128 characters) securely before creating an admin.');
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) db.prepare("UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?").run(hashPassword(password), existing.id);
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
    const server = app.listen(port, '0.0.0.0', () => console.log(`F5 AI Club server listening on port ${port}`));
    const shutdown = () => server.close(() => { app.locals.close(); process.exit(0); });
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }
}
