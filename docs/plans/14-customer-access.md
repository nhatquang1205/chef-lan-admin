# Plan 14 — Customer access (courses and lessons they own)

Uses endpoints that already exist (see `../chef-lan/docs/lesson-access/spec.md`):
`GET /api/v1/admins/customers/{id}/access` → `{ customerId, courses: CourseEnrollment[], lessons: LessonEnrollment[] }`;
`POST /api/v1/admins/enrollments` `{ courseId, customerId, isPaid, amountPaidVnd?, paymentNote?, paymentReference? }`;
`POST /api/v1/admins/lesson-enrollments` `{ lessonId, customerId, ... }`; `POST /api/v1/admins/enrollments/{id}/revoke`,
`POST /api/v1/admins/lesson-enrollments/{id}/revoke`. Read `EnrollmentRequests.cs` / `EnrollmentResponses.cs` and the
validators for exact fields (amount needs `isPaid`, whole dong; one of customerId/customerEmail).

## Build

1. `lib/api/access.ts`: the five calls; key `['customer-access', customerId]`. After grant/revoke also invalidate
   `['courses']` and `['course', courseId]` (enrollment count).
2. Section "Quyền học" on `/customers/:id`: two lists — **Khóa học** (title, status Active/Expired/Revoked, granted
   date, expiry or "Trọn đời", paid amount, note) and **Bài học riêng** (lesson title, course, same columns).
   Revoked/expired rows greyed; action "Thu hồi" on active rows (confirm).
3. "Cấp quyền" dialog: tabs "Cả khóa học" / "Một bài học". Course picker (search courses via `listCourses`); for a
   lesson, pick course then lesson (`listLessons`; show "Mua thêm" and price for add-ons). Fields: "Đã thanh toán"
   switch, amount (`VndInput`, prefilled with the course/lesson price, only when paid), payment note, reference.
4. Errors: `enrollment.already_active` → "Khách đã có quyền này rồi."; inactive customer → the existing message.
   Granting again after a revoke is allowed (the API reactivates the row).

## Done when

Against the local API: grant a course and a single lesson to a test customer, they appear in the lists; revoke both;
grant the same course twice → the already-active message; the course's enrollment count in the course page follows.
`pnpm build` / `pnpm lint` clean. Clean up the test data.
