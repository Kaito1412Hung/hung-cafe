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

`db:setup` tạo sẵn 2 tài khoản mẫu (admin + khách) theo các biến `SEED_*` trong `.env`, cùng 14 món và 4 danh mục. Dữ liệu tạo thêm khi dùng web (khách, đơn hàng, tin nhắn…) chỉ nằm trong PostgreSQL trên máy, **không** có trên GitHub.

| Lệnh               | Tác dụng                                                  |
| ------------------ | --------------------------------------------------------- |
| `npm run dev`      | Chạy server, tự khởi động lại khi sửa code               |
| `npm run db:setup` | Tạo DB/bảng/dữ liệu mẫu (chạy lại nhiều lần vẫn an toàn) |
| `npm run build`    | Biên dịch TypeScript → `dist/`                            |
| `npm run db:snapshot` | Chụp database vào `.db-snapshots/` (giữ 10 bản mới nhất, không lên git) |
| `npm run db:compare`  | So database hiện tại với bản chụp mới nhất, từng bảng |
| `npm run db:restore`  | Khôi phục bản chụp (hỏi lại trước, `-- --yes` để bỏ qua) |
| `npm run test-accounts` | Xem / xoá (`-- --clean`) dữ liệu của tài khoản test |
| `npm run check:secrets` | Kiểm tra không có file / giá trị bí mật nào sắp lên GitHub |
| `npm start`        | Chạy bản đã build (dùng khi deploy)                       |

## API

> 📖 **Tài liệu tương tác (Swagger):** chạy backend rồi mở **http://localhost:4000/api/docs** — xem mọi API, gửi lên gì / trả về gì, bấm **Try it out** để gọi thử. Bản JSON chuẩn OpenAPI 3.1: `/api/docs.json`. Muốn thử API có 🔒 thì gọi `POST /api/auth/login` trước (cookie tự lưu).
>
> Thêm API mới → nhớ khai báo thêm vào `src/docs/openapi.ts` (phần body lấy thẳng từ schema zod).

