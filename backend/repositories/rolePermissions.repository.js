// backend/repositories/rolePermissions.repository.js
import { query as dbQuery } from './db.repository.js';

export const fetchRolePermissions = async ({ clientId, scope, role }) => {
  const whereClauses = [];
  const params = [];

  if (clientId) {
    if (scope === 'client') {
      whereClauses.push(`client_id = $${params.length + 1}`);
    } else {
      whereClauses.push(`(client_id = $${params.length + 1} OR client_id IS NULL)`);
    }
    params.push(clientId);
  }

  if (role) {
    whereClauses.push(`role = $${params.length + 1}`);
    params.push(role);
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

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
