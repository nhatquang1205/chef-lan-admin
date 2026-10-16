# Plan 05 — Course create / edit

**Goal:** create a course and edit every editable field, including the thumbnail.

## Install

```bash
pnpm add react-hook-form zod @hookform/resolvers
pnpm dlx shadcn@latest add textarea checkbox popover command form
```

## Build

1. **API** — in `src/lib/api/courses.ts`: `getCourse(id)`, `createCourse(input)`, `updateCourse(id, input)`.
   Input = `CourseRequest` fields + `thumbnail: { kind: 'none' } | { kind: 'url', url } | { kind: 'file', file: File }`.
   - `kind: 'file'` → send `multipart/form-data` (`FormData`; `categoryIds` appended once per id; numbers as
     plain strings like `550000`; omit null fields) with `thumbnailFile`.
   - otherwise → JSON with `thumbnailUrl` (`null` for none).
   - After success invalidate `['courses']` and set `['course', id]`.
2. **Form** — `src/features/courses/CourseForm.tsx`, used by `/courses/new` and the "Thông tin" tab of
   `/courses/:id` (Plan 06 adds the page around it). zod schema mirrors the API:
   - `title` required ≤ 200; `subtitle` ≤ 300; `metaDescription` ≤ 300; `description`, `whatYouWillLearn` long text
     (textarea, line breaks kept — the public site shows them as typed; one item per line for "Bạn sẽ học được").
   - `priceVnd` required whole number ≥ 0 (`VndInput`); `compareAtPriceVnd` optional and ≥ `priceVnd`
     ("Giá gốc" — shown struck through on the site).
   - `accessDurationDays` optional positive integer; empty = "Trọn đời".
   - `level` select; `categoryIds` multi-select (popover + command list from `listCategories`, InActive ones
     marked "(ẩn)"); `promoVideoUrl`, `legacyFacebookGroupUrl` optional http(s) URLs.
   - Thumbnail field: current image preview; "Tải ảnh lên" (file input, accept `image/jpeg,image/png,image/webp`,
     ≤ 5 MB checked client-side) or "Dùng đường dẫn" (URL input); "Xóa ảnh".
3. **Saving** — create: `POST`, then navigate to `/courses/:newId`. Edit: `PUT` with **all** fields from the form
   (the PUT replaces the course; an unchanged thumbnail must be sent back as its URL, or it is cleared).
   Map 400 `errors` to fields with `fieldErrors`; other errors (`course.unknown_categories`,
   `course.thumbnail_conflict`, `upload.*`, 409 concurrent edit) → toast with `messageFor`. Success toast "Đã lưu".
4. Status, slug, counters and published date are **shown read-only** on the edit page header, never in the form.
5. Unsaved-changes prompt while dirty (Plan 03 hook).

## Done when

- Create a course with a thumbnail file → it appears in the list as Nháp with the image (B2 must be configured
  in the backend, otherwise expect the 503 `upload.image_storage_not_configured` message).
- Create with a thumbnail URL and two categories; edit only the title → thumbnail and categories are unchanged.
- `compareAtPriceVnd` below price, price `1.5`, empty title → inline Vietnamese errors, no request sent.
- "Xóa ảnh" + save → thumbnail cleared.
- `pnpm build` / `pnpm lint` clean. Mark 05 `done`.

## Implementation notes

- Added shadcn `textarea`, `checkbox`, `popover`, `command` (pulled in `dialog`, `input-group`; new npm dep `cmdk`). `form` does not exist in
  this registry; plain react-hook-form + `Controller` as in Plan 02. `checkbox` is installed but unused.
- Same URL, selected by `Content-Type`: `POST /admins/courses` and `PUT /admins/courses/{id}` have a JSON action and a multipart action.
  `thumbnail.kind === 'file'` sends `FormData` (no manual Content-Type, the browser adds the boundary), anything else sends JSON.
  Thumbnail sending: `none` -> JSON `thumbnailUrl: null` (clears it); `url` -> JSON `thumbnailUrl: "<url>"` (an unchanged thumbnail is
  just the loaded URL as `kind: 'url'`); `file` -> multipart `thumbnailFile` with no `thumbnailUrl` field. Multipart omits null/empty
  fields, appends `categoryIds` once per id, numbers as plain strings.
- API (`lib/api/courses.ts`): `getCourse(id)`, `createCourse(input)`, `updateCourse(id, input)`, types `CourseInput`, `ThumbnailInput`. The
  create/update functions invalidate `['courses']` and `setQueryData(['course', id], course)` themselves. Query key: `['course', id]` (number id).
- Components: `features/courses/CourseForm.tsx` (default export, prop `course?: CourseAdminDetailResponse`; create when omitted -> navigates to
  `/courses/:id` with `replace`; edit resets itself to the saved response). It renders no header; mount it with `key={course.id}`.
  `CourseEditPage.tsx` (loads `['course', id]`, simple header: title, status badge, `/slug`, lessons/duration/enrollments/published date) and
  `CourseCreatePage.tsx` are thin; `PlaceholderPage.tsx` was deleted. Plan 06 should wrap `CourseForm` in the tabs on `CourseEditPage`.
- `COURSE_STATUS_VARIANT` moved from `CoursesPage.tsx` to `lib/format.ts` so the edit page can share it.
- Save button is disabled while the edit form is clean; "Hủy thay đổi" resets to the loaded course.
- Server 400 `errors` are mapped onto fields (`thumbnailUrl` -> the thumbnail field); if none maps, a toast is shown. Other errors -> toast.
- `VndInput` strips non-digits, so a price of `1.5` cannot be typed (it becomes 15); the integer check in the schema is a backstop.
- The unsaved-changes prompt is `beforeunload` only (Plan 03 hook), so in-app navigation is not blocked.
- Not exercised in a browser; only build and lint were run.
