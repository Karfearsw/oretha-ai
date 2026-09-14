import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  __orethaPrisma?: PrismaClient;
};

/**
 * Local dev:  DATABASE_URL=file:./db/oretha.db   (created by `prisma migrate dev`)
 * Production: DATABASE_URL=libsql://<db>.turso.io + DATABASE_AUTH_TOKEN=<jwt>
 */
function createClient(): PrismaClient {
  const raw =
    process.env.DATABASE_URL ??
    (process.env.NODE_ENV === "production" ? undefined : "file:./db/oretha.db");

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

/**
 * Lazy singleton: the client is constructed on FIRST PROPERTY ACCESS, not at
 * module import. `next build` imports every route module while collecting
 * page data — on a fresh CI environment (no DATABASE_URL yet), an import-time
 * `new PrismaClient(...)` or import-time throw fails the whole build
 * ("Failed to collect page data for /api/agent-files"). Deferring to the
 * first query keeps the build green; runtime still fails fast with the
 * actionable message above.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client =
      globalForPrisma.__orethaPrisma ??
      (globalForPrisma.__orethaPrisma = createClient());
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (this: PrismaClient, ...args: unknown[]) => unknown).bind(
          client,
        )
      : value;
  },
});
