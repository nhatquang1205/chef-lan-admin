# Plan 19: shared modules

Context: `../chef-lan/docs/included-courses/plans/04-shared-module-flag.md` (needs that plan).

## API

- `CourseRequest` gains `isSharedModule: boolean`. A PUT replaces the course, so always send it from the loaded record.
- List items and the admin detail carry `isSharedModule`. `GET /api/v1/admins/courses?isSharedModule=true|false`.
- 409 `course.shared_in_use`, `course.shared_cannot_include`, `course.include_not_shared`.

## Build

1. `lib/api/types.ts`, `courses.ts`, `errors.ts` with Vietnamese messages for the three codes.
2. `CourseForm`: a `Switch` "Đây là học phần chung", with the hint "Khóa này sẽ không hiện trong danh sách khóa học công khai, và có thể
   được thêm vào khóa khác làm học phần." Sent on create and update, JSON and multipart if the form still uses it.
3. Course list: a badge "Học phần chung" on those rows, and a URL filter "Tất cả / Khóa học / Học phần chung".
4. Course page header: the same badge.
5. `AddIncludeDialog`: the picker lists only `isSharedModule: true`. Its empty state says to turn the switch on in the course first.
6. Includes tab of a flagged course: no add button, and a note that a shared module cannot contain other modules.
7. Tick the status table and add the API to `docs/spec.md`.

## Done when

`pnpm build`, `pnpm lint` clean. In the browser against the local API: the switch saves and survives a reload and a later edit of another
field; the list badge and filter work; the picker shows only flagged courses; each 409 shows its Vietnamese message; 375 px holds. Test
data removed.

## Implementation notes

- Done. `pnpm build` and `pnpm lint` clean; checked in the browser against the local API (switch saves and survives reload and a later edit of another field, list badge and filter, picker shows only flagged courses and its empty states, 409 messages, 375 px without horizontal scroll). Test data removed.
- The list filter is the URL param `kind=regular|module` (a Select "Tất cả / Khóa học / Học phần chung"), mapped to `isSharedModule=false|true` for the API. Counts as a filter for the "Xóa bộ lọc" empty state.
- `CourseForm` is JSON only (no multipart), so only `CourseRequest` carries the flag; it is a form value, so every PUT sends the loaded value. The switch sits in the "Phân loại" card.
- Includes tab: a flagged course with no includes shows only the note (no add button). A flagged course that already has includes (flagged before the rule) keeps the normal list so staff can remove them. A flagged course that is included elsewhere still shows the existing "là học phần của" note.
- `course.shared_in_use` and `course.shared_cannot_include` were exercised through the form toast; `course.include_not_shared` is unreachable from the UI (the picker lists only flagged courses), checked against the API only, its message is in `errors.ts`.
- `GrantAccessDialog` still lists all courses: a shared module can be granted alone.
