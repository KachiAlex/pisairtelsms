/**
 * Node.js custom import loader for Docker deployment
 * 
 * Redirects @vercel/postgres to our pg-based shim
 * so the app works with any PostgreSQL connection string.
 * 
 * Usage: node --import ./docker/import-shim.mjs server.mjs
 */
import { register } from 'node:module';

// Register a custom resolver that maps @vercel/postgres to our shim
const shimUrl = new URL('./vercel-postgres-shim.mjs', import.meta.url);

register('./docker/import-hook.mjs', import.meta.url);
