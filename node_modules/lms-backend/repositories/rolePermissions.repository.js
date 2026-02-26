// backend/repositories/rolePermissions.repository.js
import { query as dbQuery } from './db.repository.js';

export const fetchRolePermissions = async ({ clientId, scope }) => {
  const where = clientId
    ? scope === 'client'
      ? 'WHERE client_id = $1'
      : 'WHERE client_id = $1 OR client_id IS NULL'
    : '';
  const params = clientId ? [clientId] : [];

  return dbQuery(
    `
    SELECT id, client_id, role, permission, granted
    FROM role_permissions
    ${where}
    ORDER BY client_id NULLS LAST, role, permission
    `,
    params
  );
};

export const upsertRolePermission = async ({ clientId, role, permission, granted }) => {
  return dbQuery(
    `
    INSERT INTO role_permissions (client_id, role, permission, granted)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (client_id, role, permission)
    DO UPDATE SET granted = EXCLUDED.granted
    RETURNING *
    `,
    [clientId, role, permission, granted]
  );
};

export const deleteRolePermission = async (id) => {
  return dbQuery(`DELETE FROM role_permissions WHERE id = $1 RETURNING id`, [id]);
};
