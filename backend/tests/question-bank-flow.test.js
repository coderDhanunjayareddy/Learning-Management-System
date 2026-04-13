import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import {
  approveQuestion,
  bulkUploadQuestions,
  createQuestion,
  getQuestionById,
  listQuestions,
  rejectQuestion,
  updateQuestion,
} from '../services/questions.service.js';

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

const parseInsertColumns = (sql) => {
  const match = sql.match(/insert into questions \((.+?)\)\s+values/is);
  if (!match) return [];
  return match[1].split(',').map((column) => column.trim());
};

const parsePassageInsertColumns = (sql) => {
  const match = sql.match(/insert into comprehension_passages \((.+?)\)\s+values/is);
  if (!match) return [];
  return match[1].split(',').map((column) => column.trim());
};

const createMockDb = () => {
  const data = {
    subjects: [
      { id: 1001, client_id: 101, grade_id: 501, program_id: 401, name: 'Physics' },
      { id: 1002, client_id: 202, grade_id: 502, program_id: 402, name: 'Physics' },
    ],
    chapters: [
      { id: 2001, subject_id: 1001, client_id: 101, name: 'Thermodynamics' },
      { id: 2002, subject_id: 1002, client_id: 202, name: 'Thermodynamics' },
    ],
    comprehensionPassages: [
      {
        id: 901,
        client_id: 101,
        school_id: null,
        title: { html: '<p>Heat Transfer Passage</p>' },
        passage_content: { html: '<p>Passage body</p>' },
        subject_id: 1001,
        chapter_id: 2001,
        topic_id: null,
        created_by: 11,
      },
    ],
    questions: [],
    nextQuestionId: 1,
    nextPassageId: 1000,
  };

  const enrichQuestion = (question) => {
    const subject = data.subjects.find((item) => item.id === question.subject_id) ?? null;
    return {
      ...question,
      grade_id: subject?.grade_id ?? null,
      program_id: subject?.program_id ?? null,
    };
  };

  const applyQuestionFilters = (sql, params) => {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    let rows = [...data.questions];

    const clientMatch = normalized.match(/q\.client_id = \$(\d+)/);
    if (clientMatch) {
      const clientId = Number(params[Number(clientMatch[1]) - 1]);
      rows = rows.filter((question) => Number(question.client_id) === clientId);
    }

    if (normalized.includes('q.school_id is null')) {
      rows = rows.filter((question) => question.school_id == null);
    }

    const idMatch = normalized.match(/q\.id = \$(\d+)/);
    if (idMatch) {
      const questionId = Number(params[Number(idMatch[1]) - 1]);
      rows = rows.filter((question) => Number(question.id) === questionId);
    }

    const createdByMatch = normalized.match(/\(q\.status = 'approved' or q\.created_by = \$(\d+)\)/);
    if (createdByMatch) {
      const userId = Number(params[Number(createdByMatch[1]) - 1]);
      rows = rows.filter((question) => question.status === 'approved' || Number(question.created_by) === userId);
    }

    if (normalized.includes("q.status <> 'archived'")) {
      rows = rows.filter((question) => question.status !== 'archived');
    }

    const searchMatch = normalized.match(/plainto_tsquery\('simple', \$(\d+)\)/);
    if (searchMatch) {
      const term = String(params[Number(searchMatch[1]) - 1] ?? '').trim().toLowerCase();
      rows = rows.filter((question) => {
        const haystack = JSON.stringify(question.question_text) + ' ' + JSON.stringify(question.options);
        return haystack.toLowerCase().includes(term);
      });
    }

    return rows.map(enrichQuestion);
  };

  return {
    comprehensionPassages: data.comprehensionPassages,
    async query(text, params = []) {
      const sql = String(text);
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

      if (normalized.includes("from information_schema.columns") && normalized.includes("table_name = 'questions'")) {
        return {
          rows: [
            { column_name: 'comprehension_passage' },
            { column_name: 'comprehension_questions' },
            { column_name: 'comprehension_passage_id' },
          ],
        };
      }

      if (normalized.includes("from information_schema.tables") && normalized.includes("table_name = 'comprehension_passages'")) {
        return { rows: [{ '?column?': 1 }] };
      }

      if (normalized.includes('from subjects s left join grades g on g.id = s.grade_id where s.id = $1')) {
        const subject = data.subjects.find((item) => item.id === Number(params[0]));
        if (!subject) return { rows: [] };
        if (params[1] !== undefined && Number(subject.client_id) !== Number(params[1])) return { rows: [] };
        return {
          rows: [
            {
              id: subject.id,
              grade_id: subject.grade_id,
              program_id: subject.program_id,
              client_id: subject.client_id,
            },
          ],
        };
      }

      if (normalized.includes('from chapters c join subjects s on s.id = c.subject_id where c.id = $1')) {
        const chapter = data.chapters.find((item) => item.id === Number(params[0]));
        if (!chapter) return { rows: [] };
        if (params[1] !== undefined && Number(chapter.client_id) !== Number(params[1])) return { rows: [] };
        return {
          rows: [
            {
              id: chapter.id,
              subject_id: chapter.subject_id,
              client_id: chapter.client_id,
            },
          ],
        };
      }

      if (normalized.startsWith('select school_id from school_memberships where user_id = $1')) {
        return { rows: [] };
      }

      if (normalized.startsWith('insert into questions (')) {
        const columns = parseInsertColumns(sql);
        const jsonColumns = new Set([
          'question_text',
          'options',
          'correct_answer',
          'solution',
          'comprehension_passage',
          'comprehension_questions',
        ]);

        const record = { id: data.nextQuestionId++, approved_by: null, approved_at: null };
        columns.forEach((column, index) => {
          const value = params[index];
          record[column] =
            jsonColumns.has(column) && typeof value === 'string' ? JSON.parse(value) : value;
        });
        record.created_at = new Date(Date.UTC(2026, 2, 25, 10, data.questions.length)).toISOString();
        record.updated_at = record.created_at;
        data.questions.push(record);
        return { rows: [{ id: record.id }] };
      }

      if (normalized.startsWith('insert into comprehension_passages (')) {
        const columns = parsePassageInsertColumns(sql);
        const jsonColumns = new Set(['title', 'passage_content']);
        const record = { id: data.nextPassageId++ };
        columns.forEach((column, index) => {
          const value = params[index];
          record[column] =
            jsonColumns.has(column) && typeof value === 'string' ? JSON.parse(value) : value;
        });
        data.comprehensionPassages.push(record);
        return { rows: [{ ...record }] };
      }

      if (normalized.startsWith('select * from comprehension_passages where id = $1')) {
        const passage = data.comprehensionPassages.find((item) => Number(item.id) === Number(params[0]));
        return { rows: passage ? [{ ...passage }] : [] };
      }

      if (normalized.startsWith('select id, title, passage_content from comprehension_passages where id = any($1::int[])')) {
        const ids = Array.isArray(params[0]) ? params[0].map((entry) => Number(entry)) : [];
        return {
          rows: data.comprehensionPassages
            .filter((item) => ids.includes(Number(item.id)))
            .map((item) => ({
              id: item.id,
              title: item.title,
              passage_content: item.passage_content,
            })),
        };
      }

      if (
        normalized.includes('select q.*, s.grade_id, g.program_id') &&
        normalized.includes('from questions q') &&
        normalized.includes('where q.id = $1') &&
        !normalized.includes('order by')
      ) {
        const rows = applyQuestionFilters(sql, params);
        return { rows: rows.slice(0, 1) };
      }

      if (normalized.startsWith('select count(*) as total from questions q')) {
        const rows = applyQuestionFilters(sql, params);
        return { rows: [{ total: String(rows.length) }] };
      }

      if (
        normalized.includes('select q.*, s.grade_id, g.program_id') &&
        normalized.includes('from questions q') &&
        normalized.includes('order by q.created_at desc')
      ) {
        const rows = applyQuestionFilters(sql, params)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const pageSize = Number(params[params.length - 2]);
        const offset = Number(params[params.length - 1]);
        return { rows: rows.slice(offset, offset + pageSize) };
      }

      if (normalized.startsWith('select * from questions where id = $1')) {
        const question = data.questions.find((item) => Number(item.id) === Number(params[0]));
        return { rows: question ? [{ ...question }] : [] };
      }

      if (normalized.startsWith("update questions set status = 'approved'")) {
        const question = data.questions.find((item) => Number(item.id) === Number(params[0]));
        if (!question || question.status !== 'draft') return { rows: [] };
        question.status = 'approved';
        question.approved_by = params[1];
        question.approved_at = new Date(Date.UTC(2026, 2, 25, 11, 0, 0)).toISOString();
        question.rejection_reason = null;
        question.updated_at = question.approved_at;
        return { rows: [{ ...question }] };
      }

      if (normalized.startsWith("update questions set status = 'rejected'")) {
        const question = data.questions.find((item) => Number(item.id) === Number(params[0]));
        if (!question || question.status !== 'draft') return { rows: [] };
        question.status = 'rejected';
        question.approved_by = params[1];
        question.approved_at = null;
        question.rejection_reason = params[2];
        question.updated_at = new Date(Date.UTC(2026, 2, 25, 11, 15, 0)).toISOString();
        return { rows: [{ ...question }] };
      }

      if (
        normalized.startsWith('update questions set ') &&
        normalized.includes('updated_at = now() where id = $') &&
        !normalized.includes("status = 'approved'") &&
        !normalized.includes("status = 'rejected'")
      ) {
        const questionId = Number(params[params.length - 1]);
        const question = data.questions.find((item) => Number(item.id) === questionId);
        if (!question) return { rows: [] };

        const setMatch = sql.match(/update questions set (.+), updated_at = now\(\) where id = \$\d+/is);
        const assignments = setMatch
          ? setMatch[1].split(',').map((part) => part.trim()).filter(Boolean)
          : [];
        const jsonColumns = new Set([
          'question_text',
          'options',
          'correct_answer',
          'solution',
          'comprehension_passage',
          'comprehension_questions',
        ]);

        assignments.forEach((assignment, index) => {
          const columnMatch = assignment.match(/^([a-z_]+)\s*=\s*\$\d+$/i);
          if (!columnMatch) return;
          const column = columnMatch[1];
          const value = params[index];
          question[column] =
            jsonColumns.has(column) && typeof value === 'string' ? JSON.parse(value) : value;
        });

        question.updated_at = new Date(Date.UTC(2026, 2, 25, 12, 0, 0)).toISOString();
        return { rows: [{ id: question.id }] };
      }

      throw new Error(`Unhandled mock query: ${normalized}`);
    },
  };
};

