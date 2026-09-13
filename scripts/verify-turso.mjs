/* Verify a remote libsql/Turso database: schema, row counts, and a write probe.
 * Usage: node scripts/verify-turso.mjs <libsql-url> <authToken>
 */
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const [url, authToken] = process.argv.slice(2);
if (!url || !authToken) {
  console.error("usage: node scripts/verify-turso.mjs <url> <token>");
  process.exit(1);
}

const db = createClient({ url, authToken });

const tables = (
  await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  )
).rows.map((r) => String(r.name));
console.log("tables:", tables.join(", "));

for (const t of ["User", "Account", "Thread", "Message", "_prisma_migrations"]) {
  if (!tables.includes(t)) {
    console.log(`${t}: MISSING`);
    continue;
  }
  const c = await db.execute(`SELECT COUNT(*) AS n FROM "${t}"`);
  console.log(`${t}: ${c.rows[0].n} row(s)`);
}

// Write probe: proves the token has write scope, then cleans up.
const email = `turso-probe-${Date.now()}@karfear.test`;
try {
  await db.execute({
    sql: `INSERT INTO User (id, email, passwordHash, name, plan, setupCompleted, createdAt, updatedAt)
          VALUES (?, ?, 'probe', 'Turso Probe', 'free', 0, current_timestamp, current_timestamp)`,
    args: [randomUUID(), email],
  });
  console.log("write probe: OK");
  await db.execute({ sql: "DELETE FROM User WHERE email = ?", args: [email] });
  console.log("cleanup: OK");
} catch (err) {
  console.error("write probe FAILED:", err.message);
  process.exit(2);
}

console.log("Turso database verified.");
