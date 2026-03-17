import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CATALOG_PATH = path.join(__dirname, '..', 'seed', 'role_permissions.seed.json');
const CACHE_TTL_MS = Number(process.env.PERMISSION_CATALOG_TTL_MS || 60_000);

let cachedCatalog = null;
let cachedAt = 0;

const normalizeCatalog = (catalog) => {
  const unique = new Set();
  for (const entry of catalog) {
    const value = String(entry || '').trim();
    if (value) unique.add(value);
  }
  return Array.from(unique).sort();
};

const extractFallbackCatalog = (seed) => {
  const entries = [];
  if (Array.isArray(seed?.platform_permissions)) {
    for (const item of seed.platform_permissions) {
      if (item?.permission) entries.push(item.permission);
    }
  }
  if (Array.isArray(seed?.tenant_permissions)) {
    for (const item of seed.tenant_permissions) {
      if (item?.permission) entries.push(item.permission);
    }
  }
  return normalizeCatalog(entries);
};

export const getPermissionCatalog = async () => {
  if (cachedCatalog && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  const raw = await fs.readFile(DEFAULT_CATALOG_PATH, 'utf-8');
  const seed = JSON.parse(raw);
  const catalog = Array.isArray(seed?.permission_catalog)
    ? normalizeCatalog(seed.permission_catalog)
    : extractFallbackCatalog(seed);

  cachedCatalog = catalog;
  cachedAt = Date.now();
  return catalog;
};
