import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import * as cartService from "./cart.service";

// Mọi route giỏ hàng đều qua requireAuth nên req.user luôn có
const userId = (req: Request) => req.user!.id;

function parseProductId(req: Request) {
  const id = Number(req.params.productId);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID sản phẩm không hợp lệ");
  return id;
}

export async function get(req: Request, res: Response) {
  res.json({ data: await cartService.getCart(userId(req)) });
}

export async function addItem(req: Request, res: Response) {
  res.status(201).json({ data: await cartService.addItem(userId(req), req.body) });
}

export async function updateItem(req: Request, res: Response) {
  res.json({ data: await cartService.updateQuantity(userId(req), parseProductId(req), req.body.quantity) });
}

export async function removeItem(req: Request, res: Response) {
  res.json({ data: await cartService.removeItem(userId(req), parseProductId(req)) });
}

export async function clear(req: Request, res: Response) {
  res.json({ data: await cartService.clear(userId(req)) });
}
