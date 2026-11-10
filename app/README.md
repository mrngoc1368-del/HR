# Cổng nhân sự — Ngoclinhn Group

Webapp HR theo prototype `project/HR App.dc.html` và Sequence Diagram `project/HR Sequence Diagrams.dc.html`.
Ba tầng: **Frontend** React (Vite) → **Backend** Express REST + JWT → **Database** PostgreSQL.

## Chạy thử

```bash
# 1. PostgreSQL: tạo user/db (một lần)
createuser -P hr            # mật khẩu: hr
createdb -O hr hr && createdb -O hr hr_test

# 2. Backend + dữ liệu mẫu
cd app/server && npm i
npm run seed -- --reset     # xóa và nạp lại 18 nhân sự, đơn, phiếu lương mẫu
npm start                   # API :3001

# 3a. Frontend dev (proxy /api → :3001)
cd app/web && npm i && npm run dev
# 3b. hoặc build rồi mở thẳng http://localhost:3001
cd app/web && npm run build
```

Biến môi trường: `DATABASE_URL` (mặc định `postgres://hr:hr@localhost:5432/hr`), `JWT_SECRET` (**bắt buộc đổi khi triển khai**), `PORT`, `TODAY` (ghim "hôm nay", vd `2026-11-10`, dùng cho demo/test).

Tài khoản demo, mật khẩu `demo1234`: `linh.nguyen@ngoclinhn.vn` (nhân viên), `quan.tran@ngoclinhn.vn` (trưởng nhóm Marketing), `linh.ngo@ngoclinhn.vn` (giám đốc).

## Kiểm thử

```bash
cd app/server && npm test     # 38 test API (cần DB hr_test)
cd app/web && npm test        # 21 test giao diện
node app/e2e/flow.cjs         # E2E trình duyệt; cần server đang chạy + build web + seed --reset
```

## Tính năng ↔ luồng trong Sequence Diagram

| Luồng | API | Ghi chú |
|---|---|---|
| Đăng nhập | `POST /api/auth/login`, `/refresh`, `/logout`, `GET /api/dashboard` | bcrypt; access token JWT 15 phút trong bộ nhớ, refresh token (băm SHA-256) trong cookie httpOnly + bảng `sessions` |
| Gửi đơn | `POST /api/leave-requests`, `GET /mine`, `GET /calendar` | chặn trùng ngày và vượt quỹ (đơn đang chờ cũng chiếm quỹ); khoá theo người gửi chống gửi song song |
| Duyệt đơn 2 cấp | `GET /api/approvals`, `PATCH /api/leave-requests/:id` | khoá dòng `FOR UPDATE`, trừ phép khi giám đốc duyệt, ghi `approval_logs`, thông báo |
| Xem lương | `GET /api/payslips`, `/payslips/:id/pdf`, `GET /api/payroll` | `user_id` luôn lấy từ token; bảng công ty chỉ cho quản lý |
| Nhân viên / Hồ sơ | `GET /api/employees`, `/employees/me`, `/employees/:id` | nhân viên chỉ xem hồ sơ của mình |
