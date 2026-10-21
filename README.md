<div align="center">

# ☕ Hưng Café

**Website đặt đồ uống cho quán cà phê.** Khách xem thực đơn, chọn size / đường / đá / topping, đặt hàng, thanh toán VNPay và theo dõi đơn từng bước. Chủ quán quản lý món, đơn hàng, khách hàng, mã giảm giá và xem thống kê doanh thu.

![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![VNPay](https://img.shields.io/badge/VNPay-005BAA)

![Trang chủ Hưng Café](docs/images/trang-chu.png)

</div>

<!-- Quay xong GIF demo thì bỏ dấu chú thích ở dòng dưới:
![Demo: khách đặt món → admin xác nhận → khách thấy đơn đổi trạng thái](docs/images/demo.gif)
-->

## ✨ Điểm nổi bật

- **Thanh toán VNPay an toàn:** ký và kiểm tra chữ ký **HMAC-SHA512**. Sửa số tiền trên link là bị từ chối. Cùng một giao dịch báo về 2 lần cũng chỉ ghi nhận 1 lần (khoá dòng trong transaction). Đơn quá **15 phút** chưa trả thì tự huỷ và trả lại kho. Khách trả muộn sau khi đơn đã huỷ thì đơn chuyển sang "cần hoàn tiền".
- **Không bán quá số lượng:** đặt hàng chạy trong **transaction** có khoá dòng (`FOR UPDATE`). Tồn kho và lượt dùng mã giảm giá luôn đúng, kể cả khi nhiều người đặt cùng lúc.
- **Đơn hàng lưu "bản chụp":** tên và giá món / topping được lưu lại lúc đặt, nên sau này quán đổi giá thì đơn cũ vẫn đúng.
- **Bảo mật:** mật khẩu băm bcrypt, JWT trong **cookie httpOnly**, thu hồi phiên ("đăng xuất mọi thiết bị"), chống dò mật khẩu, giới hạn tần suất gửi form, helmet, kiểm tra mọi dữ liệu gửi lên bằng **zod**.
- **SQL thuần, không ORM:** tự viết truy vấn bằng `pg`. Schema nâng cấp được nhiều lần (`IF NOT EXISTS`, khối `DO $$`) mà không mất dữ liệu cũ.
- **Giờ Việt Nam ở mọi nơi:** lưu `TIMESTAMPTZ`, tính và hiển thị theo `Asia/Ho_Chi_Minh` (đơn hàng, thống kê, file Excel), máy chủ đặt ở múi giờ nào cũng đúng.
- **Thống kê cho chủ quán:** doanh thu theo 7 / 30 / 90 ngày hoặc cả năm theo tháng, món bán chạy, xuất báo cáo **Excel**.

## 📸 Hình ảnh

| Thực đơn | Chi tiết món (size, đường, đá, topping) |
| :---: | :---: |
| ![Thực đơn](docs/images/thuc-don.png) | ![Chi tiết món](docs/images/chi-tiet-mon.png) |
| **Giỏ hàng** | **Đơn của tôi: giờ của từng bước** |
| ![Giỏ hàng](docs/images/gio-hang.png) | ![Đơn của tôi](docs/images/don-cua-toi.png) |
| **Admin: tổng quan & thống kê** | **Admin: quản lý đơn hàng** |
| ![Admin tổng quan](docs/images/admin-tong-quan.png) | ![Admin đơn hàng](docs/images/admin-don-hang.png) |

<details>
<summary>📱 Giao diện trên điện thoại</summary>
<br>
<img src="docs/images/dien-thoai-thuc-don.png" alt="Thực đơn trên điện thoại" width="300">
</details>

## 🏗️ Kiến trúc

```mermaid
flowchart LR
    U["👤 Khách / Admin<br/>(trình duyệt)"] --> F["Frontend<br/>Next.js 16 · React 19<br/>Tailwind CSS"]
    F -- "/api/* (cookie JWT)" --> B["Backend<br/>Express 5 · TypeScript<br/>zod · helmet"]
    B -- "SQL thuần (pg)" --> D[("PostgreSQL")]
    B -- "link thanh toán có chữ ký" --> V["VNPay"]
    V -- "kết quả (return + IPN)" --> B
```

Backend chia theo module: `routes → controller → service (SQL) → schema (zod)`. Luồng chi tiết (đặt hàng, VNPay, thống kê) xem ở [docs/kien-truc.md](docs/kien-truc.md).

## 🧩 Chức năng

**Khách hàng**
- Thực đơn 45 món / 7 danh mục, tìm món gõ không dấu (`ca phe` vẫn ra "Cà Phê")
- Mỗi món có lựa chọn riêng: size, mức đường, nóng hay đá, lượng đá, topping (tối đa 4), ghi chú
- Giỏ hàng, đặt hàng, chọn mã giảm giá từ danh sách (hoặc nhập mã bí mật)
- Thanh toán **tiền mặt khi nhận** hoặc **VNPay** (kiểm tra chữ ký, tự huỷ đơn quá 15 phút chưa trả, hoàn tiền khi huỷ đơn đã trả)
- Chọn **giao tận nơi** hoặc **đến quán lấy** (không tính phí giao), **hẹn giờ nhận** trong hôm nay / ngày mai
- Theo dõi đơn: giờ của từng bước (đặt → xác nhận → giao → hoàn thành) + "Dự kiến giao lúc …"
- Huỷ đơn kèm lý do, mua lại đơn cũ, thông báo khi đơn đổi trạng thái
- Đánh giá món đã mua, món yêu thích, hồ sơ cá nhân + ảnh đại diện, đổi mật khẩu, đăng xuất mọi thiết bị

**Quản trị (admin)**
- Tổng quan: doanh thu, số đơn, món bán chạy theo 7 / 30 / 90 ngày hoặc cả năm (biểu đồ theo tháng), xuất báo cáo Excel
- Quản lý món (ảnh, tồn kho, lựa chọn của từng món), danh mục, topping
- Quản lý đơn hàng (chia trang, lọc, tìm kiếm, in hoá đơn, ghi nhận hoàn tiền), khách hàng, mã giảm giá
- Quản lý đánh giá: xem tất cả đánh giá, lọc theo số sao / món, tìm không dấu, xoá đánh giá không phù hợp
- Hộp thư liên hệ, danh sách nhận tin, thông báo đơn mới, cài đặt cửa hàng (giờ mở cửa, phí giao)

## 🚀 Chạy trên máy

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

Muốn bật VNPay: đăng ký tài khoản sandbox tại [sandbox.vnpayment.vn](https://sandbox.vnpayment.vn/devreg/), điền `VNP_TMN_CODE` và `VNP_HASH_SECRET` vào `backend/.env`. Không điền thì web chỉ có thanh toán tiền mặt.

## 📁 Cấu trúc

```
backend/    REST API — Express + PostgreSQL (SQL thuần)   → xem backend/README.md (danh sách API)
frontend/   Giao diện — Next.js App Router               → xem frontend/README.md
docs/       Tài liệu: cấu trúc database, luồng hoạt động chính, hình ảnh
```

## 📚 Tài liệu

- [Danh sách API](backend/README.md#api)
- [Cấu trúc database](docs/database.md)
- [Các phần nối với nhau thế nào](docs/kien-truc.md)

## 🗺️ Dự định phát triển

- [ ] Deploy lên mạng + tài khoản demo để xem thử
- [ ] Tài liệu API bằng Swagger (`/api/docs`)
- [ ] Test tự động (Jest cho backend, Playwright cho giao diện)
- [ ] Realtime bằng Socket.IO: admin thấy đơn mới ngay, khách thấy đơn đổi trạng thái không cần tải lại
- [ ] CI/CD bằng GitHub Actions
- [ ] App mobile (React Native)
