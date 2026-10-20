import { Router } from "express";
import ExcelJS from "exceljs";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { pool } from "../../db/pool";
import { describeOptions } from "../cart/options";
import { STATUS_LABELS, type OrderStatus } from "../orders/orders.schema";
import { calendarDaysStart, monthSpan, parsePeriod, periodRange } from "./period";

/** GET /api/admin/reports/revenue?days=30 (hoặc ?year=2026) → tải file Excel (.xlsx) báo cáo doanh thu */
export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole("admin"));

const TZ = "Asia/Ho_Chi_Minh";
const MONEY = '#,##0" đ"';
const BROWN = "FF4A2C1D";

/** Định dạng dòng tiêu đề của bảng: nền nâu, chữ trắng, đậm */
function styleHeader(sheet: ExcelJS.Worksheet, rowNumber = 1) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BROWN } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
}

reportsRouter.get("/revenue", async (req, res) => {
  const period = parsePeriod(req.query, 30);
  // N ngày: tính theo ngày lịch (từ 00:00); cả năm: 1/1 → hiện tại
  const start = period.kind === "days" ? calendarDaysStart(period.days) : periodRange(period).start;
  const end = period.kind === "days" ? new Date() : periodRange(period).end;
  const range = `o.created_at >= $1 AND o.created_at < $2`;
  const bounds = [start, end];
  const months = period.kind === "year" ? monthSpan(period.year) : null;

  const [summary, daily, products, orders, settings] = await Promise.all([
    pool.query<{ total: number; completed: number; cancelled: number; revenue: number; discount: number; shipping: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
              COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0)::int AS revenue,
              COALESCE(SUM(discount) FILTER (WHERE status = 'completed'), 0)::int AS discount,
              COALESCE(SUM(shipping_fee) FILTER (WHERE status = 'completed'), 0)::int AS shipping
       FROM orders o WHERE ${range}`,
      bounds,
    ),
    // Theo ngày (N ngày) hoặc theo tháng (cả năm)
    months
      ? pool.query<{ date: string; orders: number; completed: number; revenue: number }>(
          `SELECT 'Tháng ' || to_char(m, 'MM/YYYY') AS date,
                  COUNT(o.id) FILTER (WHERE o.status <> 'cancelled')::int AS orders,
                  COUNT(o.id) FILTER (WHERE o.status = 'completed')::int AS completed,
                  COALESCE(SUM(o.total) FILTER (WHERE o.status = 'completed'), 0)::int AS revenue
           FROM generate_series($1::date, $2::date, INTERVAL '1 month') AS m
           LEFT JOIN orders o ON date_trunc('month', o.created_at AT TIME ZONE '${TZ}') = m
           GROUP BY m ORDER BY m`,
          [months.first, months.last],
        )
      : pool.query<{ date: string; orders: number; completed: number; revenue: number }>(
          `SELECT to_char(d, 'DD/MM/YYYY') AS date,
                  COUNT(o.id) FILTER (WHERE o.status <> 'cancelled')::int AS orders,
                  COUNT(o.id) FILTER (WHERE o.status = 'completed')::int AS completed,
                  COALESCE(SUM(o.total) FILTER (WHERE o.status = 'completed'), 0)::int AS revenue
           FROM generate_series((NOW() AT TIME ZONE '${TZ}')::date - ($1::int - 1), (NOW() AT TIME ZONE '${TZ}')::date, INTERVAL '1 day') AS d
           LEFT JOIN orders o ON (o.created_at AT TIME ZONE '${TZ}')::date = d::date
           GROUP BY d ORDER BY d`,
          [period.kind === "days" ? period.days : 0],
        ),
    pool.query<{ name: string; quantity: number; revenue: number }>(
      `SELECT oi.product_name AS name, SUM(oi.quantity)::int AS quantity, SUM(oi.line_total)::int AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'completed' AND ${range}
       GROUP BY oi.product_name ORDER BY quantity DESC, revenue DESC`,
      bounds,
    ),
    pool.query<{
      id: number;
      createdAt: string;
      customerName: string;
      phone: string;
      status: OrderStatus;
      subtotal: number;
      couponCode: string;
      discount: number;
      shippingFee: number;
      total: number;
      cancelReason: string;
      fulfillment: string;
      scheduledAt: string | null;
      items: { name: string; quantity: number; size: string; sugar: string; temp: string; ice: string; note: string; toppings: { name: string }[] }[];
    }>(
      `SELECT o.id, to_char(o.created_at AT TIME ZONE '${TZ}', 'DD/MM/YYYY HH24:MI') AS "createdAt",
              o.customer_name AS "customerName", o.phone, o.status, o.subtotal, o.coupon_code AS "couponCode",
              o.discount, o.shipping_fee AS "shippingFee", o.total, o.cancel_reason AS "cancelReason",
              o.fulfillment, to_char(o.scheduled_at AT TIME ZONE '${TZ}', 'DD/MM/YYYY HH24:MI') AS "scheduledAt",
              json_agg(json_build_object('name', oi.product_name, 'quantity', oi.quantity,
                'size', oi.size, 'sugar', oi.sugar, 'temp', oi.temp, 'ice', oi.ice, 'note', oi.note, 'toppings', oi.toppings) ORDER BY oi.id) AS items
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE ${range}
       GROUP BY o.id ORDER BY o.created_at DESC`,
      bounds,
    ),
    pool.query<{ value: { name?: string } }>("SELECT value FROM settings WHERE key = 'shop'"),
  ]);

  const shopName = settings.rows[0]?.value.name ?? "Hưng Café";
  const s = summary.rows[0];
  const fmtDate = (d: Date) => d.toLocaleDateString("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
  const rangeText =
    period.kind === "days"
      ? `Từ ${daily.rows[0]?.date} đến ${daily.rows[daily.rows.length - 1]?.date} (${period.days} ngày)`
      : `Năm ${period.year}: từ ${fmtDate(start)} đến ${fmtDate(new Date(end.getTime() - 1))}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = shopName;
  wb.created = new Date();

  /* ----- Sheet 1: Tổng quan ----- */
  const overview = wb.addWorksheet("Tổng quan");
  overview.columns = [{ width: 34 }, { width: 22 }];
  overview.addRow([`BÁO CÁO DOANH THU — ${shopName.toUpperCase()}`]).font = { bold: true, size: 14, color: { argb: BROWN } };
  overview.addRow([rangeText]).font = { italic: true };
  overview.addRow([`Xuất lúc ${new Date().toLocaleString("vi-VN", { timeZone: TZ })}`]).font = { italic: true, color: { argb: "FF888888" } };
  overview.addRow([]);
  overview.addRow(["Chỉ số", "Giá trị"]);
  styleHeader(overview, 5);
  const metrics: [string, number, boolean?][] = [
    ["Doanh thu (đơn hoàn thành)", s.revenue, true],
    ["Số đơn đã đặt", s.total],
    ["Số đơn hoàn thành", s.completed],
    ["Số đơn đã huỷ", s.cancelled],
    ["Tỉ lệ huỷ", s.total ? s.cancelled / s.total : 0],
    ["Giá trị trung bình / đơn", s.completed ? Math.round(s.revenue / s.completed) : 0, true],
    ["Tổng tiền đã giảm (mã giảm giá)", s.discount, true],
    ["Tổng phí giao hàng đã thu", s.shipping, true],
  ];
  for (const [label, value, isMoney] of metrics) {
    const row = overview.addRow([label, value]);
    if (isMoney) row.getCell(2).numFmt = MONEY;
    if (label === "Tỉ lệ huỷ") row.getCell(2).numFmt = "0.0%";
  }
  overview.getRow(6).font = { bold: true };

  /* ----- Sheet 2: Theo ngày (hoặc theo tháng khi xem cả năm) ----- */
  const byDay = wb.addWorksheet(months ? "Theo tháng" : "Theo ngày");
  byDay.columns = [
    { header: months ? "Tháng" : "Ngày", key: "date", width: 16 },
    { header: "Số đơn (không tính huỷ)", key: "orders", width: 24 },
    { header: "Đơn hoàn thành", key: "completed", width: 18 },
    { header: "Doanh thu", key: "revenue", width: 18, style: { numFmt: MONEY } },
  ];
  styleHeader(byDay);
  byDay.addRows(daily.rows);
  const dayTotal = byDay.addRow({
    date: "Tổng",
    orders: daily.rows.reduce((a, r) => a + r.orders, 0),
    completed: daily.rows.reduce((a, r) => a + r.completed, 0),
    revenue: daily.rows.reduce((a, r) => a + r.revenue, 0),
  });
  dayTotal.font = { bold: true };

  /* ----- Sheet 3: Món bán chạy ----- */
  const top = wb.addWorksheet("Món bán chạy");
  top.columns = [
    { header: "#", key: "rank", width: 6 },
    { header: "Món", key: "name", width: 28 },
    { header: "Số lượng đã bán", key: "quantity", width: 18 },
    { header: "Doanh thu món", key: "revenue", width: 18, style: { numFmt: MONEY } },
  ];
  styleHeader(top);
  products.rows.forEach((p, i) => top.addRow({ rank: i + 1, ...p }));

  /* ----- Sheet 4: Danh sách đơn ----- */
  const list = wb.addWorksheet("Danh sách đơn");
  list.columns = [
    { header: "Mã đơn", key: "code", width: 10 },
    { header: "Thời gian", key: "createdAt", width: 17 },
    { header: "Khách hàng", key: "customerName", width: 22 },
    { header: "SĐT", key: "phone", width: 13 },
    { header: "Hình thức", key: "fulfillment", width: 14 },
    { header: "Hẹn giờ", key: "scheduledAt", width: 17 },
    { header: "Món", key: "items", width: 48 },
    { header: "Trạng thái", key: "status", width: 14 },
    { header: "Tạm tính", key: "subtotal", width: 13, style: { numFmt: MONEY } },
    { header: "Mã giảm giá", key: "couponCode", width: 13 },
    { header: "Giảm", key: "discount", width: 11, style: { numFmt: MONEY } },
    { header: "Phí giao", key: "shippingFee", width: 11, style: { numFmt: MONEY } },
    { header: "Tổng", key: "total", width: 13, style: { numFmt: MONEY } },
    { header: "Lý do huỷ", key: "cancelReason", width: 28 },
  ];
  styleHeader(list);
  for (const o of orders.rows) {
    const row = list.addRow({
      ...o,
      code: `#${String(o.id).padStart(5, "0")}`,
      status: STATUS_LABELS[o.status],
      fulfillment: o.fulfillment === "pickup" ? "Đến quán lấy" : "Giao tận nơi",
      scheduledAt: o.scheduledAt ?? "",
      items: o.items
        .map((i) => {
          const opts = describeOptions(i);
          return `${i.quantity} × ${i.name}${opts ? ` (${opts})` : ""}`;
        })
        .join("\n"),
    });
    row.getCell("items").alignment = { wrapText: true, vertical: "top" };
    if (o.status === "cancelled") row.font = { color: { argb: "FFB91C1C" } };
  }

  // Cố định dòng tiêu đề khi cuộn + bật bộ lọc
  for (const sheet of [byDay, top, list]) {
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  }

  const fileName =
    period.kind === "days"
      ? `bao-cao-doanh-thu-${period.days}-ngay-${new Date().toISOString().slice(0, 10)}.xlsx`
      : `bao-cao-doanh-thu-nam-${period.year}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await wb.xlsx.write(res);
  res.end();
});
