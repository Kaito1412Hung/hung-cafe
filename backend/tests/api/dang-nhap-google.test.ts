/**
 * Đăng nhập bằng Google. Phần nói chuyện với Google (đổi code lấy id_token, tải ảnh) được GIẢ LẬP
 * → không cần mạng / mã thật, nhưng vẫn chạy thật: state + cookie, tìm / nối / tạo tài khoản, cookie đăng nhập.
 */
import { afterAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { pool } from "../../src/db/pool";
import { fetchGoogleAvatar, fetchGoogleProfile, type GoogleProfile } from "../../src/modules/auth/google";
import { ADMIN, browser, newCustomer, nextIp, uniqueEmail } from "../helpers";

vi.mock("../../src/modules/auth/google", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/modules/auth/google")>();
  return { ...original, fetchGoogleProfile: vi.fn(), fetchGoogleAvatar: vi.fn() };
});

const FAKE_AVATAR = "data:image/png;base64,iVBORw0KGgo=";
vi.mocked(fetchGoogleAvatar).mockResolvedValue(FAKE_AVATAR);

afterAll(() => pool.end());

let subCounter = 0;
const newSub = () => `google-sub-${Date.now()}-${subCounter++}`;

/** Một trình duyệt bấm "Tiếp tục với Google" → (Google giả trả về `profile`) → quay về callback */
async function googleLogin(profile: Partial<GoogleProfile> & { email: string }, next?: string) {
  const ip = nextIp();
  const agent = request.agent(app);
  const start = await agent.get(`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`).set("X-Forwarded-For", ip);
  const state = new URL(start.headers.location).searchParams.get("state");
  vi.mocked(fetchGoogleProfile).mockResolvedValueOnce({
    sub: newSub(),
    emailVerified: true,
    name: "Khách Google",
    picture: "https://lh3.googleusercontent.com/a/anh=s96-c",
    ...profile,
  });
  const callback = await agent.get(`/api/auth/google/callback?code=ma-gia&state=${state}`).set("X-Forwarded-For", ip);
  return {
    callback,
    me: () => agent.get("/api/auth/me").set("X-Forwarded-For", ip),
    patch: (path: string, body: object) => agent.patch(`/api${path}`).set("X-Forwarded-For", ip).send(body),
    delete: (path: string, body: object) => agent.delete(`/api${path}`).set("X-Forwarded-For", ip).send(body),
  };
}

describe("Bước 1: chuyển sang Google", () => {
  test("/auth/options báo Google đang bật", async () => {
    const res = await browser().get("/auth/options");
    expect(res.body.data).toEqual({ google: true });
  });

  test("chuyển (302) sang Google kèm state, link quay về đúng, cookie state là httpOnly", async () => {
    const res = await browser().get("/auth/google?next=/cart");
    expect(res.status).toBe(302);
    const url = new URL(res.headers.location);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("state")).toMatch(/^[0-9a-f]{32}$/);
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(String(res.headers["set-cookie"])).toMatch(/g_oauth=.*HttpOnly/i);
  });
});

