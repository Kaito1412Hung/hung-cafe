import { api } from "@/lib/api";
import type { AppliedCoupon, Coupon, CouponInput } from "@/types/coupon";

export const couponService = {
  /** Kiểm tra mã với giỏ hàng hiện tại → số tiền được giảm (sai điều kiện thì báo lỗi rõ lý do) */
  async check(code: string): Promise<AppliedCoupon> {
    return (await api<{ data: AppliedCoupon }>("/coupons/check", { method: "POST", body: JSON.stringify({ code }) })).data;
  },

  /* ----- Admin ----- */
  async getAll(): Promise<Coupon[]> {
    return (await api<{ data: Coupon[] }>("/coupons")).data;
  },

  async create(input: CouponInput): Promise<Coupon> {
    return (await api<{ data: Coupon }>("/coupons", { method: "POST", body: JSON.stringify(input) })).data;
  },

  async update(id: number, input: Partial<CouponInput>): Promise<Coupon> {
    return (await api<{ data: Coupon }>(`/coupons/${id}`, { method: "PATCH", body: JSON.stringify(input) })).data;
  },

  async remove(id: number): Promise<void> {
    await api(`/coupons/${id}`, { method: "DELETE" });
  },
};
