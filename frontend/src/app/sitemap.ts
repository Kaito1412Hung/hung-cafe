import type { MetadataRoute } from "next";

/**
 * /sitemap.xml — danh sách các trang công khai để Google tìm và cập nhật nhanh hơn.
 * Mỗi món có 1 dòng (/menu/{slug}); tạo lại mỗi giờ để món mới tự xuất hiện.
 */
export const revalidate = 3600;

const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/menu`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    ...["giao-hang", "doi-tra", "bao-mat"].map((slug) => ({
      url: `${SITE_URL}/chinh-sach/${slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  try {
    const res = await fetch(`${BACKEND_URL}/api/products`, { next: { revalidate } });
    const { data } = (await res.json()) as { data: { slug: string; isAvailable: boolean; updatedAt: string }[] };
    for (const p of data.filter((p) => p.isAvailable)) {
      pages.push({ url: `${SITE_URL}/menu/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: "weekly", priority: 0.8 });
    }
  } catch {
    // Backend chưa chạy (VD lúc build) → vẫn trả về các trang cố định
  }
  return pages;
}
