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
