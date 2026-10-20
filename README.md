# ☕ Hưng Café

Website đặt đồ uống cho một quán cà phê: khách xem thực đơn, chọn size / đường / đá / topping, đặt hàng và theo dõi đơn; chủ quán quản lý món, đơn hàng, khách hàng, mã giảm giá và xem thống kê doanh thu.

**Công nghệ:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Node.js · Express 5 · PostgreSQL

## Chức năng

**Khách hàng**
- Thực đơn 45 món / 7 danh mục, tìm món gõ không dấu (`ca phe` vẫn ra "Cà Phê")
- Mỗi món có lựa chọn riêng: size, mức đường, nóng hay đá, lượng đá, topping (tối đa 4), ghi chú
- Giỏ hàng, đặt hàng, chọn mã giảm giá từ danh sách (hoặc nhập mã bí mật)
- Chọn **giao tận nơi** hoặc **đến quán lấy** (không tính phí giao), **hẹn giờ nhận** trong hôm nay / ngày mai
- Theo dõi đơn: giờ của từng bước (đặt → xác nhận → giao → hoàn thành) + "Dự kiến giao lúc …"
- Huỷ đơn kèm lý do, mua lại đơn cũ, thông báo khi đơn đổi trạng thái
- Đánh giá món đã mua, món yêu thích, hồ sơ cá nhân + ảnh đại diện, đổi mật khẩu, đăng xuất mọi thiết bị

**Quản trị (admin)**
- Tổng quan: doanh thu, số đơn, món bán chạy theo 7 / 30 / 90 ngày hoặc cả năm (biểu đồ theo tháng), xuất báo cáo Excel
- Quản lý món (ảnh, tồn kho, lựa chọn của từng món), danh mục, topping
- Quản lý đơn hàng (chia trang, lọc, tìm kiếm, in hoá đơn), khách hàng, mã giảm giá
- Quản lý đánh giá: xem tất cả đánh giá, lọc theo số sao / món, tìm không dấu, xoá đánh giá không phù hợp
- Hộp thư liên hệ, danh sách nhận tin, thông báo đơn mới, cài đặt cửa hàng (giờ mở cửa, phí giao)

**Bảo mật cơ bản:** mật khẩu băm bcrypt, JWT trong cookie httpOnly, chống dò mật khẩu, giới hạn tần suất gửi form, helmet, kiểm tra dữ liệu bằng zod, đặt hàng trong transaction.

## Chạy trên máy

Cần cài: **Node.js 20+** và **PostgreSQL**.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env      # sửa DATABASE_URL (mật khẩu postgres) và JWT_SECRET
npm run db:setup          # tạo database, bảng và dữ liệu mẫu
npm run dev               # http://localhost:4000

# 2. Frontend (mở terminal khác)
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:3000
```

Tài khoản mẫu (admin + khách) lấy theo các biến `SEED_*` trong `backend/.env`.

## Cấu trúc

```
backend/    REST API — Express + PostgreSQL (SQL thuần)   → xem backend/README.md (danh sách API)
frontend/   Giao diện — Next.js App Router               → xem frontend/README.md
docs/       Tài liệu: cấu trúc database, luồng hoạt động chính
```

## Tài liệu

- [Danh sách API](backend/README.md#api)
- [Cấu trúc database](docs/database.md)
- [Các phần nối với nhau thế nào](docs/kien-truc.md)
