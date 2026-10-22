/**
 * Tài liệu API theo chuẩn OpenAPI 3.1 → trang Swagger ở /api/docs (gắn trong app.ts).
 *
 * Phần "gửi lên gì" lấy thẳng từ schema zod mà API đang dùng để kiểm tra dữ liệu
 * (z.toJSONSchema) → sửa luật trong zod là tài liệu tự đổi theo, không bị lệch.
 * Thêm API mới: thêm 1 dòng vào `paths` bên dưới.
 */
import { z } from "zod";
import { roleSchema } from "../modules/admin/admin.routes";
import * as auth from "../modules/auth/auth.schema";
import { addItemSchema, updateItemSchema } from "../modules/cart/cart.schema";
import { categorySchema } from "../modules/categories/categories.service";
import { contactSchema, newsletterSchema } from "../modules/contact/contact.service";
import { couponPatchSchema, couponSchema } from "../modules/coupons/coupons.service";
import { cancelMineSchema, checkoutSchema, updateStatusSchema } from "../modules/orders/orders.schema";
import { productPatchSchema, productSchema } from "../modules/products/products.schema";
import { reviewSchema } from "../modules/reviews/reviews.service";
import { shopSettingsSchema } from "../modules/settings/settings.schema";
import { toppingPatchSchema, toppingSchema } from "../modules/toppings/toppings.service";
import { uploadSchema } from "../modules/uploads/uploads.routes";

/* ---------- Hàm nhỏ để khai báo ngắn gọn ---------- */

/** Ai được gọi: public = ai cũng được, optional = đăng nhập thì trả thêm thông tin, user = phải đăng nhập, admin = chỉ admin */
type Access = "public" | "optional" | "user" | "admin";

interface Param {
  name: string;
  in: "path" | "query";
  description?: string;
  required?: boolean;
  schema: Record<string, unknown>;
}

interface OperationInput {
  tag: string;
  summary: string;
  description?: string;
  access?: Access;
  /** Schema zod của body (giống validateBody trong route) */
  body?: z.ZodType;
  /** Tham số trên URL: ?search=... */
  query?: Param[];
  /** Mã trả về khi thành công + mô tả (mặc định 200) */
  success?: [code: number, description: string];
  /** Các lỗi riêng của API này (lỗi chung 400/401/403/404/429 được thêm tự động) */
  errors?: Record<number, string>;
  /** Có giới hạn tần suất (rateLimit) → thêm lỗi 429 */
  limited?: string;
  /** Trả file thay vì JSON */
  file?: string;
}

const ACCESS_LABEL: Record<Access, string> = {
  public: "🌐 Ai cũng gọi được",
  optional: "🌐 Ai cũng gọi được (đã đăng nhập thì trả thêm thông tin của bạn)",
  user: "🔒 Cần đăng nhập",
  admin: "🔒 Chỉ admin",
};

/** Giá trị mẫu dễ đọc cho ô "Try it out" (không có thì Swagger tự sinh chuỗi ngẫu nhiên khớp regex, rất khó đọc) */
const EXAMPLES: Record<string, unknown> = {
  customerName: "Nguyễn Văn A",
  phone: "0901234567",
  address: "12 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
  password: "123456",
  newPassword: "matkhaumoi123",
  currentPassword: "123456",
};
/** Giá trị mẫu cho ô có regex (chỉ gắn khi ô đó thật sự có regex, VD `image` của upload là data URL, còn `image` của món là đường dẫn) */
const PATTERN_EXAMPLES: Record<string, unknown> = {
  code: "GIAM10",
  image: "data:image/png;base64,iVBORw0KGgo=",
  weekdayOpen: "07:00",
  weekdayClose: "22:00",
  weekendOpen: "07:30",
  weekendClose: "22:30",
};

/** Đi qua từng ô của JSON Schema: ô có `format` (email, date-time...) thì bỏ regex, gắn giá trị mẫu dễ đọc */
function addExamples(node: unknown, name?: string) {
  if (!node || typeof node !== "object") return;
  const schema = node as Record<string, unknown>;
  if (schema.format && schema.pattern) delete schema.pattern;
  if (schema.format === "email") schema.example = "khach@example.com";
  else if (name && schema.pattern && name in PATTERN_EXAMPLES) schema.example = PATTERN_EXAMPLES[name];
  else if (name && name in EXAMPLES) schema.example = EXAMPLES[name];
  for (const [key, child] of Object.entries((schema.properties as Record<string, unknown>) ?? {})) addExamples(child, key);
  for (const key of ["items", "anyOf", "oneOf", "allOf"]) {
    const value = schema[key];
    if (Array.isArray(value)) value.forEach((child) => addExamples(child, name));
    else addExamples(value, name);
  }
}

