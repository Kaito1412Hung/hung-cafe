/** Lỗi "có chủ đích" kèm HTTP status — errorHandler sẽ trả về cho client */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string>,
  ) {
    super(message);
  }
}
