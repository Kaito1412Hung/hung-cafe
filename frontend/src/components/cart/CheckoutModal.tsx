"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ApiError } from "@/lib/api";
import { formatOrderCode } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";
import { orderService } from "@/services/orderService";
import { profileService } from "@/services/profileService";
import type { CheckoutInput } from "@/types/order";

type Errors = Partial<Record<keyof CheckoutInput, string>>;

function validate(v: CheckoutInput): Errors {
  const errors: Errors = {};
  if (v.customerName.trim().length < 2) errors.customerName = "Tên người nhận cần ít nhất 2 ký tự";
  if (!/^(0|\+84)\d{9}$/.test(v.phone.replace(/[\s.-]/g, ""))) errors.phone = "Số điện thoại không hợp lệ (VD: 0971131945)";
  if (v.address.trim().length < 5) errors.address = "Vui lòng nhập địa chỉ giao hàng";
  if (v.note.length > 255) errors.note = "Ghi chú tối đa 255 ký tự";
  return errors;
}

interface CheckoutModalProps {
  open: boolean;
  total: number;
  /** Mã giảm giá đã áp dụng ở giỏ ("" = không có) */
  couponCode: string;
  /** Server báo mã không còn dùng được lúc đặt → giỏ bỏ mã đi */
  onCouponInvalid: () => void;
  onClose: () => void;
}

/** Cha truyền `key` mới mỗi lần mở để form reset */
export function CheckoutModal({ open, total, couponCode, onCouponInvalid, onClose }: CheckoutModalProps) {
  const { user, updateUser } = useAuth();
  const { resetCart } = useCart();
  const toast = useToast();
  const router = useRouter();

  // Tự điền từ hồ sơ (Tài khoản của tôi → Hồ sơ / Địa chỉ)
  const [values, setValues] = useState<CheckoutInput>({
    customerName: user?.name ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
    note: "",
  });
  const [saveInfo, setSaveInfo] = useState(!user?.phone || !user?.address);
  const infoChanged = values.phone.replace(/[\s.-]/g, "") !== (user?.phone ?? "") || values.address.trim() !== (user?.address ?? "");
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
      const order = await orderService.checkout({ ...values, couponCode });
      resetCart();
      // Lưu SĐT + địa chỉ vào hồ sơ để lần sau khỏi gõ lại (lỗi ở bước này không ảnh hưởng đơn)
      if (saveInfo && infoChanged) {
        profileService
          .update({ phone: values.phone, address: values.address })
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
      title="Thông tin giao hàng"
      description="Quán sẽ gọi xác nhận trước khi giao."
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
        <Field label="Địa chỉ giao hàng" htmlFor="address" error={errors.address} required>
          <Input id="address" autoComplete="street-address" value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="Số nhà, đường, phường, quận" invalid={!!errors.address} />
        </Field>
        <Field label="Ghi chú cho quán" htmlFor="note" error={errors.note} hint="VD: ít đá, ít ngọt, giao giờ hành chính...">
          <Textarea id="note" value={values.note} onChange={(e) => set("note", e.target.value)} className="min-h-20" invalid={!!errors.note} />
        </Field>

        {infoChanged && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-coffee-700">
            <input type="checkbox" checked={saveInfo} onChange={(e) => setSaveInfo(e.target.checked)} className="h-4 w-4 accent-coffee-800" />
            Lưu số điện thoại &amp; địa chỉ này cho lần đặt sau
          </label>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-coffee-50 p-4">
          <Banknote className="h-5 w-5 shrink-0 text-coffee-600" />
          <div className="text-sm">
            <p className="font-medium text-coffee-900">Thanh toán khi nhận hàng (COD)</p>
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
