/**
 * Express server for Pisairtel SMS — VPS deployment
 *
 * Loads all API handlers from routes.json and serves the static frontend build.
 * This is the single canonical server entry point.
 */
import express from 'express';
import http from 'http';
import fs from 'fs';
import { readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { matchPlanGate } from './api/_lib/plan-gates.ts';
import { enforcePlan } from './api/_lib/plan-middleware.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const app = express();
const PORT = process.env.PORT || 3000;

// Load .env manually (PM2 env_file is not supported, Node 18 lacks --env-file).
// Values already present in the real environment take precedence.
try {
  const envFile = readFileSync(join(ROOT, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[m[1]] = value;
    }
  }
} catch {
  // .env is optional (env may come from the process environment instead)
}

// Trust proxy for correct IP detection behind Nginx
app.set('trust proxy', 1);

// Body parsing — handlers check for string vs object, so we provide raw body too
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Pisairtel-SMS');
  next();
});

// Security headers on API responses
const isProduction = process.env.NODE_ENV === 'production';
app.use('/api', (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.paystack.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.paystack.co; frame-src https://standard.paystack.co; frame-ancestors 'none';"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(self), camera=(self), display-capture=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), unload=(self)'
  );
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Load routes.json (route map for API handlers)
const routeConfig = JSON.parse(readFileSync(join(ROOT, 'routes.json'), 'utf8'));
const rewrites = routeConfig.rewrites || [];

// Cache for dynamically imported handler modules
const handlerCache = new Map();

/**
 * Dynamically import a handler module (with caching).
 */
async function getHandler(filePath) {
  if (handlerCache.has(filePath)) {
    return handlerCache.get(filePath);
  }
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const fileUrl = pathToFileURL(filePath).href;
  const mod = await import(fileUrl);
  const handler = mod.default;
  if (typeof handler !== 'function') {
    return null;
  }
  handlerCache.set(filePath, handler);
  return handler;
}

/**
 * Convert a Vercel source pattern to an Express route pattern.
 * Maps [param] syntax to :param.
 */
function sourceToExpressPattern(source) {
  if (source === '/((?!assets/).*)') {
    return null; // SPA fallback — handled separately
  }
  return source.replace(/\[([^\]]+)\]/g, ':$1');
}

/**
 * Parse destination into file path and query param mappings.
 */
function parseDestination(destination) {
  const [pathPart, queryPart] = destination.split('?');
  const filePath = join(ROOT, pathPart);
  const queryMapping = {};

  if (queryPart) {
    const pairs = queryPart.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (value && value.startsWith(':')) {
        queryMapping[key] = value.slice(1);
      } else {
        queryMapping[key] = value || '';
      }
    }
  }

  return { filePath, queryMapping };
}

// Register API rewrites as Express routes
let apiRouteCount = 0;
for (const rewrite of rewrites) {
  const expressPattern = sourceToExpressPattern(rewrite.source);
  if (expressPattern === null) continue;

  const { filePath, queryMapping } = parseDestination(rewrite.destination);

  if (!filePath.endsWith('.ts')) continue;

  apiRouteCount++;
  app.all(expressPattern, async (req, res, next) => {
    try {
      // Inject query params from route params or static values
      if (Object.keys(queryMapping).length > 0) {
        const mergedQuery = { ...req.query };
        for (const [key, source] of Object.entries(queryMapping)) {
          if (source === '') {
            // Static empty value, skip
          } else if (source in req.params) {
            mergedQuery[key] = req.params[source];
          } else if (!source.startsWith(':')) {
            mergedQuery[key] = source;
          }
        }
        req.query = mergedQuery;
      }

      const handler = await getHandler(filePath);
      if (!handler) {
        return res.status(404).json({ error: `Handler not found: ${filePath}` });
      }

      // Subscription plan gate: authenticated requests to gated routes must
      // have the feature enabled on the tenant's plan. Unauthenticated
      // requests pass through — handlers enforce their own auth, and public
      // endpoints (lead capture, certificate verification) stay public.
      const gate = matchPlanGate(req.path);
      if (gate && (req.headers.authorization || req.headers.cookie?.includes('auth_token'))) {
        const allowed = await enforcePlan(req, res, gate.category, gate.feature);
        if (!allowed) return;
      }

      await handler(req, res);
    } catch (err) {
      console.error(`[API Error] ${req.method} ${req.path}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', message: err.message });
      }
    }
  });
}

// Unauthenticated liveness/readiness probe for the Docker healthcheck.
// Verifies the process is up and Postgres is reachable.
app.get('/api/health', async (_req, res) => {
  try {
    const { default: pg } = await import('pg');
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      connectionTimeoutMillis: 5000,
    });
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    res.json({ status: 'ok', db: 'ok' });
  } catch (e) {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

// API 404 fallback
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static frontend assets
const distDir = join(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  app.use('/assets', express.static(join(distDir, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }));
  app.use(express.static(distDir, {
    maxAge: '1d',
    index: false,
  }));

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(join(distDir, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.status(503).json({ error: 'Frontend not built. Run build on the VPS.' });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`\n[Pisairtel SMS] Server running on port ${PORT}`);
  console.log(`[Pisairtel SMS] ${apiRouteCount} API routes loaded`);
  console.log(`[Pisairtel SMS] Frontend: ${fs.existsSync(distDir) ? 'serving from dist/' : 'not built'}`);
  console.log(`[Pisairtel SMS] Press Ctrl+C to stop\n`);
});

process.on('SIGTERM', () => {
  console.log('[Pisairtel SMS] SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[Pisairtel SMS] SIGINT received, shutting down...');
  server.close(() => process.exit(0));
});
