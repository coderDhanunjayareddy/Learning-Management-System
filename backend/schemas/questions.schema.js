// backend/schemas/questions.schema.js
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

export const requireString = (value, fieldName) => {
  if (!value || !String(value).trim()) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return String(value).trim();
};

export const parseStringArray = (value, fieldName) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new AppError(`${fieldName} must be an array`, 400);
  }
  return value.map((entry) => String(entry));
};

export const parseStringArrayParam = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  throw new AppError(`${fieldName} must be an array or comma-separated string`, 400);
};
