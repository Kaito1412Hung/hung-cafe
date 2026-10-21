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

/**
 * Múi giờ của quán. Mọi ngày giờ trên web đều hiển thị theo giờ Việt Nam,
 * nên người xem ở nước nào (hay server đặt ở đâu) cũng thấy đúng giờ của quán.
 */
export const SHOP_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Năm / tháng / ngày / giờ / phút theo giờ Việt Nam, dạng chuỗi 2 chữ số: { year: "2026", month: "10", day: "21", hour: "09", minute: "05" } */
export function vnParts(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SHOP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute };
}

/** Ngày theo giờ Việt Nam, dạng "YYYY-MM-DD" (cùng dạng với ô chọn ngày) */
export function vnDate(d: Date = new Date()) {
  const { year, month, day } = vnParts(d);
  return `${year}-${month}-${day}`;
}

/** "21/10/2026" (giờ Việt Nam) */
export function formatDate(iso: string) {
  const { year, month, day } = vnParts(new Date(iso));
  return `${day}/${month}/${year}`;
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
