/**
 * npm run db:restore                        → khôi phục bản chụp MỚI NHẤT (hỏi lại trước)
 * npm run db:restore -- 2026-10-21_093000   → khôi phục 1 bản chụp cụ thể
 * npm run db:restore -- --yes               → không hỏi lại (dùng khi chạy tự động)
 *
 * Xoá dữ liệu hiện tại và thay bằng bản chụp, xong tự so lại từng bảng để chắc chắn.
 * Nên tắt / khởi động lại backend sau khi khôi phục nếu đang chạy.
 */
import { DATABASE_URL, compareWithSnapshot, confirm, findSnapshot, positionalArg, printCompare, runPg } from "./lib";

async function main() {
  const snap = findSnapshot(positionalArg());
  const ok = await confirm(`⚠️  Khôi phục database về bản chụp ${snap.name}? Mọi thay đổi sau lúc chụp sẽ MẤT`);
  if (!ok) {
    console.log("Đã huỷ, chưa thay đổi gì.");
    process.exit(1);
  }

  // --single-transaction: lỗi giữa chừng thì không đổi gì cả
  runPg("pg_restore", ["--clean", "--if-exists", "--no-owner", "--single-transaction", "-d", DATABASE_URL, snap.file]);
  console.log(`♻️  Đã khôi phục về ${snap.name}. Kiểm tra lại:\n`);
  const same = printCompare(await compareWithSnapshot(snap.file));
  process.exit(same ? 0 : 1);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
