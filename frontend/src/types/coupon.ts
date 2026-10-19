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
  createdAt: string;
}

export type CouponInput = Omit<Coupon, "id" | "usedCount" | "createdAt">;

/** Kết quả kiểm tra mã với giỏ hàng hiện tại */
export interface AppliedCoupon {
  code: string;
  description: string;
  discount: number;
}