describe("Bước 2: Google đưa khách quay về", () => {
  test("không có / sai state (link callback bị gửi từ nơi khác) → không đăng nhập", async () => {
    vi.mocked(fetchGoogleProfile).mockClear();
    const res = await browser().get("/auth/google/callback?code=ma-gia&state=state-gia");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login?google_error=state");
    expect(String(res.headers["set-cookie"])).not.toMatch(/token=[^;]/);
    expect(fetchGoogleProfile).not.toHaveBeenCalled();
  });

  test("khách bấm Huỷ ở trang Google → báo đã huỷ", async () => {
    const res = await browser().get("/auth/google/callback?error=access_denied");
    expect(res.headers.location).toBe("/login?google_error=cancelled");
  });

  test("email mới → tạo khách mới (tên + ảnh từ Google, chưa có mật khẩu), quay về đúng trang next", async () => {
    const email = uniqueEmail("google");
    const g = await googleLogin({ email, name: "Nguyễn Google" }, "/cart");
    expect(g.callback.status).toBe(302);
    expect(g.callback.headers.location).toBe("/cart");
    expect(String(g.callback.headers["set-cookie"])).toMatch(/token=[^;]+;.*HttpOnly/i);

    const me = (await g.me()).body.user;
    expect(me).toMatchObject({ email, name: "Nguyễn Google", role: "customer", googleLinked: true, hasPassword: false, avatar: FAKE_AVATAR });
  });

  test("next là link ngoài (//web-la.com) → về trang chủ, không chuyển sang web lạ", async () => {
    const g = await googleLogin({ email: uniqueEmail("google") }, "//web-la.com");
    expect(g.callback.headers.location).toBe("/");
  });

  test("email trùng khách có sẵn → nối vào đúng tài khoản đó (không tạo tài khoản thứ 2), mật khẩu cũ vẫn dùng được", async () => {
    const k = await newCustomer();
    const g = await googleLogin({ email: k.email });
    const me = (await g.me()).body.user;
    expect(me).toMatchObject({ id: k.user.id, googleLinked: true, hasPassword: true });
    expect((await browser().login(k.email, "matkhau123")).status).toBe(200);
  });

  test("lần sau đăng nhập lại cùng tài khoản Google → vào đúng tài khoản cũ (tìm theo google_id)", async () => {
    const email = uniqueEmail("google");
    const sub = newSub();
    const first = (await (await googleLogin({ email, sub })).me()).body.user;
    const again = (await (await googleLogin({ email, sub })).me()).body.user;
    expect(again.id).toBe(first.id);
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM users WHERE email = $1", [email]);
    expect(rows[0].n).toBe(1);
  });

  test("email đã nối với tài khoản Google KHÁC → từ chối", async () => {
    const email = uniqueEmail("google");
    await googleLogin({ email, sub: newSub() });
    const other = await googleLogin({ email, sub: newSub() });
    expect(other.callback.headers.location).toBe("/login?google_error=failed");
  });

  test("email Google chưa xác minh → từ chối", async () => {
    const g = await googleLogin({ email: uniqueEmail("google"), emailVerified: false });
    expect(g.callback.headers.location).toBe("/login?google_error=unverified");
    expect((await g.me()).body.user).toBeNull();
  });

  test("admin KHÔNG đăng nhập bằng Google được (chỉ mật khẩu), và không bị nối google_id", async () => {
    const g = await googleLogin({ email: ADMIN.email });
    expect(g.callback.headers.location).toBe("/login?google_error=admin");
    expect((await g.me()).body.user).toBeNull();
    const { rows } = await pool.query("SELECT google_id FROM users WHERE email = $1", [ADMIN.email]);
    expect(rows[0].google_id).toBeNull();
  });

  test("tài khoản demo dùng chung KHÔNG đăng nhập bằng Google được", async () => {
    // Cùng mật khẩu với tai-khoan.test.ts: file nào chạy trước tạo tài khoản thì file kia vẫn đăng nhập được
    await browser().post("/auth/register", { name: "Demo", email: "demo@test.local", password: "demo123456" });
    const g = await googleLogin({ email: "demo@test.local" });
    expect(g.callback.headers.location).toBe("/login?google_error=demo");
  });
});

describe("Tài khoản chỉ có Google (chưa có mật khẩu)", () => {
  test("đăng nhập bằng mật khẩu bất kỳ → 401 (báo chung, không lộ là tài khoản Google)", async () => {
    const email = uniqueEmail("google");
    await googleLogin({ email });
    const res = await browser().login(email, "matkhau123");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Email hoặc mật khẩu không đúng/);
  });

  test("tạo mật khẩu không cần mật khẩu cũ → đăng nhập được cả 2 cách; lần đổi sau phải nhập mật khẩu hiện tại", async () => {
    const email = uniqueEmail("google");
    const g = await googleLogin({ email });
    const created = await g.patch("/auth/password", { newPassword: "matkhau-moi-1" });
    expect(created.status).toBe(200);
    expect(created.body.message).toMatch(/Đã tạo mật khẩu/);
    expect((await g.me()).body.user.hasPassword).toBe(true);
    expect((await browser().login(email, "matkhau-moi-1")).status).toBe(200);

    const again = await g.patch("/auth/password", { newPassword: "matkhau-moi-2" });
    expect(again.status).toBe(400);
    expect(again.body.errors.currentPassword).toBeTruthy();
  });

  test("xoá tài khoản: gõ sai email → 400, gõ đúng email → xoá", async () => {
    const email = uniqueEmail("google");
    const g = await googleLogin({ email });
    const wrong = await g.delete("/auth/me", { confirmEmail: "nguoi-khac@test.local" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.errors.confirmEmail).toBeTruthy();
    expect((await g.delete("/auth/me", { confirmEmail: email.toUpperCase() })).status).toBe(200);
    const { rowCount } = await pool.query("SELECT 1 FROM users WHERE email = $1", [email]);
    expect(rowCount).toBe(0);
  });

  test("tài khoản có mật khẩu: xoá mà không nhập mật khẩu → 400 (không lách bằng confirmEmail)", async () => {
    const k = await newCustomer();
    const res = await k.delete("/auth/me", { confirmEmail: k.email });
    expect(res.status).toBe(400);
    expect(res.body.errors.password).toBeTruthy();
  });
});
