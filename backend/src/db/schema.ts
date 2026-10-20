/** Cấu trúc bảng. "IF NOT EXISTS" giúp chạy lại nhiều lần không bị lỗi */
export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Thông tin hồ sơ thêm sau (ADD COLUMN IF NOT EXISTS: chạy lại không lỗi, dữ liệu cũ giữ nguyên)
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(50)  NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar   TEXT         NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone    VARCHAR(20)  NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS address  VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender   VARCHAR(10)  NOT NULL DEFAULT ''
  CHECK (gender IN ('', 'male', 'female', 'other'));
-- Tăng số này để vô hiệu hoá mọi token cũ ("đăng xuất khỏi tất cả thiết bị")
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Danh mục món. "slug" là mã cố định (dùng trong URL / sản phẩm), "name" là tên hiển thị đổi được
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  slug       VARCHAR(50) NOT NULL UNIQUE,
  name       VARCHAR(50) NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO categories (slug, name, sort_order) VALUES
  ('coffee', 'Cà phê', 1), ('tea', 'Trà', 2), ('milktea', 'Trà sữa', 3), ('freeze', 'Đá xay & Soda', 4),
  ('juice', 'Nước ép & Sinh tố', 5), ('cake', 'Bánh ngọt', 6), ('snack', 'Đồ ăn nhẹ', 7)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(60)  NOT NULL,
  description    VARCHAR(200) NOT NULL DEFAULT '',
  price          INTEGER      NOT NULL CHECK (price >= 0),
  category       VARCHAR(50)  NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE,
  image          TEXT         NOT NULL DEFAULT '',
  stock          INTEGER      NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_available   BOOLEAN      NOT NULL DEFAULT TRUE,
  is_best_seller BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Nâng cấp DB cũ: bỏ danh sách danh mục cố định (CHECK), thay bằng khoá ngoại tới bảng categories
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ALTER COLUMN category TYPE VARCHAR(50);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_fkey') THEN
    ALTER TABLE products ADD CONSTRAINT products_category_fkey
      FOREIGN KEY (category) REFERENCES categories(slug) ON UPDATE CASCADE;
  END IF;
END $$;

-- Đường dẫn đẹp cho trang chi tiết: /menu/ca-phe-sua-da (giá trị được điền ở bước setup)
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Mỗi dòng = 1 món trong giỏ của 1 người. Xoá user/sản phẩm thì dòng giỏ hàng tự xoá theo (CASCADE)
CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER     NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- Đơn hàng. Lưu sẵn tổng tiền tại thời điểm đặt (giá sản phẩm sau này đổi cũng không ảnh hưởng)
CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  address       VARCHAR(255) NOT NULL,
  note          VARCHAR(255) NOT NULL DEFAULT '',
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')),
  subtotal      INTEGER      NOT NULL CHECK (subtotal >= 0),
  shipping_fee  INTEGER      NOT NULL CHECK (shipping_fee >= 0),
  total         INTEGER      NOT NULL CHECK (total >= 0),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Món trong đơn: chụp lại tên / giá / ảnh lúc đặt ("snapshot") để admin sửa hay xoá sản phẩm thì đơn cũ vẫn đúng
CREATE TABLE IF NOT EXISTS order_items (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER      NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER      REFERENCES products(id) ON DELETE SET NULL,
  product_name  VARCHAR(60)  NOT NULL,
  product_image TEXT         NOT NULL DEFAULT '',
  unit_price    INTEGER      NOT NULL CHECK (unit_price >= 0),
  quantity      INTEGER      NOT NULL CHECK (quantity > 0),
  line_total    INTEGER      NOT NULL CHECK (line_total >= 0)
);

-- Cài đặt dạng key → value (JSONB): linh hoạt, thêm trường mới không cần sửa bảng
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(50) PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thông báo: mỗi người nhận 1 dòng → trạng thái đã đọc riêng cho từng admin
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(30)  NOT NULL,
  title      VARCHAR(120) NOT NULL,
  message    VARCHAR(255) NOT NULL DEFAULT '',
  link       VARCHAR(255) NOT NULL DEFAULT '',
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Danh sách loại thông báo (xoá rồi tạo lại để thêm loại mới cho DB cũ)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_order', 'order_cancelled', 'low_stock', 'new_customer', 'password_reset', 'order_status', 'contact_message', 'new_review'));

