# Các phần nối với nhau thế nào

## Đường đi của 1 yêu cầu

```
Trình duyệt ──> Next.js (cổng 3000) ──/api/*──> Express (cổng 4000) ──> PostgreSQL
                 trang + giao diện        (next.config.ts chuyển tiếp)
```

Vì Next.js chuyển tiếp `/api/*`, trình duyệt chỉ thấy 1 địa chỉ → cookie đăng nhập dùng chung, không vướng CORS.

**Bên frontend:** trang / component → `hooks/` hoặc `context/` → `services/xxxService.ts` (gọi `fetch`) → API.

**Bên backend**, mỗi module trong `backend/src/modules/` chia 4 lớp:

```
routes      URL + middleware (requireAuth, requireRole("admin"), validateBody)
  └─> controller   đọc request, trả response
        └─> service      logic + câu SQL
schema      zod: kiểm tra dữ liệu gửi lên (sai → 400 kèm lỗi từng ô)
```

## Đăng nhập

1. `POST /api/auth/login` → đúng mật khẩu thì backend tạo **JWT** và đặt vào cookie `token` (httpOnly: JavaScript trên trang không đọc được).
2. Mỗi yêu cầu sau, `requireAuth` đọc cookie, kiểm tra JWT rồi **đọc lại role + `token_version` từ DB** → đổi quyền, xoá tài khoản, đổi mật khẩu có hiệu lực ngay.
3. Mở web khi chưa đăng nhập, frontend hỏi `GET /api/auth/me` → server trả `200` + `{ user: null }` (không trả 401 để Console trình duyệt không hiện dòng đỏ). Các API cần đăng nhập khác vẫn trả `401` như cũ.

## Thêm vào giỏ → đặt hàng

1. Khách chọn món + lựa chọn → `POST /api/cart/items`. Backend dùng `cart/options.ts` để **chuẩn hoá** lựa chọn theo cấu hình món (VD món chỉ uống nóng thì bỏ lượng đá, topping sắp theo id). Cùng món + cùng lựa chọn → cộng dồn số lượng; khác → dòng mới.
2. Giá 1 ly = giá món + phụ thu size + tổng giá topping, **tính ở backend** (không tin giá frontend gửi lên).
3. `POST /api/orders` chạy trong **1 transaction**: khoá các món → kiểm tra còn bán, đủ tồn kho, topping còn bán → kiểm tra mã giảm giá → tạo đơn + bản chụp món → trừ kho → xoá giỏ → tạo thông báo cho admin. Lỗi ở bước nào cũng huỷ toàn bộ.

## Giờ từng bước + dự kiến giao

- Admin đổi trạng thái → `changeStatus` ghi giờ vào cột của bước đó (VD bấm "Bắt đầu giao" → `shipping_at = NOW()`).
- "Dự kiến giao lúc …" tính ở frontend (`estimateDelivery` trong `lib/orders.ts`) theo cài đặt quán:
  - Chờ xác nhận / đã xác nhận: (giờ xác nhận, chưa có thì giờ đặt) + `prepMinutes` + `deliveryMinutes`
  - Đang giao: giờ bắt đầu giao + `deliveryMinutes`
  - Hoàn thành / đã huỷ: không hiện

## Giao tận nơi / đến quán lấy + hẹn giờ

- Khách chọn hình thức ở giỏ hàng; `checkout` không tính phí giao và không lưu địa chỉ khi `fulfillment = "pickup"`.
- Giờ hẹn (`scheduledAt`) do `checkScheduledTime` kiểm tra: chỉ hôm nay / ngày mai, trong giờ mở cửa (`isWithinOpeningHours`), không sớm hơn thời gian pha chế (+ thời gian giao nếu giao tận nơi).
- Frontend tạo sẵn danh sách giờ mỗi 15 phút (`scheduleOptions` trong `lib/orders.ts`); backend vẫn kiểm tra lại.
- "Dự kiến … lúc" ưu tiên giờ hẹn; đơn lấy tại quán đã pha xong thì không hiện dự kiến nữa.

## Thanh toán VNPay

