"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/FormField";
import { Switch } from "@/components/ui/Switch";
import { ProductImage } from "@/components/ui/ProductImage";
import { CATEGORIES } from "@/lib/utils";
import type { Category, Product, ProductInput } from "@/types/product";

/** Giá trị trong form để dạng string cho dễ nhập, khi submit mới chuyển sang number */
interface FormValues {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: Category;
  image: string;
  isAvailable: boolean;
  isBestSeller: boolean;
}
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  name: "",
  description: "",
  price: "",
  stock: "",
  category: "coffee",
  image: "",
  isAvailable: true,
  isBestSeller: false,
};

function toFormValues(p: Product): FormValues {
  return {
    name: p.name,
    description: p.description,
    price: String(p.price),
    stock: String(p.stock),
    category: p.category,
    image: p.image,
    isAvailable: p.isAvailable,
    isBestSeller: p.isBestSeller,
  };
}

function validate(v: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (v.name.trim().length < 2) errors.name = "Tên sản phẩm cần ít nhất 2 ký tự";
  if (v.name.trim().length > 60) errors.name = "Tên sản phẩm tối đa 60 ký tự";

  const price = Number(v.price);
  if (!v.price) errors.price = "Vui lòng nhập giá";
  else if (!Number.isFinite(price) || price < 1000) errors.price = "Giá phải từ 1.000đ trở lên";

  const stock = Number(v.stock);
  if (v.stock === "") errors.stock = "Vui lòng nhập tồn kho";
  else if (!Number.isInteger(stock) || stock < 0) errors.stock = "Tồn kho là số nguyên ≥ 0";

  if (v.image && !/^https?:\/\/.+/.test(v.image)) errors.image = "URL ảnh phải bắt đầu bằng http:// hoặc https://";
  if (v.description.length > 200) errors.description = "Mô tả tối đa 200 ký tự";
  return errors;
}

interface ProductFormModalProps {
  open: boolean;
  product: Product | null; // null = tạo mới
  onClose: () => void;
  onSubmit: (input: ProductInput) => Promise<void>;
}

/** Component cha truyền `key` khác nhau mỗi lần mở → form tự reset state, không cần useEffect */
export function ProductFormModal({ open, product, onClose, onSubmit }: ProductFormModalProps) {
  const [values, setValues] = useState<FormValues>(product ? toFormValues(product) : EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(product);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
        price: Number(values.price),
        stock: Number(values.stock),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
      description={isEdit ? `Cập nhật thông tin cho "${product?.name}"` : "Điền thông tin để thêm món mới vào thực đơn"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" form="product-form" loading={submitting}>
            {isEdit ? "Lưu thay đổi" : "Thêm sản phẩm"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-[180px_1fr]">
        {/* Xem trước ảnh */}
        <div className="space-y-2">
          <ProductImage src={values.image} alt="Xem trước" className="aspect-square w-full rounded-2xl ring-1 ring-coffee-100" />
          <p className="text-center text-xs text-coffee-500">Xem trước ảnh</p>
        </div>

        <div className="space-y-4">
          <Field label="Tên sản phẩm" htmlFor="name" error={errors.name} required>
            <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: Cà Phê Muối" invalid={!!errors.name} autoFocus />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Giá (VNĐ)" htmlFor="price" error={errors.price} required>
              <Input id="price" type="number" inputMode="numeric" min={0} step={1000} value={values.price} onChange={(e) => set("price", e.target.value)} placeholder="45000" invalid={!!errors.price} />
            </Field>
            <Field label="Tồn kho" htmlFor="stock" error={errors.stock} required>
              <Input id="stock" type="number" inputMode="numeric" min={0} value={values.stock} onChange={(e) => set("stock", e.target.value)} placeholder="50" invalid={!!errors.stock} />
            </Field>
          </div>

          <Field label="Danh mục" htmlFor="category">
            <Select id="category" value={values.category} onChange={(e) => set("category", e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="URL hình ảnh" htmlFor="image" error={errors.image} hint="Dán link ảnh (VD từ unsplash.com)" className="sm:col-span-2">
          <Input id="image" value={values.image} onChange={(e) => set("image", e.target.value)} placeholder="https://images.unsplash.com/..." invalid={!!errors.image} />
        </Field>

        <Field label="Mô tả" htmlFor="description" error={errors.description} hint={`${values.description.length}/200 ký tự`} className="sm:col-span-2">
          <Textarea id="description" value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Mô tả ngắn về hương vị, nguyên liệu..." invalid={!!errors.description} />
        </Field>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-coffee-100 p-4">
            <div>
              <p className="text-sm font-medium text-coffee-900">Đang bán</p>
              <p className="text-xs text-coffee-500">Hiển thị cho khách đặt món</p>
            </div>
            <Switch checked={values.isAvailable} onChange={(v) => set("isAvailable", v)} label="Đang bán" />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-coffee-100 p-4">
            <div>
              <p className="text-sm font-medium text-coffee-900">Bán chạy</p>
              <p className="text-xs text-coffee-500">Nổi bật ở trang chủ</p>
            </div>
            <Switch checked={values.isBestSeller} onChange={(v) => set("isBestSeller", v)} label="Bán chạy" />
          </label>
        </div>
      </form>
    </Modal>
  );
}
