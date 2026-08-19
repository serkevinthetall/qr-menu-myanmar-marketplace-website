/**
 * Stamp a unique build id into public/version.json so open tabs can
 * detect a new Vercel deploy and hard-refresh.
 */
const fs = require('fs');
const path = require('path');

const buildId =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  `dev-${Date.now()}`;

const publicDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(
  path.join(publicDir, 'version.json'),
  `${JSON.stringify({ buildId }, null, 2)}\n`,
);
console.log(`[web-version] ${buildId}`);
