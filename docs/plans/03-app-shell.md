# Plan 03 — App shell

**Goal:** the frame every screen lives in, plus shared states so later plans stay small.

## Build

1. **Layout** — `src/components/AppLayout.tsx` (route element with `<Outlet />`): left sidebar on desktop
   (brand "Bon Bocon — Quản trị", nav: "Khóa học" → `/courses`), top bar with the user's `displayName`, a
   dropdown with "Đổi mật khẩu" and "Đăng xuất". On narrow screens the sidebar collapses into a `sheet` menu.
   Use shadcn `sidebar` (or `sheet` + `dropdown-menu` + `avatar` if `sidebar` is too heavy). `/` redirects to `/courses`.
2. **Page header** — `src/components/PageHeader.tsx`: title, optional description, optional breadcrumb
   (`breadcrumb` component) and an actions slot on the right.
3. **Shared states** — `src/components/states.tsx`: `<LoadingState />` (skeleton rows), `<ErrorState error onRetry />`
   (text from `messageFor`, "Thử lại" button), `<EmptyState title description action />`.
4. **Confirm dialog** — `src/components/ConfirmDialog.tsx` on shadcn `alert-dialog`: title, description, confirm
   label, `destructive` variant, `onConfirm` returning a promise (button shows pending, dialog stays open on error).
5. **Money input** — `src/components/VndInput.tsx`: text input that shows `550.000` while typing, stores a
   whole `number | null`, rejects non-digits; suffix "₫". Used by Plans 05 and 07.
6. **Unsaved changes guard** — `src/lib/useUnsavedChangesPrompt.ts`: `beforeunload` prompt when a form is dirty
   (router navigation blocking is optional; keep it simple).

## Out of scope

Real course data (Plan 04).

## Done when

- Signed in, every page shows the sidebar/top bar; logout and change password work from the menu.
- Layout works at 375 px width (menu in a sheet, no horizontal scroll).
- `/courses` shows a placeholder page using `PageHeader` and `EmptyState`.
- `pnpm build` / `pnpm lint` clean. Mark 03 `done`.