test('Question Bank flow: create, approve, search, and isolate tenants', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };
  const teacherTenantB = { id: 22, role: 'teacher', client_id: 202 };
  const adminTenantA = { id: 31, role: 'client_admin', client_id: 101 };
  const adminTenantB = { id: 32, role: 'client_admin', client_id: 202 };

  const createReq = {
    user: teacherTenantA,
    body: {
      question_type: 'mcq_single',
      question_text: { html: '<p>Thermo test question</p>' },
      options: [
        { id: 'opt-1', text: 'Heat energy' },
        { id: 'opt-2', text: 'Sound energy' },
      ],
      correct_answer: { answer_ids: ['opt-1'] },
      subject_id: 1001,
      chapter_id: 2001,
      topic_id: null,
      difficulty_level: 'medium',
      marks_positive: 4,
      marks_negative: 1,
      exam_tags: ['tenant-a', 'physics'],
      solution: { html: '<p>Because thermodynamics deals with heat.</p>' },
    },
  };
  const createRes = makeRes();

  await createQuestion(createReq, createRes);

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.status, 'draft');
  assert.equal(createRes.body.client_id, 101);
  assert.equal(createRes.body.created_by, 11);
  assert.equal(createRes.body.question_text.html, '<p>Thermo test question</p>');

  const ownDraftSearchRes = makeRes();
  await listQuestions(
    {
      user: teacherTenantA,
      query: { q: 'thermo', page: '1', page_size: '20' },
    },
    ownDraftSearchRes
  );

  assert.equal(ownDraftSearchRes.statusCode, 200);
  assert.equal(ownDraftSearchRes.body.total, 1);
  assert.equal(ownDraftSearchRes.body.data[0].status, 'draft');

  const crossTenantDraftSearchRes = makeRes();
  await listQuestions(
    {
      user: teacherTenantB,
      query: { q: 'thermo', page: '1', page_size: '20' },
    },
    crossTenantDraftSearchRes
  );

  assert.equal(crossTenantDraftSearchRes.statusCode, 200);
  assert.equal(crossTenantDraftSearchRes.body.total, 0);

  const wrongTenantApproveRes = makeRes();
  await approveQuestion(
    {
      user: adminTenantB,
      params: { id: String(createRes.body.id) },
    },
    wrongTenantApproveRes
  );

  assert.equal(wrongTenantApproveRes.statusCode, 403);
  assert.equal(wrongTenantApproveRes.body.error, 'Access denied');

  const approveRes = makeRes();
  await approveQuestion(
    {
      user: adminTenantA,
      params: { id: String(createRes.body.id) },
    },
    approveRes
  );

  assert.equal(approveRes.statusCode, 200);
  assert.equal(approveRes.body.status, 'approved');
  assert.equal(approveRes.body.approved_by, 31);

  const approvedSearchRes = makeRes();
  await listQuestions(
    {
      user: teacherTenantA,
      query: { q: 'thermo', page: '1', page_size: '20' },
    },
    approvedSearchRes
  );

  assert.equal(approvedSearchRes.statusCode, 200);
  assert.equal(approvedSearchRes.body.total, 1);
  assert.equal(approvedSearchRes.body.data[0].status, 'approved');

  const crossTenantApprovedSearchRes = makeRes();
  await listQuestions(
    {
      user: teacherTenantB,
      query: { q: 'thermo', page: '1', page_size: '20' },
    },
    crossTenantApprovedSearchRes
  );

  assert.equal(crossTenantApprovedSearchRes.statusCode, 200);
  assert.equal(crossTenantApprovedSearchRes.body.total, 0);

  const tenantAGetRes = makeRes();
  await getQuestionById(
    {
      user: teacherTenantA,
      params: { id: String(createRes.body.id) },
    },
    tenantAGetRes
  );

  assert.equal(tenantAGetRes.statusCode, 200);
  assert.equal(tenantAGetRes.body.id, createRes.body.id);

  const tenantBGetRes = makeRes();
  await getQuestionById(
    {
      user: teacherTenantB,
      params: { id: String(createRes.body.id) },
    },
    tenantBGetRes
  );

  assert.equal(tenantBGetRes.statusCode, 404);
  assert.equal(tenantBGetRes.body.error, 'Question not found');
});

