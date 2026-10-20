# Cấu trúc database (PostgreSQL)

Tạo / nâng cấp bằng `npm run db:setup` (file `backend/src/db/schema.ts`). Chạy lại nhiều lần vẫn an toàn: bảng và cột có rồi thì bỏ qua, dữ liệu cũ giữ nguyên.

```
users ─┬─< orders ──< order_items >── products >── categories
       ├─< cart_items >──────────────── products
       ├─< reviews >─────────────────── products
       ├─< favorites >───────────────── products
       ├─< notifications
       └─< contact_messages
toppings · coupons · settings · newsletter_subscribers   (bảng đứng riêng)
```
`A ─< B` = một A có nhiều B.

## Các bảng

| Bảng | Lưu gì | Cột đáng chú ý |
| --- | --- | --- |
| `users` | Tài khoản admin + khách | `role` (`admin` / `customer`), `password_hash` (bcrypt), `token_version` (tăng lên → mọi phiên đăng nhập cũ hết hạn), hồ sơ: `nickname, avatar, phone, address, birthday, gender` |
| `categories` | Danh mục món | `slug` (VD `coffee`, `milktea`), `sort_order` |
| `products` | Món | `slug` (đường dẫn đẹp), `price`, `stock`, `is_available`, `is_best_seller`, lựa chọn của món: `has_size`, `has_sugar`, `serve`, `allow_toppings` |
| `toppings` | Topping (trân châu, thạch...) | `price`, `is_available`, `sort_order` |
| `cart_items` | Giỏ hàng, mỗi dòng = 1 món + 1 bộ lựa chọn | `size, sugar, ice, temp, toppings, note`, `quantity` (1–99) |
| `orders` | Đơn hàng | `status`, `subtotal`, `shipping_fee`, `discount`, `total`, `coupon_code`, `cancel_reason`, thông tin giao: `customer_name, phone, address, note`, giờ từng bước: `confirmed_at, shipping_at, completed_at, cancelled_at` (NULL = chưa tới bước đó), `fulfillment` (`delivery` giao tận nơi / `pickup` đến quán lấy), `scheduled_at` (giờ hẹn, NULL = càng sớm càng tốt) |
| `order_items` | Món trong đơn | **Bản chụp lúc đặt:** `product_name`, `product_image`, `unit_price`, `toppings` (JSON tên + giá) → sau này sửa / xoá món thì đơn cũ không đổi |
| `coupons` | Mã giảm giá | `type` (`percent` / `fixed`), `value`, `max_discount`, `min_order`, `usage_limit`, `used_count`, `first_order_only`, `starts_at`, `expires_at`, `is_active`, `is_public` (false = mã bí mật, không hiện trong danh sách) |
| `reviews` | Đánh giá món | `rating` (1–5), `comment` — mỗi khách 1 đánh giá / món, chỉ khi đã nhận món |
| `favorites` | Món yêu thích | khoá chính = (`user_id`, `product_id`) |
| `notifications` | Thông báo | `type` (đơn mới, đổi trạng thái, sắp hết hàng...), `link` (bấm vào mở trang nào), `is_read` |
| `contact_messages` | Tin nhắn form liên hệ | `is_read` |
| `newsletter_subscribers` | Email đăng ký nhận tin | `email` (không trùng) |
| `settings` | Cài đặt cửa hàng | dạng `key` → `value` (JSONB): tên quán, giờ mở cửa, phí giao, mạng xã hội, `prepMinutes` / `deliveryMinutes` (tính giờ dự kiến giao) |

## Lựa chọn của từng món

| Cột | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `has_size` | true / false | Có chọn size S / M / L |
| `has_sugar` | true / false | Có chọn mức đường |
| `serve` | `none` | Không hỏi nóng / đá (đồ ăn) |
| | `cold` | Chỉ uống đá → hỏi lượng đá |
| | `hot` | Chỉ uống nóng → không hỏi đá |
| | `both` | Khách chọn nóng hoặc đá (đá thì mới hỏi lượng đá) |
| `allow_toppings` | true / false | Được thêm topping (tối đa 4) |

`products.has_options` là cột cũ, giữ lại cho DB cũ nâng cấp được, **không dùng nữa**.

## Trạng thái đơn hàng

`pending` (Chờ xác nhận) → `confirmed` (Đã xác nhận) → `shipping` (Đang giao) → `completed` (Hoàn thành)

`cancelled` (Đã huỷ): khách tự huỷ khi còn "Chờ xác nhận", admin huỷ khi chưa giao (bắt buộc ghi lý do). Huỷ đơn thì trả lại tồn kho.

Đơn **đến quán lấy** dùng chung các trạng thái nhưng hiện tên khác: `shipping` = "Chờ khách lấy" (đã pha xong), `completed` = "Khách đã lấy".

Mỗi lần đổi trạng thái, backend ghi giờ vào cột tương ứng (`confirmed_at`, `shipping_at`, `completed_at`, `cancelled_at`). Đơn tạo trước khi có các cột này được điền giờ ước lượng 1 lần lúc nâng cấp.
