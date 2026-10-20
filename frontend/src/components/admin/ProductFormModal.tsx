"use client";

import { useRef, useState, type FormEvent } from "react";
import { ImageUp, Link2, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/FormField";
import { Switch } from "@/components/ui/Switch";
import { ProductImage } from "@/components/ui/ProductImage";
import { useToast } from "@/components/ui/Toast";
import { useCategories } from "@/context/CategoriesContext";
import { resizeImage } from "@/lib/image";
import { productService } from "@/services/productService";
import { SERVES, type Serve } from "@/lib/options";
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
  /* Món cho khách chọn những gì */
  hasSize: boolean;
  hasSugar: boolean;
  serve: Serve;
  allowToppings: boolean;
}
type FormErrors = Partial<Record<keyof FormValues, string>>;

const emptyValues = (category: string): FormValues => ({
  name: "",
  description: "",
  price: "",
  stock: "",
  category,
  image: "",
  isAvailable: true,
  isBestSeller: false,
  // Mặc định theo danh mục: đồ ăn không có lựa chọn; đồ uống có size + đường + đá; trà sữa thêm topping
  ...defaultChoices(category),
});

/** Lựa chọn gợi ý khi tạo món mới / đổi danh mục (admin vẫn chỉnh lại được) */
function defaultChoices(category: string): Pick<FormValues, "hasSize" | "hasSugar" | "serve" | "allowToppings"> {
  const food = category === "cake" || category === "snack";
  return { hasSize: !food, hasSugar: !food, serve: food ? "none" : "cold", allowToppings: category === "milktea" };
}

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
    hasSize: p.hasSize,
    hasSugar: p.hasSugar,
    serve: p.serve,
    allowToppings: p.allowToppings,
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

  if (!v.category) errors.category = "Vui lòng chọn danh mục";
  if (v.image && !/^https?:\/\/.+/.test(v.image) && !v.image.startsWith("/api/uploads/")) {
    errors.image = "Link ảnh phải bắt đầu bằng http:// hoặc https://";
  }
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
  const toast = useToast();
  const { categories } = useCategories();
  const [values, setValues] = useState<FormValues>(product ? toFormValues(product) : emptyValues(categories[0]?.slug ?? ""));
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(Boolean(product?.image.startsWith("http")));
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(product);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Chọn ảnh từ máy → thu nhỏ ở trình duyệt → upload → lưu đường dẫn vào form */
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await productService.uploadImage(await resizeImage(file));
      set("image", url);
      toast("Đã tải ảnh lên");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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
          <Button type="submit" form="product-form" loading={submitting} disabled={uploading}>
            {isEdit ? "Lưu thay đổi" : "Thêm sản phẩm"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-[180px_1fr]">
        {/* Ảnh sản phẩm: bấm vào khung để chọn ảnh từ máy */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl ring-1 ring-coffee-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coffee-200"
            aria-label="Chọn ảnh từ máy"
          >
            <ProductImage src={values.image} alt="Ảnh sản phẩm" className="aspect-square w-full" />
            <span
              className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-coffee-950/55 text-xs font-medium text-white transition ${uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageUp className="h-6 w-6" />}
              {uploading ? "Đang tải lên..." : "Chọn ảnh từ máy"}
            </span>
          </button>
          <div className="flex justify-center gap-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-8 px-2.5 text-xs">
              <ImageUp className="h-3.5 w-3.5" /> {values.image ? "Đổi ảnh" : "Tải ảnh"}
            </Button>
            {values.image && (
              <Button type="button" size="sm" variant="ghost" onClick={() => set("image", "")} disabled={uploading} className="h-8 px-2 text-xs text-red-600 hover:bg-red-50" aria-label="Xoá ảnh">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
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

          <Field label="Danh mục" htmlFor="category" error={errors.category} hint="Thêm danh mục mới ở mục Danh mục trên thanh bên">
            <Select
              id="category"
              value={values.category}
              onChange={(e) => {
                const category = e.target.value as Category;
                // Món mới: đổi danh mục thì gợi ý lại lựa chọn (VD chọn "Đồ ăn nhẹ" → tắt size, đường, đá)
                setValues((prev) => ({ ...prev, category, ...(isEdit ? {} : defaultChoices(category)) }));
              }}
            >
              {!values.category && <option value="">— Chọn danh mục —</option>}
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {showUrlInput ? (
          <Field label="Hoặc dán link ảnh" htmlFor="image" error={errors.image} hint="VD: link ảnh từ unsplash.com" className="sm:col-span-2">
            <Input id="image" value={values.image.startsWith("/api/uploads/") ? "" : values.image} onChange={(e) => set("image", e.target.value)} placeholder="https://images.unsplash.com/..." invalid={!!errors.image} />
          </Field>
        ) : (
          <button type="button" onClick={() => setShowUrlInput(true)} className="flex w-fit cursor-pointer items-center gap-1.5 text-xs font-medium text-coffee-600 hover:text-coffee-950 sm:col-span-2">
            <Link2 className="h-3.5 w-3.5" /> Dùng link ảnh trên mạng thay vì tải lên
          </button>
        )}

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

        {/* Khách được chọn gì khi gọi món này */}
        <fieldset className="space-y-3 rounded-2xl border border-coffee-100 p-4 sm:col-span-2">
          <legend className="px-1 text-sm font-semibold text-coffee-900">Khách được chọn</legend>
          <Field label="Cách phục vụ" htmlFor="serve" hint="Chọn “Chỉ uống nóng” thì khách không thấy ô chọn đá">
            <Select id="serve" value={values.serve} onChange={(e) => set("serve", e.target.value as Serve)}>
              {SERVES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["hasSize", "Size S / M / L", "M +6.000đ, L +10.000đ"],
                ["hasSugar", "Mức đường", "100% → không đường"],
                ["allowToppings", "Thêm topping", "Trân châu, thạch, pudding..."],
              ] as const
            ).map(([key, title, hint]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-coffee-50/60 p-3">
                <div>
                  <p className="text-sm font-medium text-coffee-900">{title}</p>
                  <p className="text-xs text-coffee-500">{hint}</p>
                </div>
                <Switch checked={values[key]} onChange={(v) => set(key, v)} label={title} />
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
