---
name: xoa-du-lieu-test
description: Dọn dữ liệu chủ project tạo ra khi tự test Hưng Café (tài khoản kaito@gmail.com / kaitokid@gmail.com) — LIỆT KÊ trước, chờ xác nhận rồi mới xoá, giữ lại 2 tài khoản. Dùng khi chủ project nói "xoá phần tôi test", "test xong rồi", "trả về như cũ", "xoá dữ liệu 2 tài khoản".
---

# Xoá dữ liệu test của chủ project

Quy tắc: **liệt kê → chờ chủ project xác nhận → mới xoá**. Giữ lại 2 tài khoản test và toàn bộ dữ liệu demo.
Chạy trong `backend/`. Không đọc file `.env`.

## Các bước

1. **Xem có bản chụp trước lúc chủ project test không**
   ```bash
   npm run db:snapshot -- --list
   ```

2. **Liệt kê thay đổi**
   - Có bản chụp lúc trước khi test → so toàn bộ database:
     ```bash
     npm run db:compare -- <tên bản chụp>
     ```
     Bảng nào KHÁC thì truy thêm bằng SQL (qua script Node, không in mật khẩu) để biết cụ thể: đơn nào, món nào đổi tồn kho, cài đặt nào đổi (giờ mở cửa, phí ship…).
   - Luôn chạy thêm để thấy dữ liệu của 2 tài khoản test:
     ```bash
     npm run test-accounts
     ```

3. **Báo cho chủ project** (tiếng Việt, dạng bảng): từng thay đổi + ai tạo ra. Thay đổi KHÔNG do 2 tài khoản test tạo ra thì nói rõ, hỏi có xoá không. Hỏi 1 câu: khôi phục / xoá hết như danh sách chứ?

4. **Chỉ khi chủ project đồng ý**, chọn 1 cách:
   - Có bản chụp trước khi test → khôi phục cả database (sạch nhất, trả cả tồn kho, cài đặt, giờ cập nhật):
     ```bash
     npm run db:restore -- <tên bản chụp> --yes
     ```
   - Không có bản chụp → chỉ xoá dữ liệu của 2 tài khoản test (trả lại tồn kho + lượt mã giảm giá của đơn chưa huỷ, xoá thông báo liên quan, xoá thông tin hồ sơ đã điền):
     ```bash
     npm run test-accounts -- --clean --yes
     ```
     Thay đổi do admin sửa món / mã / cài đặt thì cách này không trả lại được → báo chủ project.

5. **Kiểm tra lại**: `npm run test-accounts` phải ra `✅ 2 tài khoản đang sạch như mới tạo.` (và `db:compare` ra đủ bảng giống nếu đã khôi phục).

6. **Báo kết quả**: đã xoá gì, còn gì, 2 tài khoản vẫn giữ.
