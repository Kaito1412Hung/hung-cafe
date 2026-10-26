/** Realtime (Socket.IO): đúng người nhận đúng tin, người khác không nhận, chưa có vé thì không vào được */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import { app } from "../../src/app";
import { pool } from "../../src/db/pool";
import { closeRealtime, initRealtime } from "../../src/realtime/socket";
import { signToken } from "../../src/utils/jwt";
import { adminBrowser, checkoutBody, newCustomer, simpleProduct } from "../helpers";

let server: Server;
let url = "";
const sockets: Socket[] = [];

beforeAll(async () => {
  server = createServer(app);
  initRealtime(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  closeRealtime();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

/** Mở kết nối realtime bằng vé lấy từ API (giống trình duyệt) */
async function openSocket(b: { get: (p: string) => PromiseLike<{ status: number; body: { data: { token: string } } }> }) {
  const res = await b.get("/auth/socket-token");
  expect(res.status).toBe(200);
  const socket = connect(url, { auth: { token: res.body.data.token }, transports: ["websocket"], forceNew: true });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  return socket;
}

/** Ghi lại mọi sự kiện nhận được */
function record(socket: Socket) {
  const events: { name: string; data: any }[] = [];
  socket.onAny((name, data) => events.push({ name, data }));
  return events;
}

/** Chờ tới khi có sự kiện thoả điều kiện (tối đa 3 giây) */
async function waitFor(events: { name: string; data: any }[], match: (e: { name: string; data: any }) => boolean) {
  for (let i = 0; i < 60; i++) {
    const found = events.find(match);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("Không nhận được sự kiện mong đợi");
}
const settle = () => new Promise((r) => setTimeout(r, 300));

describe("Realtime (Socket.IO)", () => {
  test("không có vé / vé sai / dùng cookie đăng nhập làm vé → bị từ chối", async () => {
    const tryConnect = (auth: object) =>
      new Promise<string>((resolve) => {
        const s = connect(url, { auth, transports: ["websocket"], forceNew: true, reconnection: false });
        sockets.push(s);
        s.once("connect", () => resolve("connected"));
        s.once("connect_error", (err) => resolve(err.message));
      });
    expect(await tryConnect({})).toBe("unauthorized");
    expect(await tryConnect({ token: "ve-gia" })).toBe("unauthorized");
    // Vé đăng nhập (cookie) không dùng được cho realtime và ngược lại
    expect(await tryConnect({ token: signToken({ id: 1, tokenVersion: 0 }) })).toBe("unauthorized");
  });

  test("khách đặt đơn → admin nhận ngay 'order:new' + thông báo chuông 'notification:new'", async () => {
    const admin = await adminBrowser();
    const adminEvents = record(await openSocket(admin));
    const p = await simpleProduct(2);
    const k = await newCustomer();
    await k.post("/cart/items", { productId: p.id, quantity: 1 });
    const order = (await k.post("/orders", checkoutBody)).body.data;

    await waitFor(adminEvents, (e) => e.name === "order:new" && e.data.id === order.id);
    const bell = await waitFor(adminEvents, (e) => e.name === "notification:new" && e.data.type === "new_order");
    expect(bell.data.title).toContain(String(order.id));
  });

  test("admin đổi trạng thái → đúng khách đó nhận 'order:updated' + chuông; khách khác KHÔNG nhận", async () => {
    const p = await simpleProduct(2);
    const owner = await newCustomer();
    const stranger = await newCustomer();
    const ownerEvents = record(await openSocket(owner));
    const strangerEvents = record(await openSocket(stranger));

    await owner.post("/cart/items", { productId: p.id, quantity: 1 });
    const order = (await owner.post("/orders", checkoutBody)).body.data;
    await (await adminBrowser()).patch(`/orders/${order.id}/status`, { status: "confirmed" });

    const updated = await waitFor(ownerEvents, (e) => e.name === "order:updated" && e.data.id === order.id);
    expect(updated.data.status).toBe("confirmed");
    await waitFor(ownerEvents, (e) => e.name === "notification:new" && e.data.type === "order_status");

    await settle();
    expect(strangerEvents).toHaveLength(0); // không lộ đơn của người khác
  });

  test("khách không nhận tin dành cho admin (đơn mới của người khác)", async () => {
    const watcher = await newCustomer();
    const events = record(await openSocket(watcher));
    const p = await simpleProduct(2);
    const buyer = await newCustomer();
    await buyer.post("/cart/items", { productId: p.id, quantity: 1 });
    await buyer.post("/orders", checkoutBody);
    await settle();
    expect(events).toHaveLength(0);
  });

  test("đặt đơn bị lỗi (giỏ trống) → không gửi tin 'đơn mới' ảo", async () => {
    const k = await newCustomer(); // tạo khách trước để admin không nhận thông báo "khách mới đăng ký"
    const adminEvents = record(await openSocket(await adminBrowser()));
    expect((await k.post("/orders", checkoutBody)).status).toBe(400);
    await settle();
    expect(adminEvents.filter((e) => e.name === "order:new")).toHaveLength(0);
  });

  test("chỉ gửi sau khi lưu xong: lỗi giữa transaction (hết hàng) → không có thông báo nào", async () => {
    const p = await simpleProduct(3);
    const old = (await pool.query("SELECT stock FROM products WHERE id = $1", [p.id])).rows[0].stock;
    const k = await newCustomer(); // tạo khách trước để admin không nhận thông báo "khách mới đăng ký"
    await k.post("/cart/items", { productId: p.id, quantity: 2 });
    const adminEvents = record(await openSocket(await adminBrowser()));
    await pool.query("UPDATE products SET stock = 1 WHERE id = $1", [p.id]); // kho tụt sau khi bỏ vào giỏ
    expect((await k.post("/orders", checkoutBody)).status).toBe(400);
    await settle();
    expect(adminEvents).toHaveLength(0);
    await pool.query("UPDATE products SET stock = $1 WHERE id = $2", [old, p.id]);
  });
});
