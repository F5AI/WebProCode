// Local, offline demo of the production build. Run `node scripts/demo-local.mjs` (or start-demo.cmd on Windows).
//
// What it does, and why it is safe for the real data:
// - Uses its own database and uploads folder in .data-demo/ so .data/ (the real site data) is never touched.
// - Reads demo-only settings from .env.demo (created on first run with a generated admin password).
// - Builds the frontend when dist/ is missing or older than the source, then serves API + frontend on one port.
// - Bank details are clearly marked as demo; no real money, account or domain is involved.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoDir = path.join(root, '.data-demo');
const envFile = path.join(root, '.env.demo');
// 3080 so the demo never collides with the dev API (3001) or Vite (5173).
const port = process.env.PORT || '3080';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function parseEnv(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) result[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
  }
  return result;
}

if (!existsSync(envFile)) {
  const password = randomBytes(18).toString('base64url');
  writeFileSync(envFile, [
    '# Cấu hình DEMO cục bộ - không dùng cho website thật, không commit, không chia sẻ.',
    '# Tài khoản quản trị demo chỉ tồn tại trong .data-demo/club.sqlite.',
    'F5AI_ADMIN_EMAIL=admin@demo.local',
    `F5AI_ADMIN_PASSWORD=${password}`,
    'BANK_NAME=NGÂN HÀNG DEMO (chưa phải tài khoản thật)',
    'BANK_ACCOUNT=0000000000',
    'BANK_ACCOUNT_NAME=F5 AI STUDIO DEMO',
    'PLAN_PRICE=199000',
    'PLAN_DAYS=30',
    '',
  ].join('\n'), 'utf8');
  console.log(`Đã tạo ${envFile} với tài khoản quản trị demo. Mở file này để lấy email/mật khẩu đăng nhập quản trị.`);
}
const demoEnv = parseEnv(readFileSync(envFile, 'utf8'));
mkdirSync(demoDir, { recursive: true });

const newest = (dir) => {
  let latest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    latest = Math.max(latest, entry.isDirectory() ? newest(full) : statSync(full).mtimeMs);
  }
  return latest;
};
const distIndex = path.join(root, 'dist', 'index.html');
const stale = !existsSync(distIndex) || statSync(distIndex).mtimeMs < Math.max(newest(path.join(root, 'src')), statSync(path.join(root, 'index.html')).mtimeMs);
if (stale) {
  console.log('Đang build frontend (dist/ chưa có hoặc cũ hơn mã nguồn)...');
  const build = spawnSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (build.status !== 0) { console.error('Build thất bại. Dừng demo.'); process.exit(build.status || 1); }
}

const env = {
  ...process.env,
  ...demoEnv,
  NODE_ENV: 'production',
  PORT: port,
  DATABASE_PATH: path.join(demoDir, 'club.sqlite'),
  // Demo chạy qua HTTP thường trong mạng nội bộ nên cookie không được gắn cờ Secure. Website thật dùng HTTPS và bỏ dòng này.
  COOKIE_SECURE: '0',
};

const admin = spawnSync(process.execPath, ['server/index.mjs', '--create-admin'], { cwd: root, env, stdio: 'inherit' });
if (admin.status !== 0) { console.error('Không tạo được tài khoản quản trị demo. Kiểm tra .env.demo.'); process.exit(admin.status || 1); }
delete env.F5AI_ADMIN_PASSWORD;

console.log('');
console.log('=== F5 AI Studio - DEMO cục bộ (bản production build) ===');
console.log(`Mở:            http://localhost:${port}`);
console.log(`Quản trị demo: email và mật khẩu trong ${envFile}`);
console.log(`Dữ liệu demo:  ${demoDir} (tách riêng khỏi .data/)`);
console.log('Dừng demo:     Ctrl+C');
console.log('');
const server = spawn(process.execPath, ['server/index.mjs'], { cwd: root, env, stdio: 'inherit' });
const stop = () => { server.kill('SIGTERM'); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => process.exit(code || 0));
