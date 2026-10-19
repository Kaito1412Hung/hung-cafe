import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { cn, formatHour, formatPrice } from "@/lib/utils";
import type { ShopSettings } from "@/types/settings";

/**
 * Trang chính sách: /chinh-sach/giao-hang, /chinh-sach/doi-tra, /chinh-sach/bao-mat
 * Số liệu (phí ship, giờ mở cửa, SĐT...) lấy từ Cài đặt của admin → đổi cài đặt là trang tự cập nhật.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

async function getSettings(): Promise<ShopSettings> {
  const res = await fetch(`${BACKEND_URL}/api/settings`, { cache: "no-store" });
  return ((await res.json()) as { data: ShopSettings }).data;
}

interface Policy {
  title: string;
  /** Tên ngắn trên menu bên trái */
  short: string;
  icon: typeof Truck;
  summary: string;
  content: (s: ShopSettings) => ReactNode;
}

const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-10 font-display text-2xl font-semibold text-coffee-950">{children}</h2>;

const POLICIES: Record<string, Policy> = {
  "giao-hang": {
    title: "Chính sách giao hàng",
    short: "Giao hàng",
    icon: Truck,
    summary: "Phạm vi, thời gian và phí giao hàng của quán.",
    content: (s) => (
      <>
        <H2>1. Phạm vi giao hàng</H2>
        <p>Quán giao hàng trong khu vực TP. Hồ Chí Minh, ưu tiên bán kính khoảng 7 km quanh quán ({s.address}). Với địa chỉ xa hơn, quán sẽ gọi điện xác nhận trước khi nhận đơn.</p>
        <H2>2. Thời gian nhận đơn & giao hàng</H2>
        <ul>
          <li>
            Nhận đơn online trong giờ mở cửa: Thứ 2 – Thứ 6 từ {formatHour(s.weekdayOpen)} đến {formatHour(s.weekdayClose)}, Thứ 7 – Chủ nhật từ {formatHour(s.weekendOpen)} đến{" "}
            {formatHour(s.weekendClose)}.
          </li>
          <li>Thời gian giao dự kiến 20 – 40 phút sau khi quán xác nhận đơn (giờ cao điểm hoặc trời mưa có thể lâu hơn).</li>
          <li>Đồ uống được pha ngay khi quán xác nhận đơn để giữ hương vị tốt nhất.</li>
        </ul>
        <H2>3. Phí giao hàng</H2>
        <ul>
          <li>Phí giao hàng: {formatPrice(s.shippingFee)} / đơn.</li>
          <li>
            <strong>Miễn phí giao hàng</strong> cho đơn có tạm tính từ {formatPrice(s.freeShippingThreshold)} trở lên.
          </li>
        </ul>
        <H2>4. Thanh toán</H2>
        <p>Hiện quán nhận thanh toán tiền mặt khi nhận hàng (COD). Vui lòng kiểm tra món trước khi thanh toán cho shipper.</p>
        <H2>5. Theo dõi đơn hàng</H2>
        <p>
          Bạn theo dõi trạng thái đơn tại trang <Link href="/orders">Đơn hàng của tôi</Link> và nhận thông báo (biểu tượng chuông) mỗi khi đơn được xác nhận, đang giao hoặc đã giao.
        </p>
      </>
    ),
  },
  "doi-tra": {
    title: "Chính sách đổi trả & hoàn tiền",
    short: "Đổi trả & hoàn tiền",
    icon: RotateCcw,
    summary: "Khi nào được đổi món, huỷ đơn và cách quán xử lý.",
    content: (s) => (
      <>
        <H2>1. Huỷ đơn</H2>
        <ul>
          <li>
            Bạn tự huỷ đơn được khi đơn còn ở trạng thái <strong>“Chờ xác nhận”</strong> (tại trang Đơn hàng của tôi).
          </li>
          <li>Khi quán đã xác nhận và bắt đầu pha chế, vui lòng gọi {s.phone} để được hỗ trợ.</li>
          <li>Nếu quán phải huỷ đơn (hết món, không liên lạc được...), bạn sẽ nhận thông báo kèm lý do.</li>
        </ul>
        <H2>2. Trường hợp được đổi món miễn phí</H2>
        <ul>
          <li>Giao sai món, sai size hoặc thiếu món so với đơn đặt.</li>
          <li>Đồ uống bị đổ, vỡ, rò rỉ trong quá trình giao.</li>
          <li>Món có dấu hiệu không đảm bảo chất lượng (có dị vật, có mùi lạ...).</li>
        </ul>
        <p>Vui lòng báo cho quán trong vòng 30 phút kể từ khi nhận hàng, kèm hình ảnh món (nếu có), qua số {s.phone} hoặc trang <Link href="/contact">Liên hệ</Link>.</p>
        <H2>3. Trường hợp không áp dụng đổi trả</H2>
        <ul>
          <li>Món đã dùng quá một nửa, hoặc báo sau 30 phút kể từ khi nhận.</li>
          <li>Không hợp khẩu vị cá nhân trong khi món được pha đúng công thức và đúng lựa chọn (size, đường, đá) bạn đã đặt.</li>
        </ul>
        <H2>4. Hoàn tiền</H2>
        <p>Với đơn thanh toán khi nhận hàng, quán sẽ giao lại món mới hoặc không thu tiền phần món bị lỗi. Mã giảm giá đã dùng cho đơn bị huỷ sẽ được trả lại lượt sử dụng.</p>
      </>
    ),
  },
  "bao-mat": {
    title: "Chính sách bảo mật thông tin",
    short: "Bảo mật thông tin",
    icon: ShieldCheck,
    summary: "Quán thu thập gì, dùng để làm gì và bạn có quyền gì với dữ liệu của mình.",
    content: (s) => (
      <>
        <H2>1. Thông tin quán thu thập</H2>
        <ul>
          <li>Thông tin tài khoản: họ tên, tên hiển thị, email, mật khẩu (được mã hoá, quán không xem được).</li>
          <li>Thông tin giao hàng: số điện thoại, địa chỉ, ghi chú đơn hàng.</li>
          <li>Thông tin bạn tự cung cấp thêm: ảnh đại diện, ngày sinh, giới tính, đánh giá món, tin nhắn liên hệ.</li>
        </ul>
        <H2>2. Mục đích sử dụng</H2>
        <ul>
          <li>Xử lý và giao đơn hàng, liên hệ khi cần xác nhận.</li>
          <li>Gửi thông báo về trạng thái đơn và ưu đãi (nếu bạn đăng ký nhận tin).</li>
          <li>Cải thiện thực đơn và chất lượng phục vụ dựa trên đánh giá của khách.</li>
        </ul>
        <H2>3. Bảo vệ thông tin</H2>
        <ul>
          <li>Mật khẩu được mã hoá một chiều (bcrypt); phiên đăng nhập lưu trong cookie bảo mật (httpOnly).</li>
          <li>Tài khoản tạm khoá đăng nhập sau nhiều lần nhập sai mật khẩu để chống dò mật khẩu.</li>
          <li>Quán không bán hay chia sẻ thông tin của bạn cho bên thứ ba, trừ đơn vị giao hàng (chỉ tên, SĐT, địa chỉ nhận).</li>
        </ul>
        <H2>4. Quyền của bạn</H2>
        <ul>
          <li>
            Xem và sửa thông tin cá nhân tại trang <Link href="/account">Tài khoản của tôi</Link>.
          </li>
          <li>Đăng xuất khỏi tất cả thiết bị nếu nghi ngờ tài khoản bị lộ.</li>
          <li>Tự xoá tài khoản bất cứ lúc nào. Đơn hàng cũ được giữ lại (không gắn với tài khoản) để phục vụ đối soát.</li>
        </ul>
        <H2>5. Liên hệ</H2>
        <p>
          Mọi thắc mắc về dữ liệu cá nhân, vui lòng liên hệ {s.email} hoặc {s.phone}.
        </p>
      </>
    ),
  },
};

