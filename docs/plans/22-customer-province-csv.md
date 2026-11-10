# Plan 22: customer form (Tên, email required, province), CSV import with invites

Context and decisions: `../chef-lan/docs/customer-profile/spec.md`.

## Admin (`chef-lan-admin`): `docs/plans/22-customer-province-csv.md`

1. `lib/api/types.ts`, `lib/api/customers.ts`: remove `facebookName`, add `provinceCode`; `getProvinces()` (TanStack Query,
   long `staleTime`).
2. `CustomerForm.tsx`: "Tên" (required), Email (required), Phone, **Tỉnh/thành** select (optional, searchable if the existing
   Select allows it), Facebook link, Note. `CustomersPage.tsx`: drop the Facebook-name column, add Tỉnh/thành.
3. **CSV import** `features/customers/CustomerImportPage.tsx` at `/customers/import` (button on the customers list):
   - "Tải file mẫu" downloads `public/customers-import-template.csv`.
   - File picker → parse with `papaparse` (handles quotes, BOM, `;` from some Excel locales) → preview table with per-row
     checks: email present and valid, name present, link http(s) if given, duplicate email inside the file. Invalid rows
     are shown and skipped. Limit 300 rows (Gmail sends about 500 mails a day).
   - "Tạo và gửi lời mời" → sequential `POST /api/v1/admins/customers` with `sendInvite: true`, progress bar, and a status per
     row: created and invited, created but mail failed (`inviteError`), skipped (email already exists), error. Leaving the
     page mid-run asks for confirmation. Summary counts at the end.
4. `docs/spec.md` status row.

## Done when

`pnpm lint`, `pnpm build` clean. Add implementation notes here.

## Implementation notes

- `papaparse` + `@types/papaparse` added. The file is read as text and parsed with `delimitersToGuess: [',', ';']`; header names are
  trimmed, lower-cased and NFC-normalised, BOM stripped. The name column is `ten`, `tên` or `name`; `email` and one name column are
  required, `facebook` is optional. A file containing U+FFFD (not UTF-8) is refused with a hint to save as CSV UTF-8.
- Template `public/customers-import-template.csv` is UTF-8 with BOM, CRLF, one example row.
- More than 300 data rows rejects the whole file (split it) rather than truncating silently.
- Page states: idle (instructions, template, picker) -> preview (table with per-row problems; invalid rows marked "Bỏ qua") ->
  confirm dialog stating the number of mails -> running (one `POST` at a time, progress bar, "Dừng" button) -> done (summary counts,
  per-row results: created+invited, created but mail failed, skipped because `customer.email_already_used`, error).
  A stopped run marks the remaining rows "Chưa chạy".
- Leaving mid-run: `beforeunload` (tab close/reload) plus a capture-phase click guard on in-app links with `window.confirm`
  (the app uses `BrowserRouter`, which has no `useBlocker`). Unmounting stops the loop.
- Import uses `createCustomerForImport` (no per-row cache invalidation); the customer list is invalidated once at the end.
- Province select is the plain shadcn `Select` (not searchable, 34 items) with a "Chưa chọn" option; names come from
  `GET /api/v1/provinces` (`staleTime: Infinity`), also used for the list column. `CustomerRequest.email` is now required; the
  "send invite" checkbox no longer depends on email. The customers search placeholder no longer mentions Facebook.
- Not exercised against a real API (by instruction); verified with `pnpm lint` and `pnpm build`.
- Fix: a file mixing CRLF and LF line endings (header CRLF, rows LF, typical after editing by hand) was read as one data row, because Papa guesses the line ending from the first line. Line endings are now normalised to LF before parsing. Checked on the user's 9-row file: 1 row before, 9 after.