test('Question rejection clears approval fields and remains atomic', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };
  const adminTenantA = { id: 31, role: 'client_admin', client_id: 101 };

  const createRes = makeRes();
  await createQuestion(
    {
      user: teacherTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Reject me</p>' },
        options: [
          { id: 'opt-1', text: 'A' },
          { id: 'opt-2', text: 'B' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        subject_id: 1001,
        chapter_id: 2001,
        difficulty_level: 'medium',
        marks_positive: 4,
        marks_negative: 1,
      },
    },
    createRes
  );

  assert.equal(createRes.statusCode, 201);

  const rejectRes = makeRes();
  await rejectQuestion(
    {
      user: adminTenantA,
      params: { id: String(createRes.body.id) },
      body: { reason: 'Needs correction' },
    },
    rejectRes
  );

  assert.equal(rejectRes.statusCode, 200);
  assert.equal(rejectRes.body.status, 'rejected');
  assert.equal(rejectRes.body.approved_at, null);
  assert.equal(rejectRes.body.rejection_reason, 'Needs correction');

  const approveAfterRejectRes = makeRes();
  await approveQuestion(
    {
      user: adminTenantA,
      params: { id: String(createRes.body.id) },
    },
    approveAfterRejectRes
  );

  assert.equal(approveAfterRejectRes.statusCode, 400);
  assert.equal(approveAfterRejectRes.body.error, 'Only draft questions can be approved');
});

