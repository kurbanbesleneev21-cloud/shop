// Picks the database connection automatically:
//  1) Supabase / Vercel Postgres integration variables (POSTGRES_PRISMA_URL + POSTGRES_URL_NON_POOLING)
//  2) DATABASE_URL + DIRECT_URL (Neon or any PostgreSQL)
export function resolveDbEnv(env = process.env) {
  const url = env.POSTGRES_PRISMA_URL || env.DATABASE_URL || env.POSTGRES_URL;
  const direct = env.POSTGRES_URL_NON_POOLING || (env.POSTGRES_PRISMA_URL ? undefined : env.DIRECT_URL) || url;
  return { DATABASE_URL: url, DIRECT_URL: direct };
}