1. Khách chọn VNPay → `checkout` tạo đơn (giữ món + mã giảm giá), `payment_status = pending`, hạn chót sau `PAYMENT_TIMEOUT_MINUTES` phút. **Chưa báo admin.**
2. Frontend gọi `POST /api/payments/vnpay/:orderId` → backend tạo dòng `payments` + link VNPay có **chữ ký HMAC-SHA512** (`vnpay.ts`) → trình duyệt chuyển sang VNPay.
3. Khách trả xong, VNPay đưa về `/thanh-toan/ket-qua?...` → frontend gửi nguyên tham số cho `GET /api/payments/vnpay/return`. Khi deploy, VNPay còn gọi thẳng `GET /api/payments/vnpay/ipn`.
4. `handleVnpayResult` (dùng chung cho return + IPN): **chữ ký đúng → mã giao dịch có thật → số tiền khớp → chưa xử lý** (khoá dòng trong transaction) → ghi `paid` → lúc này mới báo admin "Đơn hàng mới".
5. Mỗi phút `expireUnpaidOrders` (gọi trong `server.ts`) huỷ đơn VNPay quá hạn chưa trả, trả kho + lượt mã. Khách trả muộn sau khi đơn đã huỷ → `refund_pending`.
6. Không có mã VNPay trong `.env` → `vnpayEnabled = false`, web chỉ có tiền mặt.

## Ảnh món (Cloudinary)

1. Admin chọn ảnh → trình duyệt thu nhỏ ảnh (`lib/image.ts`) → gửi data URL cho `POST /api/uploads/products`.
2. Backend kiểm tra: là admin, đúng JPG / PNG / WEBP, tối đa 2MB.
3. Đã điền 3 mã `CLOUDINARY_*` trong `.env` (`cloudinaryEnabled`) → `uploadToCloudinary` (`cloudinary.ts`) gửi ảnh lên Cloudinary kèm **chữ ký SHA-1** (secret không gửi đi), nhận link `https://res.cloudinary.com/...`, chèn `f_auto,q_auto` để Cloudinary tự chọn định dạng nhẹ nhất. Ảnh nằm trong thư mục `hung-cafe/products`.
4. Chưa điền mã → lưu vào ổ cứng `backend/uploads/products/`, link `/api/uploads/products/...` (như trước).
5. Link ảnh được lưu vào cột `products.image`. Ảnh cũ (link Unsplash, ảnh đã lưu ổ cứng) giữ nguyên, không đổi.

Vì sao cần Cloudinary: máy chủ deploy (VD Render bản miễn phí) **xoá ổ cứng mỗi lần deploy lại** → ảnh lưu ổ cứng sẽ mất. Máy chủ không nên giữ file ("stateless"), file để ở dịch vụ lưu trữ riêng.

## Thống kê

- `GET /api/admin/stats?days=7|30|90` → biểu đồ theo ngày; `?year=2026` → biểu đồ theo tháng.
- Mốc thời gian tính trong `admin/period.ts` (giờ Việt Nam). Năm đang diễn ra so với **cùng kỳ năm trước** (1/1 → hôm nay của năm trước) cho công bằng.
- Báo cáo Excel nhận cùng tham số: cả năm thì sheet 2 là "Theo tháng".

## Múi giờ

- Database lưu giờ kiểu `TIMESTAMPTZ` (thời điểm tuyệt đối), API trả giờ dạng ISO có chữ `Z` (UTC).
- Chỗ nào cần "ngày hôm nay", giờ mở cửa, gom theo ngày / tháng → tính theo **`Asia/Ho_Chi_Minh`** (backend: `settings.service.ts`, `admin/period.ts`, SQL `AT TIME ZONE`).
- Frontend hiển thị mọi ngày giờ theo giờ Việt Nam (`vnParts`, `formatDateTime` …), nên người xem ở nước ngoài hay server deploy chạy giờ UTC đều thấy đúng giờ của quán.

## Thông báo

- Đơn mới, khách huỷ đơn, món sắp hết, khách mới đăng ký, tin nhắn liên hệ → thông báo cho **mọi admin**.
- Admin đổi trạng thái đơn → thông báo cho **khách** của đơn đó.
- Thông báo đến **ngay** qua realtime (mục bên dưới). Frontend vẫn hỏi lại `GET /api/notifications` mỗi 5 phút làm dự phòng.

## Realtime (Socket.IO)

