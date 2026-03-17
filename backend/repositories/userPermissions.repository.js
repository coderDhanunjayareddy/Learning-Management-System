// backend/repositories/userPermissions.repository.js
import { query as dbQuery } from './db.repository.js';

export const fetchUserPermissions = async (userId) => {
  return dbQuery(
    `
    SELECT id, user_id, permission, granted
    FROM user_permissions
    WHERE user_id = $1
    ORDER BY permission
    `,
    [userId]
  );
};

export const fetchUserSummary = async (userId) => {
  return dbQuery(
    `
    SELECT id, client_id, role
    FROM users
    WHERE id = $1
    `,
    [userId]
  );
};

export const fetchUserPermissionById = async (id) => {
  return dbQuery(
    `
    SELECT up.id, up.user_id, up.permission, up.granted, u.client_id, u.role
    FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE up.id = $1
    `,
    [id]
  );
};

export const upsertUserPermission = async ({ userId, permission, granted }) => {
  return dbQuery(
    `
    INSERT INTO user_permissions (user_id, permission, granted)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, permission)
    DO UPDATE SET granted = EXCLUDED.granted
    RETURNING *
    `,
    [userId, permission, granted]
  );
};

export const deleteUserPermission = async (id) => {
  return dbQuery(`DELETE FROM user_permissions WHERE id = $1 RETURNING id`, [id]);
};
