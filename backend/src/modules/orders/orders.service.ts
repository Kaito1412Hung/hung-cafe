import type { PoolClient } from "pg";
import { discardAfterCommit, flushAfterCommit } from "../../db/afterCommit";
import { pool } from "../../db/pool";
import { emitOrderUpdated, emitToAdmins } from "../../realtime/socket";
import { calcShippingFee, getOpenStatus, getShopSettings, isWithinOpeningHours } from "../settings/settings.service";
import type { ShopSettings } from "../settings/settings.schema";
import { AppError } from "../../utils/AppError";
import { env, vnpayEnabled } from "../../config/env";
import { LOW_STOCK_THRESHOLD, cleanup as cleanupNotifications, notifyAdmins, notifyUser } from "../notifications/notifications.service";
import { evaluate as evaluateCoupon } from "../coupons/coupons.service";
import { normalizeOptions, parseToppingIds, sizeExtra, type ProductOptionConfig } from "../cart/options";
import { availableMap } from "../toppings/toppings.service";
import { STATUS_LABELS, STATUS_TRANSITIONS, type CheckoutInput, type Fulfillment, type Order, type OrderStatus, type PaymentMethod, type PaymentStatus } from "./orders.schema";

// Lấy đơn kèm danh sách món (json_agg gom các dòng order_items thành mảng JSON)
const ORDER_SELECT = `
  SELECT o.id, o.user_id AS "userId", u.email AS "userEmail",
         o.customer_name AS "customerName", o.phone, o.address, o.note, o.status,
         o.subtotal, o.coupon_code AS "couponCode", o.discount, o.shipping_fee AS "shippingFee", o.total,
         o.cancel_reason AS "cancelReason", o.fulfillment, o.scheduled_at AS "scheduledAt",
         o.payment_method AS "paymentMethod", o.payment_status AS "paymentStatus",
         o.payment_deadline AS "paymentDeadline", o.paid_at AS "paidAt",
         (SELECT json_build_object('transactionNo', p.transaction_no, 'bankCode', p.bank_code)
            FROM payments p WHERE p.order_id = o.id AND p.status = 'success' ORDER BY p.id DESC LIMIT 1) AS payment,
         o.created_at AS "createdAt", o.updated_at AS "updatedAt",
         o.confirmed_at AS "confirmedAt", o.shipping_at AS "shippingAt",
         o.completed_at AS "completedAt", o.cancelled_at AS "cancelledAt",
         COALESCE(
           json_agg(json_build_object(
             'productId', oi.product_id, 'name', oi.product_name, 'image', oi.product_image,
             'size', oi.size, 'sugar', oi.sugar, 'temp', oi.temp, 'ice', oi.ice, 'toppings', oi.toppings, 'note', oi.note,
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
    flushAfterCommit(client); // lưu xong rồi mới gửi tin realtime
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    discardAfterCommit(client);
    client.release();
  }
}

const money = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

const TIME_ZONE = "Asia/Ho_Chi_Minh";
/** Ngày theo giờ Việt Nam, dạng "YYYY-MM-DD" */
const vnDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
/** "15:00" (kèm " ngày mai" nếu là ngày mai) */
function vnTime(d: Date, now = new Date()) {
  const time = new Intl.DateTimeFormat("vi-VN", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return vnDate(d) === vnDate(now) ? time : `${time} ngày mai`;
}

/**
 * Kiểm tra giờ hẹn: chỉ hôm nay / ngày mai, trong giờ mở cửa,
 * và không sớm hơn thời gian quán cần (pha chế, cộng thêm thời gian giao nếu giao tận nơi).
 */
function checkScheduledTime(at: Date, fulfillment: Fulfillment, settings: ShopSettings, now = new Date()) {
  const fail = (message: string) => new AppError(400, message, { scheduledAt: message });
  const leadMinutes = settings.prepMinutes + (fulfillment === "delivery" ? settings.deliveryMinutes : 0);
  const earliest = new Date(now.getTime() + (leadMinutes - 1) * 60_000); // trừ 1 phút cho khách bấm chậm
  if (at < earliest) throw fail(`Giờ hẹn sớm nhất là ${vnTime(new Date(now.getTime() + leadMinutes * 60_000), now)}`);
  const tomorrow = vnDate(new Date(now.getTime() + 24 * 60 * 60_000));
  if (vnDate(at) > tomorrow) throw fail("Chỉ hẹn được trong hôm nay hoặc ngày mai");
  const hours = isWithinOpeningHours(settings, at);
  if (!hours.ok) throw fail(`Giờ hẹn phải trong giờ mở cửa (${hours.openAt} – ${hours.closeAt})`);
}
const code = (id: number) => `#${String(id).padStart(5, "0")}`;


