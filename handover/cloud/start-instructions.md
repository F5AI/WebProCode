# F5 AI Studio — development startup

Use the existing checkout at /workspace/WebProCode. Each cloud task is already isolated; do not create a Git worktree unless the user explicitly asks.

## Retained state
Node.js 24 or newer is required for built-in SQLite. Dependencies are installed with npm ci and the production build is in dist/. If these are missing or package-lock.json changes, run the saved install_script from this checkout.
Preserve .data/club.sqlite, .data/uploads/, existing .env, user files, and local changes. These contain durable accounts, content edits, uploaded files and membership state. Never reset the database during normal startup. Server/assets contains the initial free and protected premium downloads.

## Start the workflow
From /workspace/WebProCode run:
```bash
npm run dev
```
Keep that command in a live PTY tool/terminal session (exec_command tty: true in cloud). If both services are already running, validate and reuse them rather than starting duplicates. Frontend changes update through Vite; restart the command after changing backend source or environment variables. It starts API port 3001 and Vite port 5173 with /api proxying. Both processes must be restarted in new tasks; live processes do not survive environment publication.
For the production build, use npm run build followed by npm start, which serves frontend and API together on PORT (default 3001). Production cookies require HTTPS; use development mode for local HTTP account validation.

## Readiness
Verify service health and a representative real download; a PID or port alone is insufficient:
```bash
curl --fail --silent http://127.0.0.1:3001/api/health
node --input-type=module - <<'JS'
const base = 'http://127.0.0.1:3001';
const response = await fetch(base + '/api/resources');
if (!response.ok) throw new Error('Resource listing failed');
const {resources} = await response.json();
const resource = resources.find(item => item.freeDownloads?.length);
if (!resource) throw new Error('No practice resource with a free download');
const file = await fetch(base + resource.freeDownloads[0].url);
if (!file.ok || !(await file.arrayBuffer()).byteLength) throw new Error('Practice download failed');
console.log('Resource library and free practice download verified.');
JS
```
Run npm test for API/auth/membership/upload checks. With development services running, npm run test:browser checks actual Chromium rendering and interactions on desktop, tablet and mobile. It uses Playwright installed by npm ci and /usr/bin/chromium (override CHROMIUM_PATH if necessary). npm run test:admin uses its own temporary database/server, bank fixtures and synthetic accounts to validate creator uploads and the membership approval journey. It requires a current npm run build and ffmpeg for its small video test fixture. Do not use synthetic payment fixtures for real membership.

Do not publish localhost preview links; use local requests and report readiness in text.

## Optional creator and billing activation
The free website and normal account registration work without outside credentials. No default administrator is created. A creator supplies F5AI_ADMIN_EMAIL and F5AI_ADMIN_PASSWORD securely in a local ignored .env or deployment secret manager, then runs npm run admin once. Password must be 12–128 characters; remove the bootstrap password after the account is created. Never print passwords, dump environment values, or place credentials in saved instructions. Admin login exposes Quản lý Studio for articles, uploads and membership approvals.

BANK_NAME, BANK_ACCOUNT and BANK_ACCOUNT_NAME are public receiving-bank instructions. When all are provided and the API restarted, checkout creates bank-transfer orders for 199000 VND / 30 days. An admin must verify receipt before approval; payment is not automatic and there is no auto-renewal. With no bank configuration the website persists membership interest and does not charge or grant paid access. APP_ORIGIN should be the exact public HTTPS origin for deployment; TRUST_PROXY=1 applies only behind one trusted reverse proxy.

Initial resources contain text lessons and working practice files; instructor videos have not been supplied. The admin upload interface supports real free previews and member-only full MP4/WebM videos. ComfyUI model rendering is outside the website's runtime: learners supply models/GPU themselves; the seed image workflow was structurally checked, not GPU-rendered here.

See README.md and .env.example for operations. Saving these instructions is draft persistence, not website deployment or environment publication.
