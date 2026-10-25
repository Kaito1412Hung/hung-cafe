/** Hàm dùng chung cho test API: gọi API như trình duyệt (giữ cookie đăng nhập), mỗi "người" có IP riêng */
import request from "supertest";
import { app } from "../src/app";
import { pool } from "../src/db/pool";

export const ADMIN = { email: "admin@test.local", password: "TestAdmin#2026" };

let ipCounter = 10;
/** IP giả khác nhau cho mỗi người dùng → không bị giới hạn tần suất (rate limit) của nhau */
export const nextIp = () => `203.0.113.${ipCounter++}`;

let emailCounter = 0;
export const uniqueEmail = (prefix = "khach") => `${prefix}${Date.now()}${emailCounter++}@test.local`;

/** Một "trình duyệt" riêng: tự nhớ cookie sau khi đăng nhập */
export function browser(ip = nextIp()) {
  const agent = request.agent(app);
  const send = (method: "get" | "post" | "put" | "patch" | "delete", path: string, body?: object) => {
    const req = agent[method](`/api${path}`).set("X-Forwarded-For", ip);
    return body ? req.send(body) : req;
  };
  return {
    ip,
    get: (path: string) => send("get", path),
    post: (path: string, body?: object) => send("post", path, body),
    put: (path: string, body?: object) => send("put", path, body),
    patch: (path: string, body?: object) => send("patch", path, body),
    delete: (path: string, body?: object) => send("delete", path, body),
    login: (email: string, password: string) => send("post", "/auth/login", { email, password }),
  };
}

/** Khách mới: đăng ký (tự đăng nhập luôn) */
export async function newCustomer(prefix = "khach") {
  const b = browser();
  const email = uniqueEmail(prefix);
  const res = await b.post("/auth/register", { name: "Khách Test", email, password: "matkhau123" });
  if (res.status !== 201) throw new Error(`Đăng ký thất bại: ${res.status} ${JSON.stringify(res.body)}`);
  return { ...b, email, user: res.body.user };
}

export async function adminBrowser() {
  const b = browser();
  const res = await b.login(ADMIN.email, ADMIN.password);
  if (res.status !== 200) throw new Error(`Admin đăng nhập thất bại: ${res.status}`);
  return b;
}

/** Món đang bán, không có lựa chọn size / đá (đồ ăn), còn đủ hàng */
export async function simpleProduct(minStock = 5) {
  const { rows } = await pool.query<{ id: number; price: number; stock: number }>(
    `SELECT id, price, stock FROM products WHERE serve = 'none' AND is_available AND stock >= $1 ORDER BY id LIMIT 1`,
    [minStock],
  );
  return rows[0];
}

export async function stockOf(productId: number) {
  const { rows } = await pool.query<{ stock: number }>("SELECT stock FROM products WHERE id = $1", [productId]);
  return rows[0].stock;
}

export const checkoutBody = { customerName: "Khách Test", phone: "0901234567", fulfillment: "pickup", paymentMethod: "cod" };
