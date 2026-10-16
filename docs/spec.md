# Admin web — spec

## Context

Chef Lan's staff currently manage course content with Postman against the backend (`../chef-lan`). This app
replaces that for **courses, lessons and lesson videos** (plans 01–09), then **categories, customers, invitations and
access grants** (plans 10–14). Staff management is not in scope yet.

## Decisions

| | |
|---|---|
| App type | Vite + React + TypeScript SPA, built to static files (`dist/`) |
| UI | shadcn/ui (`radix-nova`) + Tailwind v4, Vietnamese text only |
| Routing | `react-router` (declarative `<BrowserRouter>` / `<Routes>`) |
| Server state | `@tanstack/react-query` |
| Forms | `react-hook-form` + `zod` (`@hookform/resolvers`) |
| Toasts / reorder | `sonner` / `@dnd-kit/core` + `@dnd-kit/sortable` |
| Auth | Staff login against `/api/v1/admins/auth/*`; tokens in `localStorage`; single-flight refresh, coordinated across tabs |
| Production hosting | **Its own domain** (separate from the customer site), static files from nginx, which also proxies `/api/` to the API on the same host (same-origin, no CORS). See `deploy/README.md` |
| API base URL | `VITE_API_BASE_URL` (origin, no `/api`). Empty = same origin; in dev the Vite proxy forwards `/api` to `:5059` |

## API reference (what the plans use)

All admin endpoints need `Authorization: Bearer <staff access token>`. Enums are strings. Money is integer VND.

**Auth** (`/api/v1/admins/auth`)
- `POST /login` `{ email, password }` → `StaffAuthResponse { accessToken, accessTokenExpiresAt, refreshToken, user: StaffResponse }`
- `POST /refresh` `{ refreshToken }` → `StaffAuthResponse` (rotates: the old refresh token dies; reusing it revokes all sessions)
- `POST /logout` `{ refreshToken }` → 204
- `POST /change-password` `{ currentPassword, newPassword }` → 204, revokes all refresh tokens (log in again)
- `GET /api/v1/admins/me` → `StaffResponse { id, email, displayName, role, jobTitle?, mustChangePassword }`
- Errors: `identity.invalid_credentials` (401), `identity.account_locked`, `identity.account_inactive`,
  `identity.invalid_refresh_token`, `identity.current_password_incorrect`. Login is rate limited (5/min): 429.

**Categories** (read only here)
- `GET /api/v1/admins/categories?status=&q=` → `CategoryAdminResponse[] { id, name, slug, description?, thumbnailUrl?, displayOrder, status: "Active"|"InActive" }`

**Courses** (`/api/v1/admins/courses`)
- `GET ?status=Draft|Published|Archived&q=&categorySlug=&level=&sort=Newest|PriceAsc|PriceDesc|Title&page=1&pageSize=12`
  → `PagedResult<CourseListItemResponse> { items, page, pageSize, totalCount, totalPages, hasPrevious, hasNext }`;
  item = `{ id, slug, title, subtitle?, thumbnailUrl?, level, status, publishedAt?, priceVnd, compareAtPriceVnd?, priceDisplay, lessonCount, totalDurationSeconds, accessDurationDays?, categories: CategoryResponse[] }`
- `GET /{id}` → `CourseAdminDetailResponse { id, slug, title, subtitle?, description?, whatYouWillLearn?, metaDescription?, thumbnailUrl?, promoVideoUrl?, level, status, publishedAt?, priceVnd, compareAtPriceVnd?, currency, accessDurationDays?, lessonCount, totalDurationSeconds, enrollmentCount, legacyFacebookGroupUrl?, categories }`
- `POST` / `PUT /{id}` — JSON `CourseRequest { title, subtitle?, description?, whatYouWillLearn?, metaDescription?, thumbnailUrl?, promoVideoUrl?, priceVnd, compareAtPriceVnd?, accessDurationDays?, legacyFacebookGroupUrl?, categoryIds?, level }`
  **or** `multipart/form-data` with the same fields plus `thumbnailFile` (JPEG/PNG/WebP ≤ 5 MB) instead of
  `thumbnailUrl` (both = 400 `course.thumbnail_conflict`); `categoryIds` repeated once per id. 201 / 200 with the detail.
  PUT replaces everything: omitted thumbnail = cleared. `compareAtPriceVnd >= priceVnd`. Unknown category: 400 `course.unknown_categories`.
- `DELETE /{id}` → 204 (soft delete)
- `POST /{id}/publish` → 204, or 409 `course.no_published_lesson` / `course.no_playable_video`
- `POST /{id}/unpublish` → 204 (back to Draft)
- Server-owned (never sent): slug, status, publishedAt, currency, counters.

