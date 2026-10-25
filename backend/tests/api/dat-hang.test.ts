/** Giỏ hàng → đặt hàng → tồn kho → huỷ → admin xử lý đơn → mã giảm giá (gọi API thật trên database hung_cafe_test) */
import { afterAll, describe, expect, test } from "vitest";
import { pool } from "../../src/db/pool";
import { adminBrowser, checkoutBody, newCustomer, simpleProduct, stockOf } from "../helpers";

afterAll(() => pool.end());

async function customerWithCart(productId: number, quantity: number) {
  const k = await newCustomer();
  const add = await k.post("/cart/items", { productId, quantity });
  expect(add.status).toBe(201);
  return k;
}

describe("Đặt hàng + tồn kho", () => {
  test("đặt hàng: trừ đúng tồn kho, giỏ trống, đơn hiện trong 'Đơn hàng của tôi', tổng tiền đúng", async () => {
    const p = await simpleProduct(5);
    const before = await stockOf(p.id);
    const k = await customerWithCart(p.id, 2);

    const res = await k.post("/orders", checkoutBody);
    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order.status).toBe("pending");
    expect(order.paymentStatus).toBe("unpaid");
    expect(order.total).toBe(p.price * 2); // đến quán lấy → không phí giao

    expect(await stockOf(p.id)).toBe(before - 2);
    expect((await k.get("/cart")).body.data.items).toHaveLength(0);
    expect((await k.get("/orders/my")).body.data[0].id).toBe(order.id);
  });

  test("không cho bỏ vào giỏ nhiều hơn số còn lại", async () => {
    const p = await simpleProduct(1);
    const k = await newCustomer();
    const res = await k.post("/cart/items", { productId: p.id, quantity: (await stockOf(p.id)) + 1 });
    expect(res.status).toBe(400);
  });

  test("2 người cùng mua phần CUỐI CÙNG một lúc → chỉ 1 người mua được, kho không bị âm", async () => {
    const p = await simpleProduct(2);
    const oldStock = await stockOf(p.id);
    const a = await customerWithCart(p.id, 1);
    const b = await customerWithCart(p.id, 1);
    await pool.query("UPDATE products SET stock = 1 WHERE id = $1", [p.id]);

    const [r1, r2] = await Promise.all([a.post("/orders", checkoutBody), b.post("/orders", checkoutBody)]);
    const codes = [r1.status, r2.status].sort();
    expect(codes).toEqual([201, 400]);
    expect(await stockOf(p.id)).toBe(0);

    await pool.query("UPDATE products SET stock = $1 WHERE id = $2", [oldStock, p.id]);
  });

  test("giỏ trống → không đặt được", async () => {
    const k = await newCustomer();
    const res = await k.post("/orders", checkoutBody);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/trống/);
  });

  test("khách huỷ đơn chờ xác nhận → trả lại tồn kho", async () => {
    const p = await simpleProduct(5);
    const before = await stockOf(p.id);
    const k = await customerWithCart(p.id, 3);
    const order = (await k.post("/orders", checkoutBody)).body.data;
    expect(await stockOf(p.id)).toBe(before - 3);

    const res = await k.patch(`/orders/my/${order.id}/cancel`, { reason: "Đặt nhầm" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
    expect(await stockOf(p.id)).toBe(before);
  });

  test("khách không xem được đơn của người khác", async () => {
    const p = await simpleProduct(2);
    const a = await customerWithCart(p.id, 1);
    const order = (await a.post("/orders", checkoutBody)).body.data;
    const b = await newCustomer();
    expect((await b.get(`/orders/${order.id}`)).status).toBe(404);
  });
});

