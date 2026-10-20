"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Clock, Store } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useShopSettings } from "@/context/ShopSettingsContext";
import { ApiError } from "@/lib/api";
import { formatOrderCode, scheduleOptions } from "@/lib/orders";
import { cn, formatPrice } from "@/lib/utils";
import { orderService } from "@/services/orderService";
import { profileService } from "@/services/profileService";
import type { CheckoutInput, Fulfillment } from "@/types/order";

type Errors = Partial<Record<keyof CheckoutInput, string>>;

function validate(v: CheckoutInput): Errors {
  const errors: Errors = {};
  if (v.customerName.trim().length < 2) errors.customerName = "Tên người nhận cần ít nhất 2 ký tự";
  if (!/^(0|\+84)\d{9}$/.test(v.phone.replace(/[\s.-]/g, ""))) errors.phone = "Số điện thoại không hợp lệ (VD: 0971131945)";
  if (v.fulfillment === "delivery" && v.address.trim().length < 5) errors.address = "Vui lòng nhập địa chỉ giao hàng";
  if (v.note.length > 255) errors.note = "Ghi chú tối đa 255 ký tự";
  return errors;
}

interface CheckoutModalProps {
  open: boolean;
  total: number;
  /** Chọn ở giỏ hàng: giao tận nơi / đến quán lấy */
  fulfillment: Fulfillment;
  /** Mã giảm giá đã áp dụng ở giỏ ("" = không có) */
  couponCode: string;
  /** Server báo mã không còn dùng được lúc đặt → giỏ bỏ mã đi */
  onCouponInvalid: () => void;
  onClose: () => void;
}

