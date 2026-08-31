import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const vercelConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const rewrites = vercelConfig.rewrites || [];

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Pisairtel-SMS');
  next();
});

const handlerCache = new Map();

async function loadHandler(handlerPath) {
  if (handlerCache.has(handlerPath)) {
    return handlerCache.get(handlerPath);
  }

  const cleanPath = handlerPath.replace(/^\/+/, '');
  const fullPath = path.resolve(ROOT, cleanPath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileUrl = pathToFileURL(fullPath).href;
  const mod = await import(fileUrl);
  const handler = mod.default;

  if (typeof handler !== 'function') {
    return null;
  }

  handlerCache.set(handlerPath, handler);
  return handler;
}

function vercelSourceToExpress(source) {
  let expressPath = source;

  expressPath = expressPath.replace(/\[([^\]]+)\]/g, ':$1');

  expressPath = expressPath.replace(/:([^/]+)/g, (match, param) => {
    if (param.includes(':')) return match;
    return `:${param}`;
  });

  return expressPath;
}

function parseDestination(dest) {
  const [filePath, queryString] = dest.split('?');
  const queryParams = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams.entries()) {
      queryParams[key] = value;
    }
  }
  return { filePath, queryParams };
}

function resolveQueryParams(params, queryParams) {
  const resolved = {};
  for (const [key, value] of Object.entries(queryParams)) {
    resolved[key] = value.replace(/:([a-zA-Z_]+)/g, (_, name) => params[name] || '');
  }
  return resolved;
}

const apiRoutes = [];

for (const rewrite of rewrites) {
  const source = rewrite.source;
  const destination = rewrite.destination;

  if (!source.startsWith('/api/')) {
    continue;
  }

  const { filePath, queryParams } = parseDestination(destination);

  if (!filePath.endsWith('.ts')) {
    continue;
  }

  const expressPath = vercelSourceToExpress(source);
  const hasQueryParams = Object.keys(queryParams).length > 0;

  apiRoutes.push({ expressPath, filePath, queryParams, hasQueryParams });

  app.all(expressPath, async (req, res) => {
    try {
      if (hasQueryParams) {
        const resolved = resolveQueryParams(req.params, queryParams);
        for (const [key, value] of Object.entries(resolved)) {
          if (!req.query[key]) {
            req.query[key] = value;
          }
        }
      }

      const handler = await loadHandler(filePath);
      if (!handler) {
        return res.status(404).json({ error: `Handler not found: ${filePath}` });
      }

      await handler(req, res);
    } catch (error) {
      console.error(`[API Error] ${req.method} ${req.path}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });
}

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const distDir = path.resolve(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.status(503).json({ error: 'Frontend not built. Run build on the VPS.' });
  });
}

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`\n[Pisairtel SMS] Server running on port ${PORT}`);
  console.log(`[Pisairtel SMS] ${apiRoutes.length} API routes loaded`);
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
