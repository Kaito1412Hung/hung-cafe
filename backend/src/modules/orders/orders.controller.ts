import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import * as orderService from "./orders.service";

function parseId(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "Mã đơn không hợp lệ");
  return id;
}

/* ----- Khách hàng ----- */

export async function checkout(req: Request, res: Response) {
  res.status(201).json({ data: await orderService.checkout(req.user!.id, req.body) });
}

/** Số nguyên dương trong query (?limit=10), sai / thiếu thì dùng giá trị mặc định, không vượt `max` */
function intParam(value: unknown, fallback: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

/** GET /orders/my?limit=10&offset=0 → { data, total } (nút "Xem thêm" tải tiếp) */
export async function listMine(req: Request, res: Response) {
  const limit = intParam(req.query.limit, 10, 50);
  const offset = Number.isInteger(Number(req.query.offset)) && Number(req.query.offset) > 0 ? Number(req.query.offset) : 0;
  const { orders, total } = await orderService.findByUser(req.user!.id, { limit, offset });
  res.json({ data: orders, total });
}

export async function cancelMine(req: Request, res: Response) {
  res.json({ data: await orderService.cancelByCustomer(req.user!.id, parseId(req), req.body.reason) });
}

export async function reorderMine(req: Request, res: Response) {
  res.json({ data: await orderService.reorder(req.user!.id, parseId(req)) });
}

/** Admin xem được mọi đơn, khách chỉ xem được đơn của mình */
export async function getOne(req: Request, res: Response) {
  const order = await orderService.findById(parseId(req));
  if (req.user!.role !== "admin" && order.userId !== req.user!.id) {
    throw new AppError(404, "Không tìm thấy đơn hàng");
  }
  res.json({ data: order });
}

/* ----- Admin ----- */

export async function listAll(req: Request, res: Response) {
  const { status, search } = req.query;
  // ?page=2&pageSize=10 → chia trang ở server; không gửi pageSize → trả hết (giữ tương thích)
  const pageSize = req.query.pageSize ? intParam(req.query.pageSize, 10, 100) : undefined;
  const page = intParam(req.query.page, 1, 100000);
  const [{ orders, total }, summary] = await Promise.all([
    orderService.findAll({
      status: typeof status === "string" && status !== "all" ? status : undefined,
      search: typeof search === "string" && search.trim() ? search.trim() : undefined,
      page,
      pageSize,
    }),
    orderService.getSummary(),
  ]);
  res.json({ data: orders, total, page, pageSize: pageSize ?? total, summary });
}

export async function updateStatus(req: Request, res: Response) {
  res.json({ data: await orderService.changeStatus(parseId(req), req.body.status, { reason: req.body.reason }) });
}
