/** "Cà Phê Sữa Đá" → "ca-phe-sua-da" (bỏ dấu tiếng Việt, chỉ giữ a-z, 0-9 và dấu gạch) */
export function slugify(text: string) {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return slug || "mon";
}
