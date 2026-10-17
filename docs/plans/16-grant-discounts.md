# Plan 16 — Discount when granting a course

Needs backend B3 (`GET /api/v1/admins/customers/{id}/quote?courseId=` and the new grant fields). Read the implementation
notes at the end of `../chef-lan/docs/included-courses/plans/03-discounts-and-grants.md`.

## Build

1. `GrantAccessDialog` ("Cả khóa học" tab): when a course is picked, fetch the quote for this customer.
   - No discount: as today (amount prefilled with the list price when "Đã thanh toán").
   - With discounts: show the list price struck through, each discount line ("Đã có khóa Nuôi men tự nhiên: −300.000 ₫"),
     and the final price; prefill the amount with the final price; prefill the payment note with the reason if empty.
   - Send `listPriceVnd`, `discountVnd` (sum) and `discountReason` (joined reasons) with the grant. Staff may still edit
     the amount; the recorded discount stays what the quote said unless they clear it (a small "Bỏ giảm giá" link
     resets amount to list price and sends no discount).
2. Customer access list ("Quyền học"): show the discount under the paid amount when present ("Giảm 300.000 ₫ — Đã có
   khóa Nuôi men tự nhiên").
3. Types in `lib/api/types.ts`; no new error codes beyond what B3 lists.

## Done when

Against the local API: a customer who has C gets the discounted amount prefilled when granted P, the grant stores the
discount and the access list shows it; a customer without C sees no discount; "Bỏ giảm giá" works. `pnpm build` /
`pnpm lint` clean. Clean up test data.

## Implementation notes (done)

- `lib/api/access.ts` gains `getCourseQuote`; types `QuoteDiscount`, `CourseQuoteResponse`, and the three discount fields on
  `CourseEnrollmentResponse` and `GrantAccessFields`.
- `GrantAccessDialog`: on the "Cả khóa học" tab the quote is fetched (`getCourseQuote`, in the pick handler, stale responses ignored, failures ignored) when a course is picked
  With discounts it shows the struck-through list price, each reason line, the final price and a "Bỏ giảm giá" link;
  amount (when paid) and an empty note are prefilled once. The grant sends `listPriceVnd`, `discountVnd` (list − final) and
  `discountReason` (reasons joined with "; "). "Bỏ giảm giá" resets the amount to list price, clears a note that still equals the
  reason, and sends no discount. Lesson grants never send discount fields.
- `AccessSection` shows "Giảm X — reason" under the paid amount of course rows.
- Not exercised in a browser; only build and lint were run.
