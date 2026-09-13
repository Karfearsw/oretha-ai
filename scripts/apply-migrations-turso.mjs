/* Apply Prisma migration SQL to a remote libsql/Turso database.
 * Mirrors `prisma migrate deploy`: runs each migration's statements in order,
 * then records the migration in `_prisma_migrations` with the same checksum
 * algorithm Prisma uses (sha256 of the file contents), so the CLI treats
 * them as applied afterwards.
 *
 * Usage: node scripts/apply-migrations-turso.mjs <libsql-url> <authToken>
 */
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";

const [url, authToken] = process.argv.slice(2);
if (!url || !authToken) {
  console.error("usage: node scripts/apply-migrations-turso.mjs <url> <token>");
  process.exit(1);
}

const db = createClient({ url, authToken });
const migrationsDir = "prisma/migrations";

const dirs = readdirSync(migrationsDir)
  .filter((d) => /^\d{14}_/.test(d))
  .sort();
console.log(`Found ${dirs.length} migrations: ${dirs.join(", ")}`);

// Ensure the bookkeeping table exists (mirrors Prisma's shape).
await db.execute(`CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  finished_at DATETIME,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at DATETIME,
  started_at DATETIME NOT NULL DEFAULT current_timestamp,
  applied_steps_count INTEGER NOT NULL DEFAULT 0
)`);

const applied = new Set(
  (
    await db.execute(
      "SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL"
    )
  ).rows.map((r) => String(r.migration_name))
);

let appliedCount = 0;
for (const dir of dirs) {
  const sqlPath = join(migrationsDir, dir, "migration.sql");
  if (!existsSync(sqlPath)) {
    console.log(`skip ${dir} (no migration.sql)`);
    continue;
  }
  if (applied.has(dir)) {
    console.log(`already applied: ${dir}`);
    continue;
  }
  const sql = readFileSync(sqlPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");

  // Split into statements on semicolon-terminated lines (these migrations are
  // plain DDL/DML with no semicolons inside string literals).
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await db.batch(statements.map((s) => ({ sql: s, args: [] })), "write");
    await db.execute({
      sql: `INSERT INTO _prisma_migrations
            (id, checksum, finished_at, migration_name, applied_steps_count)
            VALUES (?, ?, current_timestamp, ?, ?)`,
      args: [randomUUID(), checksum, dir, statements.length],
    });
    console.log(`applied: ${dir} (${statements.length} statements)`);
    appliedCount++;
  } catch (err) {
    console.error(`FAILED at ${dir}: ${err.message}`);
    process.exit(2);
  }
}

console.log(
  appliedCount === 0
    ? "Nothing to apply — database is up to date."
    : `Done — ${appliedCount} migration(s) applied.`
);
