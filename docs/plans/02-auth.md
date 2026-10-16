# Plan 02 — Staff auth

**Goal:** staff sign in, stay signed in across reloads and tabs, and every API call carries a valid token.

## Build

1. **Session storage** — `src/lib/auth/session.ts`: `Session = { accessToken, accessTokenExpiresAt, refreshToken, user: StaffResponse }`
   stored under one `localStorage` key (`cheflan-admin-session`). `load()`, `save(session|null)`; wrap every
   storage access in `try/catch` (private mode). Listen to the `storage` event so other tabs' login/logout/refresh
   update this tab.
2. **Refresh, single-flight and cross-tab** — `getAccessToken(): Promise<string | null>`:
   - If the access token expires in more than 60 s, return it.
   - Otherwise refresh **once**: share one in-flight promise inside the tab, and wrap the refresh in
     `navigator.locks.request('cheflan-admin-refresh', ...)`. Inside the lock, **re-read the session from
     storage first**: if another tab already refreshed (refresh token changed and the access token is fresh),
     use that and do not call the API. This matters: the backend rotates refresh tokens and reusing an old one
     revokes every session of the account.
   - Refresh failure with 401 / `identity.invalid_refresh_token` → clear the session (signed out). A network
     error keeps the session and throws, so a flaky connection does not log the admin out.
3. **AuthProvider** — `src/lib/auth/AuthProvider.tsx` + `useAuth()`: `{ status: 'loading'|'authenticated'|'anonymous', user, login(email, password), logout(), getAccessToken() }`.
   `logout` calls `POST /admins/auth/logout` with the refresh token (ignore failures) then clears the session.
   Keep state and the in-memory session ref updated **in the same function** (not via an effect), so children
   never read a stale token.
4. **Authenticated fetch** — `src/lib/api/admin.ts`: `adminFetch<T>(path, init)` = `apiFetch` with the token from
   `getAccessToken()`; on a 401 response, force one refresh and retry once; on a second 401, sign out. Plans 04+
   use only `adminFetch`. (Expose it from the provider or as a module bound at startup; keep it usable outside
   React components, e.g. from query functions.)
5. **Login page** — `/login` (`src/features/auth/LoginPage.tsx`): shadcn `card`, `input`, `label`, `button`, `form`
   (`pnpm dlx shadcn@latest add card input label form`). Email + password (show/hide), submit disabled while
   pending, error text from `messageFor`. On success go to `?next=` if it is a same-app path starting with `/`
   (not `//`), else `/`. Already signed in → redirect to `/`.
6. **Route guard** — `<RequireAuth>` wrapping every route except `/login`: `loading` → full-page spinner,
   `anonymous` → `<Navigate to="/login?next=<current path>" replace />`.
7. **Change password** — `/change-password`: current + new + confirm (new ≥ 8 chars, matches confirm). On success
   the backend revokes all tokens: clear the session, toast "Đã đổi mật khẩu, vui lòng đăng nhập lại", go to `/login`.
   If `user.mustChangePassword` is true, the guard sends the user here (allow only this page and logout).
8. On startup with a stored session, call `GET /api/v1/admins/me` once to refresh `user` (and detect a dead session).

## Out of scope

Layout/navigation (Plan 03). Staff management.

## Done when

- Wrong password shows "Email hoặc mật khẩu không đúng."; 6 quick wrong attempts show the 429 / locked message.
- Correct login lands on `/`; reload keeps you signed in.
- Set the stored `accessTokenExpiresAt` to the past in devtools, reload: one `/refresh` call, still signed in.
- Two tabs open, expire the token in storage, trigger calls in both: **one** `/refresh` request in total
  (Network tab), both tabs keep working, and you are not logged out.
- Logout in one tab signs the other tab out.
- Visiting `/` signed out redirects to `/login?next=%2F`.
- `pnpm build` / `pnpm lint` clean. Mark 02 `done`.

## Implementation notes

- `shadcn add form` produced nothing in the `radix-nova` registry; forms use `react-hook-form` + `zod` +
  `@hookform/resolvers` directly with `label`/`input`. Added `react-hook-form`, `zod`, `@hookform/resolvers`.
- Files: `lib/auth/session.ts` (storage + `storage` event + in-tab listeners), `lib/auth/token.ts`
  (`getAccessToken`, `forceRefresh`, `signOutLocally`; single-flight promise + `navigator.locks`, re-reads storage inside
  the lock, falls back to no lock if the API is missing), `lib/auth/context.ts` (context + `useAuth`),
  `lib/auth/AuthProvider.tsx`, `lib/api/admin.ts` (`adminFetch`), `components/RequireAuth.tsx`, `features/auth/*`.
- The stored session is read synchronously on first render, so `status` starts as `authenticated`/`anonymous`;
  `loading` is kept in the type and handled by the guard but is not produced yet. `GET /admins/me` runs once in the
  background to refresh `user`; a dead session is cleared by `adminFetch`, a network error keeps it.
- Session changes (login, refresh, logout, other tabs) all flow through `saveSession` -> listeners -> the provider's
  single `apply()` that sets state and the ref together. Signing out also clears the query cache.
- A forced refresh after a 401 passes the rejected token; inside the lock a stored, still-fresh token that differs
  from it is reused instead of calling the API again.
- `App.tsx` has a placeholder home (greeting, change-password link, logout) until Plan 03 adds the shell.
