---
name: them-chuc-nang
description: Quy trình thêm hoặc sửa một chức năng cho Hưng Café theo cách chủ project muốn — giải thích + ví dụ trước, chờ duyệt, làm, test cả chức năng cũ, xoá dữ liệu test, ghi hướng dẫn test kèm file code. Dùng khi chủ project nhờ làm / sửa / thêm một chức năng, hoặc hỏi ý tưởng một chức năng mới.
---

# Thêm / sửa một chức năng

Chủ project đang học web: hỏi kĩ, muốn hiểu trước khi làm, và tự test lại. Viết mọi thứ bằng tiếng Việt.

## 1. Trước khi làm (KHÔNG sửa code ở bước này)
- Đọc `CLAUDE.md`, `docs/kien-truc.md`, `docs/database.md` phần liên quan.
- Giải thích bằng lời dễ hiểu: **hiện tại thế nào → sau khi làm thế nào**, kèm **ví dụ cụ thể** và hình minh hoạ chữ (khung, bảng).
- Nêu rõ: đụng tới những file nào, có thêm cột / bảng không, có ảnh hưởng chức năng cũ không.
- Nói thật nếu chức năng **không cần thiết** hoặc có cách đơn giản hơn. Chủ project từng bỏ: lịch nghỉ / ngày lễ, lọc thực đơn theo giá, sửa đơn, món vừa xem, lịch sử tồn kho — đừng gợi ý lại nếu không được hỏi.
- Có chỗ cần chủ project chọn → hỏi (tối đa vài câu ngắn). **Chờ duyệt** rồi mới làm. "Chỉ hỏi thôi" = chỉ trả lời, không làm.

## 2. Làm
- Chụp database trước: `npm run db:snapshot -- truoc-lam` (trong `backend/`).
- Theo quy ước trong `CLAUDE.md`: SQL thuần, thêm cột bằng `IF NOT EXISTS` trong `db/schema.ts`, lỗi API dạng `{ message, errors }`, tiền là số nguyên, ngày giờ theo giờ Việt Nam (`vnParts`, `vnDate`), chữ giao diện tiếng Việt có dấu.
- Đổi database → chạy `npm run db:setup` rồi **chụp lại** (`npm run db:snapshot -- sau-nang-cap`) để lúc khôi phục không mất phần nâng cấp.
- Viết code giống code xung quanh (cách đặt tên, chú thích).

## 3. Test — dùng skill `test-roi-don`
- Typecheck, lint, build; test API cho chức năng mới **và các chức năng cũ liên quan**; xem giao diện trên máy tính + điện thoại.
- Khôi phục database về bản chụp ở bước 2 (hoặc `sau-nang-cap` nếu có nâng cấp database), so đủ các bảng.

## 4. Ghi tài liệu
- `HUONG-DAN-TEST.md`: thêm **Phần mới** trước mục "Mẹo khi test" — các bước test dạng `- [ ]` có kết quả mong đợi, dùng 2 tài khoản test. Cuối phần thêm khối:
  ```
  > 📂 **Code liên quan** (mở để đọc):
  > - <việc gì>: `đường/dẫn/file.ts` (mới) — tên hàm chính nếu file lớn
  ```
  Kiểm tra mọi đường dẫn ghi vào đều tồn tại thật.
- Cập nhật nếu liên quan: `README.md` (chức năng), `docs/database.md` (bảng / cột), `docs/kien-truc.md` (luồng chạy), `backend/README.md` (API), `CLAUDE.md` (quy ước mới).

## 5. Kết thúc
- Báo cáo ngắn: làm gì, test bao nhiêu mục đạt, đã xoá dữ liệu test, cách tự test ở Phần mấy.
- **Không commit / push** cho tới khi chủ project kêu. Khi được kêu: chạy `npm run check:secrets` trước, phải ✅ mới commit.
- Chủ project test xong không ưng → gỡ sạch thay đổi (git checkout các file, xoá file mới, bỏ phần tài liệu) rồi kiểm tra build lại.
