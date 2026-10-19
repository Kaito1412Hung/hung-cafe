import type { Metadata } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ShopSettingsProvider } from "@/context/ShopSettingsContext";
import { CategoriesProvider } from "@/context/CategoriesContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  // Địa chỉ web thật khi deploy (để link ảnh chia sẻ là link đầy đủ)
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Hưng Café — Cà phê rang xay thủ công",
    template: "%s | Hưng Café",
  },
  description: "Cà phê nguyên chất rang mộc, trà và bánh ngọt làm mới mỗi ngày.",
  // Thông tin khi gửi link qua Zalo / Facebook (ảnh lấy từ app/opengraph-image.tsx)
  openGraph: {
    siteName: "Hưng Café",
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body className={`${beVietnam.variable} ${playfair.variable} font-sans antialiased`}>
        <ShopSettingsProvider>
          <CategoriesProvider>
            <AuthProvider>
              <CartProvider>
                <FavoritesProvider>
                  <ToastProvider>{children}</ToastProvider>
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
          </CategoriesProvider>
        </ShopSettingsProvider>
      </body>
    </html>
  );
}
