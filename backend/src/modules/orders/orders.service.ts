import type { PoolClient } from "pg";
import { pool } from "../../db/pool";
import { calcShippingFee, getOpenStatus, getShopSettings } from "../settings/settings.service";
import { AppError } from "../../utils/AppError";
import { LOW_STOCK_THRESHOLD, cleanup as cleanupNotifications, notifyAdmins, notifyUser } from "../notifications/notifications.service";
import { STATUS_LABELS, STATUS_TRANSITIONS, type CheckoutInput, type Order, type OrderStatus } from "./orders.schema";

// Lấy đơn kèm danh sách món (json_agg gom các dòng order_items thành mảng JSON)
const ORDER_SELECT = `
  SELECT o.id, o.user_id AS "userId", u.email AS "userEmail",
         o.customer_name AS "customerName", o.phone, o.address, o.note, o.status,
         o.subtotal, o.shipping_fee AS "shippingFee", o.total,
         o.created_at AS "createdAt", o.updated_at AS "updatedAt",
         COALESCE(
           json_agg(json_build_object(
             'productId', oi.product_id, 'name', oi.product_name, 'image', oi.product_image,
             'unitPrice', oi.unit_price, 'quantity', oi.quantity, 'lineTotal', oi.line_total
           ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS items
  FROM orders o
  LEFT JOIN users u ON u.id = o.user_id
  LEFT JOIN order_items oi ON oi.order_id = o.id`;

const GROUP_BY = `GROUP BY o.id, u.email`;

/** Chạy nhiều câu SQL trong 1 transaction: lỗi ở bất kỳ bước nào → ROLLBACK toàn bộ */
async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const money = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";
const code = (id: number) => `#${String(id).padStart(5, "0")}`;

/* ================= Khách hàng ================= */

export async function checkout(userId: number, input: CheckoutInput): Promise<Order> {
  // Ngoài giờ mở cửa (hoặc admin tạm ngưng nhận đơn) → không cho đặt
  const settings = await getShopSettings();
  const openStatus = getOpenStatus(settings);
  if (!openStatus.isOpen) throw new AppError(400, `${openStatus.message}. Bạn vui lòng đặt lại sau nhé!`);

  const orderId = await withTransaction(async (client) => {
    // FOR UPDATE: khoá các dòng sản phẩm để 2 người đặt cùng lúc không trừ kho sai
    const { rows: items } = await client.query<{
      productId: number;
      name: string;
      image: string;
      price: number;
      stock: number;
      isAvailable: boolean;
      quantity: number;
    }>(
      `SELECT p.id AS "productId", p.name, p.image, p.price, p.stock, p.is_available AS "isAvailable", c.quantity
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1
       ORDER BY c.created_at
       FOR UPDATE OF p`,
      [userId],
    );

    if (items.length === 0) throw new AppError(400, "Giỏ hàng đang trống");

    for (const item of items) {
      if (!item.isAvailable || item.stock === 0) {
        throw new AppError(400, `"${item.name}" đã tạm hết, vui lòng xoá khỏi giỏ trước khi đặt`);
      }
      if (item.quantity > item.stock) {
        throw new AppError(400, `"${item.name}" chỉ còn ${item.stock} phần, vui lòng giảm số lượng`);
      }
    }

    // Tiền luôn tính lại ở server — không tin số tiền client gửi lên
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingFee = calcShippingFee(subtotal, settings);

    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO orders (user_id, customer_name, phone, address, note, subtotal, shipping_fee, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [userId, input.customerName, input.phone, input.address, input.note, subtotal, shippingFee, subtotal + shippingFee],
    );
    const newOrderId = rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newOrderId, item.productId, item.name, item.image, item.price, item.quantity, item.price * item.quantity],
      );
      await client.query("UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2", [item.quantity, item.productId]);

      // Chỉ báo khi tồn kho VỪA tụt xuống dưới ngưỡng hoặc VỪA hết (tránh báo lặp ở mỗi đơn)
      const left = item.stock - item.quantity;
      const crossedThreshold = item.stock > LOW_STOCK_THRESHOLD && left <= LOW_STOCK_THRESHOLD;
      if (crossedThreshold || left === 0) {
        await notifyAdmins(
          {
            type: "low_stock",
            title: left === 0 ? `"${item.name}" đã hết hàng` : `"${item.name}" sắp hết hàng`,
            message: left === 0 ? "Món này không thể đặt thêm cho tới khi nhập hàng." : `Chỉ còn ${left} phần trong kho.`,
            link: "/admin/products",
          },
          client,
        );
      }
    }

    await client.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);

    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    await notifyAdmins(
      {
        type: "new_order",
        title: `Đơn hàng mới ${code(newOrderId)}`,
        message: `${input.customerName} đặt ${totalQty} món · ${money(subtotal + shippingFee)}`,
        link: `/admin/orders?order=${newOrderId}`,
      },
      client,
    );
    return newOrderId;
  });

  cleanupNotifications().catch(() => {});
  return findById(orderId);
}

export async function findByUser(userId: number): Promise<Order[]> {
  const { rows } = await pool.query<Order>(`${ORDER_SELECT} WHERE o.user_id = $1 ${GROUP_BY} ORDER BY o.created_at DESC`, [userId]);
  return rows;
}

/**
 * "Mua lại": bỏ các món của đơn cũ vào giỏ. Món đã xoá / ngừng bán / hết hàng thì bỏ qua,
 * số lượng không vượt quá tồn kho (và tối đa 99).
 */
