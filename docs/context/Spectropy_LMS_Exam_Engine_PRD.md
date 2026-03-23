# SPECTROPY LMS — Exam Engine

## Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 15 March 2026
**Author:** SPECTROPY Product & Engineering Team
**Status:** Approved for Development
**Audience:** Product, Backend, Frontend, QA, Stakeholders

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [System Context & Integration](#3-system-context--integration)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Module 1 — Exam Management, Access Control, Blueprints & Live Controls](#5-module-1--exam-management-access-control-blueprints--live-controls)
6. [Module 2 — Exam Paper Builder (Sections & Question Assignment)](#6-module-2--exam-paper-builder-sections--question-assignment)
7. [Module 3 — Student Exam Attempt Engine](#7-module-3--student-exam-attempt-engine)
8. [Module 4 — Grading and Results Engine](#8-module-4--grading-and-results-engine)
9. [Database Architecture](#9-database-architecture)
10. [API Architecture](#10-api-architecture)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Backend Service Architecture](#12-backend-service-architecture)
13. [Security Architecture](#13-security-architecture)
14. [State Machines & Flow Diagrams](#14-state-machines--flow-diagrams)
15. [Performance & Scalability](#15-performance--scalability)
16. [Error Handling Strategy](#16-error-handling-strategy)
17. [Development Plan](#17-development-plan)
18. [Risk Register](#18-risk-register)
19. [Acceptance Criteria](#19-acceptance-criteria)
20. [Glossary](#20-glossary)

---

## 1. Executive Summary

### 1.1 What We Are Building

The Exam Engine is the core assessment module of the SPECTROPY LMS platform. It enables educational institutions to create, configure, administer, and grade exams for students in Classes 6–10 preparing for competitive examinations (JEE, NEET, NTSE, Olympiads).

The engine supports the full exam lifecycle: creation → paper building → student attempt → auto-grading → result generation, with live operational controls for active exams and a robust override system for post-exam corrections.

### 1.2 Why We Are Building It

SPECTROPY's IIT Foundation Program requires a production-grade examination system that can:

- Administer timed, proctored assessments matching JEE/NEET exam patterns
- Support mixed question types (MCQ, Numerical, Integer, Matrix Match, Assertion-Reason, Comprehension)
- Auto-grade with configurable marking schemes including negative marking
- Provide instant results with section-wise breakdowns
- Operate safely across multiple tenants (schools) with strict data isolation
- Allow live corrections and time adjustments during active exams without corrupting student attempts

### 1.3 Scope Boundaries

**In scope:**
- Exam CRUD with full configuration
- Blueprint/template system for exam presets
- Section-based paper builder with manual and automatic question selection
- Student exam attempt engine with timer, auto-save, resume, and OMR mode
- Auto-grading engine for all supported question types
- Results engine with visibility controls
- Live controls (time extension, question correction, grading overrides)
- Regrading system
- Course-based access control

**Out of scope (deferred to future releases):**
- Proctoring (camera/screen monitoring)
- AI-based question generation
- Adaptive testing
- Live leaderboards
- Subjective/essay question grading
- Detailed analytics dashboards (separate module)
- PDF report generation for results (deferred to follow-up sprint)

### 1.4 Team

| Role | ID | Responsibility |
|---|---|---|
| Backend Developer | L | APIs, database, grading engine, services |
| Frontend Developer | D | UI screens, components, state management |
| Tester | T | Test plans, API testing, regression, UAT |

### 1.5 Timeline

7 working days (Day 10 – Day 16 of overall LMS build), starting 15 March 2026.

---

## 2. Product Vision & Goals

### 2.1 Vision Statement

Build an exam engine that matches the reliability and feature depth of platforms like Testpress and NTA's exam systems, while being natively multi-tenant, deeply integrated with the SPECTROPY question bank, and optimized for Smart Board classroom delivery.

### 2.2 Primary Goals

| # | Goal | Success Metric |
|---|---|---|
| G1 | Accurate, fair grading | Zero grading errors across all supported question types |
| G2 | Reliable exam delivery | No data loss during exam attempts, even on network interruption |
| G3 | Sub-second response times | Answer save < 200ms, exam start < 1s, grading < 3s for 200 questions |
| G4 | Multi-tenant safety | Zero cross-tenant data leakage under adversarial testing |
| G5 | Configurable exam patterns | Support JEE, NEET, NTSE, Olympiad, Board exam patterns via blueprints |
| G6 | Operational control | Admins can extend time, fix questions, and apply overrides without corrupting attempts |

### 2.3 Design Principles

1. **Frozen attempt model** — once a student starts, their paper structure, timing, and response mappings are immutable snapshots.
2. **Backend is source of truth** — timer, submission state, and grading are always server-authoritative.
3. **Override, don't mutate** — corrections to active/completed exams use override records, never direct mutation of question or attempt data.
4. **Computed state over manual state** — exam status (draft/active/completed) is derived from timestamps, never manually toggled.
5. **Course-gated access** — students access exams exclusively through course membership, not role permissions.
6. **Audit everything** — every live control action, override, and regrade is logged with who, when, and why.

---

## 3. System Context & Integration

### 3.1 Existing Modules (Already Implemented)

The Exam Engine integrates with four pre-existing modules:

```
┌─────────────────────────────────────────────────────────┐
│                    SPECTROPY LMS                         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │Authentication│  │    RBAC      │  │    Course      │  │
│  │   Module     │  │   Module     │  │  Management    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
│         │    ┌────────────┴───────────┐       │          │
│         │    │    Question Bank       │       │          │
│         │    │    Module              │       │          │
│         │    └────────────┬───────────┘       │          │
│         │                 │                   │          │
│  ┌──────┴─────────────────┴───────────────────┴───────┐  │
│  │              EXAM ENGINE (NEW)                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ │  │
│  │  │Module 1  │ │Module 2  │ │Module 3 │ │Module 4│ │  │
│  │  │Exam Mgmt │→│Paper     │→│Attempt  │→│Grading │ │  │
│  │  │& Config  │ │Builder   │ │Engine   │ │& Results│ │  │
│  │  └──────────┘ └──────────┘ └─────────┘ └────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Integration Points

#### Authentication Module → Exam Engine
- Every API call carries authenticated user context (JWT token)
- User identity drives: attempt ownership, tenant scoping, audit trails
- Session management handles exam-taking sessions

#### RBAC Module → Exam Engine
- Role hierarchy: Super Admin → Content Authorizer → Client Admin → School Owner → Teacher → Student
- Exam creation rights: `content_authorizer`, `admin`, `school_owner`
- Per-user permission overrides supplement role-based defaults
- Permission middleware evaluates: tenant scope → school scope → role permission → user override

#### Course Management → Exam Engine
- `course_exams` junction table links exams to courses
- Student sees an exam only when: exam assigned to their course + exam is active + access policies satisfied
- Course membership is the primary visibility and access mechanism

#### Question Bank → Exam Engine
- `exam_questions` creates many-to-many link between question bank and exam sections
- Only approved questions can be added to exams
- Question bank is read at paper-build time; exam operates on frozen snapshots at runtime
- Question search API queries the existing `questions` table with subject/topic/difficulty/type filters

### 3.3 Data Flow Overview

```
Question Bank                Course Management
     │                              │
     ▼                              ▼
┌─────────┐   assigns to    ┌──────────────┐
│questions │◄───────────────►│ course_exams │
└────┬─────┘                 └──────┬───────┘
     │                              │
     ▼                              ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│exam_     │──│exam_     │──│   exams       │
│questions │  │sections  │  │ (config +     │
└──────────┘  └──────────┘  │  lifecycle)   │
                            └──────┬───────┘
                                   │
              Student starts exam  │
                                   ▼
                            ┌──────────────┐
                            │exam_attempts │
                            └──────┬───────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │exam_responses│
                            └──────┬───────┘
                                   │
                            Submit / Timeout
                                   │
                                   ▼
                            ┌──────────────┐
                            │  Grading     │
                            │  Engine      │
                            └──────┬───────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │  Results     │
                            └──────────────┘
```

---

## 4. User Roles & Permissions

### 4.1 Role-Permission Matrix

| Permission | Super Admin | Content Authorizer | Client Admin | School Owner | Teacher | Student |
|---|---|---|---|---|---|---|
| Create exam | ✅ | ✅ | ✅ | ✅ | Via override | ❌ |
| Edit exam | ✅ | ✅ | ✅ | ✅ | Via override | ❌ |
| Delete exam | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign exam to course | ✅ | ✅ | ✅ | ✅ | Via override | ❌ |
| Manage live controls | ✅ | ✅ | ✅ | ✅ | Via override | ❌ |
| Manage blueprints | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View exam reports | ✅ | ✅ | ✅ | ✅ | ✅ | Own only |
| Attempt exam | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (via course) |

### 4.2 Permission Evaluation Order

```
1. Check tenant scope (client_id match)
2. Check school scope (school_id match)
3. Check role_permissions table for the action
4. Check user_permission_overrides table for explicit grant/deny
5. If ownership-based: check if user created the resource
6. Grant or deny
```

### 4.3 Student Access Rule

A student can access and attempt an exam when ALL of the following are true:

1. The exam is assigned to a course (`course_exams` row exists and `is_active = true`)
2. The student is a member of that course (`course_memberships` row exists)
3. The exam's computed status is `active` (current time between `start_datetime` and `end_datetime`)
4. Max attempt limit is not exceeded
5. Retake interval is satisfied (if applicable)
6. Device/network restrictions are met (if configured)

---

## 5. Module 1 — Exam Management, Access Control, Blueprints & Live Controls

### 5.1 Feature: Exam Creation

#### 5.1.1 Complete Field Specification

**Basic Information**

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | string | Yes | Non-empty, max 255 chars |
| `description` | text | No | Max 5000 chars |
| `instructions` | text | No | Rendered as HTML/Markdown in exam UI |

**Timing**

| Field | Type | Required | Validation |
|---|---|---|---|
| `start_datetime` | timestamp | Yes | Must be in the future at creation |
| `end_datetime` | timestamp | Yes | Must be after `start_datetime` |
| `duration_minutes` | integer | Yes | > 0, logically valid within exam window |

**Scoring**

| Field | Type | Required | Validation |
|---|---|---|---|
| `pass_percentage` | decimal | No | 0–100 |
| `variable_marks` | boolean | No | Default: false |
| `marks_per_question` | decimal | No | Default positive marks for all sections |
| `negative_marks` | decimal | No | ≥ 0 |
| `roundoff_marks` | boolean | No | If true, total score is rounded |

**Ranking & Display**

| Field | Type | Required | Validation |
|---|---|---|---|
| `enable_ranking` | boolean | No | Default: false |
| `show_score` | boolean | No | Default: true |
| `show_analytics` | boolean | No | Default: false |
| `show_percentile` | boolean | No | Default: false |
| `show_solutions_to_user` | boolean | No | Default: false |
| `show_pass_or_fail` | boolean | No | Default: true |

**Retake Rules**

| Field | Type | Required | Validation |
|---|---|---|---|
| `allow_retaking_exam` | boolean | No | Default: false |
| `maximum_allowed_retakes` | integer | No | null = unlimited, else ≥ 1 |
| `allow_retaking_only_for_failed_attempt` | boolean | No | Default: false |
| `interval_between_retakes_minutes` | integer | No | ≥ 0 |

**Attempt Behavior**

| Field | Type | Required | Validation |
|---|---|---|---|
| `grace_duration_for_offline_submission` | integer | No | Minutes of grace |
| `enforce_continuous_timer` | boolean | No | Timer runs even if browser closed |
| `enable_quiz_mode` | boolean | No | Immediate feedback per question |
| `disable_attempt_resuming` | boolean | No | Block resume after interruption |
| `enable_omr_mode` | boolean | No | Lock answers after first save |

**Review & Downloads (stored in `exam_config` JSONB)**

| Field | Type | Default |
|---|---|---|
| `auto_generate_review_pdf` | boolean | false |
| `allow_review_pdf_download` | boolean | false |
| `allow_question_pdf_download` | boolean | false |

**Notifications (stored in `exam_config` JSONB)**

| Field | Type | Validation |
|---|---|---|
| `completion_notification_emails` | string | Valid comma-separated emails |

**Access & Platform Controls (stored in `exam_config` JSONB)**

| Field | Type | Description |
|---|---|---|
| `access_control` | string | public/private flag |
| `device_access_control` | string | web/mobile/both |
| `allowed_network` | string | CIDR or IP ranges |

**Presentation & Flow (stored in `exam_config` JSONB)**

| Field | Type | Description |
|---|---|---|
| `custom_exam_end_message` | text | Shown after submission |
| `exam_template` | string | Blueprint reference |
| `allow_preemptive_section_ending` | boolean | Student can end section early |
| `enable_sequential_question_number_between_sections` | boolean | Continuous numbering |
| `questions_count_mode` | string | How question count is displayed |
| `redirect_url` | string | Redirect after exam completion |
| `tags` | string[] | Categorization tags |

#### 5.1.2 Storage Strategy

Core fields (frequently queried, filtered, sorted) are stored as first-class columns in the `exams` table. Advanced optional configuration is stored in an `exam_config` JSONB column to avoid schema bloat.

**Core columns:** title, description, instructions, start_datetime, end_datetime, duration_minutes, pass_percentage, variable_marks, marks_per_question, negative_marks, roundoff_marks, enable_ranking, show_score, show_analytics, show_percentile, show_solutions_to_user, show_pass_or_fail, allow_retaking_exam, maximum_allowed_retakes, allow_retaking_only_for_failed_attempt, interval_between_retakes_minutes, enforce_continuous_timer, enable_quiz_mode, disable_attempt_resuming, enable_omr_mode.

**JSONB `exam_config`:** All review, download, notification, access control, presentation, and flow fields.

#### 5.1.3 Frontend Implementation

Multi-step form with 6 sections:

```
Step 1: Basic Info        → title, description, instructions
Step 2: Timing            → start/end datetime, duration
Step 3: Scoring           → pass %, marks, negative marks, variable marks, roundoff
Step 4: Access            → course assignment, device/network restrictions
Step 5: Display & Review  → show_score, show_solutions, show_analytics, PDF options
Step 6: Advanced          → retake rules, timer behavior, OMR mode, quiz mode, notifications
```

Each step validates independently. Final submission validates all steps together.

### 5.2 Feature: Exam Lifecycle / Computed Status

There is **no manual draft/publish workflow**. Status is computed from time.

```
getComputedExamState(exam, now):
    if now < exam.start_datetime → "draft"
    if exam.start_datetime ≤ now ≤ exam.end_datetime → "active"
    if now > exam.end_datetime → "completed"
```

This computed status is used for:
- List API responses (status badge)
- Detail API responses
- Permission checks (what edits are allowed)
- Student visibility (only active exams accessible)
- UI states (full edit vs restricted vs read-only)

**Implementation note:** Do not store a mutable `status` column as source of truth. Compute it in every query/check using `getComputedExamState()`.

### 5.3 Feature: Course-Based Exam Access

#### 5.3.1 Assignment Flow

```
Teacher/Admin creates exam
    → assigns exam to one or more courses via course_exams
    → students in those courses see the exam in their list
    → exam access = course_exams ∩ course_memberships ∩ active status
```

#### 5.3.2 Student Exam List Query

```sql
SELECT e.*, ce.course_id
FROM exams e
JOIN course_exams ce ON ce.exam_id = e.id AND ce.is_active = true
JOIN course_memberships cm ON cm.course_id = ce.course_id
WHERE cm.student_id = :studentId
  AND e.client_id = :tenantId
  AND NOW() BETWEEN e.start_datetime AND e.end_datetime;
```

### 5.4 Feature: Blueprint / Template System

#### 5.4.1 Blueprint Types

**System blueprints** — created by Super Admin or Content Authorizer. Examples: JEE Main, NEET, NTSE, IBPS, Olympiad.

**Custom blueprints** — created by Admin or School Owner. Examples: Monthly Test Template, Weekly Practice Test, Foundation Mock Pattern.

#### 5.4.2 What a Blueprint Contains

```json
{
  "default_duration_minutes": 180,
  "default_pass_percentage": 25,
  "default_negative_marks": 1,
  "show_score": true,
  "show_solutions_to_user": false,
  "enforce_continuous_timer": true,
  "sections": [
    {
      "title": "Physics",
      "question_count": 30,
      "marks_per_question": 4,
      "negative_marks": 1
    },
    {
      "title": "Chemistry",
      "question_count": 30,
      "marks_per_question": 4,
      "negative_marks": 1
    },
    {
      "title": "Mathematics",
      "question_count": 30,
      "marks_per_question": 4,
      "negative_marks": 1
    }
  ],
  "sequential_question_numbers": true
}
```

#### 5.4.3 Blueprint Usage Flow

1. User selects blueprint from library
2. System prefills Create Exam form with blueprint values
3. User customizes any values as needed
4. Exam is created as an independent entity
5. **Future blueprint changes do NOT affect already-created exams** (snapshot, not live link)

### 5.5 Feature: Live Controls During Active Exams

#### 5.5.1 Available Live Actions

| Action | Description | Audit Required |
|---|---|---|
| Extend exam end time | Update `end_datetime` | Yes |
| Add global extra time | Add minutes to all active attempts | Yes |
| Add per-student extra time | Add minutes to specific attempt(s) | Yes |
| Fix question text/formatting | Edit text-only fields of a question | Yes |
| Update exam instructions | Edit instructions field | Yes |
| Apply grace marks | Give marks to all/eligible students for a question | Yes |
| Drop question | Ignore question from scoring | Yes |
| Override answer key | Replace correct answer for grading | Yes |
| Accept multiple answers | Treat multiple options as correct | Yes |

#### 5.5.2 UI Separation

Live controls are displayed in a **dedicated Live Control Panel**, completely separate from the general exam edit form. This prevents accidental structural edits during active exams.

#### 5.5.3 Safe vs Unsafe Edit Matrix

**During Active Exam:**

| Allowed (Safe) | Blocked (Unsafe) |
|---|---|
| Description edit | Adding questions |
| Instructions edit | Deleting questions |
| Custom end message | Reordering questions |
| Notification emails | Replacing questions |
| Display flags (non-scoring) | Changing section structure |
| End time extension | Changing marks (breaking fairness) |
| Time increase (via live controls) | Changing option structure |
| Text-only question corrections | Changing correct answer directly |

### 5.6 Feature: Grading Overrides

#### 5.6.1 Philosophy

If a question is wrong or disputed, **never mutate attempt history directly**. Use grading override records.

#### 5.6.2 Supported Override Types

| Type | Behavior |
|---|---|
| `grace_marks` | Give fixed marks to all/eligible students for a question |
| `drop_question` | Ignore the question entirely; award defined policy marks |
| `answer_key_override` | Replace original correct answer for grading purposes |
| `accept_multiple_answers` | Treat more than one answer as correct |

#### 5.6.3 Override Precedence

When multiple overrides exist for the same question:

```
drop_question > answer_key_override = accept_multiple_answers > grace_marks
```

Only one effective override per question per exam. If `drop_question` is active, all other overrides for that question are ignored.

---

## 6. Module 2 — Exam Paper Builder (Sections & Question Assignment)

### 6.1 Section Structure

An exam contains one or more sections. Sections exist for logical grouping, scoring rules, and section-specific instructions.

**Critical rule:** Sections do NOT restrict question types. A section may contain any mix of supported question types.

```
Exam: IIT Foundation Mock Test
├── Section 1: Physics
│   ├── Q1: MCQ Single (+4, -1)
│   ├── Q2: Numerical (+4, -1)
│   ├── Q3: Assertion-Reason (+4, -1)
│   └── Q4: Matrix Match (+4, -1)
├── Section 2: Chemistry
│   ├── Q1: MCQ Single (+4, -1)
│   ├── Q2: MCQ Multiple (+4, -2)
│   └── Q3: True/False (+2, 0)
└── Section 3: Mathematics
    ├── Q1: MCQ Single (+4, -1)
    ├── Q2: Integer Type (+4, 0)
    └── Q3: Numerical (+4, -1)
```

### 6.2 Question Selection Modes

#### 6.2.1 Manual Selection

Teacher manually picks questions from the question bank.

```
Flow: Open section → Search questions → Filter by subject/topic/difficulty/type → Select → Add to section
```

Each selected question creates an `exam_questions` row with: `section_id`, `question_id`, `order_index`.

**Advantages:** Full control, predictable paper, ideal for school exams.

#### 6.2.2 Automatic Selection (Future Enhancement)

Questions auto-selected based on rules stored in `section_question_rules` JSON:

```json
{
  "topic": "kinematics",
  "difficulty_distribution": {
    "easy": 5,
    "medium": 3,
    "hard": 2
  }
}
```

**MVP recommendation:** Generate question set when exam is created, not at attempt start.

### 6.3 Question Ordering

Questions are ordered by `order_index` within each section.

If `shuffle_questions = true` in exam config, order is randomized **per attempt** (Student A order ≠ Student B order). Shuffle must never be global — each student gets an independent randomization.

### 6.4 Marks Configuration

#### 6.4.1 Section-Level Marks (Default)

All questions in a section inherit `marks_per_question` and `negative_marks` from `exam_sections`.

#### 6.4.2 Variable Marks Mode

When `variable_marks = true`, per-question values from `exam_questions.marks_override` and `exam_questions.negative_override` take precedence.

#### 6.4.3 Mark Resolution Order

```
exam_questions.marks_override (if set)
    → exam_sections.marks_per_question (default)
        → exam-level default (fallback)
```

### 6.5 Paper Validation

Before an exam can be assigned to courses (or published), the system validates:

| Check | Error Message |
|---|---|
| Every section has at least 1 question | "Section {name} has no questions assigned" |
| All question references exist in question bank | "Question ID {id} not found in question bank" |
| No duplicate questions in a section | "Question {id} appears twice in section {name}" |
| `order_index` values are valid and sequential | "Invalid question ordering in section {name}" |
| All questions are in approved status | "Question {id} is not approved for exam use" |

### 6.6 Freeze Rule

**Once the first attempt begins, exam paper structure is immutable.**

Frozen elements: sections, questions, marks, order.

The only edits allowed after freeze:
- Text corrections in question body (typo fixes)
- Formatting/image fixes
- Instruction wording corrections

All other changes must go through the grading override system.

**Enforcement:** The `hasAnyAttempts(examId)` utility checks for existence of any `exam_attempts` row. If true, all structural mutation APIs return `403 Forbidden`.

---

## 7. Module 3 — Student Exam Attempt Engine

### 7.1 Attempt Start Flow

#### 7.1.1 Pre-Start Validation

Before creating an attempt, backend validates:

```
1. Exam exists and belongs to student's tenant
2. Exam is active (computed status)
3. Student belongs to an assigned course
4. Max attempt limit not exceeded
5. Retake interval satisfied
6. Device/network restrictions met (if configured)
```

#### 7.1.2 Attempt Creation Steps

```
POST /api/student/exams/:examId/start

1. Validate student access (all checks above)
2. Fetch exam + full paper structure (sections + questions + content)
3. Determine next attempt_number for this student
4. Create exam_attempts row:
   - exam_id, student_id, attempt_number
   - started_at = NOW()
   - status = 'in_progress'
   - auto_submitted = false
5. Create exam_responses placeholder rows (one per question):
   - attempt_id, question_id, section_id
   - student_answer = null
   - is_attempted = false
   - is_marked_for_review = false
   - answered_at = null
6. Compute timer metadata:
   - effective_deadline = MIN(started_at + duration, end_datetime) + extensions
7. Apply shuffle if enabled (randomize order per attempt)
8. Return complete attempt payload to frontend
```

#### 7.1.3 Attempt Payload (returned to frontend)

```json
{
  "attempt_id": "uuid",
  "exam": {
    "id": "uuid",
    "title": "IIT Foundation Mock Test",
    "duration_minutes": 180,
    "instructions": "...",
    "enable_omr_mode": false,
    "enable_quiz_mode": false,
    "enforce_continuous_timer": true,
    "show_solutions_to_user": false
  },
  "timer": {
    "started_at": "2026-03-15T10:00:00Z",
    "effective_deadline": "2026-03-15T13:00:00Z",
    "remaining_seconds": 10800,
    "server_time": "2026-03-15T10:00:00Z"
  },
  "sections": [
    {
      "id": "uuid",
      "title": "Physics",
      "order_index": 1,
      "instructions": "All questions are compulsory",
      "questions": [
        {
          "id": "uuid",
          "question_id": "uuid",
          "order_index": 1,
          "type": "mcq_single",
          "content": { "text": "...", "options": [...], "image": "..." },
          "response": {
            "student_answer": null,
            "is_attempted": false,
            "is_marked_for_review": false
          }
        }
      ]
    }
  ],
  "summary": {
    "total_questions": 90,
    "attempted": 0,
    "unattempted": 90,
    "marked_for_review": 0
  }
}
```

### 7.2 Response Saving

#### 7.2.1 Save Endpoint

```
POST /api/student/attempts/:attemptId/save
```

#### 7.2.2 Payload by Question Type

**MCQ Single:**
```json
{ "question_id": "uuid", "student_answer": { "selected": "B" }, "is_marked_for_review": false }
```

**MCQ Multiple:**
```json
{ "question_id": "uuid", "student_answer": { "selected": ["A", "C"] }, "is_marked_for_review": false }
```

**Numerical:**
```json
{ "question_id": "uuid", "student_answer": { "value": 9.81 }, "is_marked_for_review": true }
```

**Integer:**
```json
{ "question_id": "uuid", "student_answer": { "value": 42 }, "is_marked_for_review": false }
```

**True/False:**
```json
{ "question_id": "uuid", "student_answer": { "selected": true }, "is_marked_for_review": false }
```

**Assertion-Reason:**
```json
{ "question_id": "uuid", "student_answer": { "selected": "A" }, "is_marked_for_review": false }
```

#### 7.2.3 Backend Save Logic

```
1. Verify attempt exists and status = 'in_progress'
2. Verify attempt belongs to this student
3. Verify question belongs to this attempt
4. Verify timing still valid (not past deadline)
5. If OMR mode enabled:
   - Check if response already has is_attempted = true
   - If yes → reject with "OMR: Answer already locked"
6. Update exam_responses row:
   - student_answer = payload
   - is_attempted = true (if answer provided)
   - is_marked_for_review = payload value
   - answered_at = NOW()
7. Return success with updated summary counts
```

#### 7.2.4 Autosave Behavior

Frontend triggers autosave:
- On every answer change
- On "Save & Next" click
- Every 20–30 seconds (interval timer)
- On section switch
- Before final submit

Autosave uses the same save endpoint and must be **idempotent** — repeated identical saves produce no side effects.

### 7.3 Timer System

#### 7.3.1 Timer Architecture

```
Frontend: Display timer (countdown), trigger auto-submit at zero
Backend:  Source of truth for timing, compute deadline, validate on every API call
```

The frontend timer is a UX convenience. The backend enforces timing correctness.

#### 7.3.2 Effective Deadline Computation

```
base_deadline = attempt.started_at + exam.duration_minutes

exam_end_cap = exam.end_datetime

global_extensions = SUM(exam_time_adjustments.minutes_added WHERE exam_id AND applies_to = 'all')

personal_extensions = SUM(attempt_time_overrides.minutes_added WHERE attempt_id)

effective_deadline = MIN(
    base_deadline + global_extensions + personal_extensions,
    exam_end_cap
)
```

#### 7.3.3 Continuous Timer

When `enforce_continuous_timer = true`:
- Timer continues running even if student closes browser
- On resume, backend recomputes remaining time from `started_at`
- No pause mechanism exists
- Critical for high-stakes exams

#### 7.3.4 Timer Heartbeat

```
POST /api/student/attempts/:attemptId/heartbeat

Response:
{
  "server_time": "2026-03-15T11:30:00Z",
  "remaining_seconds": 5400,
  "effective_deadline": "2026-03-15T13:00:00Z"
}
```

Frontend recalibrates its display on every heartbeat response (every 30–60 seconds).

### 7.4 Submission

#### 7.4.1 Manual Submission

```
POST /api/student/attempts/:attemptId/submit

Backend steps:
1. Verify attempt status = 'in_progress' (atomic check)
2. Verify timing still valid
3. Save any final pending answer if included in payload
4. UPDATE exam_attempts SET
     submitted_at = NOW(),
     status = 'submitted'
   WHERE id = :attemptId AND status = 'in_progress'
   RETURNING *
5. If zero rows returned → already submitted, return graceful message
6. Trigger grading pipeline
7. After grading completes: status = 'graded'
8. Return result summary (if show_score enabled)
```

#### 7.4.2 Auto-Submission on Timeout

Two mechanisms ensure timeout is caught:

**Frontend:** Countdown reaches zero → triggers submit API call.

**Backend cron:** Periodic scan (every 30 seconds) for:
```sql
SELECT * FROM exam_attempts
WHERE status = 'in_progress'
  AND effective_deadline < NOW();
```

For each expired attempt:
```
SET submitted_at = NOW()
SET auto_submitted = true
SET status = 'submitted'
Trigger grading
SET status = 'graded'
```

**Critical:** Backend cron is the safety net. Even if frontend fails, the attempt will be auto-submitted.

### 7.5 Resume Behavior

#### 7.5.1 Resume Allowed

```
GET /api/student/attempts/:attemptId

Returns: same payload as start, with saved responses and recomputed timer
```

Resume does NOT create a new attempt. It continues the same `exam_attempts` row.

#### 7.5.2 Resume Blocked

If `disable_attempt_resuming = true`:
- Student exits and returns → attempt is blocked
- System may force-submit or show "Access denied: resume not allowed"
- Careful UX needed to avoid accidental student loss

### 7.6 Question Palette States

| State | Condition | Color |
|---|---|---|
| Not Visited | No response row interaction from frontend | Gray |
| Visited | Frontend tracked visit, no answer saved | Orange |
| Answered | `is_attempted = true` | Green |
| Marked for Review | `is_marked_for_review = true`, `is_attempted = false` | Purple |
| Answered + Marked | `is_attempted = true` AND `is_marked_for_review = true` | Blue |

### 7.7 Attempt State Machine

```
                 ┌──────────┐
   Start Exam ──►│in_progress│
                 └─────┬─────┘
                       │
            ┌──────────┴──────────┐
            │                     │
     Manual Submit          Auto-Submit
            │              (timeout)
            ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │submitted │         │submitted │
        │(manual)  │         │(auto)    │
        └─────┬────┘         └─────┬────┘
              │                    │
              └────────┬───────────┘
                       │
                  Grading runs
                       │
                       ▼
                 ┌──────────┐
                 │  graded  │
                 └──────────┘
```

**State transition rules:**
- No save after `graded`
- No second submit after `graded`
- No answer edit after `submitted`
- Only one active `in_progress` attempt per exam per student at a time

---

## 8. Module 4 — Grading and Results Engine

### 8.1 Grading Trigger

Grading begins when:
- Student submits manually
- System auto-submits on timeout
- Admin triggers regrading after override change

### 8.2 Grading Pipeline

```
Attempt submitted
  → Fetch all exam_responses for this attempt
  → Fetch paper structure (sections, questions, marks rules)
  → Fetch active grading overrides for this exam
  → For each response:
      → Resolve mark source (question override → section default)
      → Check for active grading override on this question
      → Evaluate based on question type
      → Set is_correct and marks_awarded
  → Compute totals:
      → total_score = SUM(marks_awarded)
      → total_correct = COUNT(is_correct = true)
      → total_wrong = COUNT(is_correct = false)
      → total_unattempted = COUNT(is_correct IS NULL)
  → Apply round-off if enabled (at total level only)
  → Update exam_attempts with totals
  → Set status = 'graded'
```

### 8.3 Question Type Grading Rules

#### 8.3.1 MCQ Single

```
Correct: selected option exactly matches correct option
Scoring:
  correct → +marks_per_question
  wrong   → -negative_marks
  blank   → 0
```

#### 8.3.2 MCQ Multiple

```
MVP Rule: Exact full match only
Correct: all correct options selected AND no extra options
Scoring:
  exact match     → +marks_per_question
  any mismatch    → -negative_marks
  blank           → 0

Future: Partial marking (deferred)
```

#### 8.3.3 Numerical

```
Correct: |submitted_value - correct_value| ≤ tolerance
Scoring:
  within tolerance  → +marks_per_question
  outside tolerance → -negative_marks
  blank             → 0
```

#### 8.3.4 Integer Type

```
Correct: submitted_integer === expected_integer
Scoring:
  correct → +marks_per_question
  wrong   → -negative_marks (or 0, depending on exam policy)
  blank   → 0
```

#### 8.3.5 True / False

```
Correct: selected_boolean === expected_boolean
Scoring:
  correct → +marks_per_question
  wrong   → -negative_marks
  blank   → 0
```

#### 8.3.6 Assertion-Reason

```
Treated as single correct option (A/B/C/D pattern)
Correct: exact match with configured answer
Scoring: same as MCQ Single
```

#### 8.3.7 Matrix Match

```
MVP Rule: Exact match only
Correct: all row-column pairings match exactly
Future: Partial match scoring (deferred)
```

#### 8.3.8 Comprehension-Linked

```
Each linked question graded independently
Parent passage does not affect scoring
Each sub-question follows its own type's grading rules
```

### 8.4 Unattempted Logic

A response is unattempted when:
- No answer saved (`student_answer` is null)
- Saved payload is empty/null

System sets:
- `is_correct = null` (not true, not false — null)
- `marks_awarded = 0`
- Increments `total_unattempted`

### 8.5 Negative Marking Rules

- Negative marks apply **only for wrong answers**, never for unattempted
- Deduction amount: `negative_override` (if set) > `section.negative_marks`
- Stored as: `marks_awarded = -negative_marks` (negative value)

### 8.6 Round-Off Rules

- Per-question marks remain raw (no rounding)
- Total score is rounded only at the final total stage
- This prevents cumulative distortion from per-question rounding

### 8.7 Pass / Fail Calculation

```
percentage = (student_score / max_obtainable_score) × 100

if percentage ≥ pass_percentage → Pass
else → Fail
```

### 8.8 Result Visibility Rules

Student sees only what is enabled in exam configuration:

| Flag | Controls |
|---|---|
| `show_score` | Whether student sees their total score |
| `show_analytics` | Whether student sees detailed analytics |
| `show_percentile` | Whether student sees their percentile rank |
| `show_solutions_to_user` | Whether student can view correct answers and solutions |
| `show_pass_or_fail` | Whether student sees pass/fail status |

**Example combinations:**

| show_score | show_solutions | show_pass_fail | Student Sees |
|---|---|---|---|
| ✅ | ❌ | ❌ | Score only |
| ✅ | ✅ | ✅ | Score + pass/fail + answer review |
| ❌ | ❌ | ✅ | Pass/fail only |
| ❌ | ❌ | ❌ | "Your exam has been submitted" (no results) |

### 8.9 Section-Wise Results

In addition to overall totals, compute per-section:
- Attempted count
- Correct count
- Wrong count
- Unattempted count
- Section score
- Section max score

Computed on-demand from `exam_responses` joined with `exam_sections`. No extra table required initially.

### 8.10 Result Review Data

If answer review is enabled, the result payload includes per-question:
- Question text
- Student's answer
- Correct answer
- Marks awarded
- Solution text
- Explanation video link (if available)

**Security note:** Solutions must remain hidden until exam completes for ALL students, not just the submitting student.

### 8.11 Regrading

#### 8.11.1 When Required

- Grading override added (grace marks, dropped question, answer key change)
- Mark policy changes
- Admin forces result recalculation

#### 8.11.2 Regrading Flow

```
Fetch attempt
  → Fetch all responses
  → Fetch latest active overrides
  → Re-evaluate all affected questions
  → Recompute totals
  → Update attempt with new totals
  → Log regrade event
```

**Critical rule:** Regrading must be **idempotent** — running it twice produces the same result. Regrading must be **auditable** — every regrade event is logged with who triggered it and why.

### 8.12 Teacher/Admin Result Access

Authorized staff can see:
- All attempts for an exam
- Per-student score and pass/fail
- Section-wise breakdown
- Question-wise grading details
- Ranking (if enabled)
- Override indicators
- Regrade actions (if permitted)

Access follows: role permission → tenant scope → school scope → course linkage.

---

## 9. Database Architecture

### 9.1 Entity Relationship Overview

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   exams     │────►│ exam_sections│────►│ exam_questions  │
│             │     │              │     │                 │
│ id          │     │ id           │     │ id              │
│ title       │     │ exam_id (FK) │     │ section_id (FK) │
│ client_id   │     │ title        │     │ question_id (FK)│
│ school_id   │     │ order_index  │     │ order_index     │
│ created_by  │     │ marks_per_q  │     │ marks_override  │
│ start_dt    │     │ negative_m   │     │ negative_override│
│ end_dt      │     │ instructions │     └────────┬────────┘
│ duration    │     └──────────────┘              │
│ exam_config │                                    │
│ ...         │                          ┌─────────▼────────┐
└──────┬──────┘                          │   questions      │
       │                                 │   (existing QB)  │
       │                                 └──────────────────┘
       │
       ├──────────────┐
       │              ▼
       │     ┌──────────────┐      ┌──────────────────────┐
       │     │ course_exams │      │ exam_blueprints      │
       │     │              │      │                      │
       │     │ course_id    │      │ id                   │
       │     │ exam_id (FK) │      │ name                 │
       │     │ assigned_by  │      │ category             │
       │     │ is_active    │      │ is_system_template   │
       │     └──────────────┘      │ template_config JSONB│
       │                           └──────────────────────┘
       │
       ├─────────────────────────────┐
       ▼                             ▼
┌──────────────┐            ┌─────────────────────────┐
│exam_attempts │            │ exam_time_adjustments    │
│              │            │                         │
│ id           │            │ exam_id (FK)            │
│ exam_id (FK) │            │ adjustment_type         │
│ student_id   │            │ minutes_added           │
│ attempt_no   │            │ applies_to              │
│ started_at   │            │ student_id (nullable)   │
│ submitted_at │            │ reason                  │
│ auto_submitted│           │ created_by              │
│ status       │            └─────────────────────────┘
│ total_score  │
│ total_correct│            ┌─────────────────────────┐
│ total_wrong  │            │ attempt_time_overrides   │
│ total_unattempted│        │                         │
└──────┬───────┘            │ attempt_id (FK)         │
       │                    │ minutes_added           │
       ▼                    │ reason                  │
┌──────────────┐            │ created_by              │
│exam_responses│            └─────────────────────────┘
│              │
│ id           │            ┌─────────────────────────┐
│ attempt_id   │            │question_grading_overrides│
│ question_id  │            │                         │
│ section_id   │            │ exam_id (FK)            │
│ student_answer│           │ question_id (FK)        │
│ is_attempted │            │ override_type           │
│ is_marked_review│         │ override_payload JSONB  │
│ answered_at  │            │ reason                  │
│ is_correct   │            │ created_by              │
│ marks_awarded│            └─────────────────────────┘
└──────────────┘
```

### 9.2 Table Definitions

#### 9.2.1 `exams` (extend existing)

```sql
ALTER TABLE exams ADD COLUMN IF NOT EXISTS
  -- Timing
  start_datetime      TIMESTAMPTZ NOT NULL,
  end_datetime        TIMESTAMPTZ NOT NULL,
  duration_minutes    INTEGER NOT NULL CHECK (duration_minutes > 0),

  -- Scoring
  pass_percentage     DECIMAL(5,2) DEFAULT 0 CHECK (pass_percentage BETWEEN 0 AND 100),
  variable_marks      BOOLEAN DEFAULT FALSE,
  marks_per_question  DECIMAL(6,2) DEFAULT 4,
  negative_marks      DECIMAL(6,2) DEFAULT 0 CHECK (negative_marks >= 0),
  roundoff_marks      BOOLEAN DEFAULT FALSE,

  -- Ranking & Display
  enable_ranking          BOOLEAN DEFAULT FALSE,
  show_score              BOOLEAN DEFAULT TRUE,
  show_analytics          BOOLEAN DEFAULT FALSE,
  show_percentile         BOOLEAN DEFAULT FALSE,
  show_solutions_to_user  BOOLEAN DEFAULT FALSE,
  show_pass_or_fail       BOOLEAN DEFAULT TRUE,

  -- Retake Rules
  allow_retaking_exam                     BOOLEAN DEFAULT FALSE,
  maximum_allowed_retakes                 INTEGER DEFAULT NULL,
  allow_retaking_only_for_failed_attempt  BOOLEAN DEFAULT FALSE,
  interval_between_retakes_minutes        INTEGER DEFAULT 0,

  -- Attempt Behavior
  enforce_continuous_timer    BOOLEAN DEFAULT FALSE,
  enable_quiz_mode            BOOLEAN DEFAULT FALSE,
  disable_attempt_resuming    BOOLEAN DEFAULT FALSE,
  enable_omr_mode             BOOLEAN DEFAULT FALSE,

  -- Advanced Config (JSONB)
  exam_config                 JSONB DEFAULT '{}';
```

#### 9.2.2 `exam_sections`

```sql
CREATE TABLE exam_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  order_index     INTEGER NOT NULL,
  instructions    TEXT,
  marks_per_question  DECIMAL(6,2) NOT NULL DEFAULT 4,
  negative_marks      DECIMAL(6,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(exam_id, order_index)
);

CREATE INDEX idx_exam_sections_exam ON exam_sections(exam_id);
```

#### 9.2.3 `exam_questions`

```sql
CREATE TABLE exam_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  order_index     INTEGER NOT NULL,
  marks_override      DECIMAL(6,2) DEFAULT NULL,
  negative_override   DECIMAL(6,2) DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(section_id, question_id)
);

CREATE INDEX idx_exam_questions_section ON exam_questions(section_id);
CREATE INDEX idx_exam_questions_question ON exam_questions(question_id);
```

#### 9.2.4 `course_exams`

```sql
CREATE TABLE course_exams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active   BOOLEAN DEFAULT TRUE,

  UNIQUE(course_id, exam_id)
);

CREATE INDEX idx_course_exams_course ON course_exams(course_id);
CREATE INDEX idx_course_exams_exam ON course_exams(exam_id);
```

#### 9.2.5 `exam_blueprints`

```sql
CREATE TABLE exam_blueprints (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  category            VARCHAR(100),
  is_system_template  BOOLEAN DEFAULT FALSE,
  client_id           UUID REFERENCES clients(id),
  school_id           UUID REFERENCES schools(id),
  created_by          UUID NOT NULL REFERENCES users(id),
  template_config     JSONB NOT NULL DEFAULT '{}',
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blueprints_client ON exam_blueprints(client_id);
CREATE INDEX idx_blueprints_category ON exam_blueprints(category);
```

#### 9.2.6 `exam_attempts`

```sql
CREATE TABLE exam_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id             UUID NOT NULL REFERENCES exams(id),
  student_id          UUID NOT NULL REFERENCES users(id),
  attempt_number      INTEGER NOT NULL DEFAULT 1,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at        TIMESTAMPTZ,
  auto_submitted      BOOLEAN DEFAULT FALSE,
  status              VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'submitted', 'graded')),
  total_score         DECIMAL(10,2) DEFAULT 0,
  total_correct       INTEGER DEFAULT 0,
  total_wrong         INTEGER DEFAULT 0,
  total_unattempted   INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(exam_id, student_id, attempt_number)
);

CREATE INDEX idx_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_attempts_student ON exam_attempts(student_id);
CREATE INDEX idx_attempts_status ON exam_attempts(exam_id, status);
```

#### 9.2.7 `exam_responses`

```sql
CREATE TABLE exam_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id          UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL REFERENCES questions(id),
  section_id          UUID NOT NULL REFERENCES exam_sections(id),
  student_answer      JSONB,
  is_attempted        BOOLEAN DEFAULT FALSE,
  is_marked_for_review BOOLEAN DEFAULT FALSE,
  answered_at         TIMESTAMPTZ,
  is_correct          BOOLEAN,  -- null = unattempted
  marks_awarded       DECIMAL(6,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(attempt_id, question_id)
);

CREATE INDEX idx_responses_attempt ON exam_responses(attempt_id);
CREATE INDEX idx_responses_question ON exam_responses(attempt_id, question_id);
```

#### 9.2.8 `exam_time_adjustments`

```sql
CREATE TABLE exam_time_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID NOT NULL REFERENCES exams(id),
  adjustment_type VARCHAR(50) NOT NULL,  -- 'global', 'per_student'
  minutes_added   INTEGER NOT NULL CHECK (minutes_added > 0),
  applies_to      VARCHAR(20) NOT NULL DEFAULT 'all',  -- 'all', 'specific'
  student_id      UUID REFERENCES users(id),
  reason          TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_adj_exam ON exam_time_adjustments(exam_id);
```

#### 9.2.9 `attempt_time_overrides`

```sql
CREATE TABLE attempt_time_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      UUID NOT NULL REFERENCES exam_attempts(id),
  minutes_added   INTEGER NOT NULL CHECK (minutes_added > 0),
  reason          TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_override_attempt ON attempt_time_overrides(attempt_id);
```

#### 9.2.10 `question_grading_overrides`

```sql
CREATE TABLE question_grading_overrides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id           UUID NOT NULL REFERENCES exams(id),
  question_id       UUID NOT NULL REFERENCES questions(id),
  override_type     VARCHAR(50) NOT NULL
                      CHECK (override_type IN (
                        'grace_marks', 'drop_question',
                        'answer_key_override', 'accept_multiple_answers'
                      )),
  override_payload  JSONB NOT NULL DEFAULT '{}',
  reason            TEXT NOT NULL,
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  is_active         BOOLEAN DEFAULT TRUE,

  UNIQUE(exam_id, question_id, override_type)
);

CREATE INDEX idx_grading_overrides_exam ON question_grading_overrides(exam_id);
```

### 9.3 Row-Level Security (RLS) Policies

Every table must have RLS policies enforcing:

```sql
-- Example: exam_attempts RLS
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

-- Students see only their own attempts
CREATE POLICY student_own_attempts ON exam_attempts
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    AND exam_id IN (
      SELECT e.id FROM exams e
      JOIN course_exams ce ON ce.exam_id = e.id
      JOIN course_memberships cm ON cm.course_id = ce.course_id
      WHERE cm.student_id = auth.uid()
        AND e.client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );

-- Staff see attempts within their tenant/school scope
CREATE POLICY staff_view_attempts ON exam_attempts
  FOR SELECT TO authenticated
  USING (
    exam_id IN (
      SELECT id FROM exams
      WHERE client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );
```

### 9.4 Indexing Strategy

| Table | Index | Purpose |
|---|---|---|
| `exam_attempts` | `(exam_id, student_id)` | Fast lookup for student's attempts on an exam |
| `exam_attempts` | `(exam_id, status)` | Find in-progress attempts for auto-submit cron |
| `exam_responses` | `(attempt_id, question_id)` | Fast single-response lookup for save API |
| `exam_responses` | `(attempt_id)` | Bulk fetch all responses for grading |
| `exam_questions` | `(section_id)` | Fetch all questions in a section |
| `course_exams` | `(course_id)` | Student exam list query |
| `question_grading_overrides` | `(exam_id)` | Fetch overrides during grading |

---

## 10. API Architecture

### 10.1 Complete Endpoint Reference

#### Exam CRUD

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/exams` | Create new exam | Admin+ |
| `GET` | `/api/exams` | List exams (with filters) | Admin+ |
| `GET` | `/api/exams/:id` | Get exam details | Admin+ |
| `PUT` | `/api/exams/:id` | Update exam | Admin+ (state-aware) |
| `DELETE` | `/api/exams/:id` | Delete exam | Admin+ (pre-start only) |
| `POST` | `/api/exams/:id/publish` | Validate & lock exam paper | Admin+ |

#### Section Management

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/exams/:id/sections` | Create section | Admin+ |
| `GET` | `/api/exams/:id/sections` | List sections with questions | Admin+ |
| `PUT` | `/api/sections/:id` | Update section | Admin+ (pre-freeze) |
| `DELETE` | `/api/sections/:id` | Delete section | Admin+ (pre-freeze) |

#### Question Assignment

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/sections/:id/questions` | Add question to section | Admin+ (pre-freeze) |
| `DELETE` | `/api/sections/:id/questions/:qid` | Remove question | Admin+ (pre-freeze) |
| `PUT` | `/api/sections/:id/questions/reorder` | Reorder questions | Admin+ (pre-freeze) |
| `GET` | `/api/questions/search` | Search question bank | Admin+ |

#### Course Assignment

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/exams/:id/assign-course` | Assign exam to course | Admin+ |
| `DELETE` | `/api/exams/:id/unassign-course` | Remove course assignment | Admin+ |

#### Blueprint Management

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/exam-blueprints` | List blueprints | Admin+ |
| `POST` | `/api/exam-blueprints` | Create blueprint | Admin+ |
| `PUT` | `/api/exam-blueprints/:id` | Update blueprint | Admin+ |
| `DELETE` | `/api/exam-blueprints/:id` | Delete blueprint | Admin+ |

#### Student Attempt

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/student/exams` | List available exams | Student |
| `POST` | `/api/student/exams/:id/start` | Start exam attempt | Student |
| `GET` | `/api/student/attempts/:id` | Get/resume attempt | Student (own) |
| `POST` | `/api/student/attempts/:id/save` | Save answer(s) | Student (own) |
| `POST` | `/api/student/attempts/:id/submit` | Submit attempt | Student (own) |
| `GET` | `/api/student/attempts/:id/result` | Get result | Student (own) |
| `POST` | `/api/student/attempts/:id/heartbeat` | Timer sync | Student (own) |

#### Live Controls

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/exams/:id/live/extend-end-time` | Extend exam window | Admin+ |
| `POST` | `/api/exams/:id/live/add-time` | Add time (global) | Admin+ |
| `POST` | `/api/attempts/:id/add-time` | Add time (per-student) | Admin+ |
| `POST` | `/api/exams/:id/live/question-text-correction` | Fix question text | Admin+ |
| `POST` | `/api/exams/:id/live/grading-override` | Apply grading override | Admin+ |

#### Results & Regrading

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/exams/:id/results` | All results for exam | Admin+ |
| `GET` | `/api/exams/:id/results/:attemptId` | Single attempt detail | Admin+ |
| `POST` | `/api/exams/:id/regrade` | Regrade all attempts | Admin+ |
| `POST` | `/api/attempts/:id/regrade` | Regrade single attempt | Admin+ |

### 10.2 API Response Standards

**Success response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}
```

**Error response:**
```json
{
  "success": false,
  "error": {
    "code": "EXAM_NOT_ACTIVE",
    "message": "This exam is not currently active",
    "details": {}
  }
}
```

### 10.3 Error Code Catalog

| Code | HTTP Status | Description |
|---|---|---|
| `EXAM_NOT_FOUND` | 404 | Exam does not exist |
| `EXAM_NOT_ACTIVE` | 403 | Exam is not in active state |
| `ACCESS_DENIED` | 403 | User lacks permission |
| `NO_COURSE_ACCESS` | 403 | Student not in assigned course |
| `MAX_ATTEMPTS_EXCEEDED` | 403 | Student has used all allowed attempts |
| `RETAKE_COOLDOWN` | 403 | Retake interval not yet elapsed |
| `ATTEMPT_ALREADY_SUBMITTED` | 409 | Attempt already submitted/graded |
| `ANSWER_SAVE_AFTER_TIMEOUT` | 403 | Time expired, cannot save |
| `RESUME_NOT_ALLOWED` | 403 | Exam disables resume after interruption |
| `OMR_ANSWER_LOCKED` | 403 | OMR mode: answer already saved |
| `PAPER_FROZEN` | 403 | Cannot modify paper after attempts exist |
| `INVALID_QUESTION_FOR_ATTEMPT` | 400 | Question doesn't belong to this attempt |
| `VALIDATION_ERROR` | 400 | Field validation failed |
| `UNSAFE_EDIT_BLOCKED` | 403 | Structural edit blocked during active exam |

---

## 11. Frontend Architecture

### 11.1 Screen Map

#### Teacher/Admin Screens

```
Exam Management
├── Exam List (table with filters, status badges, actions)
├── Create Exam (multi-step form, 6 steps)
├── Edit Exam (state-aware: full edit / restricted / read-only)
├── Exam Builder (section management + question assignment)
│   ├── Section panels with drag-drop
│   ├── Question search sidebar
│   └── Paper validation feedback
├── Blueprint Library (browse, filter, preview, create from)
├── Live Control Panel (dedicated panel for active exams)
│   ├── Time extension controls
│   ├── Question correction interface
│   ├── Grading override form
│   └── Regrade trigger
├── Results Dashboard
│   ├── Attempt list with filters
│   ├── Per-student drilldown
│   ├── Section-wise breakdown
│   └── Ranking table
└── Assign Exam to Course
```

#### Student Screens

```
Student Exam Experience
├── My Exams (available, upcoming, past attempts)
├── Exam Instructions (pre-start)
├── Exam Taking Screen
│   ├── Question display area (renders by type)
│   ├── Answer input components (radio, checkbox, number, toggle)
│   ├── Question palette (5 states with colors)
│   ├── Section tabs / navigation
│   ├── Countdown timer (with warnings)
│   ├── Mark for Review toggle
│   ├── Save & Next / Clear Answer buttons
│   ├── Auto-save indicator
│   └── Submit button with confirmation modal
└── Results Screen
    ├── Score card
    ├── Pass/fail indicator
    ├── Section-wise breakdown
    └── Answer review (if enabled)
```

### 11.2 Key Component Specifications

#### Timer Component

```
Props: effective_deadline, server_time, on_timeout
State: remaining_seconds (computed from server_time delta)
Behavior:
  - Counts down every second
  - Shows HH:MM:SS format
  - Warning state at 5 minutes (yellow)
  - Critical state at 1 minute (red, flashing)
  - Calls on_timeout when reaches zero
  - Recalibrates on heartbeat response
```

#### Question Palette Component

```
Props: questions[], responses[]
State: derived from response data
Rendering:
  - Grid of numbered squares
  - Color by state: gray/orange/green/purple/blue
  - Click jumps to question
  - Shows summary counts
  - Section grouping headers
```

#### Submit Confirmation Modal

```
Content:
  - Answered: X questions (green)
  - Unattempted: Y questions (gray)
  - Marked for Review: Z questions (purple)
  - Warning text if unattempted > 0
  - [Cancel] [Submit Exam] buttons
  - Submit button requires explicit confirmation
```

---

## 12. Backend Service Architecture

### 12.1 Service Layer Design

```
Controllers (API routes)
    │
    ▼
Services (Business logic)
    │
    ▼
Repositories (Database queries)
    │
    ▼
Supabase / PostgreSQL
```

### 12.2 Service Definitions

#### `exam.service`
- `createExam(payload, userId)` — validate, create, return
- `updateExam(examId, payload, userId)` — state-aware update
- `getComputedExamState(exam, now)` — compute draft/active/completed
- `validatePaper(examId)` — check sections, questions, order
- `hasAnyAttempts(examId)` — freeze check

#### `section.service`
- `createSection(examId, payload)` — with freeze check
- `updateSection(sectionId, payload)` — with freeze check
- `deleteSection(sectionId)` — with freeze check
- `addQuestion(sectionId, questionId)` — with validation
- `removeQuestion(sectionId, questionId)` — with freeze check
- `reorderQuestions(sectionId, order[])` — with freeze check

#### `attempt.service`
- `startExam(examId, studentId)` — full validation + creation
- `saveResponse(attemptId, payload)` — idempotent save + OMR check
- `submitAttempt(attemptId, studentId)` — atomic submission
- `autoSubmitExpired()` — cron job handler
- `getAttemptState(attemptId, studentId)` — for resume
- `computeEffectiveDeadline(attempt)` — timer computation

#### `grading.service`
- `gradeAttempt(attemptId)` — full grading pipeline
- `evaluateResponse(response, question, overrides)` — per-question eval
- `resolveMarks(question, section, exam)` — mark source resolution
- `computeTotals(responses)` — aggregate calculation

#### `result.service`
- `getStudentResult(attemptId, studentId)` — visibility-filtered
- `getTeacherResults(examId)` — full results for staff
- `getSectionBreakdown(attemptId)` — per-section compute
- `getResultWithReview(attemptId)` — include solutions if allowed

#### `override.service`
- `applyGradeOverride(examId, questionId, type, payload)` — create override
- `getActiveOverrides(examId)` — fetch for grading
- `regradeExam(examId)` — regrade all attempts
- `regradeAttempt(attemptId)` — regrade single attempt

#### `livecontrol.service`
- `extendEndTime(examId, newEndTime)` — with audit
- `addGlobalTime(examId, minutes, reason)` — with audit
- `addStudentTime(attemptId, minutes, reason)` — with audit
- `correctQuestionText(examId, questionId, corrections)` — safe edit

#### `blueprint.service`
- `createBlueprint(payload)` — save template
- `createExamFromBlueprint(blueprintId, overrides)` — prefill + create

---

## 13. Security Architecture

### 13.1 Non-Negotiable Security Rules

1. **Student can access only their own attempts.** Every student-facing API verifies `student_id = auth.uid()`.

2. **Tenant isolation is absolute.** Every query includes `client_id` filtering. RLS policies enforce at database level.

3. **School scope is respected.** Within a tenant, staff see only their school's data unless they have cross-school permissions.

4. **Submit is server-validated.** The frontend submit button is a UX convenience. The backend validates timing, status, and ownership independently.

5. **Timer is server-authoritative.** The frontend timer is a display. The backend computes and enforces deadlines.

6. **Solutions never leak.** When `show_solutions_to_user = false`, the result API strips solution data. Solutions also stay hidden until the exam's `end_datetime` has passed for ALL students.

7. **Overrides are permission-controlled.** Only roles with `can_manage_exam_live_controls` can create overrides. Every override is logged with `created_by` and `reason`.

8. **OMR lock is backend-enforced.** The save API rejects re-saves when OMR mode is active, not just the UI.

9. **Paper freeze is backend-enforced.** Structural mutation APIs check `hasAnyAttempts()` and reject with 403.

10. **Regrading does not mutate unrelated attempts.** Regrading operates on specific attempts and does not cascade to other exams or students.

### 13.2 Input Validation Rules

All API inputs are validated server-side:
- `title`: required, non-empty, max 255 chars
- `duration_minutes`: required, positive integer
- `end_datetime > start_datetime`: enforced
- `pass_percentage`: 0–100
- `negative_marks`: ≥ 0
- `student_answer` JSONB: validated against question type schema
- `question_id` in save: must belong to the attempt's question set
- All UUIDs: validated format before database query

### 13.3 Rate Limiting

| Endpoint | Limit | Reason |
|---|---|---|
| `/student/attempts/:id/save` | 60/minute | Prevent abuse; autosave is every 20-30s |
| `/student/exams/:id/start` | 5/minute | Prevent attempt creation spam |
| `/student/attempts/:id/heartbeat` | 2/minute | Reasonable for 30-60s interval |
| `/exams/:id/live/*` | 10/minute | Admin actions should be deliberate |

---

## 14. State Machines & Flow Diagrams

### 14.1 Exam Lifecycle

```
                    ┌──────────────────────────────┐
                    │         DRAFT                 │
                    │  (now < start_datetime)       │
                    │                               │
                    │  ✅ Full editing allowed       │
                    │  ✅ Section/question changes   │
                    │  ✅ Paper validation           │
                    │  ✅ Course assignment          │
                    │  ✅ Blueprint application      │
                    └──────────────┬────────────────┘
                                   │
                          start_datetime reached
                                   │
                    ┌──────────────▼────────────────┐
                    │         ACTIVE                 │
                    │  (start ≤ now ≤ end)           │
                    │                               │
                    │  ✅ Live controls              │
                    │  ✅ Safe text edits            │
                    │  ✅ Time extensions            │
                    │  ✅ Grading overrides          │
                    │  ❌ Structural paper changes   │
                    │  ❌ Adding/removing questions  │
                    └──────────────┬────────────────┘
                                   │
                          end_datetime reached
                                   │
                    ┌──────────────▼────────────────┐
                    │        COMPLETED               │
                    │  (now > end_datetime)          │
                    │                               │
                    │  ✅ Metadata cleanup           │
                    │  ✅ Tags editing               │
                    │  ✅ Report visibility           │
                    │  ✅ Grading overrides           │
                    │  ✅ Regrading                  │
                    │  ❌ Structural changes          │
                    └───────────────────────────────┘
```

### 14.2 Complete Student Exam Flow

```
Student opens My Exams
        │
        ▼
   Sees available exams (via course membership)
        │
        ▼
   Clicks "Start Exam" on an active exam
        │
        ▼
   ┌────────────────────────────────┐
   │  Backend validates:            │
   │  • Exam active?               │
   │  • Course membership?          │
   │  • Max attempts?              │
   │  • Retake cooldown?           │
   │  • Device/network?            │
   └────────────┬───────────────────┘
                │
          Validation passes
                │
                ▼
   ┌────────────────────────────────┐
   │  Backend creates:              │
   │  • exam_attempts row           │
   │  • exam_responses placeholders │
   │  • Computes timer              │
   │  • Returns frozen question set │
   └────────────┬───────────────────┘
                │
                ▼
   ┌────────────────────────────────┐
   │  Student takes exam:           │
   │  • Views questions             │
   │  • Selects/types answers       │
   │  • Saves responses (auto+manual)│
   │  • Marks for review            │
   │  • Navigates via palette       │
   │  • Timer counts down           │
   └─────┬─────────────┬────────────┘
         │             │
   Manual Submit    Timer = 0
         │             │
         ▼             ▼
   ┌────────────────────────────────┐
   │  Backend submits:              │
   │  • Atomic status transition    │
   │  • Triggers grading pipeline   │
   └────────────┬───────────────────┘
                │
                ▼
   ┌────────────────────────────────┐
   │  Grading engine:              │
   │  • Evaluates each response     │
   │  • Applies marks + negatives   │
   │  • Checks overrides            │
   │  • Computes totals             │
   │  • Sets status = 'graded'      │
   └────────────┬───────────────────┘
                │
                ▼
   ┌────────────────────────────────┐
   │  Student sees results:         │
   │  (filtered by exam config)     │
   │  • Score                       │
   │  • Pass/Fail                   │
   │  • Section breakdown           │
   │  • Answer review (if enabled)  │
   └────────────────────────────────┘
```

---

## 15. Performance & Scalability

### 15.1 Performance Targets

| Operation | Target | Approach |
|---|---|---|
| Exam start (question set load) | < 1 second | Single query with joins; return complete payload |
| Answer save | < 200ms | Single UPDATE on indexed row |
| Exam submit | < 500ms | Atomic status transition |
| Grading (200 questions) | < 3 seconds | Bulk fetch, in-memory evaluation, batch update |
| Student exam list | < 500ms | Indexed joins on course_exams + course_memberships |
| Results retrieval | < 1 second | Pre-computed totals in exam_attempts |

### 15.2 Optimization Strategies

1. **One-time question loading:** Load entire question set at attempt start. No per-question DB calls during exam.

2. **Bulk grading:** Fetch all responses + exam structure in 2-3 queries. Evaluate all in memory. Batch-update results.

3. **Indexed queries:** All foreign key relationships are indexed. Composite indexes on frequently joined columns.

4. **Lightweight saves:** Save endpoint updates a single indexed row. No cascading writes.

5. **Computed totals:** `total_score`, `total_correct`, etc. are pre-computed at grading time. Result queries read pre-computed values.

6. **Avoid N+1:** All list queries use eager loading / joins. Never loop with individual queries.

### 15.3 Concurrency Handling

**50-100 simultaneous exam takers (MVP target):**
- Each student writes only to their own response rows (no contention)
- Save endpoint is idempotent (safe for parallel autosave + manual save)
- Submit uses atomic `UPDATE WHERE status = 'in_progress'` (race-safe)
- PostgreSQL handles this concurrency level without issues

**Scaling beyond 500+ concurrent:**
- Move grading to async job queue
- Add connection pooling (PgBouncer)
- Consider read replicas for result queries
- Cache exam structure (sections/questions) during active exam

---

## 16. Error Handling Strategy

### 16.1 Error Categories

| Category | Examples | Handling |
|---|---|---|
| Validation errors | Missing title, invalid duration | 400 with field-specific messages |
| Access errors | No course membership, wrong tenant | 403 with clear reason code |
| State errors | Submit after graded, save after timeout | 409/403 with state description |
| Not found errors | Invalid exam ID, deleted question | 404 with resource type |
| Race conditions | Double submit, concurrent grading | Atomic DB operations, idempotent handlers |
| Infrastructure errors | DB connection failure, timeout | 500 with safe error message, internal logging |

### 16.2 Critical Error Scenarios

| Scenario | Handling |
|---|---|
| Missing response rows during grading | Log warning, grade available rows, flag for review |
| Invalid question type in grading | Skip question, log error, do not fail entire grading |
| Malformed student_answer JSON | Treat as unattempted, award 0 marks |
| Missing correct answer config | Skip question, log error, flag for admin review |
| Conflicting grading overrides | Apply precedence rules (drop > key > grace) |
| Answer save after timeout | Reject with `ANSWER_SAVE_AFTER_TIMEOUT`, do not update |
| Resume when disabled | Reject with `RESUME_NOT_ALLOWED` |
| Double grading request | Idempotent — if already graded, return existing result |

---

## 17. Development Plan

### 17.1 Timeline Overview

| Day | Date | Focus | Team |
|---|---|---|---|
| Day 10 | Sun, 15 Mar | Exam Tables + CRUD APIs | L + D + T |
| Day 11 | Mon, 16 Mar | Sections + Question Selection | L + D + T |
| Day 12 | Tue, 17 Mar | Exam Taking Backend | L + D + T |
| Day 13 | Wed, 18 Mar | Exam Taking UI + Auto-Grading | L + D + T |
| Day 14 | Thu, 19 Mar | Auto-Save, Results + Polish | L + D + T |
| Day 15 | Fri, 20 Mar | Testing + Bug Fixes | L + D + T |
| Day 16 | Sat, 21 Mar | Deployment + Documentation | L + D + T |

### 17.2 Testing Strategy

The tester (T) operates one day behind developers:
- **Day 10:** Prepare test plan + write test scripts
- **Day 11:** Test Day 10 deliverables (exam CRUD)
- **Day 12:** Test Day 11 deliverables (sections + publish)
- **Day 13:** Test Day 12 deliverables (attempt engine)
- **Day 14:** Test Day 13 deliverables (grading engine)
- **Day 15:** Full regression + security + edge cases
- **Day 16:** Final bug verification + production smoke + UAT

### 17.3 Daily Output Checkpoints

| Day | Must Ship |
|---|---|
| 10 | Exam tables created, CRUD APIs working, Exam list UI, Create form started |
| 11 | Sections working, Question selection, Publish flow, Student exam list API |
| 12 | Attempt tables, Start/Save/Resume APIs, Exam taking layout, Palette + Timer |
| 13 | Submit API + auto-grading (all Q types), Question display, Answer inputs, Navigation |
| 14 | Auto-save, Submit confirmation, Results page, Answer review |
| 15 | E2E testing complete, Security reviewed, Critical bugs fixed, UI polished |
| 16 | MVP deployed, Documentation ready, Production tested, Ready for UAT |

---

## 18. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Timer drift on unstable networks | High | High | Backend = source of truth; heartbeat recalibrates; cron auto-submits expired |
| 2 | Concurrent save conflicts | Medium | Low | Last-write-wins per question_id; single student per row; idempotent saves |
| 3 | Auto-submit race condition | Medium | High | Atomic DB: `UPDATE WHERE status='in_progress'`; zero rows = already submitted |
| 4 | Paper freeze violation | Low | Critical | `hasAnyAttempts()` in every structural mutation API; server-side enforcement |
| 5 | Grading override conflicts | Medium | High | Strict precedence: drop > key > grace; one override per question per exam |
| 6 | Multi-tenant data leakage | Low | Critical | RLS on every table; `client_id` in every query; cross-tenant test suite |
| 7 | OMR mode bypass via API | Low | High | Backend enforces OMR lock; save API checks `is_attempted` before update |
| 8 | 7-day timeline pressure | Medium | High | Parallel testing; daily checkpoints; defer ranking/PDF to follow-up sprint |

---

## 19. Acceptance Criteria

### 19.1 Module 1 — Exam Management

- [ ] Admin can create exam with all configuration fields
- [ ] Exam status computes correctly from timestamps (draft/active/completed)
- [ ] Exam can be assigned to one or more courses
- [ ] Students see only exams assigned to their courses
- [ ] Blueprint creates exam with prefilled values
- [ ] Blueprint changes don't affect existing exams
- [ ] Active exam allows only safe edits
- [ ] Live controls work: time extension, text correction
- [ ] Grading overrides can be created and applied

### 19.2 Module 2 — Paper Builder

- [ ] Sections can be created, edited, reordered, deleted
- [ ] Questions can be added from question bank with search/filter
- [ ] Only approved questions can be added
- [ ] Duplicate questions in same section are prevented
- [ ] Paper validates before publish (min questions, valid order)
- [ ] Paper freezes after first attempt starts
- [ ] Variable marks mode works per-question
- [ ] Section-level marks apply as default

### 19.3 Module 3 — Attempt Engine

- [ ] Student can start exam (all validations pass)
- [ ] Question set is frozen per attempt
- [ ] Response placeholders created at start
- [ ] Answers save correctly for all question types
- [ ] Autosave fires every 20-30 seconds
- [ ] Mark for review toggles and persists
- [ ] Timer counts down and triggers auto-submit
- [ ] OMR mode locks answers after first save
- [ ] Resume loads saved state with recomputed timer
- [ ] Manual submit works with confirmation
- [ ] Auto-submit catches expired attempts

### 19.4 Module 4 — Grading & Results

- [ ] All question types grade correctly (MCQ-S, MCQ-M, Numerical, Integer, T/F, Assertion-Reason)
- [ ] Negative marks apply only on wrong answers
- [ ] Unattempted gets zero marks
- [ ] Mark source resolves: question override → section → exam
- [ ] Total score, correct, wrong, unattempted compute accurately
- [ ] Pass/fail calculates correctly
- [ ] Round-off applies at total level only
- [ ] Student result respects visibility flags
- [ ] Section-wise breakdown is accurate
- [ ] Answer review shows correct answers when allowed
- [ ] Teacher sees all results with drilldown
- [ ] Regrading produces consistent, idempotent results
- [ ] Grading overrides (grace, drop, key change) apply correctly

---

## 20. Glossary

| Term | Definition |
|---|---|
| **Attempt** | A single instance of a student taking an exam. One student may have multiple attempts (retakes). |
| **Blueprint** | A reusable exam template that prefills configuration when creating a new exam. |
| **Computed Status** | Exam state (draft/active/completed) derived from timestamps, not manually set. |
| **Continuous Timer** | Timer that keeps running even if student closes browser or loses connection. |
| **Freeze** | The point at which exam paper structure becomes immutable (first attempt created). |
| **Grace Marks** | Fixed marks awarded to all students for a specific question (via override). |
| **Grading Override** | A record that modifies how a specific question is scored without changing the original question. |
| **Idempotent** | An operation that produces the same result no matter how many times it runs. |
| **Live Controls** | Operational actions available during an active exam (time extension, text correction, etc.). |
| **Mark Source Resolution** | The priority order for determining marks: question override → section default → exam default. |
| **OMR Mode** | Optical Mark Recognition mode where answers cannot be changed after first save. |
| **Paper Structure** | The combination of sections, questions, and ordering that define an exam. |
| **Quiz Mode** | Mode where correctness feedback may be shown after each question. |
| **Regrading** | Re-evaluating all responses for an attempt, typically after an override is applied. |
| **Response Placeholder** | Empty `exam_responses` rows created at attempt start, one per question. |
| **RLS** | Row-Level Security — Supabase/PostgreSQL feature that restricts data access at the database level. |
| **Tenant** | A client organization (school group) with isolated data in the multi-tenant system. |
| **Variable Marks** | Mode where different questions in the same section can have different mark values. |

---

*Document End — SPECTROPY LMS Exam Engine PRD v1.0*