/** Cha truyền `key` mới mỗi lần mở để form reset */
export function CheckoutModal({ open, total, fulfillment, couponCode, onCouponInvalid, onClose }: CheckoutModalProps) {
  const { user, updateUser } = useAuth();
  const { resetCart } = useCart();
  const toast = useToast();
  const router = useRouter();
  const { settings } = useShopSettings();
  const pickup = fulfillment === "pickup";

  // Tự điền từ hồ sơ (Tài khoản của tôi → Hồ sơ / Địa chỉ)
  const [values, setValues] = useState<CheckoutInput>({
    customerName: user?.name ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
    note: "",
    fulfillment,
    scheduledAt: null,
  });
  // Giờ nhận: "asap" = càng sớm càng tốt, "later" = hẹn giờ (chọn ngày + giờ, mỗi 15 phút)
  const [timeMode, setTimeMode] = useState<"asap" | "later">("asap");
  // Tính 1 lần lúc mở form (cha đổi `key` mỗi lần mở nên luôn mới)
  const days = useMemo(() => scheduleOptions(settings, fulfillment), [settings, fulfillment]);
  const [dayKey, setDayKey] = useState(days[0]?.key ?? "today");
  const day = days.find((d) => d.key === dayKey) ?? days[0];
  const [slot, setSlot] = useState(days[0]?.slots[0]?.value ?? "");
  const lead = settings.prepMinutes + (pickup ? 0 : settings.deliveryMinutes);
  const [saveInfo, setSaveInfo] = useState(!user?.phone || !user?.address);
  const infoChanged =
    values.phone.replace(/[\s.-]/g, "") !== (user?.phone ?? "") || (!pickup && values.address.trim() !== (user?.address ?? ""));
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof CheckoutInput, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const scheduledAt = timeMode === "later" && slot ? slot : null;
      const order = await orderService.checkout({ ...values, address: pickup ? "" : values.address, couponCode, scheduledAt });
      resetCart();
      // Lưu SĐT + địa chỉ vào hồ sơ để lần sau khỏi gõ lại (lỗi ở bước này không ảnh hưởng đơn)
      if (saveInfo && infoChanged) {
        profileService
          .update(pickup ? { phone: values.phone } : { phone: values.phone, address: values.address })
          .then(updateUser)
          .catch(() => {});
      }
      toast(`Đặt hàng thành công! Mã đơn ${formatOrderCode(order.id)}`);
      router.push(`/orders?new=${order.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      // Lỗi do mã giảm giá (hết lượt / hết hạn ngay lúc đặt) → bỏ mã, khách xem lại tổng tiền rồi đặt lại
      if (couponCode && err instanceof ApiError && /mã/i.test(err.message)) {
        onCouponInvalid();
        onClose();
      }
      toast((err as Error).message, "error");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pickup ? "Thông tin nhận món" : "Thông tin giao hàng"}
      description={pickup ? "Đến quán báo mã đơn để lấy món." : "Quán sẽ gọi xác nhận trước khi giao."}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Quay lại
          </Button>
          <Button type="submit" form="checkout-form" loading={submitting}>
            Xác nhận đặt hàng · {formatPrice(total)}
          </Button>
        </>
      }
    >
      <form id="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Người nhận" htmlFor="customerName" error={errors.customerName} required>
            <Input id="customerName" autoComplete="name" value={values.customerName} onChange={(e) => set("customerName", e.target.value)} invalid={!!errors.customerName} />
          </Field>
          <Field label="Số điện thoại" htmlFor="phone" error={errors.phone} required>
            <Input id="phone" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0971 131 945" invalid={!!errors.phone} />
          </Field>
        </div>
        {pickup ? (
          <p className="flex items-start gap-2.5 rounded-2xl bg-coffee-50 p-4 text-sm text-coffee-800">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-coffee-600" />
            <span>
              <strong>Đến quán lấy</strong> tại {settings.address}. Không tính phí giao hàng.
            </span>
          </p>
        ) : (
          <Field label="Địa chỉ giao hàng" htmlFor="address" error={errors.address} required>
            <Input id="address" autoComplete="street-address" value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="Số nhà, đường, phường, quận" invalid={!!errors.address} />
          </Field>
        )}

        {/* Giờ nhận */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-coffee-900">{pickup ? "Thời gian lấy" : "Thời gian giao"}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["asap", "later"] as const).map((mode) => {
              const disabled = mode === "later" && days.length === 0;
              return (
                <label
                  key={mode}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-2xl p-3 text-sm ring-1 transition",
                    timeMode === mode ? "bg-coffee-50 ring-coffee-700" : "ring-coffee-200 hover:bg-coffee-50/60",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input type="radio" name="timeMode" checked={timeMode === mode} disabled={disabled} onChange={() => setTimeMode(mode)} className="mt-0.5 accent-coffee-800" />
                  <span>
                    <span className="block font-medium text-coffee-900">{mode === "asap" ? "Càng sớm càng tốt" : "Hẹn giờ"}</span>
                    <span className="text-xs text-coffee-500">
                      {mode === "asap" ? `Khoảng ${lead} phút sau khi quán xác nhận` : disabled ? "Hôm nay và ngày mai đã hết giờ hẹn" : "Chọn giờ trong hôm nay hoặc ngày mai"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {timeMode === "later" && day && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Select
                value={day.key}
                onChange={(e) => {
                  const next = days.find((d) => d.key === e.target.value);
                  setDayKey(e.target.value as typeof dayKey);
                  setSlot(next?.slots[0]?.value ?? "");
                }}
                aria-label="Chọn ngày"
              >
                {days.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </Select>
              <Select value={slot} onChange={(e) => setSlot(e.target.value)} aria-label="Chọn giờ">
                {day.slots.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {errors.scheduledAt && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
              <Clock className="h-3.5 w-3.5" /> {errors.scheduledAt}
            </p>
          )}
        </fieldset>
        <Field label="Ghi chú cho quán" htmlFor="note" error={errors.note} hint="VD: ít đá, ít ngọt, giao giờ hành chính...">
          <Textarea id="note" value={values.note} onChange={(e) => set("note", e.target.value)} className="min-h-20" invalid={!!errors.note} />
        </Field>

        {infoChanged && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-coffee-700">
            <input type="checkbox" checked={saveInfo} onChange={(e) => setSaveInfo(e.target.checked)} className="h-4 w-4 accent-coffee-800" />
            {pickup ? "Lưu số điện thoại này cho lần đặt sau" : "Lưu số điện thoại & địa chỉ này cho lần đặt sau"}
          </label>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-coffee-50 p-4">
          <Banknote className="h-5 w-5 shrink-0 text-coffee-600" />
          <div className="text-sm">
            <p className="font-medium text-coffee-900">{pickup ? "Thanh toán tại quán khi lấy món" : "Thanh toán khi nhận hàng (COD)"}</p>
            <p className="text-coffee-600">Thanh toán online sẽ có ở phiên bản sau.</p>
          </div>
        </div>
        <p className="text-xs text-coffee-500">
          Bằng việc đặt hàng, bạn đồng ý với{" "}
          <Link href="/chinh-sach/giao-hang" target="_blank" className="underline hover:text-coffee-800">
            chính sách giao hàng
          </Link>{" "}
          và{" "}
          <Link href="/chinh-sach/doi-tra" target="_blank" className="underline hover:text-coffee-800">
            đổi trả
          </Link>{" "}
          của quán.
        </p>
      </form>
    </Modal>
  );
}
