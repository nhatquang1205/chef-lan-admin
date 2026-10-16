# Plan 01 — Foundations

**Goal:** the plumbing every later plan uses. No real screens yet.

## Install

```bash
pnpm add react-router @tanstack/react-query sonner
```

## Build

1. **Router** — `src/main.tsx` wraps `<App />` in `<BrowserRouter>`, `<QueryClientProvider>` and renders
   `<Toaster richColors position="top-right" />` (from `sonner`; or `pnpm dlx shadcn@latest add sonner` and use
   `@/components/ui/sonner`). `src/App.tsx` holds `<Routes>` with two placeholder routes: `/` ("Trang chủ") and
   `*` (Vietnamese 404: "Không tìm thấy trang").
2. **Query client** — `src/lib/query.ts`: `new QueryClient` with `retry: 1` for queries, `retry: false` for
   mutations, `refetchOnWindowFocus: false`. Do not retry 4xx (custom `retry` function that checks `ApiError.status`).
3. **API client** — `src/lib/api/client.ts`:
   - `API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''` (trim a trailing `/`).
   - `class ApiError extends Error { status; problem: ProblemDetails; get code() }`.
   - `apiFetch<T>(path, { method, body, token, signal, formData })`: JSON by default (`Content-Type: application/json`,
     `JSON.stringify(body)`), `FormData` sent as-is (no Content-Type header). Adds `Authorization: Bearer` when a
     token is given. 204 → `undefined`. Non-2xx → parse JSON `ProblemDetails` if possible, throw `ApiError`.
     Network failure → `ApiError` with status 0 and code `network`.
   - Auth injection comes in Plan 02; keep `token` a plain parameter here.
4. **Types** — `src/lib/api/types.ts`: hand-write every type listed in `docs/spec.md` → "API reference"
   (StaffResponse, StaffAuthResponse, CategoryAdmin, CourseListItem, CourseAdminDetail, CourseRequest,
   PagedResult<T>, LessonListItem, LessonDetail, LessonRequest, LessonVideo, LessonVideoRequest, uploads,
   ProblemDetails). Enums as string unions: `CourseStatus`, `CourseLevel`, `CourseSortOrder`, `VideoProvider`,
   `CategoryStatus`. Optional server fields as `?: T | null`.
5. **Errors in Vietnamese** — `src/lib/api/errors.ts`: `messageFor(error: unknown): string` mapping known `code`s
   to Vietnamese (at least every code in the spec), falling back to `problem.detail ?? problem.title`, then to
   "Đã có lỗi xảy ra. Vui lòng thử lại." Status 0 → "Không kết nối được máy chủ." 429 → "Thử quá nhiều lần, vui lòng đợi một phút."
   Plus `fieldErrors(error): Record<string, string>` that converts `problem.errors` PascalCase keys to camelCase
   (`PriceVnd` → `priceVnd`) and takes the first message of each.
6. **Formatting** — `src/lib/format.ts`: `formatVnd(n)` → `"550.000 ₫"` (`Intl.NumberFormat('vi-VN')`),
   `formatDuration(seconds)` → `"1 giờ 5 phút"` / `"26 phút"` / `"45 giây"`, `formatDate(iso)` in `vi-VN`.
   Labels: `COURSE_STATUS_LABEL` (Draft "Nháp", Published "Đã xuất bản", Archived "Lưu trữ"), `COURSE_LEVEL_LABEL`
   (Unspecified "Không xác định", Beginner "Cơ bản", Intermediate "Trung cấp", Advanced "Nâng cao").

## Out of scope

Login, layout, any resource screens.

## Done when

- `pnpm build` and `pnpm lint` are clean.
- `pnpm dev`: `/` renders the placeholder, `/whatever` renders the Vietnamese 404.
- In the browser console of the dev app, `fetch('/api/v1/categories')` returns 200 through the proxy (backend running).
- Mark 01 `done` in `docs/spec.md`.