test('Question scoring_mode persists on create and update', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const createRes = makeRes();
  await createQuestion(
    {
      user: teacherTenantA,
      body: {
        question_type: 'mcq_multiple',
        question_text: { html: '<p>Select heat transfer modes</p>' },
        options: [
          { id: 'opt-1', text: 'Conduction' },
          { id: 'opt-2', text: 'Convection' },
          { id: 'opt-3', text: 'Reflection' },
        ],
        correct_answer: { answer_ids: ['opt-1', 'opt-2'] },
        scoring_mode: 'partial',
        subject_id: 1001,
        chapter_id: 2001,
        difficulty_level: 'medium',
        marks_positive: 4,
        marks_negative: 1,
      },
    },
    createRes
  );

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.scoring_mode, 'partial');

  const updateRes = makeRes();
  await updateQuestion(
    {
      user: teacherTenantA,
      params: { id: String(createRes.body.id) },
      body: {
        scoring_mode: 'mixed',
      },
    },
    updateRes
  );

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.scoring_mode, 'mixed');
});

test('Question can link to a comprehension passage and returns passage summary', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const createRes = makeRes();
  await createQuestion(
    {
      user: teacherTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Which mode transfers heat through solids?</p>' },
        options: [
          { id: 'opt-1', text: 'Conduction' },
          { id: 'opt-2', text: 'Diffusion' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        comprehension_passage_id: 901,
        subject_id: 1001,
        chapter_id: 2001,
        difficulty_level: 'medium',
        marks_positive: 4,
        marks_negative: 1,
      },
    },
    createRes
  );

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.comprehension_passage_id, 901);
  assert.equal(createRes.body.comprehension.id, 901);
  assert.equal(createRes.body.comprehension.passage_content.html, '<p>Passage body</p>');

  const updateRes = makeRes();
  await updateQuestion(
    {
      user: teacherTenantA,
      params: { id: String(createRes.body.id) },
      body: {
        comprehension_passage_id: null,
      },
    },
    updateRes
  );

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.comprehension_passage_id, null);
  assert.equal(updateRes.body.comprehension, undefined);
});

