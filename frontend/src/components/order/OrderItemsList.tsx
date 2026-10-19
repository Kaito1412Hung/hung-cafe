import { ProductImage } from "@/components/ui/ProductImage";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types/order";

/** Danh sách món + tổng tiền của một đơn (dùng cho cả khách và admin) */
export function OrderItemsList({ order }: { order: Order }) {
  return (
    <div>
      <ul className="divide-y divide-coffee-100">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <ProductImage src={item.image} alt={item.name} className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-coffee-950">{item.name}</p>
              <p className="text-sm text-coffee-500">
                {formatPrice(item.unitPrice)} × {item.quantity}
              </p>
            </div>
            <span className="font-semibold text-coffee-950">{formatPrice(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1.5 border-t border-coffee-100 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-coffee-600">Tạm tính</dt>
          <dd className="text-coffee-950">{formatPrice(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-coffee-600">Phí giao hàng</dt>
          <dd className="text-coffee-950">{order.shippingFee === 0 ? "Miễn phí" : formatPrice(order.shippingFee)}</dd>
        </div>
        <div className="flex justify-between pt-1">
          <dt className="font-semibold text-coffee-950">Tổng cộng</dt>
          <dd className="text-lg font-bold text-coffee-950">{formatPrice(order.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
