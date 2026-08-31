#!/usr/bin/env node
/**
 * Pisairtel SMS - Deploy to VPS
 *
 * This script:
 *   1. Builds the frontend (vite build)
 *   2. Packs the dist/, api/, server/, prisma/, package.json, pnpm-lock.yaml, ecosystem.config.cjs
 *   3. SCPs the tarball to the VPS
 *   4. On the VPS: unpacks, installs deps, copies shims, restarts PM2
 *
 * Usage:
 *   node server/deploy.mjs              # full deploy
 *   node server/deploy.mjs --build-only # build only, don't push
 *
 * Requires:
 *   - SSH key auth configured (run `ssh-copy-id` or the setup script first)
 *   - .env file on the VPS at /var/www/pisairtel-sms/.env
 */

import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VPS_HOST = process.env.VPS_HOST || '162.35.161.120';
const VPS_USER = process.env.VPS_USER || 'root';
const VPS_PATH = process.env.VPS_PATH || '/var/www/pisairtel-sms';
const SSH_KEY = process.env.SSH_KEY || '~/.ssh/pisairtel_vps';
const REMOTE_DIR = `${VPS_USER}@${VPS_HOST}`;
const SSH_CMD = `ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
const SCP_CMD = `scp -i ${SSH_KEY} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;

const BUILD_ONLY = process.argv.includes('--build-only');
const SKIP_BUILD = process.argv.includes('--skip-build');

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function runRemote(cmd) {
  return run(`${SSH_CMD} ${REMOTE_DIR} "${cmd}"`);
}

async function main() {
  console.log('\n=== Pisairtel SMS - Deploying to VPS ===\n');
  console.log(`Target: ${REMOTE_DIR}:${VPS_PATH}\n`);

  // Step 1: Build frontend
  if (!SKIP_BUILD) {
    console.log('[1/5] Building frontend (vite build)...');
    run('pnpm run build');
    console.log('[1/5] Build complete.\n');
  } else {
    console.log('[1/5] Skipping build (--skip-build)\n');
  }

  if (BUILD_ONLY) {
    console.log('Build-only mode. Exiting.');
    return;
  }

  // Step 2: Create tarball
  console.log('[2/5] Creating deployment tarball...');
  const tarball = 'pisairtel-deploy.tar.gz';
  const filesToPack = [
    'dist',
    'api',
    'server',
    'scripts',
    'prisma',
    'src/lib/plans.ts',
    'src/lib/parentAuth.ts',
    'src/lib/auth.ts',
    'src/lib/tenantSettingsClient.ts',
    'package.json',
    'pnpm-lock.yaml',
    'ecosystem.config.cjs',
    'vercel.json',
    'tsconfig.json',
  ].filter(f => fs.existsSync(path.join(ROOT, f)));

  const packList = filesToPack.map(f => `"${f}"`).join(' ');
  run(`tar -czf ${tarball} ${packList}`);
  console.log('[2/5] Tarball created.\n');

  // Step 3: Upload tarball
  console.log('[3/5] Uploading to VPS...');
  run(`${SCP_CMD} ${tarball} ${REMOTE_DIR}:/tmp/${tarball}`);
  console.log('[3/5] Upload complete.\n');

  // Step 4: Extract and install on VPS
  console.log('[4/5] Extracting and installing on VPS...');
  const remoteScript = `
set -e
cd ${VPS_PATH}

# Backup current .env
if [ -f .env ]; then
  cp .env /tmp/pisairtel-env-backup
fi

# Extract new files
tar -xzf /tmp/${tarball} -C ${VPS_PATH}

# Restore .env
if [ -f /tmp/pisairtel-env-backup ]; then
  cp /tmp/pisairtel-env-backup .env
fi

# Install dependencies
pnpm install --frozen-lockfile --prod=false 2>&1 || pnpm install 2>&1

# Ensure pg is installed (needed by @vercel/postgres shim)
pnpm add pg 2>&1 || true

# Copy shims (replaces @vercel/postgres and @vercel/node with pg-based shims)
node server/copy-shims.mjs

# Clean up tarball
rm -f /tmp/${tarball}

echo "[4/5] Installation complete."
  `;
  runRemote(remoteScript);
  console.log('[4/5] VPS installation complete.\n');

  // Step 5: Restart PM2
  console.log('[5/5] Restarting PM2...');
  const restartScript = `
cd ${VPS_PATH}
pm2 delete pisairtel-sms 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
echo "[5/5] PM2 restarted."
pm2 status
  `;
  runRemote(restartScript);
  console.log('[5/5] PM2 restarted.\n');

  // Cleanup local tarball
  fs.unlinkSync(path.join(ROOT, tarball));

  console.log('=== Deployment Complete! ===');
  console.log(`\nYour app should be live at: http://${VPS_HOST}:8082`);
  console.log('\nCheck logs with:  ssh -i ~/.ssh/pisairtel_vps root@' + VPS_HOST + ' "pm2 logs pisairtel-sms --lines 50"');
  console.log('');
}

main().catch(err => {
  console.error('\n[DEPLOY ERROR]', err);
  process.exit(1);
});
