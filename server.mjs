/**
 * Express server wrapper for Pisairtel SMS
 * Replaces Vercel serverless runtime — loads all API handlers from vercel.json rewrites
 * and serves the static frontend build.
 */
import express from 'express';
import { readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for correct IP detection behind Nginx
app.set('trust proxy', 1);

// Body parsing — handlers check for string vs object, so we provide raw body too
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// Load vercel.json rewrites
const vercelConfig = JSON.parse(readFileSync(join(__dirname, 'vercel.json'), 'utf8'));
const rewrites = vercelConfig.rewrites || [];

// Cache for dynamically imported handler modules
const handlerCache = new Map();

/**
 * Convert a Vercel rewrite destination path to a file system path.
 * Strips query params and maps .ts extension.
 */
function destinationToFilePath(destination) {
  const [pathPart] = destination.split('?');
  return join(__dirname, pathPart);
}

/**
 * Extract query params from a destination like "file.ts?id=:id&action=copy"
 * Returns { filePath, queryMapping } where queryMapping maps param names to source param names.
 */
function parseDestination(destination) {
  const [pathPart, queryPart] = destination.split('?');
  const filePath = join(__dirname, pathPart);
  const queryMapping = {};

  if (queryPart) {
    const pairs = queryPart.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (value && value.startsWith(':')) {
        queryMapping[key] = value.slice(1); // e.g. { id: 'id', action: 'copy' }
      } else {
        queryMapping[key] = value || ''; // static value like 'copy' or 'stats'
      }
    }
  }

  return { filePath, queryMapping };
}

/**
 * Dynamically import a handler module (with caching).
 */
async function getHandler(filePath) {
  if (handlerCache.has(filePath)) {
    return handlerCache.get(filePath);
  }
  const mod = await import(filePath);
  const handler = mod.default;
  if (typeof handler !== 'function') {
    throw new Error(`Handler at ${filePath} does not export a default function`);
  }
  handlerCache.set(filePath, handler);
  return handler;
}

/**
 * Convert a Vercel source pattern to an Express route pattern.
 * Vercel uses :param syntax same as Express, so mostly passthrough.
 */
function sourceToExpressPattern(source) {
  // Vercel catch-all: /((?!assets/).*) → Express: /*
  if (source === '/((?!assets/).*)') {
    return null; // Handle separately as SPA fallback
  }
  return source;
}

// Register API rewrites as Express routes
for (const rewrite of rewrites) {
  const expressPattern = sourceToExpressPattern(rewrite.source);
  if (expressPattern === null) continue; // Skip SPA fallback for now

  const { filePath, queryMapping } = parseDestination(rewrite.destination);

  // Support all HTTP methods
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
            // Static value like 'copy', 'stats', 'publish'
            mergedQuery[key] = source;
          }
        }
        req.query = mergedQuery;
      }

      const handler = await getHandler(filePath);
      await handler(req, res);
    } catch (err) {
      console.error(`Handler error for ${req.method} ${req.path}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', message: err.message });
      }
    }
  });
}

// Serve static frontend assets
const distDir = join(__dirname, 'dist');
app.use('/assets', express.static(join(distDir, 'assets'), {
  maxAge: '1y',
  immutable: true,
}));

// Serve other static files from dist root (favicon, etc.)
app.use(express.static(distDir, {
  maxAge: '1d',
  index: false,
}));

// SPA fallback — serve index.html for all non-API, non-asset routes
app.get('*', (req, res) => {
  res.sendFile(join(distDir, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Pisairtel SMS server running on port ${PORT}`);
  console.log(`API routes: ${rewrites.filter(r => r.source !== '/((?!assets/).*)').length} registered`);
});
