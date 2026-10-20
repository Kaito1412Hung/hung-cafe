"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { StatsCards } from "@/components/admin/StatsCards";
import { ProductTable } from "@/components/admin/ProductTable";
import { Pagination } from "@/components/admin/Pagination";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { DeleteProductDialog } from "@/components/admin/DeleteProductDialog";
import { useProducts } from "@/hooks/useProducts";
import { normalizeSearch } from "@/lib/utils";
import { useCategories } from "@/context/CategoriesContext";
import type { Category, Product, ProductInput } from "@/types/product";

const PAGE_SIZE = 6;
type StatusFilter = "all" | "available" | "unavailable";
type SortKey = "newest" | "oldest" | "price-asc" | "price-desc" | "name";

export default function AdminProductsPage() {
  const toast = useToast();
  const { products, loading, error, createProduct, updateProduct, deleteProduct } = useProducts();

  // Bộ lọc
  const [query, setQuery] = useState("");
  const { categories } = useCategories();
  const [category, setCategory] = useState<Category | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  // Modal
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query); // tìm không dấu
    const list = products.filter((p) => {
      if (q && !normalizeSearch(p.name).includes(q)) return false;
      if (category !== "all" && p.category !== category) return false;
      if (status === "available" && !p.isAvailable) return false;
      if (status === "unavailable" && p.isAvailable) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.createdAt.localeCompare(b.createdAt);
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "name":
          return a.name.localeCompare(b.name, "vi");
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [products, query, category, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Đổi bộ lọc thì quay về trang 1
  const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const handleSubmit = async (input: ProductInput) => {
    try {
      if (editing) {
        await updateProduct(editing.id, input);
        toast(`Đã cập nhật "${input.name}"`);
      } else {
        await createProduct(input);
        toast(`Đã thêm "${input.name}" vào thực đơn`);
        setSort("newest");
        setPage(1);
      }
      setFormOpen(false);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleDelete = async (p: Product) => {
    try {
      await deleteProduct(p.id);
      toast(`Đã xoá "${p.name}"`);
      setDeleting(null);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleToggle = async (p: Product) => {
    setTogglingId(p.id);
    try {
      await updateProduct(p.id, { isAvailable: !p.isAvailable });
      toast(`${p.name}: ${p.isAvailable ? "đã ngừng bán" : "đang mở bán"}`, "info");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-coffee-500">Quản lý / Sản phẩm</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-coffee-950">Sản phẩm</h1>
          <p className="mt-1 text-coffee-600">Thêm, sửa, xoá các món trong thực đơn của quán.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Thêm sản phẩm
        </Button>
      </div>

      <StatsCards products={products} />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
        {/* Thanh công cụ */}
        <div className="flex flex-col gap-3 border-b border-coffee-100 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />
            <input
              value={query}
              onChange={(e) => withReset(setQuery)(e.target.value)}
              placeholder="Tìm theo tên sản phẩm..."
              className="h-11 w-full rounded-xl border border-coffee-200 bg-coffee-50/50 pl-10 pr-4 text-sm focus:border-coffee-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex">
            <Select value={category} onChange={(e) => withReset(setCategory)(e.target.value as Category | "all")} className="lg:w-44" aria-label="Lọc danh mục">
              <option value="all">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => withReset(setStatus)(e.target.value as StatusFilter)} className="lg:w-40" aria-label="Lọc trạng thái">
              <option value="all">Mọi trạng thái</option>
              <option value="available">Đang bán</option>
              <option value="unavailable">Ngừng bán</option>
            </Select>
            <Select value={sort} onChange={(e) => withReset(setSort)(e.target.value as SortKey)} className="lg:w-44" aria-label="Sắp xếp">
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="name">Tên A → Z</option>
            </Select>
          </div>
        </div>

        {error ? (
          <p className="p-10 text-center text-red-600">Lỗi tải dữ liệu: {error}</p>
        ) : (
          <ProductTable
            products={paginated}
            loading={loading}
            togglingId={togglingId}
            onEdit={openEdit}
            onDelete={setDeleting}
            onToggleAvailable={handleToggle}
          />
        )}

        {!loading && filtered.length > 0 && (
          <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        )}
      </div>

      <ProductFormModal key={formKey} open={formOpen} product={editing} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} />
      <DeleteProductDialog product={deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
