#!/usr/bin/env bash
set -euo pipefail
cd /workspace/WebProCode
node -e "if (Number(process.versions.node.split('.')[0]) < 24) { console.error('F5 AI Studio requires Node.js 24 or newer'); process.exit(1); }"
npm ci --cache /workspace/.npm-cache --no-fund --no-audit
npm run build
npm test
