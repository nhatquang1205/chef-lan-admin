# Plan 13 — Customer invitations

**Needs backend plan B3** (`../chef-lan/docs/customer-invitations/plans/03-invitations-and-activation.md`).

## Build

1. `lib/api/customers.ts`: `inviteCustomer(id)` → `POST /api/v1/admins/customers/{id}/invite` →
   `{ invitedAt, inviteExpiresAt }`; invalidate `['customer', id]` and `['customers']`.
2. Create form (Plan 12): checkbox "Gửi email mời ngay" (checked by default, disabled when email is empty) → sends
   `sendInvite: true`. If the response carries `inviteError`, toast "Đã tạo khách hàng nhưng chưa gửi được email mời"
   and leave the user on the detail page where "Gửi lại lời mời" is available.
3. Detail header, depending on status:
   - Chưa mời → "Gửi lời mời"; Đã mời → "Gửi lại lời mời" + "Hết hạn {date}"; Lời mời hết hạn → "Gửi lại lời mời"
     (highlighted); Đã kích hoạt / Đã khóa → no invite button. No email → disabled with tooltip "Cần email để mời".
   - Resend confirm: "Liên kết cũ sẽ không dùng được nữa."
4. Errors: `customer.no_email`, `customer.already_active`, `customer.account_inactive`, `email.send_failed`
   ("Không gửi được email. Kiểm tra cấu hình email của máy chủ rồi thử lại.") in `lib/api/errors.ts`.

## Done when

With SMTP configured on the local API: create a customer with your own email and "Gửi email mời ngay" → the mail
arrives and the status is "Đã mời"; resend → the new mail works and the old link does not; after activating on the
website the status becomes "Đã kích hoạt" and the button disappears. `pnpm build` / `pnpm lint` clean.

## Implementation notes

- `inviteCustomer(id)` in `lib/api/customers.ts` (invalidates `['customers']` and `['customer', id]`), `InviteResponse` and `inviteError` / `sendInvite` in `types.ts`, four error codes in `errors.ts`.
- `CustomerForm` (create only): checkbox "Gửi email mời ngay", checked by default, disabled and unchecked while the email is empty; sends `sendInvite`. If the response has `inviteError`, a warning toast is shown; the user lands on the detail page either way.
- `CustomerPage` header: "Gửi lời mời" (NotInvited, immediate), "Gửi lại lời mời" (Invited / InviteExpired, with confirm "Liên kết cũ sẽ không dùng được nữa."; highlighted as the primary button when expired); hidden for Active / Inactive. No email: disabled, tooltip via `title` on a wrapping span (no tooltip component installed). "Hết hạn {date}" is appended to the dates line only while status is Invited.
- Only build and lint were run; not exercised in a browser or against SMTP.
