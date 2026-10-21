---
name: test-roi-don
description: Test Hưng Café một cách an toàn rồi trả database về như cũ — chụp database trước, test (API + giao diện + chức năng cũ), khôi phục và so đủ các bảng. Dùng khi cần test chức năng mới / test lại trước khi push, hoặc chủ project nói "test lại", "test kĩ", "test xong xoá".
---

# Test rồi dọn dữ liệu

Mục tiêu: test thoải mái nhưng **database phải về đúng như trước khi test** (giữ dữ liệu demo, giữ 2 tài khoản test).
Mọi lệnh chạy trong `backend/` (hoặc thêm `--prefix backend`). Không đọc file `.env` — các script tự đọc.

## Các bước

1. **Chụp database trước khi đụng vào bất cứ thứ gì**
   ```bash
   npm run db:snapshot -- truoc-test
   ```
   Ghi lại tên bản chụp in ra (VD `2026-10-21_093751_truoc-test.dump`).

2. **Kiểm tra code**
   - Backend: `npm run typecheck`
   - Frontend: `npm run lint` rồi `npm run build`
   Có lỗi → sửa trước khi test tiếp.

3. **Test chức năng**
   - Dùng tài khoản test: khách `kaito@gmail.com`, admin `kaitokid@gmail.com` (mật khẩu chủ project đã cho trong chat — không ghi vào file).
   - Viết script test tạm trong thư mục scratchpad (không để trong project), gọi API ở `http://localhost:4000/api`.
   - Test **cả chức năng cũ** liên quan (đặt hàng, giỏ hàng, mã giảm giá, chia trang, thông báo…), không chỉ chức năng mới.
   - Ngoài giờ mở cửa thì tạm sửa giờ trong Cài đặt bằng API admin để đặt hàng được (bước 5 sẽ trả lại).
   - Gửi chữ tiếng Việt bằng `fetch` trong Node, **không dùng `curl` trong Git Bash** (làm hỏng chữ có dấu).
   - Xem giao diện bằng trình duyệt có sẵn: trang chính, trên máy tính và điện thoại (375px), không tràn ngang.

4. **Sửa lỗi nếu có**, chạy lại bước 2–3. Phân biệt rõ: lỗi của web hay lỗi do bài test viết sai.

5. **Trả database về như cũ**
   ```bash
   npm run db:restore -- <tên bản chụp ở bước 1> --yes
   ```
   Script tự so lại: phải thấy `✅ Cả 14 bảng đều giống bản chụp.` Nếu bảng nào khác → báo chủ project, không tự bỏ qua.

6. **Dọn file tạm**: xoá script test trong scratchpad.

7. **Báo cáo** (tiếng Việt): bao nhiêu mục đạt / lỗi, đã sửa gì, database đã về như cũ chưa. **Không commit / push** nếu chưa được kêu.

## Lưu ý
- Nếu chủ project đang tự test thì KHÔNG khôi phục khi chưa được đồng ý — dùng skill `xoa-du-lieu-test`.
- `db:restore` xoá mọi thay đổi sau lúc chụp, kể cả dữ liệu thật — chỉ dùng bản chụp vừa tạo ở bước 1.
