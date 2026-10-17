# Plan 15 — Included courses (shared modules)

Context: `../chef-lan/docs/included-courses/spec.md`. Needs backend B1. API shapes: implementation notes at the end of
`../chef-lan/docs/included-courses/plans/01-schema-and-admin-api.md`.

## Build

1. `lib/api/includes.ts`: list, upsert (PUT with `discountVnd`), remove, reorder, included-in. Keys
   `['course-includes', courseId]`, `['course-included-in', courseId]`; invalidate `['course', id]` too.
2. Course page: new tab "Học phần chung" (`?tab=includes`) next to "Thông tin" and "Bài học":
   - Explanation line: "Khóa học này bao gồm toàn bộ bài học của các khóa dưới đây. Khách đã có khóa đó sẽ được giảm giá."
   - Sortable list (reuse `SortableList`): title (link to that course), status badge (warn "Khóa này đang Nháp, khách
     sẽ không thấy" for drafts), lesson count, its own price, "Giảm khi đã có" amount (`VndInput`, inline edit + save),
     remove (confirm).
   - "Thêm học phần" dialog: course search (`listCourses`), excluding this course and courses that cannot be included
     (the backend answers `course.include_nested` / `course.include_self`; show those messages in Vietnamese), plus the
     discount amount (required, default 0, must be ≤ this course's price).
   - If this course is itself included somewhere, the tab shows "Khóa này là học phần của: …" (from `included-in`)
     and no add button (one level only).
3. Course list: optional small badge "Có học phần" / "Học phần" using the counts on the detail if cheap; skip if it
   needs extra requests.
4. Error codes in `lib/api/errors.ts`: `course.include_self`, `course.include_nested`, `course.include_discount_too_high`,
   `course.has_includes` (delete blocked).
5. `FieldLabel` with `required` for the discount; buttons/badges follow the height rule in `CLAUDE.md`.

## Done when

Against the local API: add C to P with a discount, edit the discount, reorder two includes, remove one; nested include
and self include show the Vietnamese messages; deleting C while included shows the blocked message. `pnpm build` /
`pnpm lint` clean. Clean up test data.