/** Schema zod → JSON Schema (bỏ dòng $schema vì OpenAPI không cần) */
function toSchema(schema: z.ZodType) {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  addExamples(json);
  return json;
}

const jsonContent = (schema: Record<string, unknown>) => ({ "application/json": { schema } });
const errorRef = jsonContent({ $ref: "#/components/schemas/Error" });

const idParam = (name = "id", description = "ID"): Param => ({ name, in: "path", required: true, description, schema: { type: "integer", minimum: 1 } });
const q = (name: string, description: string, schema: Record<string, unknown> = { type: "string" }): Param => ({ name, in: "query", description, schema });
const periodQuery = [
  q("days", "Số ngày gần nhất: 7, 30 hoặc 90", { type: "integer", enum: [7, 30, 90] }),
  q("year", "Hoặc xem cả một năm (biểu đồ theo tháng), VD 2026", { type: "integer" }),
];

/** Tạo mô tả cho 1 API theo chuẩn OpenAPI */
function op(path: string, input: OperationInput) {
  const access = input.access ?? "public";
  const pathParams = [...path.matchAll(/\{(\w+)\}/g)].map(([, name]) => idParam(name, name === "slug" ? "Đường dẫn của món, VD ca-phe-sua-da" : undefined));
  // {slug} là chuỗi, không phải số
  for (const p of pathParams) if (p.name === "slug") p.schema = { type: "string" };

  const [code, description] = input.success ?? [200, "Thành công"];
  const responses: Record<string, unknown> = {
    [code]: input.file
      ? { description, content: { [input.file]: { schema: { type: "string", format: "binary" } } } }
      : code === 204
        ? { description }
        : { description, content: jsonContent({ $ref: "#/components/schemas/Data" }) },
  };
  const addError = (status: number, text: string) => (responses[status] ??= { description: text, content: errorRef });
  for (const [status, text] of Object.entries(input.errors ?? {})) addError(Number(status), text);
  if (input.body || pathParams.length || input.query?.length) addError(400, "Dữ liệu gửi lên không hợp lệ (xem `errors` để biết sai ô nào)");
  if (access === "user" || access === "admin") addError(401, "Chưa đăng nhập hoặc phiên đã hết hạn");
  if (access === "admin") addError(403, "Bạn không có quyền (cần tài khoản admin)");
  if (pathParams.length) addError(404, "Không tìm thấy");
  if (input.limited) addError(429, `Gọi quá nhiều lần: ${input.limited}`);

  return {
    tags: [input.tag],
    summary: input.summary,
    description: [ACCESS_LABEL[access], input.description].filter(Boolean).join("\n\n"),
    ...(access === "user" || access === "admin" ? { security: [{ cookieAuth: [] }] } : {}),
    ...(pathParams.length || input.query ? { parameters: [...pathParams, ...(input.query ?? [])] } : {}),
    ...(input.body ? { requestBody: { required: true, content: jsonContent(toSchema(input.body)) } } : {}),
    responses,
  };
}

/* ---------- Danh sách API ---------- */

