"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useCategories } from "@/context/CategoriesContext";
import { ApiError } from "@/lib/api";
import { categoryService } from "@/services/categoryService";
import { ToppingManager } from "@/components/admin/ToppingManager";
import type { Category } from "@/types/category";

/* ----- Form thêm / sửa (cha truyền key mới mỗi lần mở để reset) ----- */
function CategoryFormModal({ category, nextOrder, onClose, onSaved }: { category: Category | null; nextOrder: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? nextOrder));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErrors({ name: "Tên danh mục cần ít nhất 2 ký tự" });
    const order = Number(sortOrder);
    if (!Number.isInteger(order) || order < 0 || order > 999) return setErrors({ sortOrder: "Thứ tự là số nguyên từ 0 đến 999" });

    setSaving(true);
    try {
      const input = { name: name.trim(), sortOrder: order };
      if (category) await categoryService.update(category.id, input);
      else await categoryService.create(input);
      await onSaved();
      toast(category ? `Đã cập nhật "${input.name}"` : `Đã thêm danh mục "${input.name}"`);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      toast((err as Error).message, "error");
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={category ? "Sửa danh mục" : "Thêm danh mục"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            {category ? "Lưu thay đổi" : "Thêm danh mục"}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Tên danh mục" htmlFor="catName" error={errors.name} required>
          <Input
            id="catName"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors({});
            }}
            placeholder="VD: Nước ép"
            maxLength={50}
            invalid={!!errors.name}
            autoFocus
          />
        </Field>
        <Field label="Thứ tự hiển thị" htmlFor="catOrder" error={errors.sortOrder} hint="Số nhỏ hiện trước trên thanh lọc ở trang Thực đơn">
          <Input id="catOrder" type="number" min={0} max={999} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} invalid={!!errors.sortOrder} />
        </Field>
        {category && (
          <p className="rounded-xl bg-coffee-50 px-3 py-2 text-xs text-coffee-600">
            Mã danh mục <code className="font-mono">{category.slug}</code> được giữ cố định để các món không bị ảnh hưởng khi đổi tên.
          </p>
        )}
      </form>
    </Modal>
  );
}

export default function AdminCategoriesPage() {
  const toast = useToast();
  const { categories, loading, refresh } = useCategories();
  const [editing, setEditing] = useState<{ key: number; category: Category | null } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const nextOrder = categories.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1;

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await categoryService.remove(deleting.id);
      await refresh();
      toast(`Đã xoá danh mục "${deleting.name}"`, "info");
      setDeleting(null);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-coffee-500">Quản lý / Danh mục</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-coffee-950">Danh mục</h1>
          <p className="mt-1 text-coffee-600">Nhóm món trên thực đơn: thêm, đổi tên, sắp xếp thứ tự.</p>
        </div>
        <Button onClick={() => setEditing({ key: Date.now(), category: null })}>
          <Plus className="h-4 w-4" /> Thêm danh mục
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
        {!loading && categories.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-coffee-100">
              <Tags className="h-8 w-8 text-coffee-500" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold text-coffee-950">Chưa có danh mục nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-coffee-100 text-xs font-semibold uppercase tracking-wider text-coffee-500">
                  <th className="px-6 py-3.5">Thứ tự</th>
                  <th className="px-4 py-3.5">Tên danh mục</th>
                  <th className="px-4 py-3.5">Mã (slug)</th>
                  <th className="px-4 py-3.5 text-right">Số món</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100/70">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-5">
                            <div className="h-4 w-20 rounded bg-coffee-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : categories.map((c) => (
                      <tr key={c.id} className="transition hover:bg-coffee-50/60">
                        <td className="px-6 py-4 text-sm tabular-nums text-coffee-500">{c.sortOrder}</td>
                        <td className="px-4 py-4 font-medium text-coffee-950">{c.name}</td>
                        <td className="px-4 py-4 font-mono text-xs text-coffee-500">{c.slug}</td>
                        <td className="px-4 py-4 text-right text-sm tabular-nums text-coffee-950">{c.productCount}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setEditing({ key: Date.now(), category: c })}
                              className="cursor-pointer rounded-lg p-2 text-coffee-500 transition hover:bg-coffee-100 hover:text-coffee-900"
                              aria-label={`Sửa ${c.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleting(c)}
                              className="cursor-pointer rounded-lg p-2 text-coffee-500 transition hover:bg-red-50 hover:text-red-600"
                              aria-label={`Xoá ${c.name}`}
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
        )}
      </div>

      {/* Topping dùng chung cho các món được bật "Thêm topping" */}
      <ToppingManager />

      {editing && <CategoryFormModal key={editing.key} category={editing.category} nextOrder={nextOrder} onClose={() => setEditing(null)} onSaved={refresh} />}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title="Xoá danh mục?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              Huỷ
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={busy}>
              Xoá
            </Button>
          </>
        }
      >
        <p className="text-sm text-coffee-700">
          {deleting && deleting.productCount > 0 ? (
            <>
              <strong>{deleting.name}</strong> đang có <strong>{deleting.productCount} món</strong>. Hãy chuyển các món sang danh mục khác (ở trang
              Sản phẩm) trước khi xoá.
            </>
          ) : (
            <>
              Xoá danh mục <strong>{deleting?.name}</strong>? Hành động này không thể hoàn tác.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
