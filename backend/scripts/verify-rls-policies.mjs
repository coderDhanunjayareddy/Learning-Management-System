import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

const expectedTables = (process.env.RLS_EXPECTED_TABLES ||
  'questions,content_items,scorm_attempts,refresh_tokens,user_permissions,role_permissions')
  .split(',')
  .map((table) => table.trim())
  .filter(Boolean);

if (expectedTables.length === 0) {
  console.error('No tables configured for RLS verification.');
  process.exit(1);
}

const result = await pool.query(
  `
  SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    COUNT(p.policyname) AS policy_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policies p
    ON p.schemaname = n.nspname
   AND p.tablename = c.relname
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname = ANY($1::text[])
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname
  `,
  [expectedTables]
);

const tableByName = new Map(result.rows.map((row) => [row.table_name, row]));
const failures = [];

for (const tableName of expectedTables) {
  const row = tableByName.get(tableName);
  if (!row) {
    failures.push(`${tableName}: table not found`);
    continue;
  }
  if (!row.rls_enabled) {
    failures.push(`${tableName}: RLS disabled`);
  }
  if (Number(row.policy_count) === 0) {
    failures.push(`${tableName}: no policies defined`);
  }
}

await pool.end();

if (failures.length > 0) {
  console.error('RLS verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`RLS verification passed for ${expectedTables.length} table(s).`);
