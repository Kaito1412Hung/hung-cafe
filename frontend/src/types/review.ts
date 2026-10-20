export interface Review {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  comment: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviews {
  summary: { average: number | null; count: number; breakdown: Record<1 | 2 | 3 | 4 | 5, number> };
  reviews: Review[];
  /** Đã đăng nhập và đã nhận món này (đơn hoàn thành) */
  canReview: boolean;
  myReview: Review | null;
}

export interface FeaturedReview extends Review {
  productName: string;
  productSlug: string;
}

/** Một dòng ở trang quản lý đánh giá (admin) */
export interface AdminReview extends Review {
  authorEmail: string;
  productName: string;
  productSlug: string;
  productImage: string;
}

export interface AdminReviewFilters {
  rating?: number;
  productId?: number;
  search?: string;
  hasComment?: boolean;
  /** Xem đúng 1 đánh giá (bấm từ chuông thông báo) */
  id?: number;
  sort?: "newest" | "lowest";
  page: number;
  pageSize: number;
}

export interface AdminReviewPage {
  data: AdminReview[];
  total: number;
  page: number;
  pageSize: number;
  /** Thống kê số sao theo bộ lọc hiện tại (không tính bộ lọc số sao) */
  summary: ProductReviews["summary"];
}
