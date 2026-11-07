# Plan 20: create an order for a customer

Context: `../chef-lan/docs/payments/plans/03-staff-orders.md` (needs that plan): read its decisions and the shared-module rule. A customer
who messages the fanpage gets an order made by staff, already paid, and the access at once.

## API

- `POST /api/v1/admins/orders/quote` `{ customerId, courseIds }` → per course: list price, the shared-module discounts with reasons, the
  system price; plus `subtotalVnd`. 409 `order.already_owned` for a course the customer has.
- `POST /api/v1/admins/orders` `{ customerId, items: [{ courseId, unitPriceVnd? }], orderDiscountVnd?, orderDiscountReason?, note }`
  → `AdminOrderResponse` (now with `discountVnd`, `discountReason`). Paid, access granted.
- `paymentMethod` has a third value, `StaffCreated`.

## Build

1. Types, `lib/api/orders.ts` (`quoteOrder`, `createOrder`, invalidating `orders`, `customer-access` and the customer), `errors.ts`
   (`order.already_owned` and any new code), `ORDER_METHOD_LABEL.StaffCreated = 'Admin tạo'`.
2. Page `/orders/new`, also opened with `?customerId=`. Buttons "Tạo đơn hàng": on the Orders page header and in the customer's Orders tab
   (which passes the customer, and is disabled for a locked customer).
   - **Khách hàng**: search existing customers (name, email, phone); fixed when it came from the URL. A note: "Khách mới? Tạo ở màn hình
     Khách hàng trước."
   - **Khóa học**: search and add courses, several. A course the customer already has shows "Đã có" and cannot be added. A shared module
     shows its badge. Drafts show "Nháp".
   - **Bảng giá**, re-quoted whenever the customer or the course list changes (debounced; cancel stale requests): course, list price, the
     system discounts with their reasons under it, an editable price (`VndInput`, prefilled with the system price, "Khôi phục" link once
     edited), remove.
   - **Giảm thêm cho cả đơn**: amount and a reason, required when the amount > 0.
   - **Ghi chú thanh toán**: required, prefilled "Khách nhắn fanpage", max 300.
   - **Summary**: tạm tính (after edits), giảm thêm, **thành tiền**. The page shows what it sends; the server's result is the truth, so the
     success screen shows the returned order.
   - Submit "Tạo đơn và cấp quyền" opens a confirm: customer, courses, total, "Khách sẽ được mở quyền học ngay." On success go to the
     customer's Orders tab and open the new order.
3. `OrderDialog`: show the order discount and reason, and each item's discount reason. The approve and cancel buttons already stay hidden for
   a Paid order.
4. Tick the status table and add this API to `docs/spec.md`.

## Done when

`pnpm build`, `pnpm lint` clean. In the browser against the local API, with real includes set up: two courses sharing a module show the
discount on the one with the larger discount; adding the module itself discounts both; a customer who has the module gets both discounts;
editing a price and adding an order discount give the expected total, matching the saved order; an owned course cannot be added; the
customer's access appears without a reload; 375 px holds. Test data removed. Notes added here.
