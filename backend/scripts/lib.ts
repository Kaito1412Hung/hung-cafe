/**
 * Hàm dùng chung cho các script quản lý database (chụp / khôi phục / so sánh).
 * Đọc DATABASE_URL từ backend/.env — không in mật khẩu ra màn hình.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { Client } from "pg";

export const DATABASE_URL = process.env.DATABASE_URL ?? "";
if (!DATABASE_URL) {
  console.error("❌ Thiếu DATABASE_URL trong backend/.env");
  process.exit(1);
}

/** Thư mục chứa các bản chụp database (đã có trong backend/.gitignore, không lên GitHub) */
export const SNAPSHOT_DIR = path.resolve(__dirname, "..", ".db-snapshots");
/** Giữ tối đa bao nhiêu bản chụp, cũ hơn thì tự xoá */
export const KEEP_SNAPSHOTS = 10;
/** Database tạm để so sánh (tạo rồi xoá ngay) */
const COMPARE_DB = "hung_cafe_cmp";

/** Địa chỉ database khác trên cùng server (VD database tạm, database "postgres") */
export function urlForDatabase(name: string) {
  const url = new URL(DATABASE_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

/** Chạy pg_dump / pg_restore; lỗi thì in thông báo rồi dừng (không in địa chỉ có mật khẩu) */
export function runPg(command: "pg_dump" | "pg_restore", args: string[]) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) {
    console.error(`❌ Không chạy được ${command}. Kiểm tra PostgreSQL đã cài và thư mục bin của PostgreSQL nằm trong PATH.`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`❌ ${command} báo lỗi:\n${result.stderr.replaceAll(DATABASE_URL, "<DATABASE_URL>")}`);
    process.exit(1);
  }
}

/** Danh sách bản chụp, mới nhất trước */
export function listSnapshots() {
  if (!existsSync(SNAPSHOT_DIR)) return [];
  return readdirSync(SNAPSHOT_DIR)
    .filter((f) => f.endsWith(".dump"))
    .map((f) => ({ name: f, file: path.join(SNAPSHOT_DIR, f), time: statSync(path.join(SNAPSHOT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
}

/** Tìm bản chụp theo tên (có thể gõ thiếu đuôi .dump); không ghi tên → bản mới nhất */
export function findSnapshot(name?: string) {
  const all = listSnapshots();
  if (all.length === 0) {
    console.error("❌ Chưa có bản chụp nào. Chạy: npm run db:snapshot");
    process.exit(1);
  }
  if (!name) return all[0];
  const found = all.find((s) => s.name === name || s.name === `${name}.dump`);
  if (!found) {
    console.error(`❌ Không thấy bản chụp "${name}". Các bản đang có:\n${all.map((s) => `   - ${s.name}`).join("\n")}`);
    process.exit(1);
  }
  return found;
}

/** Chụp database hiện tại → file .dump; trả về đường dẫn file */
export function takeSnapshot(label = "") {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .format(new Date())
    .replace(" ", "_")
    .replaceAll(":", "");
  const safeLabel = label.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 40);
  const file = path.join(SNAPSHOT_DIR, `${stamp}${safeLabel ? `_${safeLabel}` : ""}.dump`);
  runPg("pg_dump", ["-Fc", DATABASE_URL, "-f", file]);
  // Chỉ giữ KEEP_SNAPSHOTS bản mới nhất
  for (const old of listSnapshots().slice(KEEP_SNAPSHOTS)) unlinkSync(old.file);
  return file;
}

/** Số dòng + "dấu vân tay" (md5) nội dung từng bảng của 1 database */
async function tableFingerprints(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows: tables } = await client.query<{ name: string }>(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    );
    const result = new Map<string, { count: number; hash: string }>();
    for (const { name } of tables) {
      const { rows } = await client.query<{ count: number; hash: string }>(
        `SELECT COUNT(*)::int AS count, md5(COALESCE(string_agg(x::text, '|' ORDER BY x::text), '')) AS hash FROM "${name}" x`,
      );
      result.set(name, rows[0]);
    }
    return result;
  } finally {
    await client.end();
  }
}

export interface CompareRow {
  table: string;
  same: boolean;
  before: number | null;
  now: number | null;
}

/** So database hiện tại với 1 bản chụp: khôi phục bản chụp vào database tạm rồi so từng bảng */
export async function compareWithSnapshot(snapshotFile: string): Promise<CompareRow[]> {
  const admin = new Client({ connectionString: urlForDatabase("postgres") });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${COMPARE_DB}`);
    await admin.query(`CREATE DATABASE ${COMPARE_DB}`);
    runPg("pg_restore", ["--no-owner", "-d", urlForDatabase(COMPARE_DB), snapshotFile]);
    const [before, now] = await Promise.all([tableFingerprints(urlForDatabase(COMPARE_DB)), tableFingerprints(DATABASE_URL)]);
    const names = [...new Set([...before.keys(), ...now.keys()])].sort();
    return names.map((table) => {
      const b = before.get(table);
      const n = now.get(table);
      return { table, same: !!b && !!n && b.hash === n.hash, before: b?.count ?? null, now: n?.count ?? null };
    });
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS ${COMPARE_DB}`).catch(() => {});
    await admin.end();
  }
}

/** In kết quả so sánh; trả về true nếu tất cả bảng giống nhau */
export function printCompare(rows: CompareRow[]) {
  for (const r of rows) {
    if (r.same) console.log(`   ✓ ${r.table.padEnd(24)} giống (${r.now} dòng)`);
    else console.log(`   ✗ ${r.table.padEnd(24)} KHÁC: bản chụp ${r.before ?? "không có"} dòng → bây giờ ${r.now ?? "không có"} dòng`);
  }
  const diff = rows.filter((r) => !r.same).length;
  console.log(diff === 0 ? `\n✅ Cả ${rows.length} bảng đều giống bản chụp.` : `\n⚠️  ${diff}/${rows.length} bảng khác bản chụp.`);
  return diff === 0;
}

/** Hỏi lại trước khi làm việc không hoàn tác được (bỏ qua nếu chạy kèm --yes) */
export async function confirm(question: string) {
  if (process.argv.includes("--yes")) return true;
  if (!process.stdin.isTTY) {
    console.error("❌ Cần xác nhận: chạy lại kèm --yes (VD: npm run db:restore -- --yes)");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} (gõ "co" để đồng ý): `);
  rl.close();
  return ["co", "có", "y", "yes"].includes(answer.trim().toLowerCase());
}

/** Tham số không phải cờ (VD tên bản chụp): npm run db:restore -- 2026-10-21_093000 */
export const positionalArg = () => process.argv.slice(2).find((a) => !a.startsWith("--"));
