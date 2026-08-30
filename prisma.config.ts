// Prisma 7 configuration
// Loads environment variables and points Prisma CLI at the schema.
import "dotenv/config";
import { defineConfig } from "prisma/config";

// The real DATABASE_URL comes from the environment (local .env or the Vercel
// dashboard). A bare placeholder is used ONLY so that `prisma generate` can run
// during `npm install`/build without a database being available. The app itself
// reads process.env.DATABASE_URL directly (see src/lib/db.ts), so a missing env
// var at build time never affects runtime — it would only fail later if unset.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Keep `env` import below for clarity; both resolve to databaseUrl.
  datasource: {
    url: databaseUrl,
  },
});
