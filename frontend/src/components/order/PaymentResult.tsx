"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheckBig, CircleX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatOrderCode } from "@/lib/orders";
import { paymentService, type VnpayReturnResult } from "@/services/paymentService";

/**
 * Gửi nguyên tham số VNPay (chuỗi sau dấu ?) cho backend kiểm tra chữ ký.
 * Trang này chỉ HIỂN THỊ kết quả — việc ghi "đã thanh toán" do backend quyết định sau khi kiểm tra chữ ký.
 */
export function PaymentResult() {
  const toast = useToast();
  const [result, setResult] = useState<VnpayReturnResult | null>(null);
  const [retrying, setRetrying] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React chạy effect 2 lần ở chế độ dev → chỉ gửi 1 lần
    started.current = true;
    const query = window.location.search.slice(1);
    (query ? paymentService.verifyReturn(query) : Promise.reject(new Error("Không có thông tin thanh toán")))
      .then(setResult)
      .catch((err: Error) => setResult({ status: "invalid", orderId: null, message: err.message }));
  }, []);

  const retry = async () => {
    if (!result?.orderId) return;
    setRetrying(true);
    try {
      const { url } = await paymentService.createVnpayUrl(result.orderId);
      window.location.href = url;
    } catch (err) {
      toast((err as Error).message, "error");
      setRetrying(false);
    }
  };

  const ordersLink = result?.orderId ? `/orders?new=${result.orderId}` : "/orders";

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      {result === null ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-coffee-400" />
          <p className="mt-4 text-coffee-600">Đang kiểm tra kết quả thanh toán…</p>
        </>
      ) : result.status === "paid" ? (
        <>
          <CircleCheckBig className="h-16 w-16 text-emerald-600" />
          <h1 className="mt-4 font-display text-3xl font-bold text-coffee-950">Thanh toán thành công!</h1>
          <p className="mt-2 text-coffee-600">
            {result.orderId && <>Đơn {formatOrderCode(result.orderId)} đã được thanh toán qua VNPay. </>}Quán sẽ xác nhận và pha chế ngay ☕
          </p>
          <Link href={ordersLink} className="mt-8">
            <Button size="lg">Xem đơn hàng</Button>
          </Link>
        </>
      ) : result.status === "failed" ? (
        <>
          <CircleX className="h-16 w-16 text-red-600" />
          <h1 className="mt-4 font-display text-3xl font-bold text-coffee-950">Thanh toán chưa thành công</h1>
          <p className="mt-2 text-coffee-600">{result.message}.</p>
          <p className="mt-1 text-sm text-coffee-500">Đơn vẫn được giữ trong thời gian chờ thanh toán, bạn có thể thanh toán lại.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={retry} loading={retrying}>
              Thanh toán lại
            </Button>
            <Link href={ordersLink}>
              <Button size="lg" variant="outline">
                Xem đơn hàng
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <CircleAlert className="h-16 w-16 text-amber-500" />
          <h1 className="mt-4 font-display text-3xl font-bold text-coffee-950">Chưa xác nhận được thanh toán</h1>
          <p className="mt-2 text-coffee-600">{result.message}. Bạn kiểm tra lại trạng thái đơn trong mục Đơn hàng nhé.</p>
          <Link href="/orders" className="mt-8">
            <Button size="lg" variant="outline">
              Xem đơn hàng
            </Button>
          </Link>
        </>
      )}
    </section>
  );
}
