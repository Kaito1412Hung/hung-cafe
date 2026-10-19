"use client";

import { PackageOpen, Pencil, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { ProductImage } from "@/components/ui/ProductImage";
import { cn, formatDate, formatPrice, getCategoryLabel } from "@/lib/utils";
import type { Product } from "@/types/product";

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  togglingId: number | null;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onToggleAvailable: (p: Product) => void;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge tone="danger">Hết hàng</Badge>;
  if (stock < 20) return <Badge tone="warning">Còn {stock}</Badge>;
  return <span className="text-sm text-coffee-800">{stock}</span>;
}

export function ProductTable({ products, loading, togglingId, onEdit, onDelete, onToggleAvailable }: ProductTableProps) {
  if (!loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-coffee-100">
          <PackageOpen className="h-8 w-8 text-coffee-500" />
        </span>
        <p className="mt-4 font-display text-lg font-semibold text-coffee-950">Không có sản phẩm nào</p>
        <p className="mt-1 text-sm text-coffee-500">Thử đổi bộ lọc hoặc thêm sản phẩm mới.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="border-b border-coffee-100 text-xs font-semibold uppercase tracking-wider text-coffee-500">
            <th className="px-6 py-3.5">Sản phẩm</th>
            <th className="px-4 py-3.5">Danh mục</th>
            <th className="px-4 py-3.5">Giá</th>
            <th className="px-4 py-3.5">Tồn kho</th>
            <th className="px-4 py-3.5">Đang bán</th>
            <th className="px-4 py-3.5">Cập nhật</th>
            <th className="px-6 py-3.5 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-coffee-100/70">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-coffee-100" />
                      <div className="h-4 w-32 rounded bg-coffee-100" />
                    </div>
                  </td>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 w-16 rounded bg-coffee-100" />
                    </td>
                  ))}
                </tr>
              ))
            : products.map((p) => (
                <tr key={p.id} className="group transition hover:bg-coffee-50/60">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <ProductImage src={p.image} alt={p.name} className={cn("h-12 w-12 shrink-0 rounded-xl", !p.isAvailable && "grayscale")} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium text-coffee-950">
                          {p.name}
                          {p.isBestSeller && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Bán chạy" />}
                        </p>
                        <p className="max-w-56 truncate text-xs text-coffee-500">{p.description || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{getCategoryLabel(p.category)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-coffee-950">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">
                    <StockBadge stock={p.stock} />
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={p.isAvailable}
                      disabled={togglingId === p.id}
                      onChange={() => onToggleAvailable(p)}
                      label={`Bật/tắt bán ${p.name}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-coffee-500">{formatDate(p.updatedAt)}</td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onEdit(p)}
                        className="cursor-pointer rounded-lg p-2 text-coffee-500 transition hover:bg-coffee-100 hover:text-coffee-900"
                        aria-label={`Sửa ${p.name}`}
                        title="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(p)}
                        className="cursor-pointer rounded-lg p-2 text-coffee-500 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`Xoá ${p.name}`}
                        title="Xoá"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
