// backend/schemas/rolePermissions.schema.js
import { AppError } from '../utils/errors.js';

export const VALID_USER_ROLES = [
  'super_admin',
  'content_authorizer',
  'client_admin',
  'school_owner',
  'teacher',
  'student',
];

export const requireRole = (role) => {
  if (!role) {
    throw new AppError('role is required', 400);
  }
  if (!VALID_USER_ROLES.includes(role)) {
    throw new AppError('Invalid role', 400);
  }
  return role;
};

export const requirePermission = (permission) => {
  if (!permission || !String(permission).trim()) {
    throw new AppError('permission is required', 400);
  }
  return String(permission).trim();
};

export const parseClientId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AppError('client_id must be an integer', 400);
  }
  return parsed;
};
