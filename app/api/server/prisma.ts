import { PrismaClient } from "@prisma/client";
import { resolveMissionControlDatabaseUrl } from "@/app/api/server/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = resolveMissionControlDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
