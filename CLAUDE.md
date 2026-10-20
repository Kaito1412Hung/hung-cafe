# Hưng Café — sổ tay cho Claude

Web bán cà phê / đồ uống: khách xem thực đơn, đặt hàng, theo dõi đơn; admin quản lý món, đơn, khách, mã giảm giá, thống kê.
Chủ project đang **học web cơ bản** → giải thích từng bước, dễ hiểu.

## Quy tắc làm việc (bắt buộc)

- **Luôn trả lời bằng tiếng Việt**, kể cả phần tóm tắt cuối và nút bấm.
- **Chưa kêu sửa thì không sửa code.** "Chỉ hỏi thôi" = chỉ trả lời (trả lời chi tiết vẫn được), không đụng file. Muốn xem trước giao diện → vẽ hình minh hoạ, không sửa code.
- Sửa xong phải **test lại cả chức năng cũ**, không để chức năng đã làm bị lỗi. Chạy `npm run typecheck` (backend), `npm run lint` + `npm run build` (frontend).
- **Test xong thì xoá dữ liệu test** mình tạo ra, đưa database về như trước (snapshot bằng `pg_dump -Fc` trước khi test, `pg_restore --clean` sau khi test).
- Tài khoản test của chủ project: khách **`kaito@gmail.com`**, admin **`kaitokid@gmail.com`**. Khi được nhờ "xoá phần tôi test" → liệt kê dữ liệu / thay đổi của 2 tài khoản này trước, chủ project xác nhận rồi mới xoá; giữ lại tài khoản.
- **Giữ nguyên dữ liệu demo** (10 khách demo, ~300 đơn năm 2026, đánh giá, mã CHAOBANMOI / GIAM10 / GIAM15K).
- **Không commit / push** khi chưa được kêu. Không bao giờ commit `.env`. `HUONG-DAN-TEST.md` không đưa lên git (đã có trong `.gitignore`).
- **Không ghi mật khẩu trong chat** → chỉ chỗ: dòng `SEED_ADMIN_PASSWORD` / `SEED_CUSTOMER_PASSWORD` / `SEED_DEMO_PASSWORD` trong `backend/.env` (mật khẩu là phần sau dấu `=`).
- Chức năng mới xong → bổ sung cách test vào `HUONG-DAN-TEST.md`.

## Công nghệ

| Phần | Dùng gì |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, lucide-react |
| Backend | Node.js, Express 5, TypeScript, zod v4 (kiểm tra dữ liệu), JWT trong cookie httpOnly, bcryptjs, helmet, exceljs |
| Database | PostgreSQL, viết **SQL thuần** bằng thư viện `pg` (không dùng ORM) |

## Chạy project

Dev server khai báo trong `.claude/launch.json`: `backend` (cổng 4000) và `frontend` (cổng 3000) → Claude chạy bằng `preview_start`.

```bash
npm run dev --prefix backend     # http://localhost:4000
npm run dev --prefix frontend    # http://localhost:3000 (chuyển tiếp /api/* sang backend)
npm run db:setup --prefix backend  # tạo DB + bảng + dữ liệu mẫu (chạy lại nhiều lần vẫn an toàn)
```

Bộ đếm chống dò mật khẩu nằm trong bộ nhớ → khởi động lại backend là mở khoá.

## Bản đồ thư mục

```
backend/src/
├── app.ts / server.ts        # middleware + gắn route /api/*
├── db/schema.ts              # CREATE TABLE + nâng cấp cột (idempotent, chạy lại không hỏng)
├── db/seed.ts, seed-data.ts  # dữ liệu mẫu (45 món, 7 danh mục, topping)
├── middlewares/              # requireAuth, requireRole, validateBody, rateLimit, errorHandler
└── modules/<tên>/            # routes → controller → service (SQL) → schema (zod)
frontend/src/
├── app/(site)/               # trang khách: menu, cart, orders, account, favorites, contact, chinh-sach
├── app/(auth)/               # login, register, forgot-password
├── app/admin/                # trang quản trị
├── components/  hooks/  context/
├── services/                 # gọi API (mỗi module 1 file)
├── lib/                      # tiện ích (options.ts: size/đường/đá/topping)
└── types/
docs/                         # tài liệu: database, cách các phần nối với nhau
```

Chi tiết API: `backend/README.md`. Chi tiết bảng: `docs/database.md`. Luồng chính: `docs/kien-truc.md`.

## Quy ước code

- Chữ trên giao diện và thông báo lỗi: **tiếng Việt có dấu**. Tên biến / hàm: tiếng Anh.
- Lỗi API luôn có dạng `{ message, errors? }` (dùng `AppError`).
- Thêm cột / bảng: sửa `db/schema.ts` theo kiểu `IF NOT EXISTS` / khối `DO $$` để DB cũ nâng cấp được mà không mất dữ liệu.
- Giá tiền là số nguyên (đồng). Đơn hàng lưu **bản chụp** tên + giá món / topping lúc đặt.
- Cột `products.has_options` là cột cũ, không dùng nữa → dùng `has_size`, `has_sugar`, `serve`, `allow_toppings`.
