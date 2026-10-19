import { ImageResponse } from "next/og";
import { CupMark } from "@/lib/og";

/** Icon khi khách "Thêm vào màn hình chính" trên iPhone (cần ảnh PNG) */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#3e2a20" }}>
        <CupMark size={150} />
      </div>
    ),
    size,
  );
}
