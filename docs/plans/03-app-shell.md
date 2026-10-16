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

## Implementation notes

- No shadcn `sidebar`: a plain `<aside>` (desktop, `md:` and up) plus `sheet` (mobile) and `dropdown-menu`. Added shadcn
  components: `sheet`, `dropdown-menu`, `avatar`, `breadcrumb`, `alert-dialog`, `skeleton`, `separator`. No new npm libraries.
- `AppLayout` (`components/AppLayout.tsx`) is the route element for everything behind `RequireAuth`. When
  `user.mustChangePassword` it renders only `<Outlet />`, so the forced change-password screen stays full-page; otherwise
  `/change-password` sits inside the shell. Nav items are the `NAV_ITEMS` array at the top of the file.
- `PageHeader` props: `title`, `description?`, `breadcrumb?: { label; to? }[]` (last item without `to` = current page), `actions?: ReactNode`.
- `components/states.tsx`: `LoadingState({ rows? })`, `ErrorState({ error, onRetry? })`, `EmptyState({ title, description?, action? })`.
- `ConfirmDialog` (default export) props: `open`, `onOpenChange`, `title`, `description?`, `confirmLabel?`, `destructive?`,
  `onConfirm: () => Promise<unknown>`. It is controlled; on a rejected `onConfirm` it stays open and toasts `messageFor(error)`.
- `VndInput` (default export) props: `value: number | null`, `onChange(number | null)`, plus normal input props (`id`, `aria-invalid`, ...).
  Shows `550.000` with a "₫" suffix; strips non-digits, max 12 digits. Wire to react-hook-form via `Controller`.
- `useUnsavedChangesPrompt(dirty: boolean)` in `lib/useUnsavedChangesPrompt.ts`: `beforeunload` only, no router blocking.
- `features/courses/CoursesPage.tsx` is a placeholder for Plan 04 to replace. `ChangePasswordPage` min height changed to `70svh` to fit the shell.
