# Plan 17 — Course images (gallery) and WebP uploads

Context: `../chef-lan/docs/course-images/spec.md`. Needs backend B1 (upload returns `{ url, width, height }`, 15 MB
input, always WebP) and B2 (gallery endpoints). Shapes: implementation notes at the end of
`../chef-lan/docs/course-images/plans/01-webp-pipeline.md` and `02-course-images.md`.

## Build

1. `lib/api/uploads.ts`: `uploadImage` returns `{ url, width, height }`; `validateImage` max size → **15 MB**. Upload
   with `XMLHttpRequest` (like video uploads) when progress is needed; keep `adminFetch` for the single-image cases if
   simpler.
2. **Cover image** in the course form: upload through `POST /api/v1/admins/uploads/images` first, then send
   `thumbnailUrl` with the JSON PUT/POST — stop sending `thumbnailFile` multipart (nginx limits `/api/` to 6 MB and the
   uploads endpoint is where the WebP conversion and the 15 MB limit apply). Label it "Ảnh bìa (hiện ở banner trang
   chủ)" with a hint "Nên dùng ảnh ngang ~1920×1080, món ăn ở giữa".
3. **New tab "Hình ảnh"** on the course page (`?tab=images`):
   - Drop zone + "Chọn ảnh" (multiple, `image/jpeg,image/png,image/webp`). Each file: client check (type, 15 MB), then
     upload with its own progress bar, then attach (`POST /admins/courses/{id}/images` with url/width/height). Run a
     few at a time (e.g. 3 in parallel). Failed files show the Vietnamese error and a retry; others continue.
   - Grid of images in order (sortable, reuse `SortableList` or a grid variant with @dnd-kit), first one marked
     "Ảnh đại diện trên thẻ khóa học". Each card: preview, alt text input (save on blur/Enter), delete (confirm:
     "Ảnh sẽ bị xóa khỏi khóa học và khỏi kho lưu trữ").
   - Counter "x/20 ảnh"; disable adding at 20 (`course.too_many_images`).
   - Hint when empty: "Chưa có ảnh. Thẻ khóa học và trang chi tiết đang dùng ảnh bìa."
4. Category image and video thumbnail uploads keep working (they now get WebP automatically; update their size hint
   to 15 MB).
5. Error codes: `course.too_many_images`, `course.image_not_found`; existing `upload.*`.

## Done when

Against the local API (B2 storage configured, or expect the 503 message): upload 3 images at once with progress, they
appear in order as `.webp`; reorder → persists; edit alt; delete one; cover image upload still works and is `.webp`.
`pnpm build` / `pnpm lint` clean. Clean up test data.
