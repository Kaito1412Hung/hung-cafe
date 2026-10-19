import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WelcomeNicknameModal } from "@/components/account/WelcomeNicknameModal";

/** Layout cho các trang phía khách hàng (route group "(site)" không xuất hiện trên URL) */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      <WelcomeNicknameModal />
    </>
  );
}
