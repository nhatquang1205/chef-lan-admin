# Plan 08 — Lesson videos

**Goal:** on the lesson page, manage the lesson's videos. Videos are attached by **Bunny video id**
(`externalId`), typed in by hand in this plan; Plan 09 adds uploading.

## Build

1. **API** — `src/lib/api/videos.ts`: `listVideos(lessonId)`, `getVideo(id)`, `createVideo(lessonId, body)`,
   `updateVideo(id, body)`, `deleteVideo(id)`, `reorderVideos(lessonId, videoIds)`. Keys `['videos', lessonId]`,
   `['video', id]`. After a mutation also invalidate `['lesson', lessonId]`, `['lessons', courseId]`,
   `['course', courseId]` (video count and durations are recomputed server-side).
2. **Lesson page** — `/courses/:courseId/lessons/:lessonId`: breadcrumb Khóa học › {course} › {lesson}; the
   lesson form (Plan 07) on top, "Video" section below.
3. **Video list** — sortable (same pattern as Plan 07): title, badges "Miễn phí" / "Miễn phí {n} giây đầu" /
   "Nháp", provider, duration, `publicId` (small, copyable). Reorder sends the full id list.
4. **Video form** (dialog or inline panel) — `title` (required ≤ 200), `description`, `provider` select (default
   Bunny; labels: Bunny, YouTube, Vimeo, CDN, Facebook, Không có), `externalId` ("Mã video Bunny", shown for Bunny),
   `url` (shown for other providers), `thumbnailUrl` (URL; Plan 09 adds upload), `durationSeconds` entered as
   **mm:ss** (convert to seconds), `isFree` switch ("Cho xem miễn phí"), `freeTillSeconds` (only when free; empty =
   whole video free; otherwise "Miễn phí đến giây…", > 0, ideally < duration), `isPublished` switch.
   Client rules mirror the API: free-till needs free; published needs `externalId` (Bunny) or `url` (others).
5. **Save / delete** — PUT sends every field; delete with confirm.
6. Explain on the page (muted text): "Video không miễn phí chỉ xem được khi khách đã mua khóa học hoặc bài học."

## Done when

- Add two Bunny videos (any id string works locally) → lesson shows "2 video" and the summed duration; the course
  total duration updates.
- `freeTillSeconds` without "Cho xem miễn phí" cannot be submitted; `0` is rejected.
- Reorder persists; delete updates counts.
- The public course page (`../chef-lan-web`, or `GET /api/v1/courses/{slug}`) shows the videos in the new order
  once the course is published.
- `pnpm build` / `pnpm lint` clean. Mark 08 `done`.
