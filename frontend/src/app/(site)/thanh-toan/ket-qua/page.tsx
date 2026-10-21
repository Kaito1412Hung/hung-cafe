import type { Metadata } from "next";
import { PaymentResult } from "@/components/order/PaymentResult";

export const metadata: Metadata = { title: "Kết quả thanh toán", robots: { index: false } };

/** VNPay đưa khách quay về trang này sau khi thanh toán (kèm tham số có chữ ký) */
export default function PaymentResultPage() {
  return <PaymentResult />;
}
