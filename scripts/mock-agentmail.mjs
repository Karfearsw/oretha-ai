/* Minimal AgentMail mock for local E2E without a real key.
 * Usage: node scripts/mock-agentmail.mjs  → http://localhost:4100
 * Point the app at it with: AGENTMAIL_BASE_URL="http://localhost:4100"
 *
 * Endpoints: POST /inboxes · GET /inboxes/:id/messages ·
 *            POST /inboxes/:id/messages/send
 * Inboxes created with the same client_id are idempotent; each new inbox
 * gets one seeded inbound email so triage has something to chew on.
 */
import http from "node:http";

const PORT = process.env.MOCK_AGENTMAIL_PORT ?? 4100;
const inboxes = new Map(); // inboxId → { messages: [] }
const byClientId = new Map(); // client_id → inboxId
let n = 0;

function json(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let parsed = {};
    try {
      parsed = JSON.parse(body);
    } catch {}
    const path = (req.url ?? "").split("?")[0];
    const inboxMatch = path.match(/^\/inboxes\/([^/]+)/);
    const inboxId = inboxMatch ? decodeURIComponent(inboxMatch[1]) : null;

    if (path === "/inboxes" && req.method === "GET") {
      // key smoke-test / list
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer am_")) return json(res, 401, { error: "bad key" });
      return json(res, 200, { count: byClientId.size, inboxes: [...byClientId.values()] });
    }

    if (path === "/inboxes" && req.method === "POST") {
      // Auth check like the real API: Bearer am_…
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer am_")) return json(res, 401, { error: "bad key" });

      const cid = parsed.client_id ?? `anon-${++n}`;
      if (byClientId.has(cid)) {
        return json(res, 200, {
          inbox_id: byClientId.get(cid),
          username: byClientId.get(cid).split("@")[0],
          domain: byClientId.get(cid).split("@")[1] ?? "agentmail.to",
          display_name: parsed.display_name ?? null,
        });
      }
      const id = `${(parsed.username ?? `agent${++n}`).toLowerCase()}${n}@agentmail.to`;
      byClientId.set(cid, id);
      const seeded = [
        {
          id: "seed-1",
          from: "vendor@supplies.co",
          subject: "Invoice #4471 — due Friday",
          text: "Hi, our invoice #4471 for $1,240 is due this Friday. Can you confirm payment this week?",
          created_at: new Date(Date.now() - 3600_000).toISOString(),
        },
      ];
      inboxes.set(id, { messages: seeded });
      return json(res, 200, {
        inbox_id: id,
        username: id.split("@")[0],
        domain: "agentmail.to",
        display_name: parsed.display_name ?? null,
      });
    }

    if (inboxId && path.endsWith("/messages") && req.method === "GET") {
      const box = inboxes.get(inboxId);
      if (!box) return json(res, 404, { error: "no inbox" });
      return json(res, 200, { messages: box.messages });
    }

    if (inboxId && path.endsWith("/messages/send") && req.method === "POST") {
      const box = inboxes.get(inboxId);
      if (!box) return json(res, 404, { error: "no inbox" });
      box.messages.unshift({
        id: `sent-${Date.now()}`,
        from: inboxId,
        subject: `Sent: ${parsed.subject ?? "(no subject)"}`,
        text: parsed.text ?? "",
        created_at: new Date().toISOString(),
      });
      return json(res, 200, { ok: true, message_id: `sent-${Date.now()}` });
    }

    json(res, 404, { error: "not found", url: req.url });
  });
});

server.listen(PORT, () => console.log(`mock AgentMail on :${PORT}`));
