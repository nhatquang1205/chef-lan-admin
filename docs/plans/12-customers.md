# Plan 12 — Customers: list, detail, edit, deactivate

**Needs backend plan B2** (`../chef-lan/docs/customer-invitations/plans/02-admin-customers-api.md`) — read it for the
exact request/response shapes and error codes. Invitations come in Plan 13, access in Plan 14.

## Build

1. `lib/api/customers.ts` + types in `types.ts`: `listCustomers(params)`, `getCustomer(id)`, `createCustomer`,
   `updateCustomer`, `deactivateCustomer`, `reactivateCustomer`. Keys `['customers', params]`, `['customer', id]`.
2. Nav item "Khách hàng" (`/customers`).
3. `/customers`: filters in the URL like the course list (Plan 04 pattern): search (debounced, name/email/phone/Facebook),
   status select (Tất cả / Đã kích hoạt / Đã mời / Lời mời hết hạn / Chưa mời / Đã khóa). Table: name (+ Facebook name),
   email, phone, status badge, last login, created date; row → `/customers/:id`. Paging 20. Empty and error states.
4. `/customers/new` and the "Thông tin" section of `/customers/:id`: form `fullName` (required), `email`, `phone`,
   `facebookName`, `facebookProfileUrl` (http/https), `note` (textarea). PUT sends every field.
   - Changing the email of an **activated** customer: confirm "Email này là tài khoản đăng nhập của khách. Đổi email
     sẽ đổi tên đăng nhập. Tiếp tục?". Of an invited one: warn that the pending invite is cancelled.
   - 409 `customer.email_already_used` → error on the email field.
5. `/customers/:id` header: name, status badge, email, invited/activated/last login dates, and actions:
   "Khóa tài khoản" (confirm: "Khách sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được.") / "Mở khóa".
   Leave a slot in the header for Plan 13's invite button and a section below for Plan 14's access list.
6. Vietnamese labels for the five statuses in `lib/format.ts`; add the new error codes to `lib/api/errors.ts`.

## Done when

Against the local API: create a customer without email and one with email; search by phone finds them; edit; the
duplicate-email error shows on the field; lock → status "Đã khóa", unlock → back. `pnpm build` / `pnpm lint` clean.
Delete the test customers from the local DB afterwards.

## Implementation notes

- Files: `lib/api/customers.ts` (`listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `deactivateCustomer`, `reactivateCustomer`,
  `invalidateCustomers(id?)`; keys `['customers', params]`, `['customer', id]`; mutations invalidate both and `setQueryData` the detail), types in `types.ts`
  (`CustomerStatus`, `CustomerListItemResponse`, `CustomerDetailResponse`, `CustomerRequest`), `CUSTOMER_STATUS_LABEL` / `CUSTOMER_STATUS_VARIANT` /
  `formatDateTime` in `lib/format.ts`, codes `customer.not_found` and `customer.email_already_used` in `errors.ts`. Nav item "Khách hàng" and routes
  `/customers`, `/customers/new`, `/customers/:id` added.
- `features/customers/`: `CustomersPage` (URL filters `q`, `status`, `page`; same pattern as courses; 20 per page), `CustomerForm` (create + edit; zod + react-hook-form;
  PUT sends every field, blank optional fields as `null`), `CustomerCreatePage`, `CustomerPage` (header + form).
- Email change: confirmation on submit for an `Active` customer (login email) and an `Invited` one (pending invite cancelled); not for other statuses.
  A 409 `customer.email_already_used` becomes an error on the email field.
- All five statuses are handled (`Active`, `Invited`, `InviteExpired`, `NotInvited`, `Inactive`). The list ignores `courseCount` / `lessonCount` (Plan 14 may show them).
  `inviteExpiresAt` is in the type but not shown yet (null until backend B3).
- Lock/unlock: "Khóa tài khoản" asks for confirmation; "Mở khóa" is immediate. The form is keyed by `id:status`, so it remounts (dropping unsaved edits) when the status changes.
- **Plan 13:** put the invite / resend button in `CustomerPage`'s `PageHeader` `actions`, at the `{/* Plan 13 */}` comment, next to the status badge; also use `customer.inviteExpiresAt`
  for the expiry text, and invalidate via `invalidateCustomers(customer.id)`. `CustomerForm` currently ignores `sendInvite` (create sends none).
- **Plan 14:** add the access section as a sibling after `<CustomerForm />` in the `max-w-3xl flex flex-col gap-6` div in `CustomerPage` (at the `{/* Plan 14 */}` comment).
- Not exercised in a browser; only build and lint were run. Test customers were not created.