/** Báo "Đơn hàng mới" cho mọi admin (đơn COD: ngay lúc đặt; đơn VNPay: lúc thanh toán xong) */
export async function notifyNewOrder(client: PoolClient, orderId: number) {
  const { rows } = await client.query<{
    customerName: string;
    total: number;
    couponCode: string;
    fulfillment: Fulfillment;
    scheduledAt: Date | null;
    paymentMethod: PaymentMethod;
    qty: number;
  }>(
    `SELECT o.customer_name AS "customerName", o.total, o.coupon_code AS "couponCode", o.fulfillment, o.scheduled_at AS "scheduledAt",
            o.payment_method AS "paymentMethod", COALESCE(SUM(oi.quantity), 0)::int AS qty
     FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id WHERE o.id = $1 GROUP BY o.id`,
    [orderId],
  );
  const o = rows[0];
  if (!o) return;
  await notifyAdmins(
    {
      type: "new_order",
      title: `Đơn hàng mới ${code(orderId)}`,
      message: [
        `${o.customerName} đặt ${o.qty} món · ${money(o.total)}${o.couponCode ? ` (mã ${o.couponCode})` : ""}`,
        o.paymentMethod === "vnpay" ? "Đã thanh toán VNPay" : "",
        o.fulfillment === "pickup" ? "Đến quán lấy" : "",
        o.scheduledAt ? `Hẹn ${vnTime(o.scheduledAt)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      link: `/admin/orders?order=${orderId}`,
    },
    client,
  );
}

/* ================= Khách hàng ================= */

export async function checkout(userId: number, input: CheckoutInput): Promise<Order> {
  // Ngoài giờ mở cửa (hoặc admin tạm ngưng nhận đơn) → không cho đặt
  const settings = await getShopSettings();
  const openStatus = getOpenStatus(settings);
  if (!openStatus.isOpen) throw new AppError(400, `${openStatus.message}. Bạn vui lòng đặt lại sau nhé!`);
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  if (input.paymentMethod === "vnpay" && !vnpayEnabled) {
    throw new AppError(400, "Quán chưa bật thanh toán VNPay, bạn chọn thanh toán khi nhận hàng nhé", { paymentMethod: "Chưa bật VNPay" });
  }
  // VNPay: đơn giữ món + mã giảm giá trong PAYMENT_TIMEOUT_MINUTES phút, quá hạn chưa trả thì tự huỷ (expireUnpaidOrders)
  const isVnpay = input.paymentMethod === "vnpay";
  if (scheduledAt) checkScheduledTime(scheduledAt, input.fulfillment, settings);

  const orderId = await withTransaction(async (client) => {
    // FOR UPDATE: khoá các dòng sản phẩm để 2 người đặt cùng lúc không trừ kho sai
    const { rows: items } = await client.query<{
      productId: number;
      name: string;
      image: string;
      price: number;
      stock: number;
      isAvailable: boolean;
      size: string;
      sugar: string;
      temp: string;
      ice: string;
      toppings: string;
      note: string;
      quantity: number;
    }>(
      `SELECT p.id AS "productId", p.name, p.image, p.price, p.stock, p.is_available AS "isAvailable",
              c.size, c.sugar, c.temp, c.ice, c.toppings, c.note, c.quantity
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1
       ORDER BY c.created_at, c.id
       FOR UPDATE OF p`,
      [userId],
    );

    if (items.length === 0) throw new AppError(400, "Giỏ hàng đang trống");

    // Cùng 1 món có thể nằm ở nhiều dòng (khác size) → cộng lại để so với tồn kho
    const perProduct = new Map<number, { name: string; stock: number; quantity: number }>();
    for (const item of items) {
      if (!item.isAvailable || item.stock === 0) {
        throw new AppError(400, `"${item.name}" đã tạm hết, vui lòng xoá khỏi giỏ trước khi đặt`);
      }
      const p = perProduct.get(item.productId) ?? { name: item.name, stock: item.stock, quantity: 0 };
      p.quantity += item.quantity;
      perProduct.set(item.productId, p);
    }
    for (const p of perProduct.values()) {
      if (p.quantity > p.stock) throw new AppError(400, `"${p.name}" chỉ còn ${p.stock} phần, vui lòng giảm số lượng`);
    }

    // Tiền luôn tính lại ở server — không tin số tiền client gửi lên. Topping lấy giá hiện tại; topping vừa ngưng bán → báo khách
    const toppingMap = await availableMap(client);
    const lines = items.map((i) => {
      const ids = parseToppingIds(i.toppings);
      const missing = ids.find((id) => !toppingMap.has(id));
      if (missing) throw new AppError(400, `Một topping của "${i.name}" vừa hết, vui lòng xoá món đó và chọn lại`);
      const toppings = ids.map((id) => toppingMap.get(id)!);
      const unitPrice = i.price + sizeExtra(i.size) + toppings.reduce((s, t) => s + t.price, 0);
      return { ...i, toppings, unitPrice, lineTotal: unitPrice * i.quantity };
    });
    const subtotal = lines.reduce((sum, i) => sum + i.lineTotal, 0);
    // Đến quán lấy → không tính phí giao
    const shippingFee = input.fulfillment === "pickup" ? 0 : calcShippingFee(subtotal, settings);

    // Mã giảm giá: kiểm tra lại trong transaction + khoá dòng mã để không vượt số lượt
    let discount = 0;
    let couponCode = "";
    if (input.couponCode) {
      const result = await evaluateCoupon(client, input.couponCode, userId, subtotal, true);
      discount = result.discount;
      couponCode = result.coupon.code;
      await client.query("UPDATE coupons SET used_count = used_count + 1 WHERE id = $1", [result.coupon.id]);
    }
    const total = subtotal - discount + shippingFee;

    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO orders (user_id, customer_name, phone, address, note, subtotal, coupon_code, discount, shipping_fee, total, fulfillment, scheduled_at,
                           payment_method, payment_status, payment_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               CASE WHEN $15::int IS NULL THEN NULL ELSE NOW() + make_interval(mins => $15::int) END) RETURNING id`,
      [
        userId,
        input.customerName,
        input.phone,
        input.address,
        input.note,
        subtotal,
        couponCode,
        discount,
        shippingFee,
        total,
        input.fulfillment,
        scheduledAt,
        input.paymentMethod,
        isVnpay ? "pending" : "unpaid",
        isVnpay ? env.PAYMENT_TIMEOUT_MINUTES : null, // hạn chót trả tiền (chỉ đơn VNPay)
      ],
    );
    const newOrderId = rows[0].id;

    for (const line of lines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, size, sugar, temp, ice, toppings, note, unit_price, quantity, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          newOrderId,
          line.productId,
          line.name,
          line.image,
          line.size,
          line.sugar,
          line.temp,
          line.ice,
          JSON.stringify(line.toppings),
          line.note,
          line.unitPrice,
          line.quantity,
          line.lineTotal,
        ],
      );
    }

    for (const [productId, p] of perProduct) {
      await client.query("UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2", [p.quantity, productId]);

      // Chỉ báo khi tồn kho VỪA tụt xuống dưới ngưỡng hoặc VỪA hết (tránh báo lặp ở mỗi đơn)
      const left = p.stock - p.quantity;
      const crossedThreshold = p.stock > LOW_STOCK_THRESHOLD && left <= LOW_STOCK_THRESHOLD;
      if (crossedThreshold || left === 0) {
        await notifyAdmins(
          {
            type: "low_stock",
            title: left === 0 ? `"${p.name}" đã hết hàng` : `"${p.name}" sắp hết hàng`,
            message: left === 0 ? "Món này không thể đặt thêm cho tới khi nhập hàng." : `Chỉ còn ${left} phần trong kho.`,
            link: "/admin/products",
          },
          client,
        );
      }
    }

    await client.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);

    // Đơn VNPay: chờ khách trả tiền xong mới báo admin (payments.service gọi notifyNewOrder)
    if (!isVnpay) await notifyNewOrder(client, newOrderId);
    return newOrderId;
  });

  cleanupNotifications().catch(() => {});
  const order = await findById(orderId);
  // Đơn tiền mặt: admin thấy ngay. Đơn VNPay: báo khi khách trả tiền xong (payments.service)
  if (!isVnpay) emitToAdmins("order:new", { id: order.id });
  return order;
}

