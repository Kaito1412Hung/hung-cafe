# Hưng Café — Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4. Dữ liệu lấy từ backend Node.js ở thư mục `../backend`.

## Chạy dự án

Chạy backend trước (xem `../backend/README.md`), sau đó:

```bash
npm install
cp .env.example .env.local   # BACKEND_URL=http://localhost:4000
npm run dev                  # http://localhost:3000
```

## Các trang

| URL               | Ai vào được  | Mô tả                                                      |
| ----------------- | ------------ | ---------------------------------------------------------- |
| `/`               | Mọi người    | Landing page: số liệu thật, món bán chạy, đăng ký nhận tin |
| `/menu`           | Mọi người    | Thực đơn: lọc danh mục, tìm kiếm, sắp xếp                  |
| `/menu/[slug]`    | Mọi người    | Chi tiết món (render ở server, SEO), chọn số lượng, món liên quan |
| `/cart`           | Đã đăng nhập | Giỏ hàng + form đặt hàng (COD)                             |
| `/orders`         | Đã đăng nhập | Đơn hàng của tôi: theo dõi trạng thái, huỷ đơn chờ xác nhận, mua lại |
| `/contact`        | Mọi người    | Form liên hệ + bản đồ, giờ mở cửa                          |
| `/account`        | Đã đăng nhập | Tài khoản của tôi: ảnh đại diện, tên hiển thị, hồ sơ, địa chỉ, mật khẩu, đăng xuất mọi thiết bị, xoá tài khoản |
| `/login`          | Mọi người    | Đăng nhập (admin → trang quản lý, khách → trang chủ)       |
| `/register`       | Mọi người    | Đăng ký tài khoản khách                                    |
| `/forgot-password`| Mọi người    | Quên mật khẩu: gửi yêu cầu cho quán                        |
| `/admin/products` | **Admin**    | CRUD sản phẩm, upload ảnh từ máy                          |
| `/admin/categories`| **Admin**   | Quản lý danh mục                                           |
| `/admin/dashboard`| **Admin**    | Tổng quan: doanh thu, biểu đồ theo ngày, món bán chạy, sắp hết hàng |
| `/admin/orders`   | **Admin**    | Quản lý đơn: lọc, tìm kiếm, xác nhận → giao → hoàn thành / huỷ |
| `/admin/customers`| **Admin**    | Khách hàng: lịch sử mua, tổng chi tiêu, phân quyền, xoá   |
| `/admin/contact`  | **Admin**    | Hộp thư liên hệ + danh sách đăng ký nhận tin (xuất CSV)   |
| `/admin/orders/[id]/invoice` | **Admin** | Hoá đơn in được / lưu PDF                          |
| `/admin/settings` | **Admin**    | Thông tin quán, giờ mở cửa & nhận đơn, mạng xã hội, phí giao hàng |
| `/admin/profile`  | **Admin**    | Hồ sơ của admin (giống `/account`, không có xoá tài khoản) |

## Cấu trúc thư mục

```
src/
├── app/
│   ├── (site)/            # Trang khách (Navbar + Footer)
│   ├── (auth)/            # Đăng nhập / đăng ký
│   └── admin/             # Khu quản lý (AdminGuard + Sidebar)
├── components/
│   ├── ui/                # Button, Modal, Toast, Switch...
│   ├── layout/            # Navbar, Footer, Logo, UserMenu
│   ├── auth/              # AuthForm
│   ├── home/ product/ admin/
├── context/AuthContext.tsx   # Người đang đăng nhập (useAuth)
├── context/CartContext.tsx   # Giỏ hàng + ngăn kéo giỏ hàng (useCart)
├── context/ShopSettingsContext.tsx # Thông tin quán + phí ship (useShopSettings)
├── hooks/useProducts.ts      # State + hàm CRUD sản phẩm
├── services/                 # productService, authService — gọi REST API
├── lib/api.ts                # Hàm fetch dùng chung + ApiError
└── types/
```

## Luồng dữ liệu

```
Component → hook / AuthContext → service → lib/api.ts → fetch("/api/...")
          → Next.js rewrites → Backend Express (localhost:4000) → PostgreSQL
```

Frontend gọi `/api/*` cùng domain, Next.js chuyển tiếp sang backend (xem `next.config.ts`).
Nhờ vậy cookie đăng nhập (`httpOnly`) hoạt động bình thường mà không cần cấu hình CORS phức tạp.
Khi deploy chỉ cần đặt biến `BACKEND_URL` trỏ tới địa chỉ backend thật.

## Lộ trình

1. ✅ **Mốc 1** — Giao diện CRUD với dữ liệu giả
2. ✅ **Mốc 2** — Backend Node.js + PostgreSQL, đăng nhập / đăng xuất, phân quyền admin & khách
3. ✅ **Giỏ hàng** — lưu theo tài khoản trong PostgreSQL
4. ✅ **Đơn hàng** — khách đặt hàng, admin xử lý đơn
5. ✅ **Admin đầy đủ** — Tổng quan, Khách hàng, Cài đặt, chuông thông báo (polling 30 giây)
6. ✅ **Tài khoản** — avatar, tên hiển thị, hồ sơ, địa chỉ tự điền khi đặt hàng, bảo mật
7. ✅ **Hoàn thiện cơ bản** — trang chi tiết món, quản lý danh mục, upload ảnh, quên mật khẩu, trang 404/lỗi
8. ✅ **Hoàn thiện cơ bản (2)** — form liên hệ, nhận tin, mạng xã hội, số liệu thật, favicon + ảnh chia sẻ, mua lại, giờ mở cửa chặn đặt hàng, thông báo cho khách, in hoá đơn
9. ⬜ **Mốc 3** — Thanh toán online, quên mật khẩu qua email, ảnh lưu trên Cloudinary
10. ⬜ **Mốc 4** — Test tự động, deploy
