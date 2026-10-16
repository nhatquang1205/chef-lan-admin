# Plan 11 — Categories

**Goal:** manage categories (the backend API already exists, no backend change).

API: `GET /api/v1/admins/categories?status=&q=` → `CategoryAdminResponse[]`; `GET /{id}`; `POST`; `PUT /{id}`;
`DELETE /{id}` (204, or 409 `category.in_use` while a course uses it). Body `CategoryRequest { name, description?,
thumbnailUrl?, displayOrder?, status: "Active"|"InActive" }`. The slug is generated on create and never changes.
Read the controller/validator in `../chef-lan/src` (`AdminCategoriesController.cs`, `ContentValidators.cs`) for exact rules.

## Build

1. `lib/api/categories.ts`: add `getCategory`, `createCategory`, `updateCategory`, `deleteCategory`; invalidate
   `['categories']` (the course form's picker uses it) after every mutation.
2. Nav item "Danh mục" (`/categories`) in `AppLayout`'s `NAV_ITEMS`.
3. `/categories`: table — thumbnail, name, slug, status badge ("Đang hiện" / "Đang ẩn"), display order, actions.
   Search box (client-side filter is fine: the list is small) and status filter. Sorted by display order then name.
   "Thêm danh mục" opens the form.
4. Form (dialog, or `/categories/new` and `/categories/:id` — pick the dialog, the form is short): name (required),
   description, display order (integer ≥ 0, empty = server default), status switch, thumbnail: upload (reuse
   `uploadImage` + `validateImage` from `lib/api/uploads.ts`, it returns the URL) **or** paste a URL, with a preview
   and "Xóa ảnh". PUT sends every field.
5. Delete with `ConfirmDialog`; on 409 `category.in_use` show "Danh mục đang được dùng bởi khóa học. Hãy ẩn danh mục
   thay vì xóa." and offer a button that sets it to InActive. Add that code to `lib/api/errors.ts`.

## Done when

Create, edit, hide/show, delete an unused category, and the in-use delete message, all work against the local API;
a new category appears in the course form's picker without reloading; `pnpm build` / `pnpm lint` clean.
