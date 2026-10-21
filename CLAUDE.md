# Hưng Café — sổ tay cho Claude

Web bán cà phê / đồ uống: khách xem thực đơn, đặt hàng, theo dõi đơn; admin quản lý món, đơn, khách, mã giảm giá, thống kê.
Chủ project đang **học web cơ bản** → giải thích từng bước, dễ hiểu.

## Quy tắc làm việc (bắt buộc)

- **Luôn trả lời bằng tiếng Việt**, kể cả phần tóm tắt cuối và nút bấm.
- **Chưa kêu sửa thì không sửa code.** "Chỉ hỏi thôi" = chỉ trả lời (trả lời chi tiết vẫn được), không đụng file. Muốn xem trước giao diện → vẽ hình minh hoạ, không sửa code.
- Sửa xong phải **test lại cả chức năng cũ**, không để chức năng đã làm bị lỗi. Chạy `npm run typecheck` (backend), `npm run lint` + `npm run build` (frontend).
- **Test xong thì xoá dữ liệu test** mình tạo ra, đưa database về như trước: `npm run db:snapshot` trước khi test, `npm run db:restore -- <bản chụp> --yes` sau khi test (tự so đủ các bảng). Quy trình đầy đủ: skill `/test-roi-don`.
- **Không đọc file `.env`** (đã bị chặn trong `.claude/settings.json`). Cần database thì dùng các script trong `backend/scripts/` (tự đọc `.env`, không in mật khẩu). Gửi chữ tiếng Việt qua API bằng `fetch` trong Node, không dùng `curl` trong Git Bash (làm hỏng chữ có dấu).
- Tài khoản test của chủ project: khách **`kaito@gmail.com`**, admin **`kaitokid@gmail.com`**. Khi được nhờ "xoá phần tôi test" → liệt kê dữ liệu / thay đổi của 2 tài khoản này trước (`npm run test-accounts`), chủ project xác nhận rồi mới xoá; giữ lại tài khoản. Quy trình: skill `/xoa-du-lieu-test`.
- **Giữ nguyên dữ liệu demo** (10 khách demo, ~300 đơn năm 2026, đánh giá, mã CHAOBANMOI / GIAM10 / GIAM15K).
- **Không commit / push** khi chưa được kêu. Trước khi commit chạy `npm run check:secrets --prefix backend`, phải ✅. Không bao giờ commit `.env`. `HUONG-DAN-TEST.md` không đưa lên git (đã có trong `.gitignore`).
- **Không ghi mật khẩu trong chat** → chỉ chỗ: dòng `SEED_ADMIN_PASSWORD` / `SEED_CUSTOMER_PASSWORD` / `SEED_DEMO_PASSWORD` trong `backend/.env` (mật khẩu là phần sau dấu `=`).
- Làm / sửa chức năng theo skill `/them-chuc-nang` (giải thích + ví dụ → chờ duyệt → làm → test → tài liệu).
- Chức năng mới xong → bổ sung cách test vào `HUONG-DAN-TEST.md`, cuối mỗi phần có khối **📂 Code liên quan** liệt kê file đã thêm (ghi "(mới)") / sửa, để chủ project mở ra đọc.

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

Công cụ hỗ trợ (chạy trong `backend/`, code ở `backend/scripts/`):

| Lệnh | Tác dụng |
| --- | --- |
| `npm run db:snapshot [-- nhãn]` | Chụp database vào `backend/.db-snapshots/` (giữ 10 bản, không lên git). `-- --list` xem danh sách |
| `npm run db:compare [-- tên]` | So database hiện tại với bản chụp (mới nhất), từng bảng giống / khác |
| `npm run db:restore -- [tên] --yes` | Khôi phục bản chụp rồi tự so lại |
| `npm run test-accounts` | Liệt kê dữ liệu của 2 tài khoản test; `-- --clean --yes` để xoá (giữ tài khoản) |
| `npm run check:secrets` | Kiểm tra trước khi push: không file / giá trị bí mật nào sắp lên GitHub |

Skill (gõ `/tên`): `/test-roi-don`, `/xoa-du-lieu-test`, `/them-chuc-nang` — trong `.claude/skills/`.

Bộ đếm chống dò mật khẩu nằm trong bộ nhớ → khởi động lại backend là mở khoá.

## Bản đồ thư mục

```
backend/src/
├── app.ts / server.ts        # middleware + gắn route /api/*
├── db/schema.ts              # CREATE TABLE + nâng cấp cột (idempotent, chạy lại không hỏng)
├── db/seed.ts, seed-data.ts  # dữ liệu mẫu (45 món, 7 danh mục, topping)
├── middlewares/              # requireAuth, requireRole, validateBody, rateLimit, errorHandler
└── modules/<tên>/            # routes → controller → service (SQL) → schema (zod)
backend/scripts/              # chụp / khôi phục / so database, dữ liệu tài khoản test, kiểm tra bí mật
frontend/src/
├── app/(site)/               # trang khách: menu, cart, orders, account, favorites, contact, chinh-sach
├── app/(auth)/               # login, register, forgot-password
├── app/admin/                # trang quản trị
├── components/  hooks/  context/
├── services/                 # gọi API (mỗi module 1 file)
├── lib/                      # tiện ích (options.ts: size/đường/đá/topping)
└── types/
docs/                         # tài liệu: database, cách các phần nối với nhau
.claude/settings.json         # quyền của Claude: cấm đọc .env, lệnh được chạy sẵn / phải hỏi
.claude/skills/               # quy trình: test-roi-don, xoa-du-lieu-test, them-chuc-nang
```

Chi tiết API: `backend/README.md`. Chi tiết bảng: `docs/database.md`. Luồng chính: `docs/kien-truc.md`.

## Quy ước code

- Chữ trên giao diện và thông báo lỗi: **tiếng Việt có dấu**. Tên biến / hàm: tiếng Anh.
- Lỗi API luôn có dạng `{ message, errors? }` (dùng `AppError`).
- Thêm / sửa API → cập nhật `backend/src/docs/openapi.ts` (Swagger ở `/api/docs`), body dùng lại schema zod của route.
- Thêm cột / bảng: sửa `db/schema.ts` theo kiểu `IF NOT EXISTS` / khối `DO $$` để DB cũ nâng cấp được mà không mất dữ liệu.
- Ngày giờ: lưu `TIMESTAMPTZ`, tính và hiển thị theo giờ Việt Nam (`SHOP_TIME_ZONE`, `vnParts`, `vnDate` trong `frontend/src/lib/utils.ts`); không dùng `toLocaleString` / `getHours` không ghi múi giờ.
- Giá tiền là số nguyên (đồng). Đơn hàng lưu **bản chụp** tên + giá món / topping lúc đặt.
- Cột `products.has_options` là cột cũ, không dùng nữa → dùng `has_size`, `has_sugar`, `serve`, `allow_toppings`.
