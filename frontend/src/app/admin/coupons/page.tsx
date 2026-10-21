"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Copy, EyeOff, Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/orders";
import { formatPrice, vnParts } from "@/lib/utils";
import { couponService } from "@/services/couponService";
import type { Coupon, CouponInput } from "@/types/coupon";

/**
 * "2026-10-20T01:00:00.000Z" ↔ giá trị ô <input type="datetime-local"> "2026-10-20T08:00".
 * Ô nhập luôn hiểu là giờ Việt Nam (UTC+7), admin ở nước nào nhập cũng ra đúng giờ của quán.
 */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const { year, month, day, hour, minute } = vnParts(new Date(iso));
  return `${year}-${month}-${day}T${hour}:${minute}`;
};
const fromLocalInput = (v: string) => (v ? new Date(`${v}:00+07:00`).toISOString() : null);

/** Mô tả mức giảm: "Giảm 10% (tối đa 30.000đ)" */
function describeDiscount(c: Pick<Coupon, "type" | "value" | "maxDiscount">) {
  return c.type === "percent" ? `Giảm ${c.value}%${c.maxDiscount ? ` (tối đa ${formatPrice(c.maxDiscount)})` : ""}` : `Giảm ${formatPrice(c.value)}`;
}

function couponState(c: Coupon): { label: string; tone: "success" | "neutral" | "danger" | "warning" } {
  const now = Date.now();
  if (!c.isActive) return { label: "Đang tắt", tone: "neutral" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= now) return { label: "Hết hạn", tone: "danger" };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { label: "Hết lượt", tone: "danger" };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: "Chưa bắt đầu", tone: "warning" };
  return { label: "Đang áp dụng", tone: "success" };
}

/* ----- Form thêm / sửa (cha truyền key mới mỗi lần mở để reset) ----- */
interface FormValues {
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: string;
  maxDiscount: string;
  minOrder: string;
  usageLimit: string;
  firstOrderOnly: boolean;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  isPublic: boolean;
}

