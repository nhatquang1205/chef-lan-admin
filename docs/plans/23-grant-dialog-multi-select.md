# Plan 23: grant dialog: load more and select several at once

Why: the "Cấp quyền học" dialog on a customer's page shows only the first 8 courses (search or nothing), and grants one
course or one lesson per submit. Staff migrating Facebook members grant several at a time.

## Decisions (confirmed)

| | |
|---|---|
| Load more | The course list pages by 20 with a "Xem thêm" button at the bottom (`useInfiniteQuery`), search still works |
| Multi-select | **Both tabs.** "Cả khóa học": tick several courses. "Một bài học": pick one course, then tick several of its lessons. Picking another course in the lesson tab keeps lessons already ticked from the previous course (each ticked lesson remembers its course) |
| Already owned | **Hidden**: a course the customer has an active course grant for does not appear in either tab; a lesson with an active lesson grant does not appear in the lesson list. Source: the page's existing `['customer-access', customerId]` query (`getCustomerAccess`) |
| Paid | One "Đã thanh toán" switch. When on, each selected item has its own amount row, prefilled: a course with its quote (`getCourseQuote`, shared-module discount, the existing "Bỏ giảm giá" per course), a lesson with its price. Note and reference are shared by all items |
| Submit | Items are granted one after another with the existing `grantCourseAccess` / `grantLessonAccess` (one request each, no new API). A result per item: granted, or the error (`messageFor`). Succeeded items leave the selection; the dialog closes only when all succeeded. The access table refreshes once at the end |

## Build

1. `GrantAccessDialog.tsx`: selection state is a list of `{ kind, courseId, lessonId?, title, price, quote?, discountDropped, amount }`;
   checkboxes in `PickRow` (keep the row click toggling); a "Đã chọn (n)" summary with remove buttons; per-item amount rows
   with `VndInput` under the switch; the discount box per course as today.
2. `useInfiniteQuery` over `listCourses({ q, page, pageSize: 20 })` keyed `['courses', { q, picker: true, infinite: true }]`;
   "Xem thêm" when `hasNext`; filter out owned courses client-side (if a page then shows nothing, still offer "Xem thêm").
3. Validation: at least one item; amounts as today per item (field errors shown on that item's row).
4. Keep the dialog usable at 375 px (scrolling content, sticky footer if needed).

## Done when

`pnpm lint`, `pnpm build` clean. Browser against the local API: more than 20 courses page in; owned courses and lessons are
hidden; granting 3 courses (one with a shared-module discount) with paid on records each amount; a failure on one item
leaves only that item selected with its error. Add implementation notes here and a status row in `docs/spec.md`.

## Implementation notes

- `GrantAccessDialog.tsx` rewritten around an `items` list (`course:<id>` / `lesson:<id>` keys). Course quotes are fetched per ticked
  course (as before) and prefill that item's amount unless it was already edited; "Bỏ giảm giá" is per item.
- Owned = `['customer-access', customerId]` rows that are `Active` and unexpired; hidden in both tabs (the lesson tab's course
  picker is single-select, lessons are checkboxes and keep their course in the item title).
- Submit grants sequentially; succeeded items are removed, failed ones stay with their error (`amountPaidVnd` field error, else
  `messageFor`). `paymentNote`/`paymentReference` field errors show on the shared inputs. Dialog closes only if all succeeded.
- Deviations: the shared note is no longer auto-filled with the discount reason (several items would conflict; the reason still goes
  in each grant's `discountReason`). The access table is refreshed by each `grant*Access` call (they already invalidate it), not once
  at the end. No client-side amount check beyond the API's. Not yet exercised in a browser.
- Review: the sticky footer used `bottom-0`, which Chrome insets by the dialog's padding, so content showed under it at 375 px; it is now `-bottom-4`.
- Checked in the browser against the local API: 25 courses page in with "Xem thêm"; an owned shared module is hidden; 3 courses granted with paid on recorded 250.000 (550.000 − 300.000 shared-module discount, reason kept), 200.000 and 100.000; a course granted meanwhile stayed selected with "Khách đã có quyền này rồi."; 2 lessons of one course granted free in one submit; 375 px layout.
