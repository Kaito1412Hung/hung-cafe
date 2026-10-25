/** Các phép tính tiền và lựa chọn món: giảm giá, phí giao, phụ thu size, topping */
import { describe, expect, test } from "vitest";
import { calcDiscount } from "../../src/modules/coupons/coupons.service";
import { calcShippingFee } from "../../src/modules/settings/settings.service";
import { MAX_TOPPINGS, normalizeOptions, sizeExtra, describeOptions } from "../../src/modules/cart/options";

describe("Mã giảm giá (calcDiscount)", () => {
  test("giảm theo % làm tròn xuống", () => {
    expect(calcDiscount({ type: "percent", value: 10, maxDiscount: null }, 119_000)).toBe(11_900);
    expect(calcDiscount({ type: "percent", value: 15, maxDiscount: null }, 33_333)).toBe(4_999);
  });
  test("giảm theo % không vượt quá mức giảm tối đa", () => {
    expect(calcDiscount({ type: "percent", value: 50, maxDiscount: 30_000 }, 200_000)).toBe(30_000);
  });
  test("giảm số tiền cố định", () => {
    expect(calcDiscount({ type: "fixed", value: 15_000, maxDiscount: null }, 100_000)).toBe(15_000);
  });
  test("không bao giờ giảm quá tạm tính (không ra số âm)", () => {
    expect(calcDiscount({ type: "fixed", value: 50_000, maxDiscount: null }, 30_000)).toBe(30_000);
  });
});

describe("Phí giao hàng (calcShippingFee)", () => {
  const settings = { shippingFee: 15_000, freeShippingThreshold: 200_000 };
  test("dưới ngưỡng → tính phí", () => expect(calcShippingFee(199_000, settings)).toBe(15_000));
  test("từ ngưỡng trở lên → miễn phí", () => expect(calcShippingFee(200_000, settings)).toBe(0));
  test("giỏ trống → 0đ", () => expect(calcShippingFee(0, settings)).toBe(0));
});

describe("Lựa chọn món (normalizeOptions)", () => {
  const toppings = new Map([1, 2, 3, 4, 5, 6].map((id) => [id, { id, name: `Topping ${id}`, price: 8_000 }]));
  const milkTea = { hasSize: true, hasSugar: true, serve: "cold" as const, allowToppings: true };
  const cake = { hasSize: false, hasSugar: false, serve: "none" as const, allowToppings: false };

  test("không chọn gì → lấy mặc định: size S, 100% đường, đá bình thường", () => {
    expect(normalizeOptions(milkTea, {}, toppings)).toMatchObject({ size: "S", sugar: "100", ice: "normal", toppings: "" });
  });
  test("món không có size / đường / đá (bánh) → bỏ hết lựa chọn khách gửi lên", () => {
    expect(normalizeOptions(cake, { size: "L", sugar: "50", ice: "less", toppings: [1] }, toppings)).toMatchObject({
      size: "",
      sugar: "",
      ice: "",
      toppings: "",
    });
  });
  test(`topping: bỏ trùng, bỏ mã lạ, sắp xếp, tối đa ${MAX_TOPPINGS}`, () => {
    const o = normalizeOptions(milkTea, { toppings: [5, 1, 1, 99, 3, 2, 6] }, toppings);
    expect(o.toppings).toBe("1,2,3,5");
  });
  test("món nóng hoặc đá: chọn nóng thì không có lượng đá", () => {
    const o = normalizeOptions({ ...milkTea, serve: "both" }, { temp: "hot", ice: "less" }, toppings);
    expect(o).toMatchObject({ temp: "hot", ice: "" });
  });
  test("phụ thu size: S 0đ, M 6.000đ, L 10.000đ", () => {
    expect([sizeExtra("S"), sizeExtra("M"), sizeExtra("L"), sizeExtra("")]).toEqual([0, 6_000, 10_000, 0]);
  });
  test("mô tả lựa chọn ghi vào hoá đơn / Excel", () => {
    expect(describeOptions({ size: "M", sugar: "50", ice: "less", note: "", toppings: [{ name: "Trân châu đen" }] })).toBe(
      "Vừa (M) · 50% đường · Ít đá · +Trân châu đen",
    );
  });
});
