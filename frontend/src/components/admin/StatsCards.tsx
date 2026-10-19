import { CircleCheck, CircleSlash, Package, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

export function StatsCards({ products }: { products: Product[] }) {
  const available = products.filter((p) => p.isAvailable && p.stock > 0).length;
  const avgPrice = products.length ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0;

  const stats = [
    { label: "Tổng sản phẩm", value: products.length, icon: Package, color: "bg-coffee-100 text-coffee-700" },
    { label: "Đang bán", value: available, icon: CircleCheck, color: "bg-emerald-50 text-emerald-600" },
    { label: "Ngừng bán / hết hàng", value: products.length - available, icon: CircleSlash, color: "bg-red-50 text-red-600" },
    { label: "Giá trung bình", value: formatPrice(Math.round(avgPrice / 1000) * 1000), icon: Wallet, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-coffee-100">
          <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm text-coffee-500">{label}</p>
            <p className="mt-0.5 text-2xl font-bold text-coffee-950">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
