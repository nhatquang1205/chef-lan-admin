# Plan 07 — Lessons

**Goal:** the "Bài học" tab of a course: list, reorder, create, edit, delete lessons.

## Install

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm dlx shadcn@latest add switch dialog
```

## Build

1. **API** — `src/lib/api/lessons.ts`: `listLessons(courseId)`, `getLesson(id)`, `createLesson(courseId, body)`,
   `updateLesson(id, body)`, `deleteLesson(id)`, `reorderLessons(courseId, lessonIds)`. Keys:
   `['lessons', courseId]`, `['lesson', id]`. After any lesson mutation also invalidate `['course', courseId]`
   and `['courses']` (the server recomputes lesson count and duration).
2. **List** — sortable list (dnd-kit, drag handle, keyboard sorting on): number, title, badges "Nháp" (not
   published) and "Mua thêm" (`includedInCourse: false`), price if set, `videoCount` video · duration. Row click →
   `/courses/:courseId/lessons/:lessonId` (Plan 08 adds the video section there).
3. **Reorder** — on drop, update the list optimistically and send `PUT …/lessons/order` with the **full** id list;
   on error (`order.mismatch` = someone else changed the lessons) toast "Danh sách bài học đã thay đổi, đã tải lại."
   and refetch.
4. **Lesson form** — `src/features/lessons/LessonForm.tsx` (page `/courses/:courseId/lessons/new` and the top of
   the lesson page): `title` (required ≤ 200), `description` (textarea, line breaks kept), `recipes` (Markdown
   textarea, ≤ 100 000 chars, with a "Xem trước" toggle rendering it — `pnpm add react-markdown` — the ingredient
   tables from chef Lan's docs are GFM tables, so also `pnpm add remark-gfm`), `resourcesUrl` (http/https URL),
   `isPublished` switch ("Hiển thị"), `includedInCourse` switch ("Nằm trong giá khóa học"; off = "Bài mua thêm"),
   `priceVnd` (`VndInput`, label "Giá mua riêng"; **required when `includedInCourse` is off**, otherwise optional).
   Help text under the switch: "Bài mua thêm không được mở khi khách mua cả khóa; khách phải mua riêng bài này."
   When an existing lesson is switched from included to add-on, confirm: "Những khách đã mua khóa học sẽ mất quyền
   xem bài này. Tiếp tục?"
5. **Save** — PUT sends **every** field. Validation errors → fields; success toast; create → navigate to the new
   lesson page.
6. **Delete** — `ConfirmDialog` "Xóa bài học “{title}”?" → `DELETE`, back to the course's lessons tab.
7. Empty state: "Chưa có bài học nào" + "Thêm bài học".

## Done when

- Create 3 lessons; they show in order; course header lesson count and duration update.
- Drag lesson 3 to the top → order persists after reload.
- Turn a lesson into an add-on without a price → inline error; with a price → saved, "Mua thêm" badge, course
  lesson count drops by one.
- Recipes Markdown with a table previews as a table and round-trips unchanged.
- Delete a lesson → gone, counts updated.
- `pnpm build` / `pnpm lint` clean. Mark 07 `done`.

## Implementation notes

- Added `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `react-markdown`, `remark-gfm`; shadcn `switch` (`dialog` already existed, not overwritten). Raw HTML in Markdown stays disabled (react-markdown default).
- API (`lib/api/lessons.ts`): `listLessons(courseId)`, `getLesson(id)`, `createLesson(courseId, body)`, `updateLesson(id, body)`, `deleteLesson(id, courseId)`,
  `reorderLessons(courseId, ids)`. Create/update/delete invalidate `['lessons', courseId]`, `['course', courseId]`, `['courses']`; create/update also `setQueryData(['lesson', id])`.
  `reorderLessons` does not invalidate; `LessonList` does it after the call. Keys: `['lessons', courseId]`, `['lesson', id]` (numeric ids).
- Reusable for Plan 08: `components/SortableList.tsx` (`items: {id:number}[]`, `onReorder(nextItems)`, `renderItem(item, index, handle)` where `handle` is the drag-handle button to place in the row;
  pointer + keyboard sensors) and `components/Markdown.tsx`. `LessonList.tsx` shows the optimistic pattern: `setQueryData` with the new order, send the full id list, toast on error
  (`order.mismatch` -> "Danh sách bài học đã thay đổi, đã tải lại."), then always `invalidateQueries` so the server order wins.
- Routes: `/courses/:courseId/lessons/new` (`LessonCreatePage`) and `/courses/:courseId/lessons/:lessonId` (`LessonPage`). `LessonPage` loads `['lesson', id]` and `['course', courseId]` (breadcrumb),
  renders header (badges, delete menu, `ConfirmDialog`) and `<LessonForm key={lesson.id} courseId lesson />` inside a `max-w-3xl flex flex-col gap-6` div; Plan 08 adds its videos section as a sibling
  below the form in that div. A lesson whose `courseId` differs from the URL shows not-found. Breadcrumb/back links go to `/courses/:id?tab=lessons`.
- `LessonForm`: validation in a zod schema (add-on requires price, recipes <= 100000, http(s) URL); server field errors are mapped onto fields. Empty description/recipes/resourcesUrl are sent as `null`;
  recipes is otherwise sent unaltered (no trimming). The included -> add-on confirmation is shown on submit (not on toggling the switch). The "Xem trước" toggle swaps the textarea for the rendered Markdown (form value is kept).
- Not exercised in a browser; only build and lint were run.