| Method | Endpoint             | Quyền        | Mô tả                                  |
| ------ | -------------------- | ------------ | -------------------------------------- |
| GET    | `/api/health`        | Ai cũng được | Kiểm tra server + DB                   |
| POST   | `/api/auth/register` | Ai cũng được | Đăng ký (luôn là `customer`)           |
| POST   | `/api/auth/login`    | Ai cũng được | Đăng nhập, set cookie `token`          |
| POST   | `/api/auth/logout`   | Ai cũng được | Xoá cookie                             |
| GET    | `/api/auth/me`       | Ai cũng được | Người đang đăng nhập; chưa đăng nhập → `{ user: null }` |
| GET    | `/api/products`      | Ai cũng được | Danh sách (`?category=tea&search=trà`) |
| GET    | `/api/products/slug/:slug` | Ai cũng được | Chi tiết theo đường dẫn đẹp (`ca-phe-sua-da`) |
| GET    | `/api/products/:id`  | Ai cũng được | Chi tiết                               |
| POST   | `/api/products`      | **Admin**    | Thêm                                   |
| PUT    | `/api/products/:id`  | **Admin**    | Sửa toàn bộ                            |
| PATCH  | `/api/products/:id`  | **Admin**    | Sửa một vài trường                     |
| DELETE | `/api/products/:id`  | **Admin**    | Xoá                                    |
| GET    | `/api/categories`                | Ai cũng được | Danh mục (kèm số món)                  |
| POST/PUT/DELETE | `/api/categories(/:id)` | **Admin**    | Thêm / sửa `{ name, sortOrder }` / xoá (chặn nếu còn món) |
| POST   | `/api/uploads/products`          | **Admin**    | Upload ảnh `{ image: dataURL }` → `{ url }`: link Cloudinary nếu đã điền mã `CLOUDINARY_*`, không thì `/api/uploads/products/...` |
| GET    | `/api/cart`                      | Đã đăng nhập | Xem giỏ hàng (kèm tổng số lượng, tạm tính) |
| POST   | `/api/cart/items`                | Đã đăng nhập | Thêm món `{ productId, quantity, size?, sugar?, ice?, note? }` — cùng món + cùng lựa chọn thì cộng dồn, khác lựa chọn là dòng mới |
| PATCH  | `/api/cart/items/:lineId`        | Đã đăng nhập | Đổi số lượng 1 dòng `{ quantity }` (lineId = `id` của dòng trong giỏ) |
| DELETE | `/api/cart/items/:lineId`        | Đã đăng nhập | Xoá 1 dòng khỏi giỏ                    |
| DELETE | `/api/cart`                      | Đã đăng nhập | Xoá toàn bộ giỏ                        |
| POST   | `/api/orders`                    | Đã đăng nhập | Đặt hàng từ giỏ `{ customerName, phone, address, note, couponCode?, fulfillment?: "delivery" \| "pickup", scheduledAt?: ISO }` — lấy tại quán thì không cần địa chỉ, không tính phí giao |
| GET    | `/api/orders/my`                 | Đã đăng nhập | Đơn hàng của tôi                       |
| GET    | `/api/payments/config`           | Ai cũng được | Quán đã bật VNPay chưa, số phút giữ đơn |
| POST   | `/api/payments/vnpay/:orderId`   | Chủ đơn      | Tạo link thanh toán VNPay (có chữ ký) cho đơn đang chờ trả |
| GET    | `/api/payments/vnpay/return`     | Ai cũng được | Trang quay về gửi lại tham số VNPay → kiểm tra chữ ký, ghi nhận kết quả |
| GET    | `/api/payments/vnpay/ipn`        | VNPay gọi    | Kết quả từ máy chủ VNPay (dùng khi deploy), trả `{ RspCode, Message }` |
| PATCH  | `/api/orders/:id/refunded`       | **Admin**    | Đánh dấu đã hoàn tiền cho đơn VNPay đã trả nhưng bị huỷ |
| PATCH  | `/api/orders/my/:id/cancel`      | Đã đăng nhập | Khách tự huỷ (chỉ khi "Chờ xác nhận"), lý do không bắt buộc `{ reason }` |
| POST   | `/api/orders/my/:id/reorder`     | Đã đăng nhập | Mua lại: thêm các món của đơn cũ vào giỏ (bỏ qua món hết hàng) |
| GET    | `/api/orders/:id`                | Admin / chủ đơn | Chi tiết đơn                        |
| GET    | `/api/orders`                    | **Admin**    | Tất cả đơn + thống kê (`?status=pending&search=0971`) |
| PATCH  | `/api/orders/:id/status`         | **Admin**    | Đổi trạng thái `{ status, reason }` — huỷ thì bắt buộc lý do (khách thấy) |
| PATCH  | `/api/auth/me`                   | Đã đăng nhập | Sửa hồ sơ `{ name, nickname, phone, address, birthday, gender }` (gửi trường nào sửa trường đó) |
| PUT    | `/api/auth/me/avatar`            | Đã đăng nhập | Ảnh đại diện `{ avatar }` (data URL ≤ 200KB, `""` = xoá) |
| DELETE | `/api/auth/me`                   | Khách hàng   | Tự xoá tài khoản `{ password }`        |
| POST   | `/api/auth/logout-all`           | Đã đăng nhập | Đăng xuất khỏi tất cả thiết bị         |
| POST   | `/api/auth/forgot-password`      | Ai cũng được | Báo quên mật khẩu `{ email }` → thông báo cho admin |
| PATCH  | `/api/auth/password`             | Đã đăng nhập | Đổi mật khẩu (các thiết bị khác bị đăng xuất) |
| GET    | `/api/settings`                  | Ai cũng được | Thông tin quán, giờ mở cửa, mạng xã hội, phí giao + `openStatus` (đang mở / đóng) |
| PUT    | `/api/settings`                  | **Admin**    | Cập nhật cài đặt cửa hàng              |
| POST   | `/api/contact`                   | Ai cũng được | Gửi form liên hệ (tối đa 3 lần / 10 phút / email) → thông báo cho admin |
| GET / PATCH / DELETE | `/api/contact(/:id)`   | **Admin**    | Hộp thư liên hệ, đánh dấu đã đọc `{ isRead }`, xoá |
| POST   | `/api/newsletter`                | Ai cũng được | Đăng ký nhận tin `{ email }` (trùng → báo đã đăng ký) |
| GET / DELETE | `/api/newsletter(/:id)`        | **Admin**    | Danh sách email đăng ký nhận tin, xoá  |
| GET    | `/api/stats/public`              | Ai cũng được | Số liệu thật cho trang chủ (số món, khách, đơn đã giao, món bán chạy) |
| POST   | `/api/coupons/check`             | Đã đăng nhập | Kiểm tra mã với giỏ hiện tại `{ code }` → số tiền giảm (sai điều kiện thì báo lý do) |
| GET / POST / PATCH / DELETE | `/api/coupons(/:id)` | **Admin** | Quản lý mã giảm giá (%, số tiền, đơn tối thiểu, số lượt, hạn dùng, chỉ đơn đầu) |
| GET    | `/api/reviews/product/:productId`| Ai cũng được | Đánh giá của 1 món + điểm TB (đăng nhập thì biết mình được đánh giá không) |
| GET    | `/api/reviews/featured`          | Ai cũng được | 3 đánh giá 4–5 sao mới nhất cho trang chủ |
| GET    | `/api/reviews`                   | **Admin**    | Tất cả đánh giá (`?rating=1..5&search=&productId=&hasComment=1&sort=newest\|lowest&page=&pageSize=`), tìm không dấu, kèm thống kê số sao |
| GET    | `/api/reviews/mine`              | Đã đăng nhập | Các món mình đã đánh giá               |
| POST   | `/api/reviews`                   | Đã đăng nhập | Viết / sửa đánh giá `{ productId, rating, comment }` — chỉ khi đã nhận món (đơn hoàn thành) |
| DELETE | `/api/reviews/:id`               | Người viết / Admin | Xoá đánh giá                     |
| GET    | `/api/favorites`                 | Đã đăng nhập | Món yêu thích                          |
| PUT / DELETE | `/api/favorites/:productId` | Đã đăng nhập | Thả tim / bỏ tim                       |
| GET    | `/api/admin/reports/revenue?days=30` | **Admin** | Tải file Excel báo cáo doanh thu (4 sheet); `?year=2026` = cả năm, sheet theo tháng |
| GET    | `/api/admin/stats?days=7`        | **Admin**    | Số liệu trang Tổng quan (7/30/90 ngày); `?year=2026` = cả năm, biểu đồ theo tháng |
| GET    | `/api/admin/customers`           | **Admin**    | Danh sách tài khoản (`?role=customer&search=`) |
| GET    | `/api/admin/customers/:id`       | **Admin**    | Chi tiết + lịch sử đơn                 |
| PATCH  | `/api/admin/customers/:id/role`  | **Admin**    | Đổi quyền `{ role }`                   |
| POST   | `/api/admin/customers/:id/reset-password` | **Admin** | Tạo mật khẩu tạm (chỉ trả về 1 lần) |
| DELETE | `/api/admin/customers/:id`       | **Admin**    | Xoá tài khoản khách                    |
| GET    | `/api/notifications?limit=20`    | Đã đăng nhập | Thông báo của tôi + số chưa đọc        |
| PATCH  | `/api/notifications/:id/read`    | Đã đăng nhập | Đánh dấu 1 thông báo đã đọc            |
| PATCH  | `/api/notifications/read-all`    | Đã đăng nhập | Đánh dấu tất cả đã đọc                 |

