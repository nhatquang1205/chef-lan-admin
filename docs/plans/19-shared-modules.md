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
