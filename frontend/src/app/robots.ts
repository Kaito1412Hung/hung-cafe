import type { MetadataRoute } from "next";

const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** /robots.txt — cho Google biết trang nào nên / không nên đọc, và sitemap nằm ở đâu */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Trang cá nhân / quản trị không cần xuất hiện trên Google
      disallow: ["/admin", "/account", "/cart", "/orders", "/favorites", "/login", "/register", "/forgot-password", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