Lỗi luôn trả về dạng `{ "message": "...", "errors": { "field": "..." } }` với status 400/401/403/404/409/500.

## Realtime (Socket.IO)

- Chạy chung cổng với API (`server.ts` gọi `initRealtime`). Trình duyệt lấy vé `GET /api/auth/socket-token` (2 phút) rồi kết nối kèm `auth: { token }`
- Phòng: `user:<id>` cho từng người, `admins` cho admin
- Sự kiện: `notification:new`, `order:new` (admin), `order:updated` (admin + chủ đơn)
- Tin tạo trong transaction chỉ gửi sau COMMIT: `src/db/afterCommit.ts`
- Code: `src/realtime/socket.ts`; test: `tests/api/realtime.test.ts`

## Test tự động

```bash
npm test            # chạy hết 1 lần (Vitest)
npm run test:watch  # tự chạy lại khi sửa code
```

- `tests/unit/`: test hàm, không cần database (chữ ký VNPay / Cloudinary, tính tiền, giảm giá, kiểm tra dữ liệu zod, giờ mở cửa theo giờ VN)
- `tests/api/`: gọi API thật bằng Supertest trên database **riêng `hung_cafe_test`** (xoá + tạo lại mỗi lần chạy, chốt an toàn: tên phải kết thúc `_test`). Trên máy lấy server trong `DATABASE_URL`; trên GitHub Actions dùng `TEST_DATABASE_URL`
- Cấu hình: `vitest.config.ts` (biến môi trường riêng cho test), `tests/global-setup.ts` (tạo database), `tests/helpers.ts` (trình duyệt giả giữ cookie, mỗi người 1 IP)
- CI: `.github/workflows/ci.yml` chạy typecheck + test + build mỗi lần push