function CouponFormModal({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: (c: Coupon) => void }) {
  const toast = useToast();
  const [v, setV] = useState<FormValues>({
    code: coupon?.code ?? "",
    description: coupon?.description ?? "",
    type: coupon?.type ?? "percent",
    value: coupon ? String(coupon.value) : "",
    maxDiscount: coupon?.maxDiscount ? String(coupon.maxDiscount) : "",
    minOrder: coupon ? String(coupon.minOrder) : "0",
    usageLimit: coupon?.usageLimit ? String(coupon.usageLimit) : "",
    firstOrderOnly: coupon?.firstOrderOnly ?? false,
    startsAt: toLocalInput(coupon?.startsAt ?? null),
    expiresAt: toLocalInput(coupon?.expiresAt ?? null),
    isActive: coupon?.isActive ?? true,
    isPublic: coupon?.isPublic ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!/^[A-Z0-9_-]{3,30}$/.test(v.code)) found.code = "Mã gồm 3–30 ký tự: chữ không dấu, số, - hoặc _";
    const value = Number(v.value);
    if (!Number.isInteger(value) || value <= 0) found.value = "Nhập số lớn hơn 0";
    else if (v.type === "percent" && value > 100) found.value = "Tối đa 100%";
    if (v.expiresAt && v.startsAt && v.expiresAt <= v.startsAt) found.expiresAt = "Phải sau ngày bắt đầu";
    setErrors(found);
    if (Object.keys(found).length) return;

    const input: CouponInput = {
      code: v.code,
      description: v.description.trim(),
      type: v.type,
      value,
      maxDiscount: v.type === "percent" && v.maxDiscount ? Number(v.maxDiscount) : null,
      minOrder: Number(v.minOrder) || 0,
      usageLimit: v.usageLimit ? Number(v.usageLimit) : null,
      firstOrderOnly: v.firstOrderOnly,
      startsAt: fromLocalInput(v.startsAt),
      expiresAt: fromLocalInput(v.expiresAt),
      isActive: v.isActive,
      isPublic: v.isPublic,
    };
    setSaving(true);
    try {
      const saved = coupon ? await couponService.update(coupon.id, input) : await couponService.create(input);
      toast(coupon ? `Đã cập nhật mã ${saved.code}` : `Đã tạo mã ${saved.code}`);
      onSaved(saved);
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
      size="lg"
      title={coupon ? `Sửa mã ${coupon.code}` : "Tạo mã giảm giá"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button type="submit" form="coupon-form" loading={saving}>
            {coupon ? "Lưu thay đổi" : "Tạo mã"}
          </Button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Mã" htmlFor="c-code" error={errors.code} hint="Khách gõ mã này ở giỏ hàng" required>
          <Input id="c-code" value={v.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="VD: GIAM20" invalid={!!errors.code} />
        </Field>
        <Field label="Loại giảm" htmlFor="c-type">
          <Select id="c-type" value={v.type} onChange={(e) => set("type", e.target.value as FormValues["type"])}>
            <option value="percent">Giảm theo %</option>
            <option value="fixed">Giảm số tiền cố định</option>
          </Select>
        </Field>
        <Field label={v.type === "percent" ? "Phần trăm giảm (%)" : "Số tiền giảm (đ)"} htmlFor="c-value" error={errors.value} required>
          <Input id="c-value" type="number" min={1} value={v.value} onChange={(e) => set("value", e.target.value)} invalid={!!errors.value} />
        </Field>
        {v.type === "percent" ? (
          <Field label="Giảm tối đa (đ)" htmlFor="c-max" hint="Để trống = không giới hạn">
            <Input id="c-max" type="number" min={0} value={v.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} placeholder="VD: 30000" />
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="Đơn tối thiểu (đ)" htmlFor="c-min" hint="Tính trên tạm tính (chưa gồm phí giao)">
          <Input id="c-min" type="number" min={0} value={v.minOrder} onChange={(e) => set("minOrder", e.target.value)} />
        </Field>
        <Field label="Tổng số lượt dùng" htmlFor="c-limit" hint="Để trống = không giới hạn. Mỗi tài khoản dùng 1 lần.">
          <Input id="c-limit" type="number" min={1} value={v.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} />
        </Field>
        <Field label="Bắt đầu từ" htmlFor="c-start" hint="Để trống = áp dụng ngay">
          <Input id="c-start" type="datetime-local" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </Field>
        <Field label="Hết hạn lúc" htmlFor="c-end" error={errors.expiresAt} hint="Để trống = không hết hạn">
          <Input id="c-end" type="datetime-local" value={v.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} invalid={!!errors.expiresAt} />
        </Field>
        <Field label="Mô tả cho khách" htmlFor="c-desc" className="sm:col-span-2">
          <Input id="c-desc" value={v.description} maxLength={150} onChange={(e) => set("description", e.target.value)} placeholder="VD: Giảm 20% mừng khai trương" />
        </Field>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-coffee-100 p-4">
          <div>
            <p className="text-sm font-medium text-coffee-900">Chỉ đơn đầu tiên</p>
            <p className="text-xs text-coffee-500">Khách chưa từng đặt đơn nào</p>
          </div>
          <Switch checked={v.firstOrderOnly} onChange={(x) => set("firstOrderOnly", x)} label="Chỉ đơn đầu tiên" />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-coffee-100 p-4">
          <div>
            <p className="text-sm font-medium text-coffee-900">Đang bật</p>
            <p className="text-xs text-coffee-500">Tắt để tạm ngưng mã</p>
          </div>
          <Switch checked={v.isActive} onChange={(x) => set("isActive", x)} label="Đang bật" />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-coffee-100 p-4 sm:col-span-2">
          <div>
            <p className="text-sm font-medium text-coffee-900">Hiện cho khách chọn</p>
            <p className="text-xs text-coffee-500">Tắt = mã bí mật: không hiện trong danh sách, khách phải tự gõ (VD mã tặng riêng khách quen)</p>
          </div>
          <Switch checked={v.isPublic} onChange={(x) => set("isPublic", x)} label="Hiện cho khách chọn" />
        </label>
      </form>
    </Modal>
  );
}

export default function AdminCouponsPage() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [editing, setEditing] = useState<{ coupon: Coupon | null; key: number } | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    couponService
      .getAll()
      .then(setCoupons)
      .catch((err: Error) => {
        toast(err.message, "error");
        setCoupons([]);
      });
  }, [toast]);

  const upsert = (c: Coupon) => setCoupons((prev) => (prev?.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...(prev ?? [])]));

  const toggleActive = async (c: Coupon) => {
    try {
      upsert(await couponService.update(c.id, { isActive: !c.isActive }));
      toast(c.isActive ? `Đã tắt mã ${c.code}` : `Đã bật mã ${c.code}`, "info");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await couponService.remove(deleting.id);
      setCoupons((prev) => prev?.filter((x) => x.id !== deleting.id) ?? null);
      toast(`Đã xoá mã ${deleting.code}`, "info");
      setDeleting(null);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-coffee-500">Quản lý / Mã giảm giá</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-coffee-950">Mã giảm giá</h1>
          <p className="mt-1 text-coffee-600">Tạo mã khuyến mãi để khách nhập ở giỏ hàng.</p>
        </div>
        <Button onClick={() => setEditing({ coupon: null, key: Date.now() })}>
          <Plus className="h-4 w-4" /> Tạo mã
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
        {coupons === null ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-coffee-50" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <TicketPercent className="h-10 w-10 text-coffee-300" />
            <p className="mt-3 font-medium text-coffee-800">Chưa có mã giảm giá nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-coffee-50/60 text-left text-xs uppercase tracking-wider text-coffee-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mã</th>
                  <th className="px-5 py-3 font-semibold">Mức giảm</th>
                  <th className="px-5 py-3 font-semibold">Điều kiện</th>
                  <th className="px-5 py-3 font-semibold">Đã dùng</th>
                  <th className="px-5 py-3 font-semibold">Thời hạn</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {coupons.map((c) => {
                  const state = couponState(c);
                  return (
                    <tr key={c.id} className="align-top">
                      <td className="px-5 py-4">
                        <button
                          onClick={() => navigator.clipboard.writeText(c.code).then(() => toast(`Đã chép mã ${c.code}`, "info"))}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-coffee-100 px-2.5 py-1 font-mono font-semibold text-coffee-900 hover:bg-coffee-200"
                          title="Chép mã"
                        >
                          {c.code} <Copy className="h-3.5 w-3.5 text-coffee-500" />
                        </button>
                        {!c.isPublic && (
                          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-coffee-100 px-2 py-0.5 text-[11px] font-medium text-coffee-700">
                            <EyeOff className="h-3 w-3" /> Mã bí mật
                          </p>
                        )}
                        {c.description && <p className="mt-1.5 max-w-56 text-xs text-coffee-500">{c.description}</p>}
                      </td>
                      <td className="px-5 py-4 font-medium text-coffee-900">{describeDiscount(c)}</td>
                      <td className="px-5 py-4 text-coffee-700">
                        {c.minOrder > 0 ? `Đơn từ ${formatPrice(c.minOrder)}` : "Mọi đơn"}
                        {c.firstOrderOnly && <p className="text-xs text-coffee-500">Chỉ đơn đầu tiên</p>}
                      </td>
                      <td className="px-5 py-4 tabular-nums text-coffee-700">
                        {c.usedCount}
                        {c.usageLimit !== null && ` / ${c.usageLimit}`}
                      </td>
                      <td className="px-5 py-4 text-xs text-coffee-600">
                        {c.startsAt && <p>Từ {formatDateTime(c.startsAt)}</p>}
                        <p>{c.expiresAt ? `Đến ${formatDateTime(c.expiresAt)}` : "Không hết hạn"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Switch checked={c.isActive} onChange={() => toggleActive(c)} label={`Bật/tắt mã ${c.code}`} />
                          <Badge tone={state.tone}>{state.label}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditing({ coupon: c, key: Date.now() })} className="rounded-lg p-2 text-coffee-500 hover:bg-coffee-100 hover:text-coffee-900" aria-label={`Sửa mã ${c.code}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleting(c)} className="rounded-lg p-2 text-coffee-500 hover:bg-red-50 hover:text-red-600" aria-label={`Xoá mã ${c.code}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <CouponFormModal key={editing.key} coupon={editing.coupon} onClose={() => setEditing(null)} onSaved={upsert} />}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title={`Xoá mã ${deleting?.code ?? ""}?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              Huỷ
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={busy}>
              Xoá mã
            </Button>
          </>
        }
      >
        <p className="text-sm text-coffee-700">Khách sẽ không dùng được mã này nữa. Các đơn đã dùng mã vẫn giữ nguyên số tiền được giảm.</p>
      </Modal>
    </div>
  );
}
