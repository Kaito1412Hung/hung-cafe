# Hưng Café — Backend (Mốc 2: REST API)

Node.js + Express 5 + TypeScript + PostgreSQL (thư viện `pg`, viết SQL thuần).
Đăng nhập bằng JWT lưu trong cookie `httpOnly`, mật khẩu băm bằng `bcrypt`.

## Chạy lần đầu

```bash
npm install
cp .env.example .env        # rồi sửa DATABASE_URL (mật khẩu postgres) và JWT_SECRET
npm run db:setup            # tạo database + bảng + dữ liệu mẫu
npm run dev                 # http://localhost:4000
```

Tài khoản mẫu (admin + khách) lấy từ các biến `SEED_*` trong `.env`.

| Lệnh               | Tác dụng                                                  |
| ------------------ | --------------------------------------------------------- |
| `npm run dev`      | Chạy server, tự khởi động lại khi sửa code               |
| `npm run db:setup` | Tạo DB/bảng/dữ liệu mẫu (chạy lại nhiều lần vẫn an toàn) |
| `npm run build`    | Biên dịch TypeScript → `dist/`                            |
| `npm start`        | Chạy bản đã build (dùng khi deploy)                       |

## API

| Method | Endpoint             | Quyền        | Mô tả                                  |
| ------ | -------------------- | ------------ | -------------------------------------- |
| GET    | `/api/health`        | Ai cũng được | Kiểm tra server + DB                   |
| POST   | `/api/auth/register` | Ai cũng được | Đăng ký (luôn là `customer`)           |
| POST   | `/api/auth/login`    | Ai cũng được | Đăng nhập, set cookie `token`          |
| POST   | `/api/auth/logout`   | Ai cũng được | Xoá cookie                             |
| GET    | `/api/auth/me`       | Đã đăng nhập | Thông tin người đang đăng nhập         |
| GET    | `/api/products`      | Ai cũng được | Danh sách (`?category=tea&search=trà`) |
| GET    | `/api/products/:id`  | Ai cũng được | Chi tiết                               |
| POST   | `/api/products`      | **Admin**    | Thêm                                   |
| PUT    | `/api/products/:id`  | **Admin**    | Sửa toàn bộ                            |
| PATCH  | `/api/products/:id`  | **Admin**    | Sửa một vài trường                     |
| DELETE | `/api/products/:id`  | **Admin**    | Xoá                                    |
| GET    | `/api/cart`                      | Đã đăng nhập | Xem giỏ hàng (kèm tổng số lượng, tạm tính) |
| POST   | `/api/cart/items`                | Đã đăng nhập | Thêm món `{ productId, quantity }` (cộng dồn) |
| PATCH  | `/api/cart/items/:productId`     | Đã đăng nhập | Đổi số lượng `{ quantity }`            |
| DELETE | `/api/cart/items/:productId`     | Đã đăng nhập | Xoá 1 món khỏi giỏ                     |
| DELETE | `/api/cart`                      | Đã đăng nhập | Xoá toàn bộ giỏ                        |
| POST   | `/api/orders`                    | Đã đăng nhập | Đặt hàng từ giỏ `{ customerName, phone, address, note }` |
| GET    | `/api/orders/my`                 | Đã đăng nhập | Đơn hàng của tôi                       |
| PATCH  | `/api/orders/my/:id/cancel`      | Đã đăng nhập | Khách tự huỷ (chỉ khi "Chờ xác nhận")  |
| GET    | `/api/orders/:id`                | Admin / chủ đơn | Chi tiết đơn                        |
| GET    | `/api/orders`                    | **Admin**    | Tất cả đơn + thống kê (`?status=pending&search=0971`) |
| PATCH  | `/api/orders/:id/status`         | **Admin**    | Đổi trạng thái `{ status }`            |
| PATCH  | `/api/auth/me`                   | Đã đăng nhập | Sửa hồ sơ `{ name, nickname, phone, address, birthday, gender }` (gửi trường nào sửa trường đó) |
| PUT    | `/api/auth/me/avatar`            | Đã đăng nhập | Ảnh đại diện `{ avatar }` (data URL ≤ 200KB, `""` = xoá) |
| DELETE | `/api/auth/me`                   | Khách hàng   | Tự xoá tài khoản `{ password }`        |
| POST   | `/api/auth/logout-all`           | Đã đăng nhập | Đăng xuất khỏi tất cả thiết bị         |
| PATCH  | `/api/auth/password`             | Đã đăng nhập | Đổi mật khẩu (các thiết bị khác bị đăng xuất) |
| GET    | `/api/settings`                  | Ai cũng được | Thông tin quán + phí giao hàng         |
| PUT    | `/api/settings`                  | **Admin**    | Cập nhật cài đặt cửa hàng              |
| GET    | `/api/admin/stats?days=7`        | **Admin**    | Số liệu trang Tổng quan (7/30/90 ngày) |
| GET    | `/api/admin/customers`           | **Admin**    | Danh sách tài khoản (`?role=customer&search=`) |
| GET    | `/api/admin/customers/:id`       | **Admin**    | Chi tiết + lịch sử đơn                 |
| PATCH  | `/api/admin/customers/:id/role`  | **Admin**    | Đổi quyền `{ role }`                   |
| DELETE | `/api/admin/customers/:id`       | **Admin**    | Xoá tài khoản khách                    |
| GET    | `/api/notifications?limit=20`    | Đã đăng nhập | Thông báo của tôi + số chưa đọc        |
| PATCH  | `/api/notifications/:id/read`    | Đã đăng nhập | Đánh dấu 1 thông báo đã đọc            |
| PATCH  | `/api/notifications/read-all`    | Đã đăng nhập | Đánh dấu tất cả đã đọc                 |