export async function reorder(userId: number, id: number) {
  const order = await findById(id);
  if (order.userId !== userId) throw new AppError(404, "Không tìm thấy đơn hàng");

  const added: string[] = [];
  const skipped: string[] = [];
  for (const item of order.items) {
    const { rows } = item.productId
      ? await pool.query<{ stock: number; isAvailable: boolean }>(`SELECT stock, is_available AS "isAvailable" FROM products WHERE id = $1`, [item.productId])
      : { rows: [] };
    const product = rows[0];
    if (!product || !product.isAvailable || product.stock === 0) {
      skipped.push(item.name);
      continue;
    }
    // Cộng dồn với giỏ hiện tại nhưng không vượt tồn kho / 99
    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, LEAST($3::int, $4::int, 99))
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, $4::int, 99), updated_at = NOW()`,
      [userId, item.productId, item.quantity, product.stock],
    );
    added.push(item.name);
  }
  if (added.length === 0) throw new AppError(400, "Các món trong đơn này hiện đã hết hoặc ngừng bán");
  return { added, skipped };
}

/* ================= Dùng chung ================= */

export async function findById(id: number): Promise<Order> {
  const { rows } = await pool.query<Order>(`${ORDER_SELECT} WHERE o.id = $1 ${GROUP_BY}`, [id]);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy đơn hàng");
  return rows[0];
}

/** Đổi trạng thái, kiểm tra theo STATUS_TRANSITIONS. Huỷ đơn → hoàn lại tồn kho. */
/** Nội dung báo cho khách khi admin đổi trạng thái đơn */
const CUSTOMER_MESSAGES: Partial<Record<OrderStatus, { title: string; message: string }>> = {
  confirmed: { title: "đã được xác nhận", message: "Quán đang pha chế đồ uống cho bạn ☕" },
  shipping: { title: "đang được giao", message: "Shipper đang trên đường tới, bạn để ý điện thoại nhé 🛵" },
  completed: { title: "đã giao thành công", message: "Cảm ơn bạn đã ủng hộ Hưng Café! Hẹn gặp lại 💛" },
  cancelled: { title: "đã bị huỷ", message: "Quán đã huỷ đơn này. Liên hệ quán nếu bạn cần hỗ trợ." },
};

/**
 * Đổi trạng thái, kiểm tra theo STATUS_TRANSITIONS. Huỷ đơn → hoàn lại tồn kho.
 * `notifyCustomer`: admin đổi → báo cho khách; khách tự huỷ thì không cần báo lại chính họ.
 */
export async function changeStatus(id: number, next: OrderStatus, notifyCustomer = true): Promise<Order> {
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ status: OrderStatus; userId: number | null }>(
      `SELECT status, user_id AS "userId" FROM orders WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!rows[0]) throw new AppError(404, "Không tìm thấy đơn hàng");

    const current = rows[0].status;
    if (!STATUS_TRANSITIONS[current].includes(next)) {
      throw new AppError(400, `Không thể chuyển đơn từ "${STATUS_LABELS[current]}" sang "${STATUS_LABELS[next]}"`);
    }

    await client.query("UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2", [next, id]);

    if (next === "cancelled") {
      await client.query(
        `UPDATE products p SET stock = p.stock + oi.quantity, updated_at = NOW()
         FROM order_items oi
         WHERE oi.order_id = $1 AND oi.product_id = p.id`,
        [id],
      );
    }

    const content = CUSTOMER_MESSAGES[next];
    if (notifyCustomer && content && rows[0].userId) {
      await notifyUser(
        rows[0].userId,
        { type: "order_status", title: `Đơn ${code(id)} ${content.title}`, message: content.message, link: `/orders#don-${id}` },
        client,
      );
    }
  });
  return findById(id);
}

/** Khách tự huỷ đơn của mình — chỉ khi đơn còn "Chờ xác nhận" */
export async function cancelByCustomer(userId: number, id: number): Promise<Order> {
  const order = await findById(id);
  if (order.userId !== userId) throw new AppError(404, "Không tìm thấy đơn hàng");
  if (order.status !== "pending") throw new AppError(400, "Đơn đã được xác nhận, vui lòng liên hệ quán để huỷ");
  const cancelled = await changeStatus(id, "cancelled", false);
  await notifyAdmins({
    type: "order_cancelled",
    title: `Khách đã huỷ đơn ${code(id)}`,
    message: `${order.customerName} · ${money(order.total)} — tồn kho đã được hoàn lại.`,
    link: `/admin/orders?order=${id}`,
  });
  return cancelled;
}

/* ================= Admin ================= */

export interface OrderFilters {
  status?: string;
  search?: string;
}

export async function findAll(filters: OrderFilters): Promise<Order[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`o.status = $${values.length}`);
  }
  if (filters.search) {
    // Tìm theo mã đơn (VD "12" hoặc "#12"), tên hoặc số điện thoại
    values.push(`%${filters.search}%`, filters.search.replace(/^#/, ""));
    conditions.push(
      `(o.customer_name ILIKE $${values.length - 1} OR o.phone ILIKE $${values.length - 1} OR o.id::text = $${values.length})`,
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query<Order>(`${ORDER_SELECT} ${where} ${GROUP_BY} ORDER BY o.created_at DESC`, values);
  return rows;
}

/** Số đơn theo từng trạng thái + doanh thu (chỉ tính đơn đã hoàn thành) */
export async function getSummary() {
  const { rows } = await pool.query<{ status: OrderStatus; count: string; revenue: string }>(
    "SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue FROM orders GROUP BY status",
  );
  const counts: Record<OrderStatus, number> = { pending: 0, confirmed: 0, shipping: 0, completed: 0, cancelled: 0 };
  let revenue = 0;
  for (const r of rows) {
    counts[r.status] = Number(r.count);
    if (r.status === "completed") revenue = Number(r.revenue);
  }
  return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0), revenue };
}
