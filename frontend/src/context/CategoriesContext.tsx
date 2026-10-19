"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { categoryService } from "@/services/categoryService";
import type { Category } from "@/types/category";

interface CategoriesContextValue {
  categories: Category[];
  loading: boolean;
  /** Tên hiển thị theo slug: "coffee" → "Cà phê" */
  getLabel: (slug: string) => string;
  /** Tải lại sau khi admin thêm / sửa / xoá danh mục */
  refresh: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

/** Danh mục lấy từ database (admin quản lý ở /admin/categories), dùng chung toàn trang */
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setCategories(await categoryService.getAll());
    } catch {
      // backend chưa chạy: để danh sách rỗng, nhãn sẽ hiện tạm bằng slug
    }
  }, []);

  useEffect(() => {
    categoryService
      .getAll()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getLabel = useCallback((slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug, [categories]);

  return <CategoriesContext.Provider value={{ categories, loading, getLabel, refresh }}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories phải được dùng bên trong <CategoriesProvider>");
  return ctx;
}