/** Đơn của 1 khách, mới nhất trước, theo từng trang (nút "Xem thêm") */
export async function findByUser(userId: number, { limit = 10, offset = 0 } = {}): Promise<{ orders: Order[]; total: number }> {
  const [list, count] = await Promise.all([
    pool.query<Order>(`${ORDER_SELECT} WHERE o.user_id = $1 ${GROUP_BY} ORDER BY o.created_at DESC, o.id DESC LIMIT $2 OFFSET $3`, [userId, limit, offset]),
    pool.query<{ total: number }>("SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1", [userId]),
  ]);
  return { orders: list.rows, total: count.rows[0].total };
}

/**
 * "Mua lại": bỏ các món của đơn cũ vào giỏ (giữ size / đường / nóng-đá / topping / ghi chú nếu món vẫn còn các lựa chọn đó).
 * Món đã xoá / ngừng bán / hết hàng thì bỏ qua, số lượng không vượt quá tồn kho (và tối đa 99).
 */
export async function reorder(userId: number, id: number) {
  const order = await findById(id);
  if (order.userId !== userId) throw new AppError(404, "Không tìm thấy đơn hàng");

  const toppingMap = await availableMap();
  const added: string[] = [];
  const skipped: string[] = [];
  for (const item of order.items) {
    const { rows } = item.productId
      ? await pool.query<{ stock: number; isAvailable: boolean; inCart: number } & ProductOptionConfig>(
          `SELECT stock, is_available AS "isAvailable", has_size AS "hasSize", has_sugar AS "hasSugar", serve, allow_toppings AS "allowToppings",
                  (SELECT COALESCE(SUM(quantity), 0)::int FROM cart_items WHERE user_id = $2 AND product_id = $1) AS "inCart"
           FROM products WHERE id = $1`,
          [item.productId, userId],
        )
      : { rows: [] };
    const product = rows[0];
    const room = product ? Math.min(product.stock - product.inCart, item.quantity) : 0;
    if (!product || !product.isAvailable || room <= 0) {
      skipped.push(item.name);
      continue;
    }
    // Chuẩn hoá lại theo cấu hình HIỆN TẠI của món (VD món đã tắt size → bỏ size cũ; topping đã ngưng → bỏ)
    const o = normalizeOptions(
      product,
      {
        size: item.size || undefined,
        sugar: item.sugar || undefined,
        temp: item.temp || undefined,
        ice: item.ice || undefined,
        toppings: (item.toppings ?? []).map((t) => t.id),
        note: item.note,
      },
      toppingMap,
    );
    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, size, sugar, temp, ice, toppings, note, quantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, LEAST($9::int, 99))
       ON CONFLICT (user_id, product_id, size, sugar, temp, ice, toppings, note)
       DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 99), updated_at = NOW()`,
      [userId, item.productId, o.size, o.sugar, o.temp, o.ice, o.toppings, o.note, room],
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

/** Đơn đến quán lấy: bước "shipping" = đã pha xong, chờ khách tới */
const PICKUP_MESSAGES: Partial<Record<OrderStatus, { title: string; message: string }>> = {
  shipping: { title: "đã pha xong", message: "Mời bạn đến quán lấy nhé ☕ Nhớ báo mã đơn cho nhân viên." },
  completed: { title: "đã được nhận", message: "Cảm ơn bạn đã ghé Hưng Café! Đừng quên đánh giá món nhé ⭐" },
};

/** Nội dung báo cho khách khi admin đổi trạng thái đơn */
const CUSTOMER_MESSAGES: Partial<Record<OrderStatus, { title: string; message: string }>> = {
  confirmed: { title: "đã được xác nhận", message: "Quán đang pha chế đồ uống cho bạn ☕" },
  shipping: { title: "đang được giao", message: "Shipper đang trên đường tới, bạn để ý điện thoại nhé 🛵" },
  completed: { title: "đã giao thành công", message: "Cảm ơn bạn đã ủng hộ Hưng Café! Đừng quên đánh giá món nhé ⭐" },
  cancelled: { title: "đã bị huỷ", message: "Quán đã huỷ đơn này. Liên hệ quán nếu bạn cần hỗ trợ." },
};

/** Cột lưu giờ của từng bước */
const STEP_COLUMNS: Partial<Record<OrderStatus, string>> = {
  confirmed: "confirmed_at",
  shipping: "shipping_at",
  completed: "completed_at",
  cancelled: "cancelled_at",
};

/**
 * Đổi trạng thái, kiểm tra theo STATUS_TRANSITIONS. Huỷ đơn → hoàn lại tồn kho + trả lại lượt mã giảm giá.
 * `notifyCustomer`: admin đổi → báo cho khách; khách tự huỷ thì không cần báo lại chính họ.
 */
export async function changeStatus(
  id: number,
  next: OrderStatus,
  {
    reason = "",
    notifyCustomer = true,
    onlyIfPaymentPending = false,
  }: { reason?: string; notifyCustomer?: boolean; /** Tự huỷ đơn quá hạn: chỉ huỷ nếu khách VẪN chưa trả tiền (tránh huỷ nhầm đơn vừa trả) */ onlyIfPaymentPending?: boolean } = {},
): Promise<Order> {
  await withTransaction(async (client) => {
    const { rows } = await client.query<{
      status: OrderStatus;
      userId: number | null;
      couponCode: string;
      fulfillment: Fulfillment;
      paymentMethod: PaymentMethod;
      paymentStatus: PaymentStatus;
    }>(
      `SELECT status, user_id AS "userId", coupon_code AS "couponCode", fulfillment,
              payment_method AS "paymentMethod", payment_status AS "paymentStatus"
       FROM orders WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!rows[0]) throw new AppError(404, "Không tìm thấy đơn hàng");

    const current = rows[0].status;
    if (!STATUS_TRANSITIONS[current].includes(next)) {
      throw new AppError(400, `Không thể chuyển đơn từ "${STATUS_LABELS[current]}" sang "${STATUS_LABELS[next]}"`);
    }
    if (onlyIfPaymentPending && rows[0].paymentStatus !== "pending") throw new AppError(409, "Đơn đã được thanh toán");
    // Đơn VNPay chưa trả tiền thì quán chưa làm
    if (next === "confirmed" && rows[0].paymentMethod === "vnpay" && rows[0].paymentStatus !== "paid") {
      throw new AppError(400, "Đơn này chưa được thanh toán VNPay, chưa xác nhận được");
    }

    // Ghi lại giờ của bước mới (tên cột lấy từ danh sách cố định STEP_COLUMNS, không lấy từ người dùng)
    const stepColumn = STEP_COLUMNS[next];
    await client.query(
      `UPDATE orders SET status = $1, cancel_reason = $2, updated_at = NOW()${stepColumn ? `, ${stepColumn} = NOW()` : ""} WHERE id = $3`,
      [next, next === "cancelled" ? reason : "", id],
    );

    // Trạng thái thanh toán đi theo: huỷ đơn đã trả tiền → cần hoàn tiền; huỷ đơn chờ trả → thất bại; COD giao xong → đã thu tiền
    const payment = rows[0].paymentStatus;
    const nextPayment: PaymentStatus | null =
      next === "cancelled" ? (payment === "paid" ? "refund_pending" : payment === "pending" ? "failed" : null) : next === "completed" && payment === "unpaid" ? "paid" : null;
    if (nextPayment) {
      await client.query(
        `UPDATE orders SET payment_status = $1::varchar, paid_at = CASE WHEN $1::varchar = 'paid' THEN NOW() ELSE paid_at END WHERE id = $2`,
        [nextPayment, id],
      );
    }

    if (next === "cancelled") {
      await client.query(
        `UPDATE products p SET stock = p.stock + oi.qty, updated_at = NOW()
         FROM (SELECT product_id, SUM(quantity) AS qty FROM order_items WHERE order_id = $1 GROUP BY product_id) oi
         WHERE oi.product_id = p.id`,
        [id],
      );
      // Đơn huỷ → trả lại 1 lượt cho mã giảm giá (khách cũng dùng lại được mã đó)
      if (rows[0].couponCode) {
        await client.query("UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = $1", [rows[0].couponCode]);
      }
    }

    const content = (rows[0].fulfillment === "pickup" ? PICKUP_MESSAGES[next] : undefined) ?? CUSTOMER_MESSAGES[next];
    if (notifyCustomer && content && rows[0].userId) {
      await notifyUser(
        rows[0].userId,
        {
          type: "order_status",
          title: `Đơn ${code(id)} ${content.title}`,
          message: next === "cancelled" && reason ? `Lý do: ${reason}` : content.message,
          link: `/orders#don-${id}`,
        },
        client,
      );
    }
  });
  const order = await findById(id);
  emitOrderUpdated(order);
  return order;
}