1. Đăng nhập xong, `SocketProvider` (`frontend/src/context/SocketContext.tsx`) xin vé `GET /api/auth/socket-token` (JWT `use: "socket"`, sống 2 phút) rồi mở Socket.IO **thẳng tới backend** (`NEXT_PUBLIC_SOCKET_URL`) — vì Vercel không chuyển tiếp WebSocket và cookie đăng nhập thuộc tên miền Vercel. Mỗi lần nối lại xin vé mới.
2. `realtime/socket.ts` kiểm tra vé + `token_version` → cho vào phòng `user:<id>`; admin vào thêm phòng `admins`. Vé realtime không dùng làm cookie đăng nhập được (và ngược lại).
3. Sự kiện: `notification:new` (người nhận thông báo), `order:new` (admin: đơn tiền mặt lúc đặt, đơn VNPay lúc trả xong), `order:updated` (admin + chủ đơn: đổi trạng thái, huỷ, thanh toán, hoàn tiền).
4. Thông báo / sự kiện tạo trong transaction được **xếp hàng** (`db/afterCommit.ts`), chỉ gửi sau `COMMIT`; `ROLLBACK` thì bỏ → không có "đơn mới ảo".
5. Giao diện: chuông thêm thông báo + toast (admin có đơn mới thì kêu "ting", tắt / bật bằng nút loa, lưu trong `localStorage`), trang **Đơn hàng** admin tải lại danh sách, **Đơn hàng của tôi** lấy lại đúng đơn vừa đổi. Mất mạng → tự nối lại, nối lại xong tải lại dữ liệu.

## Chia trang

- Khách: `GET /api/orders/my?limit=10&offset=0` → `{ data, total }`, nút "Xem thêm đơn cũ hơn" tăng `offset`.
- Admin: `GET /api/orders?page=1&pageSize=10&status=&search=` → `{ data, total, page, pageSize, summary }`.

## Chạy thật (deploy)

```
Trình duyệt → Vercel (Next.js, chuyển tiếp /api/*) → Cloudflare → bộ chia tải Render → Express (Render) → Neon (PostgreSQL)
                                                                                         └→ Cloudinary (ảnh)
```

- **Vercel** build thư mục `frontend`, biến `BACKEND_URL` (link Render) + `SITE_URL` (link web thật, cho sitemap / ảnh chia sẻ).
- **Render** build thư mục `backend` (`npm install --include=dev && npm run build`, chạy `npm start`), biến môi trường thay cho `.env`: `DATABASE_URL` (Neon, đường dẫn **trực tiếp** — bỏ `-pooler`), `DATABASE_SSL=true`, `NODE_ENV=production`, `JWT_SECRET`, `CLIENT_URL` (cũng là nguồn được phép mở Socket.IO), `TRUST_PROXY=4`, `DEMO_EMAILS`, mã Cloudinary.
- **Vercel** thêm `NEXT_PUBLIC_SOCKET_URL` = link Render (biến `NEXT_PUBLIC_` gắn lúc build → đổi xong phải deploy lại).
- **IP thật của khách:** đi qua 4 trạm → `TRUST_PROXY=4` (đo bằng `DEBUG_IP=true` ở `/api/health`). Gọi qua Vercel thì IP giả bị xoá; gọi thẳng link Render vẫn có thể giả IP.
- **Tài khoản demo** (`DEMO_EMAILS`): mật khẩu công khai trong README, bị khoá đổi mật khẩu / hồ sơ / xoá; gõ sai mật khẩu không khoá theo email.
- Push lên GitHub → Vercel + Render tự build lại. Thêm cột / bảng mới → chạy `db:setup` vào Neon (schema viết `IF NOT EXISTS`, không mất dữ liệu).

## Dữ liệu mẫu

- `npm run db:setup` = `schema.ts` (tạo / nâng cấp bảng) + `seed.ts` (45 món, 7 danh mục, 6 topping, 2 tài khoản mẫu).
- Ảnh món tải lên nằm trên **Cloudinary** (nếu đã điền mã) hoặc trong `backend/uploads/` (không đưa lên git).
- Khách demo, đơn hàng năm 2026, đánh giá... **chỉ có trong database trên máy**, không nằm trên GitHub.
