// backend/repositories/db.repository.js
import pool from '../config/db.js';

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
