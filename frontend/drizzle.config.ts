import * as dotenv from "dotenv";
import type { Config } from "drizzle-kit";

// Next.js の外（CLI）から実行されるため、env は自分で読み込む
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export default {
  schema: "./src/external/client/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
} satisfies Config;
