import http from 'http';
import crypto from 'crypto';
import { execSync, exec } from 'child_process';

const PORT = 9000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'pisairtel-webhook-secret-2024';
const REPO_DIR = '/opt/pisairtel-sms';
const GIT_REMOTE = 'https://github.com/KachiAlex/pisairtelsms.git';

function verifySignature(payload, signature) {
  if (!signature) return false;
  const [algo, hash] = signature.split('=');
  if (algo !== 'sha256') return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(payload);
  const computed = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computed));
}

function deploy() {
  console.log('[deploy] Starting deployment...');
  execSync(`cd ${REPO_DIR} && git fetch ${GIT_REMOTE} main && git merge FETCH_HEAD --ff-only`, { stdio: 'inherit' });
  console.log('[deploy] Code updated. Building Docker image...');
  exec(`cd ${REPO_DIR} && docker compose build --no-cache app`, (err) => {
    if (err) {
      console.error('[deploy] Build failed:', err.message);
      return;
    }
    console.log('[deploy] Build complete. Restarting containers...');
    exec(`cd ${REPO_DIR} && docker compose up -d`, (err2) => {
      if (err2) {
        console.error('[deploy] Restart failed:', err2.message);
        return;
      }
      console.log('[deploy] Waiting for app to start...');
      setTimeout(() => {
        exec('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/', (err3, stdout) => {
          if (err3) {
            console.error('[deploy] Health check failed:', err3.message);
            return;
          }
          if (stdout.trim() === '200') {
            console.log('[deploy] Deployment successful! App is healthy.');
          } else {
            console.error(`[deploy] App unhealthy (status: ${stdout})`);
            exec('docker logs pisairtel-sms --tail 20', (e, out) => console.log(out));
          }
        });
      }, 15000);
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    return res.end('Method Not Allowed');
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(body, signature)) {
      console.log('[webhook] Invalid signature, rejecting');
      res.writeHead(403);
      return res.end('Forbidden');
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400);
      return res.end('Bad Request');
    }

    const event = req.headers['x-github-event'];
    console.log(`[webhook] Received event: ${event}, ref: ${payload.ref}`);

    if (event === 'push' && payload.ref === 'refs/heads/main') {
      console.log('[webhook] Push to main detected. Triggering deploy...');
      res.writeHead(200);
      res.end('Deploy triggered');
      deploy();
    } else {
      res.writeHead(200);
      res.end('Ignored');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[webhook] Server listening on 0.0.0.0:${PORT}`);
});
