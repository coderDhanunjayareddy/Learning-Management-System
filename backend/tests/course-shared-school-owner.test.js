import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { ensureCourseActionAccess, listCoursesForRequest } from '../services/courseShared.service.js';

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

const makeReq = () => ({
  baseUrl: '/api/school-owner',
  user: {
    id: 44,
    role: 'school_owner',
    client_id: 301,
  },
});

test('listCoursesForRequest returns school-owner assigned courses with read-only flags for assigned-only courses', async (t) => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);
    calls.push({ text: normalized, params });

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
    ) {
      return { rows: [] };
    }

    if (normalized.includes('select distinct school_id from school_memberships')) {
      return { rows: [{ school_id: 11 }, { school_id: 12 }] };
    }

    if (normalized.includes('from courses c')) {
      return {
        rows: [
          {
            id: 5,
            title: 'Shared Algebra',
            description: 'Shared course',
            published: true,
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: null,
            created_by: 99,
            client_id: 301,
            assigned_school_ids: [11],
            assigned_school_names: ['North School'],
            assigned_school_count: 1,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const courses = await listCoursesForRequest(makeReq());

  assert.equal(courses.length, 1);
  assert.equal(courses[0].is_assigned_to_my_school, true);
  assert.equal(courses[0].is_created_by_me, false);
  assert.equal(courses[0].can_manage_content, false);
  assert.equal(courses[0].can_edit_course, false);
  assert.equal(courses[0].can_enroll, true);
  assert.equal(courses[0].assigned_school_count, 1);
  assert.ok(calls.some((call) => call.text.includes('exists ( select 1 from course_school_assignments scoped_csa')));
});

test('ensureCourseActionAccess blocks school owners from updating assigned courses they did not create', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
    ) {
      return { rows: [] };
    }

    if (normalized.includes('select distinct school_id from school_memberships')) {
      return { rows: [{ school_id: 11 }] };
    }

    if (normalized.includes('from courses c') && normalized.includes('where c.id = $1')) {
      return {
        rows: [
          {
            id: Number(params[0]),
            title: 'Shared Algebra',
            description: 'Shared course',
            published: false,
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: null,
            created_by: 99,
            client_id: 301,
            assigned_school_ids: [11],
            assigned_school_names: ['North School'],
            assigned_school_count: 1,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await ensureCourseActionAccess({
    courseId: 5,
    req: makeReq(),
    action: 'update',
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.error, 'Assigned courses are read-only for school owners.');
});
