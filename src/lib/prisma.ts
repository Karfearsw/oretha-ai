import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Local dev:     DATABASE_URL=file:./db/oretha.db      (file created by `prisma migrate dev`)
 * Production:    DATABASE_URL=libsql://<your-db>.turso.io + DATABASE_AUTH_TOKEN=<token>
 */
function createClient() {
  const raw =
    process.env.DATABASE_URL ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "file:./db/oretha.db");

  if (!raw) {
    // Fail loudly with the fix, instead of a cryptic libsql error.
    throw new Error(
      "DATABASE_URL is not set. In Vercel: Settings → Environment Variables → add " +
        "DATABASE_URL (libsql://…turso.io), DATABASE_AUTH_TOKEN, and AUTH_SECRET, then redeploy — " +
        "env changes only apply to deployments made after saving them.",
    );
  }

  if (raw.startsWith("file:")) {
    // resolve relative file URLs against the project root
    const abs = `file:${path.join(process.cwd(), raw.replace(/^file:/, ""))}`;
    return new PrismaClient({ adapter: new PrismaLibSql({ url: abs }) });
  }

  return new PrismaClient({
    adapter: new PrismaLibSql({
      url: raw,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
