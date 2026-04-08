// backend/services/rolePermissions.service.js
import { AppError } from '../utils/errors.js';
import {
  parseClientId,
  requirePermission,
  requireRole,
} from '../schemas/rolePermissions.schema.js';
import * as rolePermissionsRepo from '../repositories/rolePermissions.repository.js';
import { getPermissionCatalog } from '../utils/permissionCatalog.js';
import { invalidatePermissionCacheForRoleClient } from '../middleware/auth.js';

const ensureSuperAdmin = (user) => {
  if (user?.role !== 'super_admin') {
    throw new AppError('Access denied', 403);
  }
};

const ensureClientAdmin = (user) => {
  if (user?.role !== 'client_admin') {
    throw new AppError('Access denied', 403);
  }
};

const requireClientId = (clientId) => {
  if (!clientId) {
    throw new AppError('client_id is required', 400);
  }
  return clientId;
};

export const listRolePermissions = async ({ user, query }) => {
  if (user?.role === 'super_admin') {
    const clientId = parseClientId(query?.client_id);
    const scope = query?.scope || 'all';
    const role = query?.role ? requireRole(query?.role) : null;
    const result = await rolePermissionsRepo.fetchRolePermissions({ clientId, scope, role });

    if (!role) {
      return result.rows;
    }

    const catalog = await getPermissionCatalog();
    const byPermission = new Map();
    for (const row of result.rows) {
      if (!byPermission.has(row.permission)) {
        byPermission.set(row.permission, row);
      }
    }

    return catalog.map((permission) => {
      const existing = byPermission.get(permission);
      if (existing) return existing;
      return {
        id: null,
        client_id: clientId ?? null,
        role,
        permission,
        granted: false,
      };
    });
  }

  ensureClientAdmin(user);
  const clientId = requireClientId(parseClientId(user?.client_id));
  if (query?.client_id && parseClientId(query?.client_id) !== clientId) {
    throw new AppError('Access denied', 403);
  }
  const scope = query?.scope === 'all' ? 'all' : 'client';
  const role = query?.role ? requireRole(query?.role) : null;
  const result = await rolePermissionsRepo.fetchRolePermissions({ clientId, scope, role });
  if (!role) {
    return result.rows;
  }

  const catalog = await getPermissionCatalog();
  const byPermission = new Map();
  for (const row of result.rows) {
    if (!byPermission.has(row.permission)) {
      byPermission.set(row.permission, row);
    }
  }

  return catalog.map((permission) => {
    const existing = byPermission.get(permission);
    if (existing) return existing;
    return {
      id: null,
      client_id: clientId,
      role,
      permission,
      granted: false,
    };
  });
};

export const upsertRolePermission = async ({ user, body }) => {
  if (user?.role === 'super_admin') {
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
    invalidatePermissionCacheForRoleClient(role, clientId ?? null);
    return result.rows[0];
  }

  ensureClientAdmin(user);
  const role = requireRole(body?.role);
  if (['super_admin', 'content_authorizer'].includes(role)) {
    throw new AppError('Access denied', 403);
  }

  const permission = requirePermission(body?.permission);
  const granted = body?.granted !== false;
  const clientId = requireClientId(parseClientId(user?.client_id));
  if (body?.client_id && parseClientId(body?.client_id) !== clientId) {
    throw new AppError('Access denied', 403);
  }

  const result = await rolePermissionsRepo.upsertRolePermission({
    clientId,
    role,
    permission,
    granted,
  });
  invalidatePermissionCacheForRoleClient(role, clientId);
  return result.rows[0];
};

export const deleteRolePermission = async ({ user, params }) => {
  const id = Number(params?.id);
  if (!Number.isInteger(id)) {
    throw new AppError('id must be an integer', 400);
  }

  if (user?.role === 'super_admin') {
    const existing = await rolePermissionsRepo.fetchRolePermissionById(id);
    if (existing.rows.length === 0) {
      throw new AppError('Role permission not found', 404);
    }

    const permissionRow = existing.rows[0];
    const result = await rolePermissionsRepo.deleteRolePermission(id);
    if (result.rows.length === 0) {
      throw new AppError('Role permission not found', 404);
    }
    invalidatePermissionCacheForRoleClient(permissionRow.role, permissionRow.client_id ?? null);
    return { success: true };
  }

  ensureClientAdmin(user);
  const clientId = requireClientId(parseClientId(user?.client_id));
  const existing = await rolePermissionsRepo.fetchRolePermissionById(id);
  if (existing.rows.length === 0) {
    throw new AppError('Role permission not found', 404);
  }

  const permissionRow = existing.rows[0];
  if (Number(permissionRow.client_id) !== Number(clientId)) {
    throw new AppError('Access denied', 403);
  }
  if (['super_admin', 'content_authorizer'].includes(permissionRow.role)) {
    throw new AppError('Access denied', 403);
  }

  const result = await rolePermissionsRepo.deleteRolePermission(id);
  if (result.rows.length === 0) {
    throw new AppError('Role permission not found', 404);
  }
  invalidatePermissionCacheForRoleClient(permissionRow.role, permissionRow.client_id ?? null);
  return { success: true };
};


