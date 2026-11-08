# Plan 21: free orders

Context: `../chef-lan/docs/payments/plans/05-free-courses.md`. A course priced 0 is granted when the customer creates the order;
the order arrives Paid with `paidVia: "Free"` and `amountVnd: 0`.

## Build

1. `src/lib/api/types.ts`: `OrderPaidVia = 'Webhook' | 'Manual' | 'Free'`.
2. `OrderDialog.tsx`: the "paid via" line reads "Khóa học miễn phí" for `Free` (keep the other two texts).
3. Check that an amount of 0 renders as "0 ₫" in the orders table, the dialog and the customer Orders tab.

## Done when

`pnpm lint` and `pnpm build` clean. Status row in `docs/spec.md`.

## Implementation notes

Done. `formatVnd(0)` already renders "0 ₫" in the orders table, the dialog and the customer Orders tab, so only the type and the
"Cách xác nhận" line changed.
