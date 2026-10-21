/**
 * npm run db:compare                       → so database hiện tại với bản chụp MỚI NHẤT
 * npm run db:compare -- 2026-10-21_093000  → so với 1 bản chụp cụ thể
 *
 * In từng bảng: giống / khác (số dòng trước → sau). Không thay đổi dữ liệu.
 */
import { compareWithSnapshot, findSnapshot, positionalArg, printCompare } from "./lib";

async function main() {
  const snap = findSnapshot(positionalArg());
  console.log(`🔍 So database hiện tại với bản chụp ${snap.name}\n`);
  const same = printCompare(await compareWithSnapshot(snap.file));
  process.exit(same ? 0 : 1);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
