import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run `npm run build && node scripts/export-preview.mjs` from the repository.
// The output contains public resources only. No server, account, or premium data
// is copied into this offline preview.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(repository, 'dist');
const freeRoot = path.join(repository, 'server', 'assets', 'free');
const output = path.join(repository, 'website-preview.html');
const index = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const content = JSON.parse(await fs.readFile(path.join(repository, 'server', 'content.json'), 'utf8'));
const resources = Array.isArray(content) ? content : content.resources;
const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const assets = {};
const files = {};
const serialized = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const safeScript = value => value.replace(/<\/script/gi, '<\\/script');
const embed = async publicPath => {
  if (assets[publicPath]) return assets[publicPath];
  if (!/^\/(?:assets|images)\/[A-Za-z0-9._/-]+$/.test(publicPath) || path.posix.normalize(publicPath) !== publicPath) throw new Error(`Unsupported asset: ${publicPath}`);
  const mime = mimeTypes[path.extname(publicPath)];
  if (!mime) throw new Error(`Unknown asset MIME: ${publicPath}`);
  const bytes = await fs.readFile(path.join(dist, publicPath));
  return assets[publicPath] = `data:${mime};base64,${bytes.toString('base64')}`;
};

const publicResources = [];
for (const resource of resources) {
  await embed(resource.image);
  const freeDownloads = [];
  for (const item of resource.freeDownloads || []) {
    const filename = path.basename(item.file);
    if (filename !== item.file || !filename) throw new Error(`Unsupported free filename: ${item.file}`);
    if (!files[filename]) files[filename] = { mime: item.mime || 'application/octet-stream', data: (await fs.readFile(path.join(freeRoot, filename))).toString('base64') };
    freeDownloads.push({ name: item.name, mime: item.mime, url: `preview-file:${filename}`, locked: false });
  }
  publicResources.push({
    id: resource.id, title: resource.title, description: resource.description,
    type: resource.type, category: resource.category, image: resource.image,
    duration: resource.duration, level: resource.level, author: resource.author || 'F5 AI Studio',
    sections: (resource.sections || []).map(({ title, body }) => ({ title, body })),
    freeDownloads,
    premiumDownloads: (resource.premiumDownloads || []).map(({ name, mime }) => ({ name, mime, url: null, locked: true })),
    premiumBenefit: resource.premiumBenefit,
    videoUrl: null, premiumVideoUrl: null, premiumVideoAvailable: Boolean(resource.premiumVideoFile),
    featured: Boolean(resource.featured), step: resource.step,
    hasPremium: Boolean(resource.premiumDownloads?.length || resource.premiumVideoFile),
    premiumAvailable: false, isLocked: Boolean(resource.premiumDownloads?.length || resource.premiumVideoFile),
  });
}