## Bảo mật cơ bản

- **Chống dò mật khẩu:** sai 5 lần / 15 phút với 1 email → khoá đăng nhập email đó 15 phút; 1 IP sai quá 20 lần cũng bị khoá (`middlewares/rateLimit.ts`).
- **Giới hạn tần suất (rate limit) theo IP:** đăng ký 5 lần/giờ, quên mật khẩu 5 lần/15 phút, liên hệ / nhận tin 10 lần/10 phút, thử mã giảm giá 20 lần/5 phút.
- **helmet:** thêm các header bảo mật (chống nhúng iframe, chống đoán kiểu file, ẩn `X-Powered-By`).
- **Tài khoản demo dùng chung** (`DEMO_EMAILS`): không đổi được mật khẩu / hồ sơ / ảnh, không đăng xuất mọi thiết bị, không xoá được (403); gõ sai mật khẩu chỉ khoá theo IP, không khoá theo email.
- **IP thật của khách:** backend đứng sau proxy (máy dev: Next.js; deploy: Vercel + Render) → biến `TRUST_PROXY` cho biết tin mấy trạm trong header `X-Forwarded-For`. Sai thì mọi khách bị tính chung 1 IP. Kiểm tra: mở `/api/health` xem `yourIp`.
- Bộ đếm lưu trong bộ nhớ server (khởi động lại là reset). Chạy nhiều server thì nên chuyển sang Redis.

## Cấu trúc

```
src/
├── server.ts              # Điểm khởi động: kiểm tra DB rồi listen
├── app.ts                 # Khai báo middleware + route
├── config/env.ts          # Đọc & kiểm tra biến môi trường (zod)
├── docs/openapi.ts        # Tài liệu API (Swagger) → /api/docs, body lấy từ schema zod
├── db/
│   ├── pool.ts            # Kết nối PostgreSQL
│   ├── schema.ts          # CREATE TABLE
│   ├── setup.ts / seed.ts # Tạo DB + dữ liệu mẫu
├── middlewares/           # requireAuth, requireRole, validateBody, errorHandler
├── modules/
│   ├── auth/              # routes → controller → service → DB
│   ├── products/          # Có slug cho trang chi tiết
│   ├── categories/        # Danh mục (bảng categories)
│   ├── uploads/           # Upload ảnh sản phẩm → Cloudinary (cloudinary.ts) hoặc thư mục uploads/ (không đưa lên Git)
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
