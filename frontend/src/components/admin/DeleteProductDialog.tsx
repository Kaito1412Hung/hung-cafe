"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/types/product";

interface DeleteProductDialogProps {
  product: Product | null;
  onClose: () => void;
  onConfirm: (product: Product) => Promise<void>;
}

export function DeleteProductDialog({ product, onClose, onConfirm }: DeleteProductDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await onConfirm(product);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      size="sm"
      title="Xoá sản phẩm?"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Huỷ
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={deleting}>
            Xoá vĩnh viễn
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <TriangleAlert className="h-6 w-6" />
        </span>
        <p className="text-sm leading-relaxed text-coffee-700">
          Bạn chắc chắn muốn xoá <strong className="text-coffee-950">{product?.name}</strong>? Hành động này không thể hoàn tác.
        </p>
      </div>
    </Modal>
  );
}
