# Plan 20: create an order for a customer

Context: `../chef-lan/docs/payments/plans/03-staff-orders.md` (needs that plan): read its decisions and the shared-module rule. A customer
who messages the fanpage gets an order made by staff, already paid, and the access at once.

## API

- `POST /api/v1/admins/orders/quote` `{ customerId, courseIds }` → per course: list price, the shared-module discounts with reasons, the
  system price, `alreadyOwned`; plus `subtotalVnd` (owned courses left out).
- Courses are picked from the normal `GET /api/v1/admins/courses`, with no customer filter: ownership is the server's call.
- `POST /api/v1/admins/orders` `{ customerId, items: [{ courseId, unitPriceVnd? }], orderDiscountVnd?, orderDiscountReason?, note }`
  → `AdminOrderResponse` (now with `discountVnd`, `discountReason`). Paid, access granted.
- `paymentMethod` has a third value, `StaffCreated`.

## Build

1. Types, `lib/api/orders.ts` (`quoteOrder`, `createOrder`, invalidating `orders`, `customer-access` and the customer), `errors.ts`
   (`order.already_owned` and any new code), `ORDER_METHOD_LABEL.StaffCreated = 'Admin tạo'`.
2. Page `/orders/new`, also opened with `?customerId=`. Buttons "Tạo đơn hàng": on the Orders page header and in the customer's Orders tab
   (which passes the customer, and is disabled for a locked customer).
   - **Step 1, Khách hàng**: search existing customers (name, email, phone); fixed when it came from the URL. A note: "Khách mới? Tạo ở
     màn hình Khách hàng trước." Everything below stays disabled until a customer is chosen. Changing the customer keeps the courses and
     quotes again.
   - **Step 2, Khóa học**: search and add courses, several, from the plain admin course list. A shared module shows its badge, a draft
     "Nháp". When the quote flags a course as `alreadyOwned`, its row says "Khách đã có khóa này", counts for nothing and blocks submit
     until it is removed. A 409 `order.already_owned` on create (it changed meanwhile) shows its message and quotes again.
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
editing a price and adding an order discount give the expected total, matching the saved order; an owned course is flagged and blocks submit; the
customer's access appears without a reload; 375 px holds. Test data removed. Notes added here.

## Notes (implementation)

Built: `/orders/new` (`CreateOrderPage`), "Tạo đơn hàng" on the Orders header and the customer's Orders tab (disabled, with a title, for a locked
customer), `quoteOrder`/`createOrder`, new error messages, `Admin tạo` label, `OrderDialog` shows the order discount and per-item reasons (and hides
"Hết hạn giữ đơn" for staff-created orders). `pnpm build` and `pnpm lint` are clean.

Differences from the plan:
- The quote discount field is `discountVnd` (not `amountVnd`), as the backend ships it.
- Stale quote requests are not aborted; the query key holds the debounced course ids, so a late answer for old ids is never shown, and submit is held
  ("Đang tính giá…") until the quote matches the current list.
- A 409 on create is shown through the confirm dialog's toast, and the quote is refetched. The English server detail naming the course is replaced by a
  Vietnamese message; the owned row is flagged by the refetched quote.
- After success the customer's Orders tab opens the new order through `?tab=orders&order=<id>` (`OrdersTable` got an `openId` prop).
- A locked customer (`Inactive`) cannot be picked, and a locked customer arriving through `?customerId=` shows a notice and blocks submit.

NOT verified in a browser: the staff password could not be obtained in this session (reading the `Seed:AdminPassword` secret was refused), so no UI
login was possible. Only the local API's quote endpoint was exercised with curl (shapes and numbers match the types: 46+47 -> 800000/600000;
46+47+41 -> 700000/600000/550000; 47+48 -> 750000/650000; 49+42 -> 0/600000). Still to check by hand: the Done-when list (discounts shown, owned row
blocks submit, edited price and order discount totals, access visible without reload, 375 px layout).
