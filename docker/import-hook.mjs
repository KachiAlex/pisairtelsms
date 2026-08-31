/**
 * Custom import resolver hook for Docker deployment
 * 
 * Intercepts imports of @vercel/postgres and redirects to our
 * pg.Pool-based shim that works with any PostgreSQL connection.
 */
import { resolve as pathResolve } from 'node:path';

export async function resolve(specifier, context, nextResolve) {
  // Redirect @vercel/postgres to our shim
  if (specifier === '@vercel/postgres' || specifier.startsWith('@vercel/postgres/')) {
    const shimPath = pathResolve(process.cwd(), 'docker/vercel-postgres-shim.mjs');
    return nextResolve(shimPath, context);
  }

  // Pass through everything else
  return nextResolve(specifier, context);
}