const paths = {
  "/api/health": {
    get: op("/api/health", { tag: "Hệ thống", summary: "Kiểm tra backend + database còn chạy",
      description: "Trả thêm `yourIp`: IP của chính bạn như backend nhìn thấy (dùng để kiểm tra cấu hình TRUST_PROXY sau khi deploy).", errors: { 500: "Không kết nối được database" } }),
  },

  /* ----- Tài khoản ----- */
  "/api/auth/register": {
    post: op("/api/auth/register", {
      tag: "Tài khoản",
      summary: "Đăng ký tài khoản khách",
      description: "Thành công thì đăng nhập luôn (backend gửi cookie `token`).",
      body: auth.registerSchema,
      success: [201, "Đã tạo tài khoản → `{ user }`"],
      errors: { 409: "Email đã được dùng" },
      limited: "tối đa 5 tài khoản / giờ cho mỗi thiết bị",
    }),
  },
  "/api/auth/login": {
    post: op("/api/auth/login", {
      tag: "Tài khoản",
      summary: "Đăng nhập",
      description:
        "Đúng email + mật khẩu → backend gửi cookie **httpOnly** tên `token` (JWT). Trình duyệt tự gửi kèm cookie này ở các lần gọi sau.\n\n" +
        "👉 **Thử các API 🔒 trên trang này:** gọi API này trước (Try it out → Execute), sau đó các API cần đăng nhập sẽ chạy được.",
      body: auth.loginSchema,
      success: [200, "Đăng nhập thành công → `{ user }` + cookie `token`"],
      errors: { 401: "Sai email hoặc mật khẩu" },
      limited: "sai mật khẩu quá nhiều lần thì tạm khoá",
    }),
  },
  "/api/auth/logout": {
    post: op("/api/auth/logout", { tag: "Tài khoản", summary: "Đăng xuất (xoá cookie)" }),
  },
  "/api/auth/logout-all": {
    post: op("/api/auth/logout-all", { tag: "Tài khoản", summary: "Đăng xuất mọi thiết bị", description: "Tăng `token_version` → mọi JWT cũ hết hiệu lực.", access: "user" }),
  },
  "/api/auth/forgot-password": {
    post: op("/api/auth/forgot-password", {
      tag: "Tài khoản",
      summary: "Quên mật khẩu (gửi yêu cầu cho quán)",
      description: "Luôn trả cùng một câu trả lời dù email có tồn tại hay không → không ai dò được email nào đã đăng ký.",
      body: auth.forgotPasswordSchema,
      limited: "tối đa 5 lần / 15 phút",
    }),
  },
  "/api/auth/me": {
    get: op("/api/auth/me", { tag: "Tài khoản", summary: "Thông tin tài khoản đang đăng nhập", description: "Chưa đăng nhập vẫn trả 200 với `{ user: null }`.", access: "optional" }),
    patch: op("/api/auth/me", { tag: "Tài khoản", summary: "Sửa hồ sơ", description: "Chỉ gửi những ô muốn đổi.", access: "user", body: auth.updateProfileSchema }),
    delete: op("/api/auth/me", { tag: "Tài khoản", summary: "Xoá tài khoản của mình", description: "Phải nhập lại mật khẩu để xác nhận.", access: "user", body: auth.deleteAccountSchema, errors: { 400: "Sai mật khẩu / tài khoản admin không tự xoá được" } }),
  },
  "/api/auth/me/avatar": {
    put: op("/api/auth/me/avatar", { tag: "Tài khoản", summary: "Đổi ảnh đại diện", description: "Ảnh dạng data URL (frontend đã thu nhỏ trước khi gửi).", access: "user", body: auth.avatarSchema }),
  },
  "/api/auth/password": {
    patch: op("/api/auth/password", { tag: "Tài khoản", summary: "Đổi mật khẩu", access: "user", body: auth.changePasswordSchema, errors: { 400: "Mật khẩu hiện tại không đúng / dữ liệu không hợp lệ" } }),
  },

  /* ----- Thực đơn ----- */
  "/api/products": {
    get: op("/api/products", {
      tag: "Thực đơn",
      summary: "Danh sách món",
      query: [q("category", "Lọc theo danh mục (slug), VD ca-phe"), q("search", "Tìm theo tên, gõ không dấu cũng được (VD: ca phe)")],
    }),
    post: op("/api/products", { tag: "Thực đơn", summary: "Thêm món", access: "admin", body: productSchema, success: [201, "Đã thêm món"] }),
  },
  "/api/products/slug/{slug}": {
    get: op("/api/products/slug/{slug}", { tag: "Thực đơn", summary: "Chi tiết món theo đường dẫn" }),
  },
  "/api/products/{id}": {
    get: op("/api/products/{id}", { tag: "Thực đơn", summary: "Chi tiết món theo ID" }),
    put: op("/api/products/{id}", { tag: "Thực đơn", summary: "Sửa toàn bộ món", access: "admin", body: productSchema }),
    patch: op("/api/products/{id}", { tag: "Thực đơn", summary: "Sửa một vài ô của món (VD bật / tắt còn bán)", access: "admin", body: productPatchSchema }),
    delete: op("/api/products/{id}", { tag: "Thực đơn", summary: "Xoá món", access: "admin", success: [204, "Đã xoá"] }),
  },
  "/api/categories": {
    get: op("/api/categories", { tag: "Thực đơn", summary: "Danh sách danh mục (kèm số món)" }),
    post: op("/api/categories", { tag: "Thực đơn", summary: "Thêm danh mục", access: "admin", body: categorySchema, success: [201, "Đã thêm"], errors: { 409: "Tên danh mục đã có" } }),
  },
  "/api/categories/{id}": {
    put: op("/api/categories/{id}", { tag: "Thực đơn", summary: "Sửa danh mục", access: "admin", body: categorySchema }),
    delete: op("/api/categories/{id}", { tag: "Thực đơn", summary: "Xoá danh mục", access: "admin", success: [204, "Đã xoá"], errors: { 409: "Danh mục còn món, chưa xoá được" } }),
  },
  "/api/toppings": {
    get: op("/api/toppings", { tag: "Thực đơn", summary: "Danh sách topping", description: "Mặc định chỉ trả topping đang bán. Admin gửi `?all=1` để thấy cả topping đã tắt.", access: "optional", query: [q("all", "1 = lấy cả topping đã tắt (chỉ admin)", { type: "integer", enum: [1] })] }),
    post: op("/api/toppings", { tag: "Thực đơn", summary: "Thêm topping", access: "admin", body: toppingSchema, success: [201, "Đã thêm"], errors: { 409: "Topping này đã có" } }),
  },
  "/api/toppings/{id}": {
    patch: op("/api/toppings/{id}", { tag: "Thực đơn", summary: "Sửa topping", access: "admin", body: toppingPatchSchema }),
    delete: op("/api/toppings/{id}", { tag: "Thực đơn", summary: "Xoá topping", access: "admin", success: [204, "Đã xoá"] }),
  },
  "/api/uploads/products": {
    post: op("/api/uploads/products", {
      tag: "Thực đơn",
      summary: "Upload ảnh món",
      description:
        "Ảnh JPG / PNG / WEBP dạng data URL, tối đa 2MB. Trả về đường dẫn ảnh để lưu vào món.\n\n" +
        "Đã điền mã Cloudinary trong `.env` → ảnh lưu trên **Cloudinary** (link `https://res.cloudinary.com/...`, tự tối ưu định dạng). Chưa điền → lưu vào ổ cứng máy chủ (link `/api/uploads/products/...`).",
      access: "admin",
      body: uploadSchema,
      success: [201, "Đã lưu ảnh → `{ data: { url } }`"],
    }),
  },

  /* ----- Giỏ hàng ----- */
  "/api/cart": {
    get: op("/api/cart", { tag: "Giỏ hàng", summary: "Xem giỏ hàng (kèm tạm tính)", access: "user" }),
    delete: op("/api/cart", { tag: "Giỏ hàng", summary: "Xoá hết giỏ hàng", access: "user" }),
  },
  "/api/cart/items": {
    post: op("/api/cart/items", {
      tag: "Giỏ hàng",
      summary: "Thêm món vào giỏ",
      description: "Cùng món + cùng lựa chọn (size, đường, đá, topping, ghi chú) thì cộng dồn số lượng.",
      access: "user",
      body: addItemSchema,
      success: [201, "Giỏ hàng sau khi thêm"],
      errors: { 400: "Dữ liệu sai / món hết hàng / vượt số lượng còn lại / topping không dùng được" },
    }),
  },
  "/api/cart/items/{lineId}": {
    patch: op("/api/cart/items/{lineId}", { tag: "Giỏ hàng", summary: "Đổi số lượng một dòng trong giỏ", access: "user", body: updateItemSchema, errors: { 400: "Dữ liệu sai / vượt số lượng còn lại" } }),
    delete: op("/api/cart/items/{lineId}", { tag: "Giỏ hàng", summary: "Bỏ một dòng khỏi giỏ", access: "user" }),
  },
  "/api/favorites": {
    get: op("/api/favorites", { tag: "Giỏ hàng", summary: "Món yêu thích của tôi", access: "user" }),
  },
  "/api/favorites/{productId}": {
    put: op("/api/favorites/{productId}", { tag: "Giỏ hàng", summary: "Thả tim món", access: "user", success: [204, "Đã thêm vào yêu thích"] }),
    delete: op("/api/favorites/{productId}", { tag: "Giỏ hàng", summary: "Bỏ tim món", access: "user", success: [204, "Đã bỏ"] }),
  },

  /* ----- Mã giảm giá ----- */
  "/api/coupons/check": {
    post: op("/api/coupons/check", {
      tag: "Mã giảm giá",
      summary: "Kiểm tra mã với giỏ hàng hiện tại",
      description: "Trả về số tiền được giảm nếu dùng mã này.",
      access: "user",
      body: z.object({ code: z.string().trim().min(1).max(30) }),
      errors: { 400: "Mã không tồn tại / hết hạn / hết lượt / chưa đủ giá trị đơn tối thiểu / đã dùng rồi" },
      limited: "tối đa 20 lần / 5 phút (chống dò mã)",
    }),
  },
  "/api/coupons/available": {
    get: op("/api/coupons/available", { tag: "Mã giảm giá", summary: "Các mã công khai để chọn (kèm số tiền giảm hoặc lý do chưa dùng được)", access: "user" }),
  },
  "/api/coupons": {
    get: op("/api/coupons", { tag: "Mã giảm giá", summary: "Tất cả mã (kèm số lượt đã dùng)", access: "admin" }),
    post: op("/api/coupons", { tag: "Mã giảm giá", summary: "Tạo mã", access: "admin", body: couponSchema, success: [201, "Đã tạo"], errors: { 409: "Mã đã tồn tại" } }),
  },
  "/api/coupons/{id}": {
    patch: op("/api/coupons/{id}", { tag: "Mã giảm giá", summary: "Sửa mã", access: "admin", body: couponPatchSchema }),
    delete: op("/api/coupons/{id}", { tag: "Mã giảm giá", summary: "Xoá mã", access: "admin", success: [204, "Đã xoá"] }),
  },

  /* ----- Đơn hàng ----- */
  "/api/orders": {
    post: op("/api/orders", {
      tag: "Đơn hàng",
      summary: "Đặt hàng từ giỏ hàng",
      description:
        "Chạy trong **transaction**: khoá tồn kho + lượt dùng mã giảm giá → không bán quá số lượng. Lưu bản chụp tên + giá lúc đặt.\n\n" +
        "Chọn `paymentMethod: \"vnpay\"` → đơn chờ thanh toán, giữ món trong 15 phút (gọi tiếp `POST /api/payments/vnpay/{orderId}` để lấy link trả tiền).",
      access: "user",
      body: checkoutSchema,
      success: [201, "Đã tạo đơn"],
      errors: { 400: "Dữ liệu sai / giỏ trống / món hết hàng / mã giảm giá không dùng được / quán đang đóng cửa / chưa bật VNPay" },
    }),
    get: op("/api/orders", {
      tag: "Đơn hàng",
      summary: "Tất cả đơn (admin)",
      description: "Trả kèm thống kê số đơn theo trạng thái. Không gửi `pageSize` → trả hết.",
      access: "admin",
      query: [
        q("status", "Lọc trạng thái", { type: "string", enum: ["all", "pending", "confirmed", "shipping", "completed", "cancelled"] }),
        q("search", "Tìm theo mã đơn, tên khách hoặc số điện thoại"),
        q("page", "Trang số mấy (từ 1)", { type: "integer", minimum: 1 }),
        q("pageSize", "Số đơn mỗi trang (10–100)", { type: "integer", minimum: 10, maximum: 100 }),
      ],
    }),
  },
  "/api/orders/my": {
    get: op("/api/orders/my", {
      tag: "Đơn hàng",
      summary: "Đơn hàng của tôi",
      description: "Trả `{ data, total }`, dùng cho nút \"Xem thêm\".",
      access: "user",
      query: [q("limit", "Số đơn mỗi lần (tối đa 50)", { type: "integer", minimum: 1, maximum: 50 }), q("offset", "Bỏ qua bao nhiêu đơn đầu", { type: "integer", minimum: 0 })],
    }),
  },
  "/api/orders/my/{id}/cancel": {
    patch: op("/api/orders/my/{id}/cancel", { tag: "Đơn hàng", summary: "Khách huỷ đơn (khi quán chưa xác nhận)", access: "user", body: cancelMineSchema, errors: { 400: "Đơn đã được xác nhận, không huỷ được nữa" } }),
  },
  "/api/orders/my/{id}/reorder": {
    post: op("/api/orders/my/{id}/reorder", { tag: "Đơn hàng", summary: "Mua lại: bỏ các món của đơn cũ vào giỏ", description: "Món đã ngừng bán / hết hàng sẽ được bỏ qua và báo lại.", access: "user" }),
  },
  "/api/orders/{id}": {
    get: op("/api/orders/{id}", { tag: "Đơn hàng", summary: "Chi tiết đơn", description: "Khách chỉ xem được đơn của mình; admin xem được mọi đơn.", access: "user" }),
  },
  "/api/orders/{id}/status": {
    patch: op("/api/orders/{id}/status", {
      tag: "Đơn hàng",
      summary: "Đổi trạng thái đơn",
      description: "Đi theo thứ tự: chờ xác nhận → đã xác nhận → đang giao → hoàn thành (hoặc huỷ kèm lý do). Huỷ đơn thì trả lại kho + lượt mã giảm giá.",
      access: "admin",
      body: updateStatusSchema,
      errors: { 400: "Không chuyển được (sai thứ tự, đơn đã xong / đã huỷ, hoặc đơn VNPay chưa thanh toán)" },
    }),
  },
  "/api/orders/{id}/refunded": {
    patch: op("/api/orders/{id}/refunded", { tag: "Đơn hàng", summary: "Ghi nhận đã hoàn tiền (đơn VNPay đã trả nhưng bị huỷ)", access: "admin", errors: { 400: "Đơn không ở trạng thái cần hoàn tiền" } }),
  },

  /* ----- Thanh toán ----- */
  "/api/payments/config": {
    get: op("/api/payments/config", { tag: "Thanh toán VNPay", summary: "Quán đã bật VNPay chưa + số phút giữ đơn" }),
  },
  "/api/payments/vnpay/{orderId}": {
    post: op("/api/payments/vnpay/{orderId}", {
      tag: "Thanh toán VNPay",
      summary: "Tạo link thanh toán VNPay cho đơn",
      description: "Link có chữ ký **HMAC-SHA512**. Chỉ chủ đơn gọi được, đơn phải đang chờ thanh toán và chưa quá hạn.",
      access: "user",
      success: [200, "`{ data: { url } }` → chuyển trình duyệt sang link này"],
      errors: { 400: "Đơn thanh toán khi nhận / đã quá hạn / quán chưa bật VNPay", 409: "Đơn đã được thanh toán" },
      limited: "tối đa 10 lần / phút",
    }),
  },
  "/api/payments/vnpay/return": {
    get: op("/api/payments/vnpay/return", {
      tag: "Thanh toán VNPay",
      summary: "Trang quay về gửi lại kết quả VNPay",
      description:
        "Frontend (trang /thanh-toan/ket-qua) gửi lại **nguyên** các tham số `vnp_*` VNPay gắn trên link. Backend kiểm tra: chữ ký → mã giao dịch → số tiền → chưa xử lý, rồi mới ghi nhận.\n\n" +
        "Trả `status`: `paid` / `failed` / `invalid` (sai chữ ký, sai số tiền...).",
      query: [q("vnp_*", "Các tham số VNPay gửi về (vnp_Amount, vnp_TxnRef, vnp_ResponseCode, vnp_SecureHash...)")],
    }),
  },
  "/api/payments/vnpay/ipn": {
    get: op("/api/payments/vnpay/ipn", {
      tag: "Thanh toán VNPay",
      summary: "VNPay báo kết quả trực tiếp cho backend (IPN)",
      description: "Do máy chủ VNPay gọi (cần backend có địa chỉ công khai). Trả theo chuẩn VNPay: `{ RspCode, Message }` (00 thành công, 97 sai chữ ký, 04 sai số tiền...).",
      query: [q("vnp_*", "Các tham số VNPay gửi về")],
    }),
  },

  /* ----- Đánh giá ----- */
  "/api/reviews": {
    get: op("/api/reviews", {
      tag: "Đánh giá",
      summary: "Tất cả đánh giá (admin)",
      access: "admin",
      query: [
        q("rating", "Lọc số sao (1–5)", { type: "integer", minimum: 1, maximum: 5 }),
        q("productId", "Lọc theo món", { type: "integer" }),
        q("search", "Tìm trong nội dung / tên khách / tên món (không dấu cũng được)"),
        q("hasComment", "1 = chỉ đánh giá có viết nội dung", { type: "integer", enum: [1] }),
        q("sort", "Sắp xếp", { type: "string", enum: ["newest", "lowest"] }),
        q("page", "Trang số mấy", { type: "integer", minimum: 1 }),
        q("pageSize", "Số dòng mỗi trang", { type: "integer", minimum: 1 }),
      ],
    }),
    post: op("/api/reviews", {
      tag: "Đánh giá",
      summary: "Đánh giá món (đánh giá lại thì ghi đè)",
      description: "Chỉ khách **đã mua và nhận** món này mới được đánh giá.",
      access: "user",
      body: reviewSchema,
      success: [201, "Đã lưu đánh giá"],
      errors: { 403: "Bạn chưa mua món này" },
      limited: "tối đa 10 lần / phút",
    }),
  },
  "/api/reviews/featured": {
    get: op("/api/reviews/featured", { tag: "Đánh giá", summary: "Đánh giá nổi bật cho trang chủ" }),
  },
  "/api/reviews/product/{productId}": {
    get: op("/api/reviews/product/{productId}", { tag: "Đánh giá", summary: "Đánh giá của một món", description: "Đã đăng nhập thì trả thêm: bạn đã mua chưa, đánh giá của bạn.", access: "optional" }),
  },
  "/api/reviews/mine": {
    get: op("/api/reviews/mine", { tag: "Đánh giá", summary: "Đánh giá của tôi", access: "user" }),
  },
  "/api/reviews/{id}": {
    delete: op("/api/reviews/{id}", { tag: "Đánh giá", summary: "Xoá đánh giá (của mình, hoặc admin xoá bất kỳ)", access: "user", success: [204, "Đã xoá"], errors: { 403: "Không phải đánh giá của bạn" } }),
  },

  /* ----- Thông báo ----- */
  "/api/notifications": {
    get: op("/api/notifications", { tag: "Thông báo", summary: "Thông báo của tôi (kèm số chưa đọc)", access: "user" }),
  },
  "/api/notifications/read-all": {
    patch: op("/api/notifications/read-all", { tag: "Thông báo", summary: "Đánh dấu đã đọc tất cả", access: "user", success: [204, "Xong"] }),
  },
  "/api/notifications/{id}/read": {
    patch: op("/api/notifications/{id}/read", { tag: "Thông báo", summary: "Đánh dấu đã đọc một thông báo", access: "user", success: [204, "Xong"] }),
  },

  /* ----- Liên hệ & cửa hàng ----- */
  "/api/contact": {
    post: op("/api/contact", { tag: "Liên hệ & cửa hàng", summary: "Gửi tin nhắn liên hệ", access: "optional", body: contactSchema, success: [201, "Đã gửi → `{ message }`"], limited: "tối đa 10 tin / 10 phút" }),
    get: op("/api/contact", { tag: "Liên hệ & cửa hàng", summary: "Hộp thư liên hệ", access: "admin" }),
  },
  "/api/contact/{id}": {
    patch: op("/api/contact/{id}", { tag: "Liên hệ & cửa hàng", summary: "Đánh dấu đã đọc / chưa đọc", access: "admin", body: z.object({ isRead: z.boolean() }) }),
    delete: op("/api/contact/{id}", { tag: "Liên hệ & cửa hàng", summary: "Xoá tin nhắn", access: "admin", success: [204, "Đã xoá"] }),
  },
  "/api/newsletter": {
    post: op("/api/newsletter", { tag: "Liên hệ & cửa hàng", summary: "Đăng ký nhận tin", body: newsletterSchema, limited: "tối đa 10 lần / 10 phút" }),
    get: op("/api/newsletter", { tag: "Liên hệ & cửa hàng", summary: "Danh sách email nhận tin", access: "admin" }),
  },
  "/api/newsletter/{id}": {
    delete: op("/api/newsletter/{id}", { tag: "Liên hệ & cửa hàng", summary: "Xoá email khỏi danh sách", access: "admin", success: [204, "Đã xoá"] }),
  },
  "/api/stats/public": {
    get: op("/api/stats/public", { tag: "Liên hệ & cửa hàng", summary: "Số liệu cho trang chủ (số món, đơn đã giao, thành viên)" }),
  },
  "/api/settings": {
    get: op("/api/settings", { tag: "Liên hệ & cửa hàng", summary: "Thông tin cửa hàng (giờ mở cửa, phí giao, mạng xã hội...)" }),
    put: op("/api/settings", { tag: "Liên hệ & cửa hàng", summary: "Sửa cài đặt cửa hàng", access: "admin", body: shopSettingsSchema }),
  },

  /* ----- Quản trị ----- */
  "/api/admin/stats": {
    get: op("/api/admin/stats", { tag: "Quản trị", summary: "Số liệu trang Tổng quan (doanh thu, đơn, món bán chạy, biểu đồ)", access: "admin", query: periodQuery }),
  },
  "/api/admin/reports/revenue": {
    get: op("/api/admin/reports/revenue", {
      tag: "Quản trị",
      summary: "Tải báo cáo doanh thu Excel",
      access: "admin",
      query: periodQuery,
      success: [200, "File .xlsx"],
      file: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  },
  "/api/admin/customers": {
    get: op("/api/admin/customers", {
      tag: "Quản trị",
      summary: "Danh sách tài khoản (kèm số đơn, tổng chi tiêu)",
      access: "admin",
      query: [q("search", "Tìm theo tên, email, số điện thoại"), q("role", "Lọc vai trò", { type: "string", enum: ["admin", "customer"] })],
    }),
  },
  "/api/admin/customers/{id}": {
    get: op("/api/admin/customers/{id}", { tag: "Quản trị", summary: "Chi tiết một tài khoản", access: "admin" }),
    delete: op("/api/admin/customers/{id}", { tag: "Quản trị", summary: "Xoá tài khoản", access: "admin", success: [204, "Đã xoá"], errors: { 400: "Không tự xoá mình được / phải hạ quyền admin trước khi xoá" } }),
  },
  "/api/admin/customers/{id}/role": {
    patch: op("/api/admin/customers/{id}/role", { tag: "Quản trị", summary: "Đổi vai trò (khách ↔ admin)", access: "admin", body: roleSchema, errors: { 400: "Không tự đổi quyền của mình / phải còn ít nhất một admin" } }),
  },
  "/api/admin/customers/{id}/reset-password": {
    post: op("/api/admin/customers/{id}/reset-password", { tag: "Quản trị", summary: "Đặt lại mật khẩu tạm cho khách", description: "Trả về mật khẩu tạm để quán báo cho khách.", access: "admin" }),
  },
};

export const openapiDoc = {
  openapi: "3.1.0",
  info: {
    title: "Hưng Café API",
    version: "1.0.0",
    description:
      "REST API của website đặt đồ uống **Hưng Café** (Express 5 + PostgreSQL).\n\n" +
      "- Dữ liệu trả về dạng `{ data }`; lỗi luôn dạng `{ message, errors? }`.\n" +
      "- Đăng nhập bằng cookie **httpOnly** `token` (JWT). Muốn thử API có 🔒: gọi **POST /api/auth/login** trước, cookie được lưu và gửi kèm tự động.\n" +
      "- Giá tiền là số nguyên (đồng). Ngày giờ dạng ISO (UTC), giao diện hiển thị theo giờ Việt Nam.",
  },
  tags: [
    { name: "Tài khoản", description: "Đăng ký, đăng nhập, hồ sơ" },
    { name: "Thực đơn", description: "Món, danh mục, topping, ảnh" },
    { name: "Giỏ hàng", description: "Giỏ hàng và món yêu thích" },
    { name: "Mã giảm giá" },
    { name: "Đơn hàng", description: "Đặt hàng, theo dõi, quản lý đơn" },
    { name: "Thanh toán VNPay" },
    { name: "Đánh giá" },
    { name: "Thông báo" },
    { name: "Liên hệ & cửa hàng" },
    { name: "Quản trị", description: "Thống kê, báo cáo, tài khoản" },
    { name: "Hệ thống" },
  ],
  paths,
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "token", description: "JWT trong cookie httpOnly, có được sau khi gọi POST /api/auth/login" },
    },
    schemas: {
      Data: {
        type: "object",
        description: "Dữ liệu trả về nằm trong `data` (một đối tượng hoặc một danh sách). Bấm Try it out → Execute để xem dữ liệu thật.",
        properties: { data: { description: "Đối tượng hoặc danh sách", example: {} } },
      },
      Error: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", description: "Thông báo lỗi tiếng Việt, hiện thẳng cho người dùng", example: "Thông báo lỗi" },
          errors: {
            type: "object",
            description: "Chỉ có khi dữ liệu gửi lên sai: lỗi của từng ô",
            additionalProperties: { type: "string" },
            example: { email: "Email không hợp lệ" },
          },
        },
      },
    },
  },
};
