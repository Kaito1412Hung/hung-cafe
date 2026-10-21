/**
 * npm run check:secrets   → kiểm tra TRƯỚC KHI commit / push
 *
 * 1. Không có file bí mật nào sắp lên GitHub: .env, .env.local, HUONG-DAN-TEST.md, bản chụp database…
 *    (xét file đã theo dõi, file đã `git add`, và file mới chưa bị .gitignore chặn)
 * 2. Không file nào chứa GIÁ TRỊ bí mật thật lấy từ backend/.env, frontend/.env.local
 *    (mật khẩu database, JWT_SECRET, mật khẩu tài khoản mẫu…). Chỉ in TÊN biến, không in giá trị.
 *
 * Kết quả: ✅ (thoát mã 0) hoặc ❌ kèm danh sách cần xử lý (thoát mã 1).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

// File sẽ có trên GitHub nếu commit: đã theo dõi + đã add + file mới chưa bị ignore
const tracked = git("ls-files");
const staged = git("diff", "--cached", "--name-only", "--diff-filter=ACMR");
const untracked = git("ls-files", "--others", "--exclude-standard");
const candidates = [...new Set([...tracked, ...staged, ...untracked])];

const problems: string[] = [];
const warnings: string[] = [];

/* ----- 1. Tên file không được lên GitHub ----- */
const FORBIDDEN: { test: (f: string) => boolean; why: string }[] = [
  { test: (f) => /(^|\/)\.env(\.[^/]+)?$/.test(f) && !f.endsWith(".env.example"), why: "file bí mật .env" },
  { test: (f) => f === "HUONG-DAN-TEST.md", why: "hướng dẫn test riêng (không đưa lên GitHub)" },
  { test: (f) => f.endsWith(".dump") || f.includes(".db-snapshots/"), why: "bản chụp database" },
];
for (const f of candidates) {
  const rule = FORBIDDEN.find((r) => r.test(f));
  if (rule) problems.push(`${f} — ${rule.why}${untracked.includes(f) ? " (file mới, chưa bị .gitignore chặn)" : ""}`);
}

/* ----- 2. Giá trị bí mật thật nằm trong file ----- */
const secrets = new Map<string, string>(); // tên biến → giá trị
for (const envFile of ["backend/.env", "frontend/.env.local"]) {
  const full = path.join(root, envFile);
  if (!existsSync(full)) continue;
  for (const [key, value] of Object.entries(parse(readFileSync(full)))) {
    if (key === "DATABASE_URL") {
      const password = decodeURIComponent(new URL(value).password);
      if (password.length >= 4) secrets.set(`${envFile}: mật khẩu trong DATABASE_URL`, password);
    } else if (/SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE/i.test(key) && value.length >= 6) {
      secrets.set(`${envFile}: ${key}`, value);
    }
  }
}

const readable = candidates.filter((f) => existsSync(path.join(root, f)) && !/\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|dump)$/i.test(f));
const contents = new Map(readable.map((f) => [f, readFileSync(path.join(root, f), "utf8")]));

for (const [name, value] of secrets) {
  const files = [...contents].filter(([, text]) => text.includes(value)).map(([f]) => f);
  if (files.length === 0) continue;
  // Mật khẩu tài khoản MẪU trong .env.example là cố ý (để người clone về chạy được) → chỉ nhắc nhở
  const onlyExample = files.every((f) => f.endsWith(".env.example"));
  if (onlyExample && /SEED_.*PASSWORD/.test(name)) {
    warnings.push(`${name} trùng giá trị mẫu trong ${files.join(", ")} (chỉ dùng cho máy dev — đổi mật khẩu khi deploy)`);
  } else {
    problems.push(`${name} — giá trị thật xuất hiện trong: ${files.join(", ")}`);
  }
}

/* ----- Kết quả ----- */
console.log(`🔐 Đã kiểm tra ${candidates.length} file sẽ có trên GitHub, ${secrets.size} giá trị bí mật.\n`);
for (const w of warnings) console.log(`   ⚠️  ${w}`);
if (problems.length === 0) {
  console.log(`${warnings.length ? "\n" : ""}✅ An toàn: không có file hay giá trị bí mật nào sắp lên GitHub.`);
  process.exit(0);
}
console.log(`❌ Có ${problems.length} vấn đề, ĐỪNG push cho tới khi sửa:`);
for (const p of problems) console.log(`   - ${p}`);
console.log("\nCách sửa: thêm file vào .gitignore, hoặc bỏ khỏi git bằng `git rm --cached <file>`, rồi đổi bí mật đã lộ.");
process.exit(1);
