# Plan 10 — Logo

**Goal:** the admin shows the Bon Bocon logo.

1. Copy `../chef-lan-web/public/logo.png` (640×640) into `public/`. Also make a small `public/logo-64.png` (64×64) and
   use it as the favicon in `index.html` (keep `favicon.svg` only if it is the brand; otherwise delete it).
2. `components/AppLayout.tsx`: the sidebar brand and the mobile sheet header show the logo (32px, rounded) left of
   "Bon Bocon — Quản trị". `alt=""` because the text is next to it.
3. `features/auth/LoginPage.tsx` and the forced change-password screen: logo centred above the card title (72px).
4. No layout shift: give the `<img>` explicit `width`/`height`.

## Done when

The logo shows in the sidebar, the mobile menu, the login page and the browser tab; `pnpm build` / `pnpm lint` clean.

## Implementation notes

- `public/logo.png` (640x640, 269 KB) is the source copy; the UI uses `public/logo-128.png` (19 KB) so no page loads the full
  file. `public/logo-64.png` (6 KB) is the favicon (`index.html`, `type="image/png"`). All made with `sips`.
- `public/favicon.svg` was the Vite template logo, not the brand, so it was deleted.
- Logo shown in `Brand()` and the mobile sheet title (32px, `rounded-md`), on `LoginPage` (72px, header text centred) and on
  `ChangePasswordPage` only in the forced-change state (`user.mustChangePassword`); inside the shell the page has no logo.
