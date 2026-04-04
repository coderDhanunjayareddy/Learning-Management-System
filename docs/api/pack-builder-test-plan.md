# Pack Builder Day 1 Test Plan

## Acceptance Criteria
- User can open Pack Builder from `/superadmin/packs`.
- User can open Pack Builder from `/content-authorizer/packs`.
- Pack selector loads from `GET /api/packs` and shows loading, empty, and error states.
- `POST /api/packs` validates `name`, blocks duplicate pack names, and auto-selects the new pack in the UI.
- `GET /api/packs/:id/items` returns item-based pack contents with course, grade, and subject context.
- `GET /api/packs/:id/summary` returns grouped counts by course and subject.
- `GET /api/courses` returns platform-global courses by default and supports search by name, grade, and subject.
- `POST /api/courses` validates `name` and `grade`, blocks duplicate names in the same scope, and returns `course_id`.
- `GET /api/courses/:id/content` returns paginated course content for item selection.
- `POST /api/packs/:id/items` adds selected items, skips duplicates, and returns the updated item count.
- `POST /api/packs/:id/attach-course` adds all items from a platform-global course in one call.
- `DELETE /api/packs/:id/items/:itemId` removes a single item and supports the UI undo window.
- Client-owned course items cannot be attached to a platform-global pack.

## Backend Scenarios
- Empty pack list.
- Create pack success and duplicate-name rejection.
- Populated pack list with correct `item_count` and `course_count`.
- Invalid pack ID returns `404`.
- Global course search without `client_id`.
- Explicit `client_id` filter for a platform admin.
- Create course validation errors for missing name, missing grade, and duplicate name.
- Add item flow with one new item and one duplicate item.
- Attach-course flow where one item already exists in the pack.
- Remove item flow and second delete returning `removed: false`.
- Forbidden attach attempt for a client-owned content item.

## Frontend Scenarios
- Pack dropdown renders the correct badge count for the selected pack.
- Create Course modal validates inline and closes on success.
- Selecting a course loads its content items with checkbox multi-select.
- `Add to Pack` clears the current selection and refreshes the pack data.
- `Attach Entire Course` refreshes counts and summary.
- Remove button hides the item immediately, shows an undo toast, and commits delete after 3 seconds.
- Summary groups can be expanded and collapsed.

## Fixture Data
- Global Pack 1: `STEM Starter`, initially contains `Motion` and `Atoms Quiz`.
- Global Pack 2: `Empty Pack`, contains no items.
- Course 10: `Physics 101`, global, `grade=10`, `subject=Physics`, 2 items.
- Course 11: `Chemistry Basics`, global, `grade=9`, `subject=Chemistry`, 1 item.
- Course 12: `Tenant Biology`, client-owned, `grade=8`, `subject=Biology`, 1 item.
- Content items:
  - `video`: `Motion`
  - `pdf`: `Force Notes`
  - `exam`: `Atoms Quiz`
