/** Thanh toán VNPay từ đầu tới cuối (khoá giả): đặt đơn → link có chữ ký → VNPay báo về → đã thanh toán; link bị sửa → từ chối */
import { afterAll, describe, expect, test } from "vitest";
import { pool } from "../../src/db/pool";
import { buildSignData, sign } from "../../src/modules/payments/vnpay";
import { browser, checkoutBody, newCustomer, simpleProduct } from "../helpers";

afterAll(() => pool.end());

/** Giả lập VNPay gửi kết quả về (ký bằng khoá test) */
function vnpayReply(txnRef: string, amount: string, responseCode = "00", tamper: Record<string, string> = {}) {
  const params: Record<string, string> = {
    vnp_Amount: amount,
    vnp_BankCode: "NCB",
    vnp_ResponseCode: responseCode,
    vnp_TmnCode: "TESTCODE",
    vnp_TransactionNo: "14175954",
    // VNPay gửi cả 2 mã: ResponseCode + TransactionStatus, đều "00" mới là trả tiền thành công
    vnp_TransactionStatus: responseCode === "00" ? "00" : "02",
    vnp_TxnRef: txnRef,
  };
  const qs = new URLSearchParams({ ...params, vnp_SecureHash: sign(buildSignData(params)), ...tamper });
  return qs.toString();
}

async function vnpayOrder() {
  const p = await simpleProduct(2);
  const k = await newCustomer();
  await k.post("/cart/items", { productId: p.id, quantity: 1 });
  const order = (await k.post("/orders", { ...checkoutBody, paymentMethod: "vnpay" })).body.data;
  const link = await k.post(`/payments/vnpay/${order.id}`);
  expect(link.status).toBe(200);
  const q = new URL(link.body.data.url).searchParams;
  return { k, order, txnRef: q.get("vnp_TxnRef")!, amount: q.get("vnp_Amount")! };
}

describe("VNPay", () => {
  test("đặt đơn VNPay → chờ thanh toán, có hạn chót 15 phút", async () => {
    const { order } = await vnpayOrder();
    expect(order.paymentMethod).toBe("vnpay");
    expect(order.paymentStatus).toBe("pending");
    const minutes = (new Date(order.paymentDeadline).getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(13);
    expect(minutes).toBeLessThanOrEqual(15);
  });

  test("VNPay báo thành công (chữ ký đúng) → đơn đã thanh toán; báo lại lần 2 không xử lý trùng", async () => {
    const { k, order, txnRef, amount } = await vnpayOrder();
    const res = await browser().get(`/payments/vnpay/return?${vnpayReply(txnRef, amount)}`);
    expect(res.body.data.status).toBe("paid");
    expect((await k.get(`/orders/${order.id}`)).body.data.paymentStatus).toBe("paid");

    const ipn = await browser().get(`/payments/vnpay/ipn?${vnpayReply(txnRef, amount)}`);
    expect(ipn.body.RspCode).toBe("02"); // "đơn đã được xác nhận trước đó"
  });

  test("link bị sửa số tiền → chữ ký không hợp lệ, đơn vẫn chưa thanh toán", async () => {
    const { k, order, txnRef, amount } = await vnpayOrder();
    const res = await browser().get(`/payments/vnpay/return?${vnpayReply(txnRef, amount, "00", { vnp_Amount: "100" })}`);
    expect(res.body.data.status).toBe("invalid");
    expect((await browser().get(`/payments/vnpay/ipn?${vnpayReply(txnRef, amount, "00", { vnp_Amount: "100" })}`)).body.RspCode).toBe("97");
    expect((await k.get(`/orders/${order.id}`)).body.data.paymentStatus).toBe("pending");
  });

  test("ResponseCode 00 nhưng TransactionStatus khác 00 (giao dịch chưa hoàn tất) → chưa coi là đã trả", async () => {
    const { k, order, txnRef, amount } = await vnpayOrder();
    const params: Record<string, string> = { vnp_Amount: amount, vnp_ResponseCode: "00", vnp_TmnCode: "TESTCODE", vnp_TransactionStatus: "01", vnp_TxnRef: txnRef };
    const qs = new URLSearchParams({ ...params, vnp_SecureHash: sign(buildSignData(params)) });
    expect((await browser().get(`/payments/vnpay/return?${qs}`)).body.data.status).toBe("failed");
    expect((await k.get(`/orders/${order.id}`)).body.data.paymentStatus).toBe("pending");
  });

  test("khách bấm huỷ trên VNPay → báo thất bại, đơn vẫn chờ để thanh toán lại", async () => {
    const { k, order, txnRef, amount } = await vnpayOrder();
    const res = await browser().get(`/payments/vnpay/return?${vnpayReply(txnRef, amount, "24")}`);
    expect(res.body.data.status).toBe("failed");
    expect((await k.get(`/orders/${order.id}`)).body.data.paymentStatus).toBe("pending");
  });
});
