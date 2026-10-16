# Plan 06 — Course page and actions

**Goal:** `/courses/:id` is the course's home: header with status and actions, tabs for details and lessons.

## Build

1. **Page** — `src/features/courses/CoursePage.tsx`: loads `getCourse(id)`; 404 (`course.not_found`) → "Không tìm
   thấy khóa học" with a link back. `PageHeader` with breadcrumb (Khóa học › title), status badge, slug,
   `lessonCount` bài · duration · `enrollmentCount` học viên, published date.
   Tabs (shadcn `tabs`, state in `?tab=`): "Thông tin" (the Plan 05 form) and "Bài học" (Plan 07; placeholder for now).
2. **Publish / unpublish** — header button "Xuất bản" (Draft) or "Ẩn khóa học" (Published):
   `POST /{id}/publish|unpublish`, then refetch the course and invalidate `['courses']`. Errors in Vietnamese:
   - `course.no_published_lesson` → "Khóa học cần ít nhất một bài học (nằm trong khóa học) đã xuất bản."
   - `course.no_playable_video` → "Khóa học cần ít nhất một video có thể phát."
   Unpublish confirm: "Khách hàng sẽ không thấy khóa học này nữa. Người đã mua vẫn giữ quyền truy cập."
3. **View on site** — when Published, a link "Xem trên trang" to the customer site
   (`VITE_PUBLIC_SITE_URL` + `/courses/{slug}`; add the variable to `.env.example`; hide the link if unset).
4. **Delete** — in a "…" menu: `ConfirmDialog` (destructive) "Xóa khóa học “{title}”? Thao tác này ẩn khóa học khỏi
   mọi danh sách." → `DELETE /{id}` → toast, invalidate `['courses']`, navigate to `/courses`.

## Done when

- A new course without lessons: "Xuất bản" shows the no-lesson message (409), course stays Nháp.
- A course with a published lesson and playable video publishes; the badge and list update; "Ẩn khóa học" reverts it.
- Delete removes it from the list; its URL then shows the not-found state.
- `pnpm build` / `pnpm lint` clean. Mark 06 `done`.
