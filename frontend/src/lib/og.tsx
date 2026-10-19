/**
 * Dùng chung cho các ảnh tạo bằng code (ImageResponse): icon, ảnh chia sẻ link (Open Graph).
 */

/** Ly cà phê vẽ bằng SVG (giống favicon) */
export function CupMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#3e2a20" />
      <path d="M24 12c-2 3 2 5 0 8M32 12c-2 3 2 5 0 8M40 12c-2 3 2 5 0 8" stroke="#d3b08c" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M14 26h32v12a13 13 0 0 1-13 13h-6a13 13 0 0 1-13-13z" fill="#fbf7f1" />
      <path d="M46 29h3a6 6 0 0 1 0 12h-3.5" stroke="#fbf7f1" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <rect x="12" y="52" width="36" height="3.5" rx="1.75" fill="#c18e63" />
    </svg>
  );
}

/**
 * Tải font hỗ trợ tiếng Việt từ Google Fonts (chỉ lấy đúng các ký tự cần vẽ → file rất nhỏ).
 * Lỗi mạng → trả null, ảnh vẫn tạo được bằng font mặc định.
 */
export async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}
