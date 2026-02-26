// backend/schemas/curriculum.schema.js
import { AppError } from '../utils/errors.js';

export const parseNullableInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AppError(`${fieldName} must be an integer`, 400);
  }
  return parsed;
};

export const parseRequiredInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AppError(`${fieldName} must be an integer`, 400);
  }
  return parsed;
};

export const parseBoolean = (value, fieldName) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new AppError(`${fieldName} must be a boolean`, 400);
};

export const requireString = (value, fieldName) => {
  if (!value || !String(value).trim()) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return String(value).trim();
};
