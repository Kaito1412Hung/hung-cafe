import { ImageResponse } from "next/og";
import { CupMark, loadGoogleFont } from "@/lib/og";

/**
 * Ảnh xem trước khi gửi link web qua Zalo / Facebook / Messenger (Open Graph image).
 * Next.js tự gắn thẻ <meta property="og:image"> trỏ tới ảnh này.
 */
export const alt = "Hưng Café — Cà phê rang xay thủ công";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "Hưng Café";
const TAGLINE = "Cà phê rang mộc · Trà · Bánh ngọt";
const NOTE = "Đặt món online — giao tận nơi tại TP.HCM";

export default async function OpenGraphImage() {
  const [display, body] = await Promise.all([
    loadGoogleFont("Playfair Display", 700, TITLE),
    loadGoogleFont("Be Vietnam Pro", 500, TAGLINE + NOTE),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "linear-gradient(135deg, #1f1410 0%, #5f3a29 100%)",
          color: "#fbf7f1",
        }}
      >
        <CupMark size={120} />
        <div style={{ marginTop: 40, fontSize: 104, fontFamily: display ? "Playfair" : undefined, fontWeight: 700 }}>{TITLE}</div>
        <div style={{ marginTop: 12, fontSize: 40, color: "#e4cfb7", fontFamily: body ? "BeVietnam" : undefined }}>{TAGLINE}</div>
        <div style={{ marginTop: 48, display: "flex", fontSize: 28, color: "#d3b08c", fontFamily: body ? "BeVietnam" : undefined }}>{NOTE}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(display ? [{ name: "Playfair", data: display, weight: 700 as const }] : []),
        ...(body ? [{ name: "BeVietnam", data: body, weight: 500 as const }] : []),
      ],
    },
  );
}
