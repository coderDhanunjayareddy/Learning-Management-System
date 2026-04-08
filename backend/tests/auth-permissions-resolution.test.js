import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import {
  invalidatePermissionCacheForUser,
  loadPermissions,
} from '../middleware/auth.js';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const loadForRequest = async (req) => {
  const res = makeRes();
  let nextCalled = false;

  await loadPermissions(req, res, () => {
    nextCalled = true;
  });

  return { res, nextCalled };
};

test('tenant roles ignore global role permission rows and use client-scoped rows only', async (t) => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (text, params = []) => {
    const normalizedText = String(text).replace(/\s+/g, ' ').trim();
    calls.push({ text: normalizedText, params });

    if (normalizedText.includes('FROM role_permissions')) {
      return {
        rows: [
          { permission: 'courses.read', granted: false, client_id: 42 },
        ],
      };
    }

    if (normalizedText.includes('FROM user_permissions')) {
      return { rows: [] };
    }

    throw new Error(`Unexpected query: ${normalizedText}`);
  };

  t.after(() => {
    pool.query = originalQuery;
    invalidatePermissionCacheForUser(1001);
  });

  invalidatePermissionCacheForUser(1001);

  const req = {
    user: { id: 1001, role: 'teacher' },
    clientId: 42,
  };

  const { res, nextCalled } = await loadForRequest(req);

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.equal(req.permissions.get('courses.read'), false);
  assert.equal(calls.length, 2);
  assert.match(calls[0].text, /where role = \$1 and client_id = \$2/i);
  assert.doesNotMatch(calls[0].text, /client_id is null/i);
});

test('platform roles can still merge global and client-scoped role permission rows', async (t) => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (text, params = []) => {
    const normalizedText = String(text).replace(/\s+/g, ' ').trim();
    calls.push({ text: normalizedText, params });

    if (normalizedText.includes('FROM role_permissions')) {
      return {
        rows: [
          { permission: 'courses.read', granted: true, client_id: null },
        ],
      };
    }

    if (normalizedText.includes('FROM user_permissions')) {
      return { rows: [] };
    }

    throw new Error(`Unexpected query: ${normalizedText}`);
  };

  t.after(() => {
    pool.query = originalQuery;
    invalidatePermissionCacheForUser(1002);
  });

  invalidatePermissionCacheForUser(1002);

  const req = {
    user: { id: 1002, role: 'content_authorizer' },
    clientId: 42,
  };

  const { res, nextCalled } = await loadForRequest(req);

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.equal(req.permissions.get('courses.read'), true);
  assert.equal(calls.length, 2);
  assert.match(calls[0].text, /client_id = \$2 or client_id is null/i);
});

test('user overrides still win over tenant role permissions', async (t) => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (text, params = []) => {
    const normalizedText = String(text).replace(/\s+/g, ' ').trim();
    calls.push({ text: normalizedText, params });

    if (normalizedText.includes('FROM role_permissions')) {
      return {
        rows: [
          { permission: 'courses.read', granted: false, client_id: 77 },
        ],
      };
    }

    if (normalizedText.includes('FROM user_permissions')) {
      return {
        rows: [
          { permission: 'courses.read', granted: true },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalizedText}`);
  };

  t.after(() => {
    pool.query = originalQuery;
    invalidatePermissionCacheForUser(1003);
  });

  invalidatePermissionCacheForUser(1003);

  const req = {
    user: { id: 1003, role: 'school_owner' },
    clientId: 77,
  };

  const { res, nextCalled } = await loadForRequest(req);

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.equal(req.permissions.get('courses.read'), true);
  assert.equal(calls.length, 2);
});
