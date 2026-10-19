import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import * as cartService from "./cart.service";

// Mọi route giỏ hàng đều qua requireAuth nên req.user luôn có
const userId = (req: Request) => req.user!.id;

/** Mã dòng trong giỏ (không phải mã món — cùng món khác size là 2 dòng) */
function parseLineId(req: Request) {
  const id = Number(req.params.lineId);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "Mã dòng giỏ hàng không hợp lệ");
  return id;
}

export async function get(req: Request, res: Response) {
  res.json({ data: await cartService.getCart(userId(req)) });
}

export async function addItem(req: Request, res: Response) {
  res.status(201).json({ data: await cartService.addItem(userId(req), req.body) });
}

export async function updateItem(req: Request, res: Response) {
  res.json({ data: await cartService.updateQuantity(userId(req), parseLineId(req), req.body.quantity) });
}

export async function removeItem(req: Request, res: Response) {
  res.json({ data: await cartService.removeItem(userId(req), parseLineId(req)) });
}

export async function clear(req: Request, res: Response) {
  res.json({ data: await cartService.clear(userId(req)) });
}
