"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { clearToppingCache } from "@/hooks/useToppings";
import { formatPrice } from "@/lib/utils";
import { toppingService, type AdminTopping } from "@/services/toppingService";

/** Một dòng đang sửa: tên + giá (để dạng chuỗi cho dễ gõ) */
interface Draft {
  id: number | null;
  name: string;
  price: string;
}

/** Quản lý topping (trân châu, thạch, pudding...) — món nào được thêm topping thì chỉnh trong form món */
export function ToppingManager() {
  const toast = useToast();
  const [list, setList] = useState<AdminTopping[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminTopping | null>(null);

  useEffect(() => {
    toppingService
      .getAll()
      .then(setList)
      .catch((err: Error) => {
        toast(err.message, "error");
        setList([]);
      });
  }, [toast]);

  const upsert = (t: AdminTopping) => {
    clearToppingCache(); // khách mở hộp thoại chọn món sẽ thấy danh sách mới
    setList((prev) => (prev?.some((x) => x.id === t.id) ? prev.map((x) => (x.id === t.id ? t : x)) : [...(prev ?? []), t]));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const name = draft.name.trim();
    const price = Number(draft.price);
    if (name.length < 2) return setError("Tên topping cần ít nhất 2 ký tự");
    if (!Number.isInteger(price) || price < 0 || price > 100000) return setError("Giá từ 0 đến 100.000đ");
    setSaving(true);
    setError(null);
    try {
      const nextOrder = (list ?? []).reduce((m, t) => Math.max(m, t.sortOrder), 0) + 1;
      const saved = draft.id ? await toppingService.update(draft.id, { name, price }) : await toppingService.create({ name, price, isAvailable: true, sortOrder: nextOrder });
      upsert(saved);
      toast(draft.id ? `Đã cập nhật "${saved.name}"` : `Đã thêm topping "${saved.name}"`);
      setDraft(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (t: AdminTopping) => {
    try {
      upsert(await toppingService.update(t.id, { isAvailable: !t.isAvailable }));
      toast(t.isAvailable ? `Đã tạm ngưng "${t.name}"` : `Đã bán lại "${t.name}"`, "info");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await toppingService.remove(deleting.id);
      clearToppingCache();
      setList((prev) => prev?.filter((x) => x.id !== deleting.id) ?? null);
      toast(`Đã xoá "${deleting.name}"`, "info");
      setDeleting(null);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const editor = (
    <form onSubmit={handleSave} className="flex flex-wrap items-start gap-2 bg-coffee-50/60 px-6 py-3">
      <Input autoFocus value={draft?.name ?? ""} onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })} placeholder="Tên topping" maxLength={50} className="h-10 min-w-40 flex-1" aria-label="Tên topping" />
      <Input type="number" min={0} step={1000} value={draft?.price ?? ""} onChange={(e) => setDraft((d) => d && { ...d, price: e.target.value })} placeholder="Giá (đ)" className="h-10 w-32" aria-label="Giá topping" />
      <Button type="submit" size="sm" loading={saving} className="h-10">
        {!saving && <Check className="h-4 w-4" />} Lưu
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => setDraft(null)} aria-label="Huỷ">
        <X className="h-4 w-4" />
      </Button>
      {error && <p className="basis-full text-xs font-medium text-red-600">{error}</p>}
    </form>
  );

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-coffee-100 px-6 py-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-coffee-950">Topping</h2>
          <p className="text-sm text-coffee-600">Món nào được thêm topping thì bật trong form món (mục “Khách được chọn”).</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            setDraft({ id: null, name: "", price: "" });
          }}
        >
          <Plus className="h-4 w-4" /> Thêm topping
        </Button>
      </div>

      {draft?.id === null && editor}

      {list === null ? (
        <div className="space-y-2 p-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-coffee-50" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-coffee-500">Chưa có topping nào.</p>
      ) : (
        <ul className="divide-y divide-coffee-100/70">
          {list.map((t) =>
            draft?.id === t.id ? (
              <li key={t.id}>{editor}</li>
            ) : (
              <li key={t.id} className="flex items-center gap-4 px-6 py-3">
                <span className={t.isAvailable ? "flex-1 font-medium text-coffee-950" : "flex-1 font-medium text-coffee-400 line-through"}>{t.name}</span>
                <span className="w-24 text-right text-sm tabular-nums text-coffee-700">+{formatPrice(t.price)}</span>
                <Switch checked={t.isAvailable} onChange={() => toggle(t)} label={`Đang bán ${t.name}`} />
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setError(null);
                      setDraft({ id: t.id, name: t.name, price: String(t.price) });
                    }}
                    className="cursor-pointer rounded-lg p-2 text-coffee-500 transition hover:bg-coffee-100 hover:text-coffee-900"
                    aria-label={`Sửa ${t.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleting(t)} className="cursor-pointer rounded-lg p-2 text-coffee-500 transition hover:bg-red-50 hover:text-red-600" aria-label={`Xoá ${t.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title={`Xoá topping "${deleting?.name ?? ""}"?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Huỷ
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Xoá
            </Button>
          </>
        }
      >
        <p className="text-sm text-coffee-700">Đơn cũ vẫn giữ tên và giá topping này. Muốn tạm ngưng thì nên tắt công tắc “Đang bán” thay vì xoá.</p>
      </Modal>
    </section>
  );
}