-- Tin nhắn khách gửi từ trang Liên hệ (khách vãng lai cũng gửi được → user_id có thể NULL)
CREATE TABLE IF NOT EXISTS contact_messages (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  phone      VARCHAR(20)  NOT NULL DEFAULT '',
  subject    VARCHAR(120) NOT NULL DEFAULT '',
  message    TEXT         NOT NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Email đăng ký nhận tin khuyến mãi (ô "Giảm 20% cho đơn đầu tiên" ở trang chủ)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

/* ---------- Tuỳ chọn món: size / đường / đá / ghi chú ---------- */
-- Món nào có chọn size/đường/đá (bánh thì không). Lần đầu thêm cột: tắt sẵn cho danh mục bánh
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'has_options') THEN
    ALTER TABLE products ADD COLUMN has_options BOOLEAN NOT NULL DEFAULT TRUE;
    UPDATE products SET has_options = FALSE WHERE category = 'cake';
  END IF;
END $$;

-- Cùng 1 món nhưng khác size / đường / đá / ghi chú → là 2 dòng khác nhau trong giỏ
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS size  VARCHAR(1)   NOT NULL DEFAULT '';
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS sugar VARCHAR(4)   NOT NULL DEFAULT '';
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS ice   VARCHAR(10)  NOT NULL DEFAULT '';
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS note  VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_line ON cart_items(user_id, product_id, size, sugar, ice, note);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size  VARCHAR(1)   NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sugar VARCHAR(4)   NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS ice   VARCHAR(10)  NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note  VARCHAR(100) NOT NULL DEFAULT '';

/* ---------- Tuỳ chọn riêng từng món + topping ---------- */
-- has_size / has_sugar: có chọn size / mức đường không
-- serve: 'none' (đồ ăn) | 'cold' (chỉ đá) | 'hot' (chỉ nóng) | 'both' (khách chọn nóng hoặc đá)
-- allow_toppings: có cho thêm topping không (trà sữa...)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'serve') THEN
    ALTER TABLE products ADD COLUMN has_size BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE products ADD COLUMN has_sugar BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE products ADD COLUMN serve VARCHAR(5) NOT NULL DEFAULT 'cold' CHECK (serve IN ('none', 'cold', 'hot', 'both'));
    ALTER TABLE products ADD COLUMN allow_toppings BOOLEAN NOT NULL DEFAULT FALSE;
    -- Lần đầu: chuyển từ cột cũ has_options, rồi chỉnh các món nóng / nóng-đá có sẵn
    UPDATE products SET has_size = has_options, has_sugar = has_options, serve = CASE WHEN has_options THEN 'cold' ELSE 'none' END;
    UPDATE products SET serve = 'hot', has_size = FALSE WHERE slug IN ('espresso', 'pour-over-cau-dat');
    UPDATE products SET serve = 'hot' WHERE slug IN ('tra-gung-mat-ong', 'tra-o-long-nong');
    UPDATE products SET serve = 'both' WHERE slug IN ('americano', 'caffe-latte', 'cappuccino', 'flat-white', 'ca-phe-trung', 'matcha-latte');
    UPDATE products SET allow_toppings = TRUE WHERE category = 'milktea';
  END IF;
END $$;

