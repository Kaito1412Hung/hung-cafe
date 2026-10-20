export interface Coupon {
  id: number;
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: number;
  /** Giảm tối đa (cho loại %) — null = không giới hạn */
  maxDiscount: number | null;
  minOrder: number;
  /** Tổng số lượt — null = không giới hạn */
  usageLimit: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  /** Hiện trong danh sách cho khách chọn (false = mã bí mật, phải tự gõ) */
  isPublic: boolean;
  createdAt: string;
}

export type CouponInput = Omit<Coupon, "id" | "usedCount" | "createdAt">;

/** Mã công khai trong cửa sổ "Chọn mã giảm giá" */
export interface AvailableCoupon {
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  expiresAt: string | null;
  /** Số lượt còn lại (null = không giới hạn) */
  usageLeft: number | null;
  /** Số tiền được giảm với giỏ hiện tại (0 nếu chưa dùng được) */
  discount: number;
  eligible: boolean;
  /** Lý do chưa dùng được, VD "Mua thêm 38.000đ để dùng" */
  reason: string;
}

/** Kết quả kiểm tra mã với giỏ hàng hiện tại */
export interface AppliedCoupon {
  code: string;
  description: string;
  discount: number;
}