**Lessons**
- `GET /api/v1/admins/courses/{courseId}/lessons` → `LessonAdminListItemResponse[] { id, courseId, slug, title, sortOrder, isPublished, priceVnd?, includedInCourse, videoCount, durationSeconds }`
- `POST /api/v1/admins/courses/{courseId}/lessons` · `PUT /api/v1/admins/lessons/{id}` — `LessonRequest { title, description?, recipes?, resourcesUrl?, isPublished = true, priceVnd?, includedInCourse = true }`
  → `LessonAdminDetailResponse` (list item fields + `description?, recipes?, resourcesUrl?`). `recipes` is Markdown.
  `includedInCourse: false` (add-on, bought separately) **requires** `priceVnd`.
- `GET /api/v1/admins/lessons/{id}` · `DELETE /api/v1/admins/lessons/{id}` (204)
- `PUT /api/v1/admins/courses/{courseId}/lessons/order` `{ lessonIds: [...] }` → 204, all live lessons exactly once, else 400 `order.mismatch`

**Lesson videos**
- `GET /api/v1/admins/lessons/{lessonId}/videos` → `LessonVideoAdminResponse[] { id, lessonId, publicId, sortOrder, title, description?, provider, externalId?, url?, thumbnailUrl?, durationSeconds, isFree, freeTillSeconds?, isPublished }`
- `POST /api/v1/admins/lessons/{lessonId}/videos` · `PUT /api/v1/admins/lesson-videos/{id}` — `LessonVideoRequest { title, description?, externalId?, url?, thumbnailUrl?, durationSeconds, isFree, freeTillSeconds?, provider = "Bunny", isPublished = true }`
  Rules: `freeTillSeconds` only when `isFree`, and > 0; a published video needs `externalId` or `url` (unless provider `None`).
  Providers: `None, YouTube, Vimeo, Cdn, Facebook, Bunny` (Bunny is the normal one: `externalId` = Bunny video id).
- `GET /api/v1/admins/lesson-videos/{id}` · `DELETE /api/v1/admins/lesson-videos/{id}` (204)
- `PUT /api/v1/admins/lessons/{lessonId}/videos/order` `{ videoIds: [...] }` → 204

**Uploads** (`/api/v1/admins/uploads`)
- `POST /images` multipart field `file` (JPEG/PNG/WebP ≤ 5 MB) → `{ url }`
- `POST /videos` multipart fields `title` (first) then `file` (≤ 8 GB, streamed) → `{ videoId, title }`; put `videoId` into a video's `externalId`.
- Errors: `upload.*` (`unsupported_image`, `image_too_large`, `video_host_not_configured` 503, ...).

**Errors**: `ProblemDetails { title, status, detail?, code? , errors? }`; validation 400 has
`errors: { "PriceVnd": ["..."] }` (PascalCase keys). 409 also comes from concurrent edits.

## Plans

Implement in order; each plan leaves the app building and usable.

| # | Plan | Status |
|---|---|---|
| 01 | [Foundations: router, query client, API client, types](plans/01-foundations.md) | done |
| 02 | [Staff auth: login, session, refresh, guard, change password](plans/02-auth.md) | done |
| 03 | [App shell: layout, navigation, shared UI states](plans/03-app-shell.md) | done |
| 04 | [Course list](plans/04-course-list.md) | done |
| 05 | [Course create / edit form](plans/05-course-form.md) | done |
| 06 | [Course actions: publish, unpublish, delete](plans/06-course-actions.md) | done |
| 07 | [Lessons: list, reorder, create / edit, delete](plans/07-lessons.md) | done |
| 08 | [Lesson videos: list, reorder, create / edit, delete](plans/08-lesson-videos.md) | done |
| 09 | [Uploads: video upload with progress, image upload for video thumbnails](plans/09-uploads.md) | done |
| 10 | [Logo](plans/10-logo.md) | todo |
| 11 | [Categories](plans/11-categories.md) | done |
| 12 | [Customers: list, detail, edit, deactivate](plans/12-customers.md) — needs backend B2 | todo |
| 13 | [Customer invitations](plans/13-customer-invites.md) — needs backend B3 | todo |
| 14 | [Customer access: grant / revoke courses and lessons](plans/14-customer-access.md) | todo |

Plans 12–14 depend on backend work in `../chef-lan/docs/customer-invitations/` (B1 email, B2 customers API, B3
invitations). 10 and 11 need no backend change and can be done first.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and rsyncs `dist/` to `/var/www/chef-lan-admin/releases/<sha>` and
switches `current`; nginx config and the one-time setup are in `deploy/`. `VITE_API_BASE_URL` stays empty in production.

## Later (not planned yet)

- Staff management.
