import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { getAllCourses } from '../services/admin.service.js';

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

const createMockQuery = (rows) => {
  const calls = [];

  const query = async (text, params = []) => {
    calls.push({
      text: String(text).replace(/\s+/g, ' ').trim(),
      params,
    });
    return { rows };
  };

  return { query, calls };
};

test('getAllCourses does not force published-only filter for teacher tenant users', async (t) => {
  const mock = createMockQuery([
    { id: 2, title: 'Draft Physics', description: null, published: false, created_at: '2026-04-01T10:00:00.000Z' },
    { id: 1, title: 'Published Chemistry', description: null, published: true, created_at: '2026-04-02T10:00:00.000Z' },
  ]);

  const originalQuery = pool.query;
  pool.query = mock.query;
  t.after(() => {
    pool.query = originalQuery;
  });

  const req = {
    user: {
      role: 'teacher',
      client_id: 201,
    },
  };
  const res = makeRes();

  await getAllCourses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 2);
  assert.equal(mock.calls.length, 1);
  assert.match(mock.calls[0].text, /where client_id = \$1/i);
  assert.doesNotMatch(mock.calls[0].text, /published = true/i);
  assert.deepEqual(mock.calls[0].params, [201]);
});

test('getAllCourses still forces published-only filter for student users', async (t) => {
  const mock = createMockQuery([
    { id: 1, title: 'Published Chemistry', description: null, published: true, created_at: '2026-04-02T10:00:00.000Z' },
  ]);

  const originalQuery = pool.query;
  pool.query = mock.query;
  t.after(() => {
    pool.query = originalQuery;
  });

  const req = {
    user: {
      role: 'student',
      client_id: 201,
    },
  };
  const res = makeRes();

  await getAllCourses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
  assert.equal(mock.calls.length, 1);
  assert.match(mock.calls[0].text, /published = true/i);
  assert.deepEqual(mock.calls[0].params, [201]);
});
