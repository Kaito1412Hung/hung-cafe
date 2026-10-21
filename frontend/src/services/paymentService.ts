import { api } from "@/lib/api";

export interface PaymentConfig {
  /** Quán đã bật VNPay chưa (backend có mã VNPay trong .env) */
  vnpay: boolean;
  /** Quá bao nhiêu phút chưa trả thì đơn tự huỷ */
  timeoutMinutes: number;
}

export interface VnpayReturnResult {
  status: "paid" | "failed" | "invalid";
  orderId: number | null;
  message: string;
}

export const paymentService = {
  async getConfig(): Promise<PaymentConfig> {
    return (await api<{ data: PaymentConfig }>("/payments/config")).data;
  },

  /** Tạo link thanh toán VNPay cho đơn của mình → chuyển trình duyệt sang link này */
  async createVnpayUrl(orderId: number): Promise<{ url: string; deadline: string }> {
    return (await api<{ data: { url: string; deadline: string } }>(`/payments/vnpay/${orderId}`, { method: "POST" })).data;
  },

  /** Trang "quay về": gửi lại nguyên tham số VNPay (chuỗi sau dấu ?) để backend kiểm tra chữ ký */
  async verifyReturn(queryString: string): Promise<VnpayReturnResult> {
    return (await api<{ data: VnpayReturnResult }>(`/payments/vnpay/return?${queryString}`)).data;
  },
};
