import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import type { AddItemInput, Cart, CartItem } from "./cart.schema";

/** Lấy giỏ hàng: JOIN với products để luôn có giá / tồn kho mới nhất */
export async function getCart(userId: number): Promise<Cart> {
  const { rows } = await pool.query<CartItem>(
    `SELECT p.id AS "productId", p.name, p.price, p.image, p.category, p.stock,
            p.is_available AS "isAvailable",
            c.quantity,
            p.price * c.quantity AS "lineTotal"
     FROM cart_items c
     JOIN products p ON p.id = c.product_id
     WHERE c.user_id = $1
     ORDER BY c.created_at`,
    [userId],
  );

  const purchasable = rows.filter((i) => i.isAvailable && i.stock > 0);
  return {
    items: rows,
    totalQuantity: rows.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: purchasable.reduce((sum, i) => sum + i.lineTotal, 0),
  };
}

/** Kiểm tra sản phẩm còn bán và đủ hàng cho số lượng mong muốn */
async function assertPurchasable(productId: number, quantity: number) {
  const { rows } = await pool.query<{ name: string; stock: number; isAvailable: boolean }>(
    `SELECT name, stock, is_available AS "isAvailable" FROM products WHERE id = $1`,
    [productId],
  );
  const product = rows[0];
  if (!product) throw new AppError(404, "Không tìm thấy sản phẩm");
  if (!product.isAvailable || product.stock === 0) throw new AppError(400, `"${product.name}" đang tạm hết`);
  if (quantity > product.stock) {
    throw new AppError(400, `"${product.name}" chỉ còn ${product.stock} phần`);
  }
}

export async function addItem(userId: number, input: AddItemInput): Promise<Cart> {
  const existing = await pool.query<{ quantity: number }>(
    "SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2",
    [userId, input.productId],
  );
  const newQuantity = (existing.rows[0]?.quantity ?? 0) + input.quantity;
  if (newQuantity > 99) throw new AppError(400, "Mỗi món tối đa 99 phần");
  await assertPurchasable(input.productId, newQuantity);

  // Đã có trong giỏ → cộng dồn số lượng (UPSERT)
  await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = NOW()`,
    [userId, input.productId, input.quantity],
  );
  return getCart(userId);
}

export async function updateQuantity(userId: number, productId: number, quantity: number): Promise<Cart> {
  await assertPurchasable(productId, quantity);
  const { rowCount } = await pool.query(
    "UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND product_id = $3",
    [quantity, userId, productId],
  );
  if (!rowCount) throw new AppError(404, "Món này không có trong giỏ hàng");
  return getCart(userId);
}

export async function removeItem(userId: number, productId: number): Promise<Cart> {
  await pool.query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [userId, productId]);
  return getCart(userId);
}

export async function clear(userId: number): Promise<Cart> {
  await pool.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
  return getCart(userId);
}
