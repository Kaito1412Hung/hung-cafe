/**
 * npm run db:snapshot                 → chụp database hiện tại
 * npm run db:snapshot -- truoc-test   → chụp kèm nhãn (dễ nhận ra)
 * npm run db:snapshot -- --list       → xem các bản chụp đang có
 *
 * Bản chụp lưu ở backend/.db-snapshots/ (không lên GitHub), giữ 10 bản mới nhất.
 */
import path from "node:path";
import { KEEP_SNAPSHOTS, SNAPSHOT_DIR, listSnapshots, positionalArg, takeSnapshot } from "./lib";

if (process.argv.includes("--list")) {
  const all = listSnapshots();
  if (all.length === 0) console.log("Chưa có bản chụp nào.");
  for (const s of all) console.log(`   - ${s.name}  (${new Date(s.time).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })})`);
  process.exit(0);
}

const file = takeSnapshot(positionalArg());
console.log(`📸 Đã chụp database: ${path.basename(file)}`);
console.log(`   Thư mục: ${SNAPSHOT_DIR} (giữ ${KEEP_SNAPSHOTS} bản mới nhất)`);
console.log("   Khôi phục lại: npm run db:restore    ·    So sánh: npm run db:compare");
