// Build step: applies the Prisma schema and seeds the database (idempotent).
import { execSync } from "child_process";
import { resolveDbEnv } from "./db-env.mjs";

const db = resolveDbEnv();
if (!db.DATABASE_URL) {
  console.error("No database configured: set DATABASE_URL (or connect Supabase/Neon in Vercel Storage).");
  process.exit(1);
}
const source = process.env.POSTGRES_PRISMA_URL ? "POSTGRES_PRISMA_URL (Supabase/Vercel integration)" : "DATABASE_URL";
console.log("Using database from", source);
const env = { ...process.env, ...db };
execSync("npx prisma db push --skip-generate", { stdio: "inherit", env });
execSync("node prisma/seed.mjs", { stdio: "inherit", env });
execSync("node scripts/rebrand.mjs", { stdio: "inherit", env });
