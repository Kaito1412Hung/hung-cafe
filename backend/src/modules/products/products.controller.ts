import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import * as productService from "./products.service";

function parseId(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID sản phẩm không hợp lệ");
  return id;
}

export async function list(req: Request, res: Response) {
  const { category, search } = req.query;
  const products = await productService.findAll({
    category: typeof category === "string" ? category : undefined,
    search: typeof search === "string" ? search.trim() : undefined,
  });
  res.json({ data: products });
}

export async function getBySlug(req: Request, res: Response) {
  res.json({ data: await productService.findBySlug(String(req.params.slug)) });
}

export async function getOne(req: Request, res: Response) {
  res.json({ data: await productService.findById(parseId(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await productService.create(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await productService.update(parseId(req), req.body) });
}

export async function remove(req: Request, res: Response) {
  await productService.remove(parseId(req));
  res.status(204).end();
}
