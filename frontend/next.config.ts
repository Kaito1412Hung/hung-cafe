import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  images: {
    // Cho phép next/image tải ảnh từ Unsplash (dùng cho ảnh tĩnh ở trang chủ)
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // Mọi request /api/* được Next.js chuyển tiếp sang backend Node.js
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
