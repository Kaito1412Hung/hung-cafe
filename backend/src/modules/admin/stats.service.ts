import { pool } from "../../db/pool";

const TZ = "Asia/Ho_Chi_Minh";

/** Thống kê cho trang Tổng quan trong `days` ngày gần nhất, so sánh với kỳ trước đó */
export async function getDashboardStats(days: number) {
  const [kpi, customers, daily, topProducts, recentOrders, lowStock, statusCounts] = await Promise.all([
    // Doanh thu / số đơn kỳ này & kỳ trước (FILTER = đếm có điều kiện trong cùng 1 câu SQL)
    pool.query<{ revenue: string; prevRevenue: string; orders: string; prevOrders: string; completed: string; pending: string }>(
      `SELECT
         COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND created_at >= NOW() - make_interval(days => $1)), 0) AS revenue,
         COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND created_at >= NOW() - make_interval(days => $1 * 2)
                                     AND created_at < NOW() - make_interval(days => $1)), 0) AS "prevRevenue",
         COUNT(*) FILTER (WHERE status <> 'cancelled' AND created_at >= NOW() - make_interval(days => $1)) AS orders,
         COUNT(*) FILTER (WHERE status <> 'cancelled' AND created_at >= NOW() - make_interval(days => $1 * 2)
                          AND created_at < NOW() - make_interval(days => $1)) AS "prevOrders",
         COUNT(*) FILTER (WHERE status = 'completed' AND created_at >= NOW() - make_interval(days => $1)) AS completed,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending
       FROM orders`,
      [days],
    ),
    pool.query<{ current: string; previous: string; total: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE created_at >= NOW() - make_interval(days => $1)) AS current,
         COUNT(*) FILTER (WHERE created_at >= NOW() - make_interval(days => $1 * 2) AND created_at < NOW() - make_interval(days => $1)) AS previous,
         COUNT(*) AS total
       FROM users WHERE role = 'customer'`,
      [days],
    ),
    // generate_series tạo đủ từng ngày (kể cả ngày không có đơn) để biểu đồ không bị "thủng"
    pool.query<{ date: string; revenue: number; orders: number }>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(o.total) FILTER (WHERE o.status = 'completed'), 0)::int AS revenue,
              COUNT(o.id) FILTER (WHERE o.status <> 'cancelled')::int AS orders
       FROM generate_series((NOW() AT TIME ZONE '${TZ}')::date - ($1::int - 1), (NOW() AT TIME ZONE '${TZ}')::date, INTERVAL '1 day') AS d
       LEFT JOIN orders o ON (o.created_at AT TIME ZONE '${TZ}')::date = d::date
       GROUP BY d ORDER BY d`,
      [days],
    ),
    pool.query<{ name: string; image: string; quantity: number; revenue: number }>(
      `SELECT oi.product_name AS name, MAX(oi.product_image) AS image,
              SUM(oi.quantity)::int AS quantity, SUM(oi.line_total)::int AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled' AND o.created_at >= NOW() - make_interval(days => $1)
       GROUP BY oi.product_name
       ORDER BY quantity DESC, revenue DESC
       LIMIT 5`,
      [days],
    ),
    pool.query(
      `SELECT id, customer_name AS "customerName", total, status, created_at AS "createdAt"
       FROM orders ORDER BY created_at DESC LIMIT 5`,
    ),
    pool.query(
      `SELECT id, name, image, stock, is_available AS "isAvailable"
       FROM products WHERE stock <= 15 ORDER BY stock ASC, name LIMIT 6`,
    ),
    pool.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*)::int AS count FROM orders
       WHERE created_at >= NOW() - make_interval(days => $1) GROUP BY status`,
      [days],
    ),
  ]);

  const k = kpi.rows[0];
  const revenue = Number(k.revenue);
  const completed = Number(k.completed);

  return {
    days,
    revenue: { current: revenue, previous: Number(k.prevRevenue) },
    orders: { current: Number(k.orders), previous: Number(k.prevOrders) },
    newCustomers: { current: Number(customers.rows[0].current), previous: Number(customers.rows[0].previous) },
    totalCustomers: Number(customers.rows[0].total),
    averageOrderValue: completed ? Math.round(revenue / completed) : 0,
    pendingOrders: Number(k.pending),
    daily: daily.rows,
    topProducts: topProducts.rows,
    recentOrders: recentOrders.rows,
    lowStock: lowStock.rows,
    statusCounts: Object.fromEntries(statusCounts.rows.map((r) => [r.status, r.count])),
  };
}
