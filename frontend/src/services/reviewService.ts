import { api } from "@/lib/api";
import type { AdminReviewFilters, AdminReviewPage, ProductReviews, Review } from "@/types/review";

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

  /** Admin: tất cả đánh giá, lọc + chia trang ở server */
  async getAll(f: AdminReviewFilters): Promise<AdminReviewPage> {
    const q = new URLSearchParams({ page: String(f.page), pageSize: String(f.pageSize) });
    if (f.rating) q.set("rating", String(f.rating));
    if (f.productId) q.set("productId", String(f.productId));
    if (f.search) q.set("search", f.search);
    if (f.hasComment) q.set("hasComment", "1");
    if (f.id) q.set("id", String(f.id));
    if (f.sort) q.set("sort", f.sort);
    return api<AdminReviewPage>(`/reviews?${q}`);
  },

  async remove(id: number): Promise<void> {
    await api(`/reviews/${id}`, { method: "DELETE" });
  },
};