/** Khách tự huỷ đơn của mình — chỉ khi đơn còn "Chờ xác nhận" */
export async function cancelByCustomer(userId: number, id: number, reason = ""): Promise<Order> {
  const order = await findById(id);
  if (order.userId !== userId) throw new AppError(404, "Không tìm thấy đơn hàng");
  if (order.status !== "pending") throw new AppError(400, "Đơn đã được xác nhận, vui lòng liên hệ quán để huỷ");
  const cancelled = await changeStatus(id, "cancelled", { reason: reason || "Khách tự huỷ đơn", notifyCustomer: false });
  if (order.paymentMethod === "vnpay" && order.paymentStatus === "pending") return cancelled;
  await notifyAdmins({
    type: "order_cancelled",
    title: `Khách đã huỷ đơn ${code(id)}`,
    message: `${order.customerName} · ${money(order.total)}${reason ? ` — Lý do: ${reason}` : " — tồn kho đã được hoàn lại."}`,
    link: `/admin/orders?order=${id}`,
  });
  return cancelled;
}

/* ================= Admin ================= */

export interface OrderFilters {
  status?: string;
  search?: string;
  /** Trang (từ 1) + số đơn mỗi trang. Không truyền pageSize → lấy hết */
  page?: number;
  pageSize?: number;
}

