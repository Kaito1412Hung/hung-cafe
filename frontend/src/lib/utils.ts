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

/** "07:00" → "7:00" cho dễ đọc */
export const formatHour = (hhmm: string) => hhmm.replace(/^0(\d)/, "$1");

/**
 * Chuẩn hoá chữ để tìm kiếm KHÔNG DẤU: "Cà Phê  Đá" → "ca phe da".
 * So sánh cả tên món lẫn từ khoá sau khi chuẩn hoá → gõ "ca phe" hay "cà phê" đều ra.
 */
export function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu thanh + dấu mũ
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
