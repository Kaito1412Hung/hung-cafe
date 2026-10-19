import { Pool } from "pg";
import { env } from "../config/env";

/** Pool giữ sẵn nhiều kết nối tới PostgreSQL, dùng chung cho cả app */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
});