/** Danh sách đơn cho admin: lọc + chia trang ở server (không tải cả trăm đơn một lần) */
export async function findAll(filters: OrderFilters): Promise<{ orders: Order[]; total: number }> {
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
  let paging = "";
  const listValues = [...values];
  if (filters.pageSize) {
    listValues.push(filters.pageSize, ((filters.page ?? 1) - 1) * filters.pageSize);
    paging = `LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`;
  }
  const [list, count] = await Promise.all([
    pool.query<Order>(`${ORDER_SELECT} ${where} ${GROUP_BY} ORDER BY o.created_at DESC, o.id DESC ${paging}`, listValues),
    pool.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM orders o ${where}`, values),
  ]);
  return { orders: list.rows, total: count.rows[0].total };
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

/* ================= Thanh toán ================= */

/** Admin đã chuyển trả tiền cho khách (đơn VNPay đã trả nhưng bị huỷ) */
export async function markRefunded(id: number): Promise<Order> {
  const { rowCount } = await pool.query(
    `UPDATE orders SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1 AND payment_status = 'refund_pending'`,
    [id],
  );
  if (!rowCount) throw new AppError(400, "Đơn này không ở trạng thái cần hoàn tiền");
  const order = await findById(id);
  emitOrderUpdated(order);
  return order;
}

/** Huỷ các đơn VNPay quá hạn mà chưa thanh toán (trả kho + lượt mã giảm giá). Trả về số đơn đã huỷ */
export async function expireUnpaidOrders(): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM orders WHERE payment_status = 'pending' AND status = 'pending' AND payment_deadline < NOW() ORDER BY id`,
  );
  let count = 0;
  for (const { id } of rows) {
    try {
      await changeStatus(id, "cancelled", { reason: `Quá ${env.PAYMENT_TIMEOUT_MINUTES} phút chưa thanh toán VNPay`, onlyIfPaymentPending: true });
      count++;
    } catch {
      // Đơn vừa được trả tiền / đổi trạng thái cùng lúc → bỏ qua, lần sau xét lại
    }
  }
  return count;
}
