import type { Metadata } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ShopSettingsProvider } from "@/context/ShopSettingsContext";
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
  title: {
    default: "Hưng Café — Cà phê rang xay thủ công",
    template: "%s | Hưng Café",
  },
  description: "Cà phê nguyên chất rang mộc, trà và bánh ngọt làm mới mỗi ngày.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body className={`${beVietnam.variable} ${playfair.variable} font-sans antialiased`}>
        <ShopSettingsProvider>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>{children}</ToastProvider>
            </CartProvider>
          </AuthProvider>
        </ShopSettingsProvider>
      </body>
    </html>
  );
}
