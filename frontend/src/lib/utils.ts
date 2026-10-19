/** Nối className, bỏ qua giá trị falsy */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const priceFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export function formatPrice(value: number) {
  return priceFormatter.format(value);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function unsplash(id: string, width = 800) {
  return `https://images.unsplash.com/photo-${id}?w=${width}&q=80&auto=format&fit=crop`;
}
