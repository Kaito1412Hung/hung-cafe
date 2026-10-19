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

export async function listMine(req: Request, res: Response) {
  res.json({ data: await orderService.findByUser(req.user!.id) });
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
  const [orders, summary] = await Promise.all([
    orderService.findAll({
      status: typeof status === "string" && status !== "all" ? status : undefined,
      search: typeof search === "string" && search.trim() ? search.trim() : undefined,
    }),
    orderService.getSummary(),
  ]);
  res.json({ data: orders, summary });
}

export async function updateStatus(req: Request, res: Response) {
  res.json({ data: await orderService.changeStatus(parseId(req), req.body.status, { reason: req.body.reason }) });
}
