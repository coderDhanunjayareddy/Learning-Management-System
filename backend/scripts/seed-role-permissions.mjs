import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

const getArgValue = (name) => {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) return null;
  return arg.split('=').slice(1).join('=');
};

const parseClientId = (value) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error('client_id must be an integer');
  }
  return parsed;
};

const resolveFilePath = () => {
  const fileArg = getArgValue('--file');
  if (fileArg) {
    return path.isAbsolute(fileArg)
      ? fileArg
      : path.join(process.cwd(), fileArg);
  }
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, '..', 'seed', 'role_permissions.seed.json');
};

const main = async () => {
  const clientId = parseClientId(getArgValue('--client_id'));
  const filePath = resolveFilePath();

  const raw = await fs.readFile(filePath, 'utf-8');
  const seed = JSON.parse(raw);

  const platformPermissions = Array.isArray(seed.platform_permissions)
    ? seed.platform_permissions
    : [];
  const tenantPermissions = Array.isArray(seed.tenant_permissions)
    ? seed.tenant_permissions
    : [];

  if (tenantPermissions.length > 0 && !clientId) {
    throw new Error('client_id is required to seed tenant_permissions');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const entry of platformPermissions) {
      const { role, permission, granted } = entry;
      if (!role || !permission) continue;
      await client.query(
        `DELETE FROM role_permissions WHERE client_id IS NULL AND role = $1 AND permission = $2`,
        [role, permission]
      );
      await client.query(
        `INSERT INTO role_permissions (client_id, role, permission, granted)
         VALUES (NULL, $1, $2, $3)`,
        [role, permission, granted !== false]
      );
    }

    for (const entry of tenantPermissions) {
      const { role, permission, granted } = entry;
      if (!role || !permission) continue;
      await client.query(
        `
        INSERT INTO role_permissions (client_id, role, permission, granted)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (client_id, role, permission)
        DO UPDATE SET granted = EXCLUDED.granted
        `,
        [clientId, role, permission, granted !== false]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
    console.log(`Platform permissions inserted: ${platformPermissions.length}`);
    console.log(`Tenant permissions inserted for client_id=${clientId}: ${tenantPermissions.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
