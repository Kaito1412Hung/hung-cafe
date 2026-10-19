"use client";

import { useCallback, useEffect, useState } from "react";
import { productService } from "@/services/productService";
import type { Product, ProductInput } from "@/types/product";

/** Gom toàn bộ state + thao tác CRUD sản phẩm vào một hook để các trang tái sử dụng */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    productService
      .getAll()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const createProduct = useCallback(async (input: ProductInput) => {
    const created = await productService.create(input);
    setProducts((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateProduct = useCallback(async (id: number, input: Partial<ProductInput>) => {
    const updated = await productService.update(id, input);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id: number) => {
    await productService.remove(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { products, loading, error, createProduct, updateProduct, deleteProduct };
}
