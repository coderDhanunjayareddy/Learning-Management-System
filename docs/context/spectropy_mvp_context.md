**Document Purpose**
This file summarizes the SPECTROPY LMS MVP plan and the data model for the Question Bank + Exam Engine. Use it as the single reference for scope, roles, workflows, tables, and MVP guardrails.

**Sources**
- `docs/context/_source_mvp_plan.txt`
- `docs/context/_source_data_model.txt`

**MVP Scope**
- Build Question Bank (create, manage, search questions) with 3-tier ownership.
- Build Exam Engine (create exams, take exams, auto-grade, show results).
- Foundation: multi-tenant auth, role-based access, basic UI.

**Out of Scope (Phase 2)**
- Courses module.
- Advanced analytics and reporting.
- Mobile app.
- Proctoring features.
- Bulk import/export.
- Full entitlement system.
- Additional question types and manual grading.

**Roles and Tenancy**
- Roles (system): super_admin, content_authorizer, client_admin, school_owner, teacher, student.
- MVP role simplification: content_authorizer is merged into super_admin. All other roles are active.
- Tenancy levels: platform -> client -> school -> batch.
- Ownership model: questions and exams are scoped by `client_id` and optional `school_id`.
- Platform-level content is represented by `client_id = NULL` (not used in MVP).

**Core Modules**
- Authentication and user management (JWT, role-based access, tenant context).
- Question Bank (CRUD, search, approval workflow).
- Exam Engine (create, take, grade, results).

**Question Bank (MVP)**
- Question types: mcq_single, mcq_multiple, numerical, true_false.
- Auto-gradable only. Manual grading is Phase 2.
- Attributes: rich text, optional LaTeX, options (MCQ), correct_answer, solution, subject/chapter/topic, difficulty, positive/negative marks, exam tags.
- Search and filter: subject, chapter, topic, difficulty, type, status, exam tags, created_by, full-text search.
- Workflow: teacher creates draft -> school_owner approves -> approved questions can be used in exams.

**Exam Engine (MVP)**
- Exam config: title, description, duration, start/end window, sections, marks, negative marks, shuffling, max attempts.
- Exam taking: palette, mark for review, timer, auto-save every 30 seconds via HTTP, manual save, submit confirmation.
- Auto-grading: all-or-nothing for mcq_multiple. Numerical uses tolerance.
- Results: total score, section-wise score, question-wise result, correct answers, solutions.

**Workflows and Status**
- Question status: draft -> approved -> rejected -> archived (soft delete).
- Exam status: draft -> published -> active -> completed.
- Attempt status: in_progress -> submitted -> graded.

**Data Model (New Tables for MVP1)**
- Curriculum: subjects, chapters, topics.
- Question Bank: questions.
- Exam Engine: exams, exam_sections, exam_questions, exam_attempts, exam_responses.

**Existing Core Tables (Already in DB)**
- clients, schools, users, school_memberships.
- batches, batch_members.
- courses, content_items, enrollments, student_attempts, certificates.
- content_packs, content_pack_items, content_entitlements.
- audit_logs, role_permissions.

**Table Creation Order**
1. subjects
2. chapters
3. topics
4. questions
5. exams
6. exam_sections
7. exam_questions
8. exam_attempts
9. exam_responses

**JSONB Formats**
```json
// question_text
{
  "html": "<p>What is 2+2?</p>",
  "latex": null,
  "images": [{"url": "https://...", "alt": "Diagram"}]
}
```
```json
// options (MCQ only)
[
  {"id": "A", "text": {"html": "3"}, "is_correct": false},
  {"id": "B", "text": {"html": "4"}, "is_correct": true}
]
```
```json
// correct_answer
{"answer": "B"}              // mcq_single
{"answers": ["A", "C"]}      // mcq_multiple
{"value": 9.8, "tolerance": 0.01}  // numerical
{"answer": true}             // true_false
```
```json
// student_answer
{"selected": "B"}            // mcq_single
{"selected": ["A", "C"]}     // mcq_multiple
{"value": 9.81}              // numerical
{"selected": true}           // true_false
```

**API Endpoints (MVP)**
- POST `/api/auth/login` - login.
- POST `/api/auth/logout` - logout.
- GET `/api/auth/me` - current user.
- GET `/api/questions` - list/search questions (scoped).
- GET `/api/questions/:id` - question details.
- POST `/api/questions` - create question.
- PUT `/api/questions/:id` - update question.
- DELETE `/api/questions/:id` - soft delete.
- POST `/api/questions/:id/approve` - approve question.
- POST `/api/questions/:id/reject` - reject with feedback.
- GET `/api/exams` - list exams.
- GET `/api/exams/:id` - exam details.
- POST `/api/exams` - create exam.
- PUT `/api/exams/:id` - update draft exam.
- DELETE `/api/exams/:id` - delete exam.
- POST `/api/exams/:id/publish` - publish exam.
- POST `/api/exams/:id/sections` - add section.
- POST `/api/exams/:id/sections/:sid/questions` - add questions to section.
- GET `/api/student/exams` - list available exams.
- POST `/api/student/exams/:id/start` - start attempt.
- GET `/api/student/attempts/:aid` - get attempt state.
- POST `/api/student/attempts/:aid/save` - save responses.
- POST `/api/student/attempts/:aid/submit` - submit exam.
- GET `/api/student/attempts/:aid/result` - get result.
- GET `/api/exams/:id/results` - all results for exam.
- GET `/api/exams/:id/results/:aid` - specific attempt result.

**Non-Functional Requirements (MVP)**
- API response time < 500ms p95.
- Support 100 concurrent exam takers.
- Question list load time < 2 seconds for 50 items.
- No lost responses on submit.
- Tablet-responsive exam taking.

**Tech Stack Decisions**
- Database: PostgreSQL (Supabase).
- Backend: Node.js + Express + TypeScript.
- Frontend: React + Tailwind CSS.
- Auth: JWT (access + refresh).
- API style: REST.
- Math rendering: KaTeX.
- Search: PostgreSQL full-text search (tsvector + GIN).
- Auto-save: HTTP POST every 30 seconds (no WebSockets in MVP).

**Success Criteria (P0)**
- Login works, role detected.
- Question ownership isolation works across schools.
- Admin approves questions and only approved questions used in exams.
- Teacher can create exams with sections and questions.
- Student can take exams, auto-save works, submit works.
- Auto-grading computes correct scores for all 4 question types.
- Student sees results with correct/wrong per question.

**Guardrails and Pitfalls**
- Always enforce ownership checks on every endpoint.
- Only approved questions can be added to exams.
- Use transactions when creating exams with sections and questions.
- Handle timeout auto-submit in both frontend and backend.