describe("Admin xử lý đơn", () => {
  test("đi đúng thứ tự: chờ → xác nhận → đang giao → hoàn thành; tiền mặt giao xong thành đã thanh toán", async () => {
    const p = await simpleProduct(2);
    const k = await customerWithCart(p.id, 1);
    const order = (await k.post("/orders", checkoutBody)).body.data;
    const a = await adminBrowser();

    for (const status of ["confirmed", "shipping", "completed"]) {
      const res = await a.patch(`/orders/${order.id}/status`, { status });
      expect(res.status, `chuyển sang ${status}`).toBe(200);
      expect(res.body.data.status).toBe(status);
    }
    const done = (await k.get(`/orders/${order.id}`)).body.data;
    expect(done.paymentStatus).toBe("paid");
    expect(done.confirmedAt && done.shippingAt && done.completedAt).toBeTruthy(); // có giờ từng bước
  });

  test("không cho nhảy cóc (chờ xác nhận → hoàn thành)", async () => {
    const p = await simpleProduct(2);
    const k = await customerWithCart(p.id, 1);
    const order = (await k.post("/orders", checkoutBody)).body.data;
    const res = await (await adminBrowser()).patch(`/orders/${order.id}/status`, { status: "completed" });
    expect(res.status).toBe(400);
  });

  test("đơn đã xác nhận thì khách không tự huỷ được nữa", async () => {
    const p = await simpleProduct(2);
    const k = await customerWithCart(p.id, 1);
    const order = (await k.post("/orders", checkoutBody)).body.data;
    await (await adminBrowser()).patch(`/orders/${order.id}/status`, { status: "confirmed" });
    expect((await k.patch(`/orders/my/${order.id}/cancel`, {})).status).toBe(400);
  });

  test("admin huỷ đơn phải ghi lý do, huỷ xong trả lại kho", async () => {
    const p = await simpleProduct(2);
    const before = await stockOf(p.id);
    const k = await customerWithCart(p.id, 1);
    const order = (await k.post("/orders", checkoutBody)).body.data;
    const a = await adminBrowser();
    expect((await a.patch(`/orders/${order.id}/status`, { status: "cancelled" })).status).toBe(400);
    expect((await a.patch(`/orders/${order.id}/status`, { status: "cancelled", reason: "Món trong đơn đã hết" })).status).toBe(200);
    expect(await stockOf(p.id)).toBe(before);
  });
});

describe("Mã giảm giá", () => {
  test("đủ điều kiện → giảm đúng số tiền; hết lượt → không dùng được; huỷ đơn → trả lại lượt", async () => {
    const p = await simpleProduct(5);
    const a = await adminBrowser();
    const code = `TEST${Date.now() % 1_000_000}`;
    const created = await a.post("/coupons", { code, type: "percent", value: 10, usageLimit: 1 });
    expect(created.status).toBe(201);

    const k1 = await customerWithCart(p.id, 2);
    const o1 = await k1.post("/orders", { ...checkoutBody, couponCode: code.toLowerCase() });
    expect(o1.status).toBe(201);
    expect(o1.body.data.discount).toBe(Math.floor((p.price * 2 * 10) / 100));

    // Lượt duy nhất đã dùng → người sau không dùng được
    const k2 = await customerWithCart(p.id, 1);
    expect((await k2.post("/orders", { ...checkoutBody, couponCode: code })).status).toBe(400);

    // Huỷ đơn đầu → mã có lại lượt
    await k1.patch(`/orders/my/${o1.body.data.id}/cancel`, {});
    expect((await k2.post("/orders", { ...checkoutBody, couponCode: code })).status).toBe(201);
  });

  test("chưa đủ giá trị đơn tối thiểu → báo rõ lý do", async () => {
    const p = await simpleProduct(2);
    const a = await adminBrowser();
    const code = `MIN${Date.now() % 1_000_000}`;
    await a.post("/coupons", { code, type: "fixed", value: 20_000, minOrder: 10_000_000 });
    const k = await customerWithCart(p.id, 1);
    const res = await k.post("/coupons/check", { code });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/áp dụng cho đơn từ/);
  });
});
