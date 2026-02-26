// backend/services/rolePermissions.service.js
import { AppError } from '../utils/errors.js';
import {
  parseClientId,
  requirePermission,
  requireRole,
} from '../schemas/rolePermissions.schema.js';
import * as rolePermissionsRepo from '../repositories/rolePermissions.repository.js';

const ensureSuperAdmin = (user) => {
  if (user?.role !== 'super_admin') {
    throw new AppError('Access denied', 403);
  }
};

export const listRolePermissions = async ({ user, query }) => {
  ensureSuperAdmin(user);
  const clientId = parseClientId(query?.client_id);
  const scope = query?.scope || 'all';
  const result = await rolePermissionsRepo.fetchRolePermissions({ clientId, scope });
  return result.rows;
};

export const upsertRolePermission = async ({ user, body }) => {
  ensureSuperAdmin(user);
  const role = requireRole(body?.role);
  const permission = requirePermission(body?.permission);
  const granted = body?.granted !== false;
  const clientId = parseClientId(body?.client_id);

  if (['client_admin', 'school_owner', 'teacher', 'student'].includes(role) && !clientId) {
    throw new AppError('client_id is required for this role', 400);
  }

  const result = await rolePermissionsRepo.upsertRolePermission({
    clientId,
    role,
    permission,
    granted,
  });
  return result.rows[0];
};

export const deleteRolePermission = async ({ user, params }) => {
  ensureSuperAdmin(user);
  const id = Number(params?.id);
  if (!Number.isInteger(id)) {
    throw new AppError('id must be an integer', 400);
  }
  const result = await rolePermissionsRepo.deleteRolePermission(id);
  if (result.rows.length === 0) {
    throw new AppError('Role permission not found', 404);
  }
  return { success: true };
};


