export interface Category {
  id: number;
  /** Mã cố định, dùng trong sản phẩm và URL (VD: "coffee") */
  slug: string;
  name: string;
  sortOrder: number;
  productCount: number;
}

export interface CategoryInput {
  name: string;
  sortOrder: number;
}
