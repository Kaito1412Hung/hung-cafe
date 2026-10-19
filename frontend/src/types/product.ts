export type Category = "coffee" | "tea" | "freeze" | "cake";

export interface Product {
  id: number;
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

/** Dữ liệu người dùng nhập khi tạo / sửa sản phẩm (server tự sinh id và thời gian) */
export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;
