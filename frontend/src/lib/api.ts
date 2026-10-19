/**
 * Hàm gọi API dùng chung.
 * Frontend gọi "/api/..." cùng domain → Next.js chuyển tiếp (rewrites) sang backend,
 * nên cookie đăng nhập hoạt động mà không phải cấu hình CORS phức tạp.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Backend đã chạy chưa?");
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const fallback = res.status >= 500 ? "Máy chủ đang gặp sự cố, thử lại sau" : `Lỗi ${res.status}`;
    throw new ApiError(res.status, body?.message ?? fallback, body?.errors);
  }
  return body as T;
}