Lỗi luôn trả về dạng `{ "message": "...", "errors": { "field": "..." } }` với status 400/401/403/404/409/500.

## Cấu trúc

```
src/
├── server.ts              # Điểm khởi động: kiểm tra DB rồi listen
├── app.ts                 # Khai báo middleware + route
├── config/env.ts          # Đọc & kiểm tra biến môi trường (zod)
├── db/
│   ├── pool.ts            # Kết nối PostgreSQL
│   ├── schema.ts          # CREATE TABLE
│   ├── setup.ts / seed.ts # Tạo DB + dữ liệu mẫu
├── middlewares/           # requireAuth, requireRole, validateBody, errorHandler
├── modules/
│   ├── auth/              # routes → controller → service → DB
│   ├── products/
│   ├── cart/              # Giỏ hàng (bảng cart_items)
│   ├── orders/            # Đơn hàng (orders, order_items)
│   ├── settings/          # Cài đặt cửa hàng (bảng settings, JSONB)
│   ├── admin/             # Thống kê + quản lý khách hàng
│   └── notifications/     # Thông báo cho admin
└── utils/                 # AppError, JWT + cookie
```

**Trạng thái đơn hàng:** `pending` (Chờ xác nhận) → `confirmed` (Đã xác nhận) → `shipping` (Đang giao) → `completed` (Hoàn thành).
Huỷ (`cancelled`) được khi chưa giao; huỷ đơn sẽ hoàn lại tồn kho. Đặt hàng chạy trong **transaction**:
khoá sản phẩm, kiểm tra tồn kho, tạo đơn, trừ kho, xoá giỏ — lỗi ở bước nào cũng rollback toàn bộ.

**Thông báo:** tự tạo cho mọi admin khi có đơn mới, khách huỷ đơn, món vừa tụt xuống ≤ 10 phần / hết hàng,
hoặc có khách đăng ký. Thông báo của đơn hàng được tạo **trong cùng transaction** với đơn (đơn lỗi thì không có thông báo).
Mỗi admin giữ tối đa 100 thông báo gần nhất.

**Phân quyền & phiên đăng nhập:** `requireAuth` đọc lại role và `token_version` từ DB ở mỗi request.
Đổi quyền / xoá tài khoản có hiệu lực ngay; tăng `token_version` (đổi mật khẩu, "đăng xuất mọi thiết bị") làm mọi JWT cũ hết hạn.

Mỗi module chia 4 lớp: **routes** (URL + middleware) → **controller** (đọc request, trả response) →
**service** (logic + SQL) → **schema** (validate dữ liệu đầu vào).

## Deploy (gợi ý)

- Database: tạo PostgreSQL miễn phí trên Neon / Supabase / Render → dán URL vào `DATABASE_URL`, đặt `DATABASE_SSL=true`.
- Backend: Render / Railway — Build: `npm install && npm run build`, Start: `npm start`, chạy `npm run db:setup` một lần.
- Đặt `NODE_ENV=production` (cookie sẽ có cờ `secure`, bắt buộc HTTPS) và một `JWT_SECRET` mới.
