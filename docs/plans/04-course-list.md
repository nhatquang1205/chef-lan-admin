# Plan 04 — Course list

**Goal:** `/courses` lists every course, drafts included, with filters and paging.

## Build

1. **API** — `src/lib/api/courses.ts`: `listCourses(params)` → `GET /api/v1/admins/courses` (omit empty params);
   `src/lib/api/categories.ts`: `listCategories()` → `GET /api/v1/admins/categories`.
   Query keys: `['courses', params]`, `['categories']` (categories: `staleTime` 5 min).
2. **Filters in the URL** — read/write `status`, `q`, `categorySlug`, `level`, `sort`, `page` with
   `useSearchParams`, so reload and back/forward keep them. `q` debounced 300 ms; changing any filter resets `page` to 1.
3. **Toolbar** — search input ("Tìm khóa học…"), status select (Tất cả / Nháp / Đã xuất bản / Lưu trữ), category
   select (from `listCategories`, by slug), level select, sort select (Mới nhất / Giá tăng / Giá giảm / Tên),
   "Thêm khóa học" button → `/courses/new`.
4. **Table** (shadcn `table`, `badge`, `select`, `pagination`): thumbnail (48×30, placeholder if none), title +
   subtitle, status badge, categories, price (`priceDisplay`, struck `compareAtPriceVnd` if higher), lessons
   count, total duration, published date. Row click → `/courses/:id`. Keep previous page data while loading the
   next (`placeholderData: keepPreviousData`).
5. **Pagination** — "Trang x / y", previous/next, `pageSize` 20.
6. States: loading skeleton, error with retry, empty ("Chưa có khóa học nào" with the add button; with filters:
   "Không có khóa học phù hợp" + "Xóa bộ lọc").
7. Add routes `/courses/new` and `/courses/:id` as placeholders (filled by Plans 05–07).

## Done when

- All local courses appear, drafts included; each filter and the search narrow the list and survive reload.
- Paging works with more than 20 courses (or set `pageSize` lower temporarily to check).
- Mobile: table scrolls horizontally inside its card, page does not.
- `pnpm build` / `pnpm lint` clean. Mark 04 `done`.
