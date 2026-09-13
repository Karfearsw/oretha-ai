/* Mock GitHub + Linear APIs for local connector E2E.
 * Run: node scripts/mock-connectors.mjs   (port 4200)
 *
 * Overrides used by src/lib/connectors.ts when set in .env.local:
 *   GITHUB_API_BASE=http://localhost:4200/github
 *   LINEAR_API_BASE=http://localhost:4200/linear/graphql
 * Auth: any Bearer token starting "gh_test_" (GitHub) / "lin_test_" (Linear).
 */
import http from "node:http";

const PORT = 4200;
const ISSUES = [
  {
    id: 9001,
    title: "Fix login redirect loop on mobile",
    html_url: "https://github.test/oceanluxe/app/issues/42",
    state: "open",
    updated_at: new Date().toISOString(),
  },
  {
    id: 9002,
    title: "Ship onboarding email sequence",
    html_url: "https://github.test/oceanluxe/app/issues/43",
    state: "open",
    updated_at: new Date().toISOString(),
  },
];
const PRS = [
  {
    id: 8001,
    title: "Add Turso failover to prisma client",
    html_url: "https://github.test/oceanluxe/app/pull/77",
    state: "open",
    updated_at: new Date().toISOString(),
  },
];

function json(res, code, body) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const path = (req.url ?? "").split("?")[0];
  const auth = req.headers.authorization ?? "";

  if (path === "/github/user") {
    if (!auth.startsWith("Bearer gh_test_"))
      return json(res, 401, { message: "Bad credentials" });
    return json(res, 200, { login: "karfear-qa", name: "Karfear QA" });
  }

  if (path === "/github/search/issues") {
    if (!auth.startsWith("Bearer gh_test_"))
      return json(res, 401, { message: "Bad credentials" });
    const q = new URL(`http://x${req.url}`).searchParams.get("q") ?? "";
    const items = q.includes("type:pr") ? PRS : q.includes("type:issue") ? ISSUES : [];
    return json(res, 200, { total_count: items.length, items });
  }

  if (path === "/linear/graphql" && req.method === "POST") {
    let body = "";
    for await (const ch of req) body += ch;
    if (!auth.startsWith("lin_test_"))
      return json(res, 401, { errors: [{ message: "Invalid auth" }] });
    if (body.includes("viewer { id")) {
      return json(res, 200, {
        data: { viewer: { id: "v1", name: "Karfear QA", email: "qa@karfear.test" } },
      });
    }
    if (body.includes("assignedIssues")) {
      return json(res, 200, {
        data: {
          viewer: {
            assignedIssues: {
              nodes: [
                {
                  id: "lin-771",
                  title: "Design review: hub pulse cards",
                  url: "https://linear.test/karfear/ore-123",
                  priority: 2,
                  state: { name: "In Progress" },
                },
                {
                  id: "lin-772",
                  title: "Backfill changelog for v0.3",
                  url: "https://linear.test/karfear/ore-124",
                  priority: 1,
                  state: { name: "Todo" },
                },
              ],
            },
          },
        },
      });
    }
    return json(res, 400, { errors: [{ message: "unknown query" }] });
  }

  json(res, 404, { error: "not found", path });
});

server.listen(PORT, () => console.log(`mock connectors on :${PORT}`));
