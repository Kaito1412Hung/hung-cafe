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

CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(60)  NOT NULL,
  description    VARCHAR(200) NOT NULL DEFAULT '',
  price          INTEGER      NOT NULL CHECK (price >= 0),
  category       VARCHAR(20)  NOT NULL CHECK (category IN ('coffee', 'tea', 'freeze', 'cake')),
  image          TEXT         NOT NULL DEFAULT '',
  stock          INTEGER      NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_available   BOOLEAN      NOT NULL DEFAULT TRUE,
  is_best_seller BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

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
  type       VARCHAR(30)  NOT NULL CHECK (type IN ('new_order', 'order_cancelled', 'low_stock', 'new_customer')),
  title      VARCHAR(120) NOT NULL,
  message    VARCHAR(255) NOT NULL DEFAULT '',
  link       VARCHAR(255) NOT NULL DEFAULT '',
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
`;
