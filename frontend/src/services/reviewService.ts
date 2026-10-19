import { api } from "@/lib/api";
import type { ProductReviews, Review } from "@/types/review";

export const reviewService = {
  async getByProduct(productId: number): Promise<ProductReviews> {
    return (await api<{ data: ProductReviews }>(`/reviews/product/${productId}`)).data;
  },

  /** Các món mình đã đánh giá */
  async getMine(): Promise<{ productId: number; rating: number; comment: string }[]> {
    return (await api<{ data: { productId: number; rating: number; comment: string }[] }>("/reviews/mine")).data;
  },

  /** Viết mới hoặc sửa đánh giá của mình */
  async save(productId: number, rating: number, comment: string): Promise<Review> {
    return (await api<{ data: Review }>("/reviews", { method: "POST", body: JSON.stringify({ productId, rating, comment }) })).data;
  },

  async remove(id: number): Promise<void> {
    await api(`/reviews/${id}`, { method: "DELETE" });
  },
};
