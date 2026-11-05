# Plan 18: orders

Context: `../chef-lan/docs/payments/plans/02-contact-orders-and-admin-list.md` (needs that plan). No refunds, no bank
transaction screen.

## API

- `GET /api/v1/admins/orders?status=&paymentMethod=&customerId=&q=&page=&pageSize=` → `PagedResult<AdminOrderResponse>`
  `{ id, code, status, paymentMethod, amountVnd, customerId, customerName?, customerEmail?, customerPhone?, createdAt, expiresAt,
  paidAt?, paidVia?, paidReason?, paidByStaffId?, paymentTransactionId?, items: [{ kind, title, courseSlug, listPriceVnd,
  discountVnd, unitPriceVnd }] }`. `status`: Pending, Paid, Expired, Cancelled (effective, same as shown).
  `paymentMethod`: BankTransfer, ContactChef. `paidVia`: Webhook, Manual.
- `POST /api/v1/admins/orders/{id}/mark-paid` `{ reason }`: approve, grants access. 409 `order.already_paid`.
- `POST /api/v1/admins/orders/{id}/cancel`: 409 `order.not_pending`.

## Build

1. `lib/api/types.ts`, `lib/api/orders.ts` (`listOrders`, `markOrderPaid`, `cancelOrder`, `invalidateOrders`, which must also
   invalidate `['customer-access', customerId]`, since approving grants access). `lib/format.ts`: `ORDER_STATUS_LABEL`
   (Chờ thanh toán, Đã thanh toán, Hết hạn, Đã hủy), `ORDER_STATUS_VARIANT`, `ORDER_METHOD_LABEL` (Chuyển khoản, Liên hệ Chef
   Lan). `errors.ts`: `order.already_paid`, `order.not_pending`, `order.not_found`.
2. `features/orders/OrdersTable.tsx`, shared by both screens. Columns: Mã đơn, Khách hàng (hidden in the customer tab), Sản
   phẩm, Số tiền, Hình thức, Trạng thái, Ngày tạo. A row click opens the detail dialog; the customer name links to the customer.
3. `features/orders/OrderDialog.tsx`: everything from the row (no extra request): customer with phone and email, items with
   list price and discount, amount, method, dates, how it was paid (`paidVia`, reason, `Nhân viên #id`). Actions:
   - "Duyệt đơn" for Pending and Expired. Opens a form with a required reason (`FieldLabel required`, max 300), prefilled
     "Khách thanh toán trực tiếp với Chef Lan" for ContactChef and "Đã kiểm tra chuyển khoản" for BankTransfer, and the note
     "Khách sẽ được mở quyền học ngay." Approving does not move the money: keep the wording about confirming payment.
   - "Hủy đơn" for Pending, destructive `ConfirmDialog`.
4. `features/orders/OrdersPage.tsx` at `/orders`, nav item "Đơn hàng" after "Khách hàng" (`Receipt` icon): search (code, name,
   email, phone), status and method selects, URL filters and paging exactly as in `CustomersPage.tsx`, 20 per page, the usual
   loading, error and empty states.
5. `CustomerPage.tsx`: wrap the body in tabs as in `CoursePage.tsx`, `?tab=orders`: "Thông tin" (the form and `AccessSection`,
   unchanged) and "Đơn hàng" (`CustomerOrdersTab.tsx`: `OrdersTable` with `customerId`, paging in component state).
6. Tick the status table and add this API to `docs/spec.md`.

## Done when

`pnpm build`, `pnpm lint` clean. In the browser: filters, search and paging work and survive a reload; approving a contact
order shows Paid and the course appears in that customer's access without a reload; cancel works; the customer tab shows only
that customer's orders; 375 px layout holds. Test data removed. Add implementation notes here.

## Implementation notes

Done as planned. Files: `lib/api/orders.ts`, `features/orders/{OrdersTable,OrderDialog,OrdersPage,CustomerOrdersTab}.tsx`, tabs in `CustomerPage.tsx`, nav item and route.

- The method filter's URL key is `method` (the API parameter is `paymentMethod`); `status`, `q`, `page` as in `CustomersPage`.
- `OrdersTable` owns the detail dialog and keeps a snapshot of the clicked order; approve and cancel replace it with the order the API returns, so the dialog shows the new state at once. Consequence: when the active status filter no longer matches the changed order, the list becomes empty/shorter and, if it becomes empty, the table (and so the dialog) unmounts. The toast confirms the action.
- Approve is a second view inside the same dialog (not a nested dialog); "Quay lại" returns to the details. Reason is trimmed, required, max 300.
- `invalidateOrders(customerId)` invalidates `['orders']` and `['customer-access', customerId]`. Customer detail tabs unmount the inactive tab, so the access list is also refetched on return.
- Customer tab: `?tab=orders`; paging is component state.
- Verified in the browser against the local API: filters (status incl. Expired on a backdated order, method, q, combined) and page 2 survive a reload; approving an expired and a pending contact order shows Paid with reason and `Nhân viên #id` and the course appears in the customer's access without a reload; empty-reason validation; cancel; the customer tab lists only that customer's orders and pages; at 375 px the page does not scroll sideways (table scrolls inside its card) and the dialog fits. Not tested: BankTransfer approval from a real SePay order (checkout is off locally; rows were inserted directly), `order.already_paid` / `order.not_pending` toasts (only the backend message mapping exists).
