import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import { availableMap } from "../toppings/toppings.service";
import type { AddItemInput, Cart, CartItem } from "./cart.schema";
import { normalizeOptions, parseToppingIds, sizeExtra, type ProductOptionConfig } from "./options";

const OPTION_COLUMNS = `p.has_size AS "hasSize", p.has_sugar AS "hasSugar", p.serve, p.allow_toppings AS "allowToppings"`;

/** Lấy giỏ hàng: JOIN với products để luôn có giá / tồn kho mới nhất; giá topping lấy theo bảng topping hiện tại */
export async function getCart(userId: number): Promise<Cart> {
  const [{ rows }, toppingMap] = await Promise.all([
    pool.query<Omit<CartItem, "toppings" | "unitPrice" | "lineTotal"> & { toppingIds: string }>(
      `SELECT c.id, p.id AS "productId", p.slug, p.name, p.price, p.image, p.category, p.stock,
              p.is_available AS "isAvailable", ${OPTION_COLUMNS},
              c.size, c.sugar, c.temp, c.ice, c.toppings AS "toppingIds", c.note, c.quantity
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1
       ORDER BY c.created_at, c.id`,
      [userId],
    ),
    availableMap(),
  ]);

  const items: CartItem[] = rows.map(({ toppingIds, ...row }) => {
    const toppings = parseToppingIds(toppingIds).flatMap((id) => toppingMap.get(id) ?? []);
    const unitPrice = row.price + sizeExtra(row.size) + toppings.reduce((s, t) => s + t.price, 0);
    return { ...row, toppings, unitPrice, lineTotal: unitPrice * row.quantity };
  });

  const purchasable = items.filter((i) => i.isAvailable && i.stock > 0);
  return {
    items,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: purchasable.reduce((sum, i) => sum + i.lineTotal, 0),
  };
}

/** Tổng số phần của 1 món đang có trong giỏ (cộng mọi size), trừ dòng `excludeLineId` */
async function quantityInCart(userId: number, productId: number, excludeLineId = 0) {
  const { rows } = await pool.query<{ total: number }>(
    "SELECT COALESCE(SUM(quantity), 0)::int AS total FROM cart_items WHERE user_id = $1 AND product_id = $2 AND id <> $3",
    [userId, productId, excludeLineId],
  );
  return rows[0].total;
}

async function getProduct(productId: number) {
  const { rows } = await pool.query<{ name: string; stock: number; isAvailable: boolean } & ProductOptionConfig>(
    `SELECT p.name, p.stock, p.is_available AS "isAvailable", ${OPTION_COLUMNS} FROM products p WHERE p.id = $1`,
    [productId],
  );
  if (!rows[0]) throw new AppError(404, "Không tìm thấy sản phẩm");
  return rows[0];
}

/** Kiểm tra món còn bán và đủ hàng cho tổng số phần (mọi size cộng lại) */
function assertPurchasable(product: { name: string; stock: number; isAvailable: boolean }, totalQuantity: number) {
  if (!product.isAvailable || product.stock === 0) throw new AppError(400, `"${product.name}" đang tạm hết`);
  if (totalQuantity > product.stock) {
    throw new AppError(400, `"${product.name}" chỉ còn ${product.stock} phần`);
  }
}

export async function addItem(userId: number, input: AddItemInput): Promise<Cart> {
  const product = await getProduct(input.productId);
  const options = normalizeOptions(product, input, await availableMap());

  const existing = await pool.query<{ quantity: number }>(
    `SELECT quantity FROM cart_items
     WHERE user_id = $1 AND product_id = $2 AND size = $3 AND sugar = $4 AND temp = $5 AND ice = $6 AND toppings = $7 AND note = $8`,
    [userId, input.productId, options.size, options.sugar, options.temp, options.ice, options.toppings, options.note],
  );
  if ((existing.rows[0]?.quantity ?? 0) + input.quantity > 99) throw new AppError(400, "Mỗi món tối đa 99 phần");
  assertPurchasable(product, (await quantityInCart(userId, input.productId)) + input.quantity);

  // Cùng món + cùng lựa chọn đã có trong giỏ → cộng dồn số lượng (UPSERT)
  await pool.query(
    `INSERT INTO cart_items (user_id, product_id, size, sugar, temp, ice, toppings, note, quantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, product_id, size, sugar, temp, ice, toppings, note)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = NOW()`,
    [userId, input.productId, options.size, options.sugar, options.temp, options.ice, options.toppings, options.note, input.quantity],
  );
  return getCart(userId);
}

async function findLine(userId: number, lineId: number) {
  const { rows } = await pool.query<{ productId: number }>(`SELECT product_id AS "productId" FROM cart_items WHERE id = $1 AND user_id = $2`, [
    lineId,
    userId,
  ]);
  if (!rows[0]) throw new AppError(404, "Món này không có trong giỏ hàng");
  return rows[0];
}

export async function updateQuantity(userId: number, lineId: number, quantity: number): Promise<Cart> {
  const { productId } = await findLine(userId, lineId);
  assertPurchasable(await getProduct(productId), (await quantityInCart(userId, productId, lineId)) + quantity);
  await pool.query("UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3", [quantity, lineId, userId]);
  return getCart(userId);
}

export async function removeItem(userId: number, lineId: number): Promise<Cart> {
  await pool.query("DELETE FROM cart_items WHERE id = $1 AND user_id = $2", [lineId, userId]);
  return getCart(userId);
}

export async function clear(userId: number): Promise<Cart> {
  await pool.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
  return getCart(userId);
}
