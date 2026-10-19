/** Slug của danh mục (danh sách lấy từ API /categories) */
export type Category = string;

export interface Product {
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
  createdAt: string;
  updatedAt: string;
}

/** Dữ liệu người dùng nhập khi tạo / sửa sản phẩm (server tự sinh id, slug và thời gian) */
export type ProductInput = Omit<Product, "id" | "slug" | "createdAt" | "updatedAt">;
