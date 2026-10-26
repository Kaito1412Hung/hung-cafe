/**
 * Việc cần làm SAU KHI transaction lưu thành công (COMMIT), VD gửi tin realtime.
 * Gửi trước COMMIT mà sau đó lỗi (ROLLBACK) → người nhận thấy "đơn mới" nhưng mở ra không có.
 *
 * - Không ở trong transaction (dùng `pool`) → chạy luôn
 * - Trong transaction (dùng `client`) → xếp hàng, `flushAfterCommit` chạy sau COMMIT, `discardAfterCommit` bỏ khi ROLLBACK
 */
import type { PoolClient } from "pg";
import { pool } from "./pool";

const queues = new WeakMap<object, (() => void)[]>();

function runSafely(fn: () => void) {
  try {
    fn();
  } catch (err) {
    console.error("Lỗi việc sau COMMIT:", (err as Error).message);
  }
}

export function afterCommit(client: PoolClient | typeof pool, fn: () => void) {
  if (client === pool) return runSafely(fn);
  const queue = queues.get(client) ?? [];
  queue.push(fn);
  queues.set(client, queue);
}

export function flushAfterCommit(client: PoolClient) {
  const queue = queues.get(client);
  queues.delete(client);
  queue?.forEach(runSafely);
}

export function discardAfterCommit(client: PoolClient) {
  queues.delete(client);
}
