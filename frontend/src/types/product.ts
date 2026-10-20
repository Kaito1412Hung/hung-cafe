import type { ProductOptionConfig } from "@/lib/options";

/** Slug của danh mục (danh sách lấy từ API /categories) */
export type Category = string;

export interface Product extends ProductOptionConfig {
  id: number;
  /** Đường dẫn trang chi tiết: /menu/{slug} */
  slug: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  stock: number;
  isAvailable: boolean;
  isBestSeller: boolean;
  /** Món có ít nhất 1 lựa chọn (size / đường / nóng-đá / topping) — server tự tính */
  hasOptions: boolean;
  /** Điểm trung bình (null = chưa có đánh giá) */
  ratingAverage: number | null;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Dữ liệu người dùng nhập khi tạo / sửa sản phẩm (server tự sinh id, slug và thời gian) */
export type ProductInput = Omit<Product, "id" | "slug" | "createdAt" | "updatedAt" | "ratingAverage" | "ratingCount" | "hasOptions">;
