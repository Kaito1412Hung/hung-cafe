const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (ảnh gốc, trước khi thu nhỏ)

/** Kiểm tra file rồi nạp thành <img> để vẽ lên canvas */
async function loadImage(file: File): Promise<{ img: HTMLImageElement; release: () => void }> {
  if (!file.type.startsWith("image/")) throw new Error("Vui lòng chọn một file ảnh (JPG, PNG, WEBP)");
  if (file.size > MAX_FILE_SIZE) throw new Error("Ảnh tối đa 10MB");

  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh này"));
    };
    el.src = url;
  });
  return { img, release: () => URL.revokeObjectURL(url) };
}

function toJpeg(canvas: HTMLCanvasElement, quality = 0.85) {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Cắt vuông ở giữa và thu nhỏ còn `size` px → data URL JPEG (dùng cho ảnh đại diện).
 * Làm ở trình duyệt nên ảnh gửi lên server chỉ còn ~20-40KB thay vì vài MB.
 */
export async function resizeImageToSquare(file: File, size = 256): Promise<string> {
  const { img, release } = await loadImage(file);
  try {
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; // nền trắng cho ảnh PNG trong suốt
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return toJpeg(canvas);
  } finally {
    release();
  }
}

/** Thu nhỏ để cạnh dài nhất ≤ `maxSide` px, giữ nguyên tỉ lệ (dùng cho ảnh sản phẩm) */
export async function resizeImage(file: File, maxSide = 1000): Promise<string> {
  const { img, release } = await loadImage(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return toJpeg(canvas, 0.82);
  } finally {
    release();
  }
}