-- Danh sách topping (giá cộng thêm vào mỗi phần)
CREATE TABLE IF NOT EXISTS toppings (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(50) NOT NULL UNIQUE,
  price        INTEGER     NOT NULL CHECK (price >= 0),
  is_available BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO toppings (name, price, sort_order) VALUES
  ('Trân châu đen', 8000, 1), ('Trân châu trắng', 8000, 2), ('Thạch dừa', 6000, 3),
  ('Thạch cà phê', 6000, 4), ('Pudding trứng', 10000, 5), ('Kem cheese', 12000, 6)
ON CONFLICT (name) DO NOTHING;

-- Giỏ: nóng/đá + topping (mã topping, sắp xếp tăng dần, VD "1,5") → khác topping là dòng khác
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS temp     VARCHAR(4)   NOT NULL DEFAULT '';
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS toppings VARCHAR(100) NOT NULL DEFAULT '';
DROP INDEX IF EXISTS idx_cart_items_line;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_line_v2 ON cart_items(user_id, product_id, size, sugar, temp, ice, toppings, note);

-- Đơn: chụp lại topping lúc đặt [{ id, name, price }] (topping đổi giá / bị xoá thì đơn cũ vẫn đúng)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS temp     VARCHAR(4) NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS toppings JSONB      NOT NULL DEFAULT '[]';

/* ---------- Mã giảm giá ---------- */
CREATE TABLE IF NOT EXISTS coupons (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(30)  NOT NULL UNIQUE,  -- luôn lưu chữ IN HOA
  description      VARCHAR(150) NOT NULL DEFAULT '',
  type             VARCHAR(10)  NOT NULL CHECK (type IN ('percent', 'fixed')),
  value            INTEGER      NOT NULL CHECK (value > 0),  -- % hoặc số tiền
  max_discount     INTEGER      CHECK (max_discount > 0),    -- giảm tối đa (cho loại %), NULL = không giới hạn
  min_order        INTEGER      NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  usage_limit      INTEGER      CHECK (usage_limit > 0),     -- tổng số lượt, NULL = không giới hạn
  used_count       INTEGER      NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  first_order_only BOOLEAN      NOT NULL DEFAULT FALSE,
  starts_at        TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
INSERT INTO coupons (code, description, type, value, max_discount, min_order, first_order_only) VALUES
  ('CHAOBANMOI', 'Giảm 20% cho đơn đầu tiên (tối đa 50.000đ)', 'percent', 20, 50000, 0, TRUE),
  ('GIAM10', 'Giảm 10% cho đơn từ 100.000đ (tối đa 30.000đ)', 'percent', 10, 30000, 100000, FALSE),
  ('GIAM15K', 'Giảm 15.000đ cho đơn từ 150.000đ', 'fixed', 15000, NULL, 150000, FALSE)
ON CONFLICT (code) DO NOTHING;

-- Mã hiện trong danh sách "Chọn mã giảm giá" cho khách (tắt = mã bí mật, phải tự gõ)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code   VARCHAR(30)  NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount      INTEGER      NOT NULL DEFAULT 0 CHECK (discount >= 0);
-- Lý do huỷ đơn (admin chọn / khách chọn) để khách biết vì sao
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255) NOT NULL DEFAULT '';

/* ---------- Đánh giá món (chỉ khách đã nhận món mới được đánh giá) ---------- */
CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)  -- mỗi người 1 đánh giá / món (đánh giá lại = sửa)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, created_at DESC);

/* ---------- Món yêu thích ---------- */
CREATE TABLE IF NOT EXISTS favorites (
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- Giờ của từng bước đơn hàng (NULL = chưa tới bước đó). Lần đầu thêm cột: điền giờ ước lượng cho đơn cũ
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'confirmed_at') THEN
    ALTER TABLE orders
      ADD COLUMN confirmed_at TIMESTAMPTZ,
      ADD COLUMN shipping_at  TIMESTAMPTZ,
      ADD COLUMN completed_at TIMESTAMPTZ,
      ADD COLUMN cancelled_at TIMESTAMPTZ;

    -- Đơn đã hoàn thành: updated_at chính là lúc hoàn thành; chia khoảng thời gian thành xác nhận (10%) → giao (40%)
    WITH span AS (
      SELECT id, created_at,
             CASE WHEN updated_at - created_at < INTERVAL '20 minutes'
                  THEN make_interval(mins => 20 + id % 25) ELSE updated_at - created_at END AS total
      FROM orders WHERE status = 'completed'
    )
    UPDATE orders o SET confirmed_at = s.created_at + s.total * 0.1,
                        shipping_at  = s.created_at + s.total * 0.4,
                        completed_at = s.created_at + s.total
    FROM span s WHERE o.id = s.id;

    UPDATE orders SET confirmed_at = created_at + make_interval(mins => 2 + id % 6) WHERE status IN ('confirmed', 'shipping');
    UPDATE orders SET shipping_at = confirmed_at + make_interval(mins => 8 + id % 8) WHERE status = 'shipping';
    UPDATE orders SET cancelled_at = GREATEST(updated_at, created_at + INTERVAL '3 minutes') WHERE status = 'cancelled';
  END IF;
END $$;

-- Hình thức nhận: giao tận nơi / khách đến quán lấy. Giờ hẹn: NULL = càng sớm càng tốt
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment VARCHAR(10) NOT NULL DEFAULT 'delivery';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_check;
ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_check CHECK (fulfillment IN ('delivery', 'pickup'));

CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
`;
