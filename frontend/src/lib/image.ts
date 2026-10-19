const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Đọc ảnh người dùng chọn, cắt vuông ở giữa và thu nhỏ còn `size` px → data URL JPEG.
 * Làm ở trình duyệt nên ảnh gửi lên server chỉ còn ~20-40KB thay vì vài MB.
 */
export async function resizeImageToSquare(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Vui lòng chọn một file ảnh (JPG, PNG, WEBP)");
  if (file.size > MAX_FILE_SIZE) throw new Error("Ảnh tối đa 5MB");

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Không đọc được ảnh này"));
      el.src = url;
    });

    // Cắt phần vuông lớn nhất ở giữa ảnh
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; // nền trắng cho ảnh PNG trong suốt
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
