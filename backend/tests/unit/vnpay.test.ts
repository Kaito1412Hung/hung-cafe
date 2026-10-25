/** Chữ ký VNPay: ký đúng thì nhận, sửa bất kỳ tham số nào (số tiền, mã đơn…) thì từ chối */
import { describe, expect, test } from "vitest";
import { buildPaymentUrl, buildSignData, sign, verifySignature, vnpDate, normalizeIp } from "../../src/modules/payments/vnpay";

/** Dữ liệu VNPay gửi về (đã ký bằng khoá test) */
function signedReturn(overrides: Record<string, string> = {}) {
  const params = {
    vnp_Amount: "11900000",
    vnp_BankCode: "NCB",
    vnp_OrderInfo: "Thanh toan don hang 327",
    vnp_ResponseCode: "00",
    vnp_TmnCode: "TESTCODE",
    vnp_TransactionNo: "14175954",
    vnp_TxnRef: "327-1792553175934",
    ...overrides,
  };
  return { ...params, vnp_SecureHash: sign(buildSignData(params)) };
}

describe("VNPay", () => {
  test("xếp tham số theo tên A→Z, khoảng trắng thành dấu +", () => {
    expect(buildSignData({ b: "2", a: "xin chao" })).toBe("a=xin+chao&b=2");
  });

  test("chữ ký HMAC-SHA512 dài 128 ký tự hex, cùng dữ liệu thì cùng chữ ký", () => {
    const s = sign("a=1&b=2");
    expect(s).toMatch(/^[0-9a-f]{128}$/);
    expect(sign("a=1&b=2")).toBe(s);
    expect(sign("a=1&b=3")).not.toBe(s);
  });

  test("chữ ký đúng → nhận", () => {
    expect(verifySignature(signedReturn())).toBe(true);
  });

  test("sửa số tiền trên link → từ chối", () => {
    const q = signedReturn();
    expect(verifySignature({ ...q, vnp_Amount: "100" })).toBe(false);
  });

  test("sửa mã giao dịch / mã kết quả → từ chối", () => {
    const q = signedReturn({ vnp_ResponseCode: "24" });
    expect(verifySignature({ ...q, vnp_ResponseCode: "00" })).toBe(false);
    expect(verifySignature({ ...signedReturn(), vnp_TxnRef: "999-1" })).toBe(false);
  });

  test("thiếu chữ ký hoặc chữ ký sai độ dài → từ chối (không lỗi)", () => {
    const { vnp_SecureHash: _ignored, ...noHash } = signedReturn();
    expect(verifySignature(noHash)).toBe(false);
    expect(verifySignature({ ...signedReturn(), vnp_SecureHash: "abc" })).toBe(false);
  });

  test("ký bằng khoá khác (kẻ gian tự ký) → từ chối", () => {
    const params = { vnp_Amount: "100", vnp_TxnRef: "327-1" };
    expect(verifySignature({ ...params, vnp_SecureHash: sign(buildSignData(params), "khoa-cua-ke-gian") })).toBe(false);
  });

  test("link thanh toán: số tiền ×100, có chữ ký, ký lại khớp", () => {
    const url = new URL(buildPaymentUrl({ amount: 119000, txnRef: "327-1", orderInfo: "Thanh toan don 327", ipAddr: "1.2.3.4", expireAt: new Date() }));
    const q = Object.fromEntries(url.searchParams);
    expect(q.vnp_Amount).toBe("11900000");
    expect(q.vnp_TmnCode).toBe("TESTCODE");
    expect(verifySignature(q)).toBe(true);
  });

  test("ngày giờ gửi VNPay theo giờ Việt Nam (yyyyMMddHHmmss)", () => {
    // 08:30 giờ UTC = 15:30 giờ Việt Nam
    expect(vnpDate(new Date("2026-10-21T08:30:00Z"))).toBe("20261021153000");
    // 20:00 UTC ngày 31/12 = 03:00 sáng 01/01 năm sau ở Việt Nam
    expect(vnpDate(new Date("2026-12-31T20:00:00Z"))).toBe("20270101030000");
  });

  test("chuẩn hoá IP (IPv6 kiểu ::ffff:)", () => {
    expect(normalizeIp("::ffff:113.161.45.20")).toBe("113.161.45.20");
    expect(normalizeIp("::1")).toBe("127.0.0.1");
    expect(normalizeIp(undefined)).toBe("127.0.0.1");
  });
});
