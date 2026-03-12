// backend/services/userPermissions.service.js
import { AppError } from '../utils/errors.js';
import { requirePermission } from '../schemas/rolePermissions.schema.js';
import * as userPermissionsRepo from '../repositories/userPermissions.repository.js';

const ensureAllowedAdmin = (user) => {
  if (!['super_admin', 'client_admin'].includes(user?.role)) {
    throw new AppError('Access denied', 403);
  }
};

const requireUserId = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AppError('user_id must be an integer', 400);
  }
  return parsed;
};

const ensureUserScope = async (requester, userId) => {
  if (requester?.role === 'super_admin') return;

  const result = await userPermissionsRepo.fetchUserSummary(userId);
  const target = result.rows[0];
  if (!target) {
    throw new AppError('User not found', 404);
  }

  const requesterClientId = requester?.client_id ?? null;
  if (!requesterClientId || target.client_id !== requesterClientId) {
    throw new AppError('Access denied', 403);
  }
};

export const listUserPermissions = async ({ user, query }) => {
  ensureAllowedAdmin(user);
  const userId = requireUserId(query?.user_id);
  await ensureUserScope(user, userId);
  const result = await userPermissionsRepo.fetchUserPermissions(userId);
  return result.rows;
};

export const upsertUserPermission = async ({ user, body }) => {
  ensureAllowedAdmin(user);
  const userId = requireUserId(body?.user_id);
  await ensureUserScope(user, userId);
  const permission = requirePermission(body?.permission);
  const granted = body?.granted !== false;
  const result = await userPermissionsRepo.upsertUserPermission({
    userId,
    permission,
    granted,
  });
  return result.rows[0];
};

export const deleteUserPermission = async ({ user, params }) => {
  ensureAllowedAdmin(user);
  const id = Number(params?.id);
  if (!Number.isInteger(id)) {
    throw new AppError('id must be an integer', 400);
  }
  const existing = await userPermissionsRepo.fetchUserPermissionById(id);
  if (existing.rows.length === 0) {
    throw new AppError('User permission not found', 404);
  }
  await ensureUserScope(user, existing.rows[0].user_id);
  const result = await userPermissionsRepo.deleteUserPermission(id);
  if (result.rows.length === 0) {
    throw new AppError('User permission not found', 404);
  }
  return { success: true };
};
