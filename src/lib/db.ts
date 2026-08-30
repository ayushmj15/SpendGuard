import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Check your .env file.");
  }
  const adapter = new PrismaPg(url);
  return new PrismaClient({ adapter });
}

function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Lazily constructs the Prisma client on first use so that merely importing
 * this module (e.g. during `next build` page-data collection) never throws when
 * DATABASE_URL is absent. The missing-URL error only surfaces at runtime when a
 * query is actually executed.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === "then") return undefined;
    if (typeof prop === "symbol") {
      return Reflect.get(getDb(), prop, receiver);
    }
    return Reflect.get(getDb(), prop, receiver);
  },
});
