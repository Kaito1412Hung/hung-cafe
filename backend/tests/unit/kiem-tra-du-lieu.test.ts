/** Kiểm tra dữ liệu gửi lên (zod), giờ mở cửa theo giờ Việt Nam, chữ ký Cloudinary */
import { describe, expect, test } from "vitest";
import { registerSchema } from "../../src/modules/auth/auth.schema";
import { checkoutSchema } from "../../src/modules/orders/orders.schema";
import { addItemSchema } from "../../src/modules/cart/cart.schema";
import { getOpenStatus } from "../../src/modules/settings/settings.service";
import { DEFAULT_SHOP_SETTINGS } from "../../src/modules/settings/settings.schema";
import { optimizedUrl, signParams } from "../../src/modules/uploads/cloudinary";
import { createHash } from "node:crypto";

describe("Đăng ký (registerSchema)", () => {
  test("hợp lệ → email tự viết thường, bỏ khoảng trắng", () => {
    const r = registerSchema.safeParse({ name: " Khách Test ", email: " Khach@Test.LOCAL ", password: "matkhau123" });
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("khach@test.local");
  });
  test("email sai dạng, mật khẩu < 6 ký tự, tên 1 chữ → bị chặn", () => {
    const r = registerSchema.safeParse({ name: "A", email: "khachtest.local", password: "123" });
    expect(r.success).toBe(false);
    const fields = r.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });
});

describe("Đặt hàng (checkoutSchema)", () => {
  const base = { customerName: "Khách Test", phone: "0901 234 567", fulfillment: "delivery", address: "12 Lê Lợi, Quận 1" };
  test("số điện thoại có dấu cách / dấu chấm → tự bỏ đi", () => {
    expect(checkoutSchema.parse(base).phone).toBe("0901234567");
  });
  test("số điện thoại sai → bị chặn", () => {
    expect(checkoutSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
  });
  test("giao tận nơi mà thiếu địa chỉ → bị chặn; đến quán lấy thì không cần", () => {
    expect(checkoutSchema.safeParse({ ...base, address: "" }).success).toBe(false);
    expect(checkoutSchema.parse({ ...base, fulfillment: "pickup", address: "abc" }).address).toBe("");
  });
  test("mặc định thanh toán tiền mặt, mã giảm giá tự viết hoa", () => {
    const r = checkoutSchema.parse({ ...base, couponCode: "giam10" });
    expect(r.paymentMethod).toBe("cod");
    expect(r.couponCode).toBe("GIAM10");
  });
});

describe("Thêm vào giỏ (addItemSchema)", () => {
  test("số lượng 1–99", () => {
    expect(addItemSchema.safeParse({ productId: 1, quantity: 0 }).success).toBe(false);
    expect(addItemSchema.safeParse({ productId: 1, quantity: 100 }).success).toBe(false);
    expect(addItemSchema.parse({ productId: 1 }).quantity).toBe(1);
  });
});

describe("Giờ mở cửa (getOpenStatus) — tính theo giờ Việt Nam dù máy chủ ở đâu", () => {
  const s = { ...DEFAULT_SHOP_SETTINGS, weekdayOpen: "07:00", weekdayClose: "22:00" };
  // 21/10/2026 là thứ Tư
  test("06:59 giờ VN (23:59 UTC hôm trước) → đóng cửa", () => {
    expect(getOpenStatus(s, new Date("2026-10-20T23:59:00Z")).isOpen).toBe(false);
  });
  test("07:00 giờ VN (00:00 UTC) → mở cửa", () => {
    expect(getOpenStatus(s, new Date("2026-10-21T00:00:00Z")).isOpen).toBe(true);
  });
  test("22:00 giờ VN → đã đóng", () => {
    expect(getOpenStatus(s, new Date("2026-10-21T15:00:00Z")).isOpen).toBe(false);
  });
  test("tạm ngưng nhận đơn → luôn đóng", () => {
    expect(getOpenStatus({ ...s, acceptOrders: false }, new Date("2026-10-21T05:00:00Z")).isOpen).toBe(false);
  });
});

describe("Cloudinary", () => {
  test("chữ ký = SHA-1 của tham số xếp A→Z + secret", () => {
    const expected = createHash("sha1").update("folder=hung-cafe/products&timestamp=1700000000bi-mat").digest("hex");
    expect(signParams({ timestamp: 1700000000, folder: "hung-cafe/products" }, "bi-mat")).toBe(expected);
  });
  test("link ảnh được chèn f_auto,q_auto (tự tối ưu)", () => {
    expect(optimizedUrl("https://res.cloudinary.com/x/image/upload/v1/a.jpg")).toBe("https://res.cloudinary.com/x/image/upload/f_auto,q_auto/v1/a.jpg");
  });
});
