# Plan 09 — Uploads

**Goal:** upload a video file to Bunny from the video form (no more copying ids by hand), and upload images for
video thumbnails.

## Build

1. **Video upload helper** — `src/lib/api/uploads.ts`: `uploadVideo(file, title, { onProgress, signal })` using
   **`XMLHttpRequest`** (fetch has no upload progress): `POST {API_BASE}/api/v1/admins/uploads/videos`,
   `Authorization` from `getAccessToken()` taken right before sending, `FormData` with `title` appended **before**
   `file` (the server reads fields in order and streams the file). `xhr.upload.onprogress` → percent. Abort via
   `signal` → `xhr.abort()`. Resolve `{ videoId, title }`; on non-2xx parse `ProblemDetails` into `ApiError`.
   Never read the file into memory (`FormData` with the `File` streams it).
   Note: a large upload can outlive the access token; that is fine — the token is only checked when the request starts.
2. **Image upload helper** — `uploadImage(file)` with `adminFetch` + `FormData` field `file` → `{ url }`.
   Client checks: type JPEG/PNG/WebP, ≤ 5 MB.
3. **In the video form (Plan 08)**, for provider Bunny: "Tải video lên" button next to `externalId`:
   - pick a file (`accept="video/*"`), default the upload title to the video form's title (or the file name);
   - show a progress bar (shadcn `progress`) with percent and "Hủy";
   - read the duration client-side before uploading (`<video preload="metadata">` + `URL.createObjectURL`,
     revoke afterwards) and prefill `durationSeconds` if empty;
   - on success fill `externalId` with `videoId` and toast "Đã tải video lên. Bunny cần vài phút để xử lý.";
   - block closing the dialog / leaving the page while uploading (`beforeunload`), and keep the form unsaved until
     the user presses Lưu.
   - errors: `upload.video_host_not_configured` (503) → "Máy chủ chưa cấu hình Bunny."; network drop → "Tải lên bị
     gián đoạn." (the server deletes the half-created Bunny video itself).
4. **Thumbnail upload** in the video form: "Tải ảnh lên" next to `thumbnailUrl`, fills the URL on success, with a preview.

## Out of scope

Resumable/chunked uploads (TUS), uploading straight from the browser to Bunny, deleting the old Bunny video when
an `externalId` is replaced.

## Done when

- With Bunny configured in the backend: upload a small mp4 → progress reaches 100%, `externalId` is filled, saving
  the video works, and the video plays on the customer watch page after Bunny finishes encoding.
- Cancel mid-upload → request aborted, no `externalId` set, no stray video left in the Bunny library.
- Without Bunny configured locally: the 503 message shows.
- Image upload fills `thumbnailUrl` (needs B2 configured; else the 503 message).
- `pnpm build` / `pnpm lint` clean. Mark 09 `done`.

## Implementation notes

- Added shadcn `progress`. New `lib/api/uploads.ts`: `uploadVideo` (XHR, `title` before `file`, token from `getAccessToken()` right before send, progress, abort via `signal`
  -> rejects `UploadAbortedError`; network error -> `ApiError(0, code 'network')`), `uploadImage` (`adminFetch` + FormData `file`), `validateImage` (JPEG/PNG/WebP, 5 MB),
  `readVideoDuration` (`<video preload="metadata">` + object URL, revoked).
- `VideoForm` got "Tải video lên" (Bunny only; title defaults to the form title, else file name; duration prefilled only when empty; fills `externalId`, not saved until Lưu),
  progress + "Hủy", "Tải ảnh lên" with a thumbnail preview, a `beforeunload` guard while uploading, and a new `onBusyChange` prop. `VideoList` uses it to ignore dialog close
  (Esc, outside click) and hide the close button while an upload runs. Form Hủy/submit are disabled meanwhile.
- `upload.video_host_not_configured` message changed to "Máy chủ chưa cấu hình Bunny."; a network drop during upload shows "Tải lên bị gián đoạn." (handled in the form, `messageFor` keeps its generic status-0 text).
- A 401 on the video upload is not retried (the token is only checked at request start and was fresh). Not exercised in a browser; only build and lint were run.