test('Bulk upload can create one linked passage and reuse it across multiple child questions', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const bulkReq = {
    user: teacherTenantA,
    body: {},
    file: {
      originalname: 'linked-passage.csv',
      buffer: Buffer.from(
        [
          'Type,Question,Options,Correct Answer,Solution,Program,Grade,Subject,Chapter,Topic,Has Comprehension,Passage Key,Passage Title,Passage Content,Passage Action',
          'mcq_single,What is the main idea?,Forest life;Ocean life;Desert life;Mountain life,A,The passage focuses on forest life.,401,501,1001,2001,,yes,P1,Rainforest Reading,"<p>Rainforests support rich biodiversity.</p>",create',
          'mcq_single,Which habitat is described?,Forest;Ocean;Desert;Tundra,A,The habitat is forest.,401,501,1001,2001,,yes,P1,Rainforest Reading,"<p>Rainforests support rich biodiversity.</p>",create',
        ].join('\n'),
        'utf8'
      ),
    },
  };
  const bulkRes = makeRes();

  await bulkUploadQuestions(bulkReq, bulkRes);

  assert.equal(bulkRes.statusCode, 200);
  assert.equal(bulkRes.body.inserted, 2);
  assert.equal(bulkRes.body.errors.length, 0);
  assert.equal(mockDb.comprehensionPassages.length, 2);
  const createdPassages = mockDb.comprehensionPassages.filter((item) => Number(item.id) !== 901);
  assert.equal(createdPassages.length, 1);
  const linkedPassageId = createdPassages[0].id;
  assert.equal(bulkRes.body.data[0].comprehension_passage_id, linkedPassageId);
  assert.equal(bulkRes.body.data[1].comprehension_passage_id, linkedPassageId);
});