const scriptPaths = [...index.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(match => match[1]);
const cssPaths = [...index.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]);
if (scriptPaths.length !== 1 || !cssPaths.length) throw new Error('Expected one built JavaScript bundle and at least one stylesheet. Run npm run build first.');
let javascript = await fs.readFile(path.join(dist, scriptPaths[0]), 'utf8');
const imagePaths = [...new Set([...javascript.matchAll(/["'](\/images\/[A-Za-z0-9._/-]+)["']/g)].map(match => match[1]))];
for (const asset of imagePaths) await embed(asset);
javascript = javascript.replace(/(["'])(\/images\/[A-Za-z0-9._/-]+)\1/g, (_, quote, asset) => `window.__F5PreviewAssets[${JSON.stringify(asset)}]`);
const styles = [];
for (const cssPath of cssPaths) {
  let stylesheet = await fs.readFile(path.join(dist, cssPath), 'utf8');
  const fontPaths = [...new Set([...stylesheet.matchAll(/url\(["']?(\/assets\/[^\s)"']+)["']?\)/g)].map(match => match[1]))];
  for (const asset of fontPaths) await embed(asset);
  stylesheet = stylesheet.replace(/url\(["']?(\/assets\/[^\s)"']+)["']?\)/g, (_, asset) => `url("${assets[asset]}")`);
  styles.push(stylesheet);
}
const favicon = `data:image/svg+xml;base64,${(await fs.readFile(path.join(dist, 'favicon.svg'))).toString('base64')}`;
// Font bytes are already in the stylesheet, so keep only image data in JS.
const imageAssets = Object.fromEntries(Object.entries(assets).filter(([asset]) => asset.startsWith('/images/')));
const bootstrap = `(() => {
  const assets = ${serialized(imageAssets)};
  const freeFiles = ${serialized(files)};
  const resources = ${serialized(publicResources)};
  const message = 'Tính năng này cần bản website đầy đủ được triển khai.';
  window.__F5PreviewAssets = assets;
  const downloads = new Map();
  const fileUrls = new Map();
  for (const [filename, file] of Object.entries(freeFiles)) {
    const bytes = Uint8Array.from(atob(file.data), character => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: file.mime }));
    downloads.set(url, filename);
    fileUrls.set(filename, url);
  }
  for (const resource of resources) {
    resource.image = assets[resource.image];
    resource.freeDownloads = resource.freeDownloads.map(item => ({ ...item, url: fileUrls.get(item.url.slice('preview-file:'.length)) }));
  }
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (link && downloads.has(link.href)) link.download = downloads.get(link.href);
  }, true);
  const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
  window.fetch = (input, options = {}) => {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const endpoint = new URL(rawUrl, location.href).pathname;
    const method = (options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method !== 'GET') return json({ error: message }, 503);
    if (endpoint === '/api/session') return json({ user: null });
    if (endpoint === '/api/resources') return json({ resources });
    if (endpoint === '/api/membership/config') return json({ price: 199000, currency: 'VND', durationDays: 30, paymentConfigured: false, bank: null, interested: false });
    if (endpoint.startsWith('/api/resources/')) {
      const id = decodeURIComponent(endpoint.slice('/api/resources/'.length));
      const resource = resources.find(item => item.id === id);
      return resource ? json({ resource }) : json({ error: 'Không tìm thấy tài nguyên này.' }, 404);
    }
    return json({ error: message }, 503);
  };
  // Announce limitations when these dialogs open, before anyone fills a form.
  const explainDialogs = () => {
    for (const dialog of document.querySelectorAll('.df-auth-dialog, .df-membership-dialog')) {
      if (dialog.querySelector('.preview-dialog-notice')) continue;
      const notice = document.createElement('p');
      notice.className = 'preview-dialog-notice';
      notice.setAttribute('role', 'note');
      notice.textContent = message + ' Bản ngoại tuyến không tạo tài khoản, lưu email hoặc nhận thanh toán.';
      dialog.querySelector('.df-dialog-body')?.prepend(notice);
    }
  };
  new MutationObserver(explainDialogs).observe(document.body, { childList: true, subtree: true });
})();`;

const previewStyles = `
:root { --preview-banner-height: 44px; }
#preview-banner { position: fixed; inset: 0 0 auto; z-index: 2000; min-height: var(--preview-banner-height); display: flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 18px; color: #e9f0e6; background: #263b2c; text-align: center; font: 500 11px/1.7 'Be Vietnam Pro', sans-serif; }
#preview-banner strong { font-weight: 650; }
#root { padding-top: var(--preview-banner-height); }
.sidebar { top: var(--preview-banner-height); height: calc(100dvh - var(--preview-banner-height)); }
.topbar { top: var(--preview-banner-height); }
.dialog-backdrop { top: var(--preview-banner-height); }
.df-dialog { max-height: calc(100dvh - var(--preview-banner-height) - 56px); }
.preview-dialog-notice { background: #f3f5ec; border: 1px solid #dce4d5; padding: 12px 14px; border-radius: 10px; color: #486046; font-size: 12px; line-height: 1.8; }
@media (max-width: 560px) {
  :root { --preview-banner-height: 65px; }
  #preview-banner { display: block; padding: 9px 18px; font-size: 10px; }
  #preview-banner strong { display: block; }
  #preview-banner .preview-separator { display: none; }
  .df-dialog { max-height: calc(100dvh - var(--preview-banner-height) - 20px); }
}
`;
const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#263b2c">
  <meta name="description" content="Bản xem trước ngoại tuyến F5 AI Studio: tài nguyên miễn phí để làm phim AI 3 phút.">
  <link rel="icon" type="image/svg+xml" href="${favicon}">
  <title>F5 AI Studio — Bản xem trước ngoại tuyến</title>
  <style>${styles.join('\n')}${previewStyles}</style>
</head>
<body>
  <div id="preview-banner" role="note"><strong>Bản xem trước ngoại tuyến</strong><span class="preview-separator">·</span><span>Tài khoản và thanh toán cần website được triển khai</span></div>
  <div id="root"></div>
  <noscript>Bật JavaScript trong trình duyệt để sử dụng thư viện tài nguyên.</noscript>
  <script>${safeScript(bootstrap)}</script>
  <script>${safeScript(javascript)}</script>
</body>
</html>
`;
await fs.writeFile(output, html);
console.log(`Generated ${output} (${Buffer.byteLength(html)} bytes; ${publicResources.length} resources, ${Object.keys(files).length} free files).`);
