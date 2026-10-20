import { pool } from "../../db/pool";
import { currentYear, monthSpan, periodRange, type Period } from "./period";

const TZ = "Asia/Ho_Chi_Minh";

/** Biểu đồ: N ngày → từng ngày; cả năm → từng tháng. generate_series tạo đủ mọi ngày/tháng (kể cả không có đơn) để biểu đồ không bị "thủng" */
function chartQuery(period: Period) {
  if (period.kind === "days") {
    return pool.query<{ date: string; revenue: number; orders: number }>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(o.total) FILTER (WHERE o.status = 'completed'), 0)::int AS revenue,
              COUNT(o.id) FILTER (WHERE o.status <> 'cancelled')::int AS orders
       FROM generate_series((NOW() AT TIME ZONE '${TZ}')::date - ($1::int - 1), (NOW() AT TIME ZONE '${TZ}')::date, INTERVAL '1 day') AS d
       LEFT JOIN orders o ON (o.created_at AT TIME ZONE '${TZ}')::date = d::date
       GROUP BY d ORDER BY d`,
      [period.days],
    );
  }
  const { first, last } = monthSpan(period.year);
  return pool.query<{ date: string; revenue: number; orders: number }>(
    `SELECT to_char(m, 'YYYY-MM') AS date,
            COALESCE(SUM(o.total) FILTER (WHERE o.status = 'completed'), 0)::int AS revenue,
            COUNT(o.id) FILTER (WHERE o.status <> 'cancelled')::int AS orders
     FROM generate_series($1::date, $2::date, INTERVAL '1 month') AS m
     LEFT JOIN orders o ON date_trunc('month', o.created_at AT TIME ZONE '${TZ}') = m
     GROUP BY m ORDER BY m`,
    [first, last],
  );
}

/** Thống kê cho trang Tổng quan trong 1 khoảng thời gian (N ngày gần nhất hoặc cả năm), so sánh với kỳ trước đó */
export async function getDashboardStats(period: Period) {
  const { start, end, prevStart, prevEnd } = periodRange(period);
  const range = [start, end, prevStart, prevEnd];

  const [kpi, customers, chart, topProducts, recentOrders, lowStock, statusCounts, years] = await Promise.all([
    // Doanh thu / số đơn kỳ này ($1 → $2) & kỳ trước ($3 → $4) (FILTER = đếm có điều kiện trong cùng 1 câu SQL)
    pool.query<{ revenue: string; prevRevenue: string; orders: string; prevOrders: string; completed: string; pending: string }>(
      `SELECT
         COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND created_at >= $1 AND created_at < $2), 0) AS revenue,
         COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND created_at >= $3 AND created_at < $4), 0) AS "prevRevenue",
         COUNT(*) FILTER (WHERE status <> 'cancelled' AND created_at >= $1 AND created_at < $2) AS orders,
         COUNT(*) FILTER (WHERE status <> 'cancelled' AND created_at >= $3 AND created_at < $4) AS "prevOrders",
         COUNT(*) FILTER (WHERE status = 'completed' AND created_at >= $1 AND created_at < $2) AS completed,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending
       FROM orders`,
      range,
    ),
    pool.query<{ current: string; previous: string; total: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE created_at >= $1 AND created_at < $2) AS current,
         COUNT(*) FILTER (WHERE created_at >= $3 AND created_at < $4) AS previous,
         COUNT(*) AS total
       FROM users WHERE role = 'customer'`,
      range,
    ),
    chartQuery(period),
    pool.query<{ name: string; image: string; quantity: number; revenue: number }>(
      `SELECT oi.product_name AS name, MAX(oi.product_image) AS image,
              SUM(oi.quantity)::int AS quantity, SUM(oi.line_total)::int AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled' AND o.created_at >= $1 AND o.created_at < $2
       GROUP BY oi.product_name
       ORDER BY quantity DESC, revenue DESC
       LIMIT 5`,
      [start, end],
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
       WHERE created_at >= $1 AND created_at < $2 GROUP BY status`,
      [start, end],
    ),
    // Các năm có đơn hàng (để admin chọn xem thống kê năm nào)
    pool.query<{ year: number }>(
      `SELECT DISTINCT EXTRACT(YEAR FROM created_at AT TIME ZONE '${TZ}')::int AS year FROM orders`,
    ),
  ]);

  const k = kpi.rows[0];
  const revenue = Number(k.revenue);
  const completed = Number(k.completed);

  return {
    period,
    years: [...new Set([currentYear(), ...years.rows.map((r) => r.year)])].sort((a, b) => b - a),
    revenue: { current: revenue, previous: Number(k.prevRevenue) },
    orders: { current: Number(k.orders), previous: Number(k.prevOrders) },
    newCustomers: { current: Number(customers.rows[0].current), previous: Number(customers.rows[0].previous) },
    totalCustomers: Number(customers.rows[0].total),
    averageOrderValue: completed ? Math.round(revenue / completed) : 0,
    pendingOrders: Number(k.pending),
    chart: { unit: period.kind === "days" ? ("day" as const) : ("month" as const), points: chart.rows },
    topProducts: topProducts.rows,
    recentOrders: recentOrders.rows,
    lowStock: lowStock.rows,
    statusCounts: Object.fromEntries(statusCounts.rows.map((r) => [r.status, r.count])),
  };
}
