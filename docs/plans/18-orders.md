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
