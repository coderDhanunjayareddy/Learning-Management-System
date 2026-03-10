// Usage:
//   node backend/scripts/run_sql.mjs backend/scripts/questions_migration_20260309.sql
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPathArg = process.argv[2];
if (!sqlPathArg) {
  console.error('Missing SQL file path. Example: node backend/scripts/run_sql.mjs backend/scripts/questions_migration_20260309.sql');
  process.exit(1);
}

const sqlPath = path.isAbsolute(sqlPathArg) ? sqlPathArg : path.resolve(__dirname, '..', sqlPathArg);

if (!fs.existsSync(sqlPath)) {
  console.error(`SQL file not found: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

try {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('SQL executed successfully:', sqlPath);
  } finally {
    client.release();
  }
  process.exit(0);
} catch (error) {
  console.error('Failed to execute SQL:', error);
  process.exit(1);
}
