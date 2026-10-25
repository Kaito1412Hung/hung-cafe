/** Tài khoản + phân quyền + tài khoản demo dùng chung (gọi API thật trên database hung_cafe_test) */
import { afterAll, describe, expect, test } from "vitest";
import { pool } from "../../src/db/pool";
import { ADMIN, browser, newCustomer, uniqueEmail } from "../helpers";

afterAll(() => pool.end());

describe("Đăng ký / đăng nhập", () => {
  test("đăng ký xong tự đăng nhập, /auth/me trả đúng người", async () => {
    const k = await newCustomer();
    const me = await k.get("/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: k.email, role: "customer" });
    expect(me.body.user.passwordHash).toBeUndefined(); // không bao giờ trả mật khẩu
  });

  test("đăng ký trùng email → 409", async () => {
    const k = await newCustomer();
    const res = await browser().post("/auth/register", { name: "Người khác", email: k.email, password: "matkhau123" });
    expect(res.status).toBe(409);
  });

  test("cookie đăng nhập là httpOnly (JavaScript trên trình duyệt không đọc được)", async () => {
    const res = await browser().post("/auth/register", { name: "Khách Test", email: uniqueEmail(), password: "matkhau123" });
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  test("sai mật khẩu → 401, sai 5 lần → khoá đăng nhập 429 (kể cả đúng mật khẩu)", async () => {
    const k = await newCustomer();
    const b = browser();
    for (let i = 0; i < 5; i++) expect((await b.login(k.email, "sai-mat-khau")).status).toBe(401);
    const locked = await b.login(k.email, "matkhau123");
    expect(locked.status).toBe(429);
    expect(locked.body.message).toMatch(/sai mật khẩu 5 lần/);
  });

  test("chưa đăng nhập: /auth/me trả user null (không báo lỗi đỏ)", async () => {
    const res = await browser().get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });
});

describe("Phân quyền", () => {
  test("chưa đăng nhập gọi giỏ hàng / đơn của tôi → 401", async () => {
    const b = browser();
    expect((await b.get("/cart")).status).toBe(401);
    expect((await b.get("/orders/my")).status).toBe(401);
  });

  test("khách gọi API của admin → 403", async () => {
    const k = await newCustomer();
    expect((await k.get("/orders")).status).toBe(403);
    expect((await k.get("/admin/stats")).status).toBe(403);
    expect((await k.post("/products", {})).status).toBe(403);
  });

  test("admin gọi được API quản trị", async () => {
    const a = browser();
    expect((await a.login(ADMIN.email, ADMIN.password)).status).toBe(200);
    expect((await a.get("/admin/stats?days=7")).status).toBe(200);
    expect((await a.get("/orders?page=1&pageSize=10")).status).toBe(200);
  });

  test("dữ liệu sai dạng → 400 kèm lỗi từng ô", async () => {
    const res = await browser().post("/auth/register", { name: "A", email: "khong-phai-email", password: "1" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });
});

describe("Tài khoản demo dùng chung (DEMO_EMAILS)", () => {
  const DEMO = { email: "demo@test.local", password: "demo123456" };

  test("không đổi được mật khẩu / hồ sơ / ảnh / đăng xuất mọi thiết bị / xoá tài khoản", async () => {
    await browser().post("/auth/register", { name: "Khách Demo", ...DEMO });
    const d = browser();
    expect((await d.login(DEMO.email, DEMO.password)).status).toBe(200);
    expect((await d.patch("/auth/password", { currentPassword: DEMO.password, newPassword: "matkhaumoi1" })).status).toBe(403);
    expect((await d.patch("/auth/me", { name: "Tên bậy" })).status).toBe(403);
    expect((await d.put("/auth/me/avatar", { avatar: "data:image/jpeg;base64,/9j/4AAQ" })).status).toBe(403);
    expect((await d.post("/auth/logout-all")).status).toBe(403);
    const del = await d.delete("/auth/me", { password: DEMO.password });
    expect(del.status).toBe(403);
    expect(del.body.message).toMatch(/tài khoản demo/);
    // Mật khẩu không đổi → vẫn đăng nhập được
    expect((await browser().login(DEMO.email, DEMO.password)).status).toBe(200);
  });

  test("gõ sai mật khẩu nhiều lần không khoá tài khoản demo", async () => {
    const b = browser();
    for (let i = 0; i < 6; i++) expect((await b.login(DEMO.email, "sai-" + i)).status).toBe(401);
    expect((await browser().login(DEMO.email, DEMO.password)).status).toBe(200);
  });

  test("tài khoản thường vẫn sửa hồ sơ được", async () => {
    const k = await newCustomer();
    expect((await k.patch("/auth/me", { phone: "0909000111" })).status).toBe(200);
  });
});