type Props = { params: Promise<{ slug: string }> };

// Chỉ 3 đường dẫn này hợp lệ, còn lại → 404
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = POLICIES[(await params).slug];
  return policy ? { title: policy.title, description: policy.summary } : {};
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();
  const settings = await getSettings();
  const Icon = policy.icon;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8 lg:py-16">
      {/* Menu các chính sách */}
      <nav aria-label="Chính sách" className="h-fit lg:sticky lg:top-24">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-coffee-500">Chính sách</p>
        <ul className="flex gap-2 overflow-x-auto lg:flex-col">
          {Object.entries(POLICIES).map(([key, p]) => (
            <li key={key} className="shrink-0">
              <Link
                href={`/chinh-sach/${key}`}
                aria-current={key === slug ? "page" : undefined}
                className={cn("block rounded-xl px-3.5 py-2.5 text-sm font-medium transition", key === slug ? "bg-coffee-900 text-cream" : "text-coffee-700 hover:bg-coffee-100")}
              >
                {p.short}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-coffee-100 sm:p-10 [&_a]:font-medium [&_a]:text-coffee-800 [&_a]:underline [&_li]:mt-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coffee-100 text-coffee-700">
          <Icon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold text-coffee-950 sm:text-4xl">{policy.title}</h1>
        <p className="!mt-2 text-coffee-600">{policy.summary}</p>
        <div className="leading-relaxed text-coffee-800">{policy.content(settings)}</div>
        <p className="!mt-10 border-t border-coffee-100 pt-5 text-sm text-coffee-500">Áp dụng cho mọi đơn hàng đặt tại website {settings.name}.</p>
      </article>
    </div>
  );
}
