# CLAUDE.md

Admin web app for chef Lan's cooking courses (brand "Bon Bocon"). Staff use it to manage courses,
lessons and lesson videos. It talks to the backend in `../chef-lan` (ASP.NET Core) over
`/api/v1/admins/**` with a **staff** (Internal) JWT. The customer site is a separate repo, `../chef-lan-web`.

**Work is planned in `docs/`.** Read `docs/spec.md` first (decisions, API reference, status table), then
implement **one plan from `docs/plans/` at a time, in order**. When a plan is done, tick it in the status
table in `docs/spec.md` and note anything that changed. Do not start the next plan in the same change.

## Stack

Vite 8 + React 19 + TypeScript (SPA, no SSR) · Tailwind CSS v4 (`@tailwindcss/vite`, no config file) ·
shadcn/ui (`radix-nova` style, lucide icons) · pnpm · oxlint.

Libraries added by the plans (do not swap them without updating `docs/spec.md`): `react-router` (routing),
`@tanstack/react-query` (server state), `react-hook-form` + `zod` (forms), `sonner` (toasts),
`@dnd-kit/*` (reordering).

## Commands

```bash
pnpm install
pnpm dev            # http://localhost:5173, /api proxied to http://localhost:5059 (the backend's `make run`)
pnpm build          # tsc -b && vite build -> dist/
pnpm lint           # oxlint (src/components/ui is generated and ignored)
pnpm dlx shadcn@latest add <component>   # add a shadcn component into src/components/ui
```

The backend must be running for anything past the login page: in `../chef-lan`, `docker compose up -d`
then `make run`. The seeded admin is `admin@cheflan.local`; its password is the backend's
`Seed:AdminPassword` user-secret (ask the user, never hard-code it).

## Conventions

- **UI text is Vietnamese only.** No i18n library; write strings inline. Code, comments and identifiers in English.
- `@/` is `src/`. Layout: `src/lib/api/` (client, types, one file of calls per resource), `src/lib/auth/`,
  `src/features/<resource>/` (pages, forms, hooks for one resource), `src/components/` (shared app
  components), `src/components/ui/` (shadcn, generated, edit only when necessary).
- **Types for API data are hand-written** in `src/lib/api/types.ts` from the backend contracts. Enums arrive as
  **strings** (`"Draft"`, `"Published"`), ids as numbers, money as plain numbers of VND (no decimals).
- All server data goes through TanStack Query; invalidate the affected queries after a mutation instead of
  patching caches by hand.
- Errors from the API are RFC 7807 `ProblemDetails` with an extra `code` (e.g. `course.no_published_lesson`).
  Validation failures (400) also carry `errors: { Field: [messages] }` with **PascalCase** field names. Map
  them onto form fields; show other errors in a toast. Never show raw English server messages when a
  Vietnamese one exists for that `code` (see `src/lib/api/errors.ts` once Plan 01 lands).
- Keep it simple: no global state library, no generated API client, no SSR, no tests framework unless a plan
  asks for one.

## Deployment

Static files only: `.github/workflows/deploy.yml` builds, rsyncs `dist/` to the VPS and flips a `current` symlink;
nginx (`deploy/nginx.conf`) serves the admin on its own domain and proxies `/api/` to the API on the same host, so
`VITE_API_BASE_URL` is empty in production. Setup steps: `deploy/README.md`.

## Things that bite

- **PUT replaces the whole resource** (course, lesson, video). Always send every field from the loaded
  record, not only the edited ones, or omitted fields are cleared (e.g. a course thumbnail).
- **Refresh tokens rotate, and reusing an old one revokes every session of that account.** Refresh must be
  single-flight within a tab and coordinated across tabs (see Plan 02). Getting this wrong logs the admin
  out everywhere.
- **Reorder endpoints take the complete ordered id list** of the parent's live children, or answer 400
  `order.mismatch`.
- VND must be whole numbers; the API rejects `150000.5`.
- Video uploads can be gigabytes: send them with `XMLHttpRequest` (for progress) as multipart with the
  `title` field **before** the `file` field, never read the file into memory.
