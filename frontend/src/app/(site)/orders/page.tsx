import { Suspense } from "react";
import type { Metadata } from "next";
import { MyOrders } from "@/components/order/MyOrders";

export const metadata: Metadata = { title: "Đơn hàng của tôi" };

export default function MyOrdersPage() {
  return (
    <Suspense>
      <MyOrders />
    </Suspense>
  );
}
