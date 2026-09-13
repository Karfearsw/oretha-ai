/* Minimal OpenAI-compatible mock LLM for local dev without an API key.
 * Usage:  node scripts/mock-llm.mjs   → http://localhost:4000/v1
 * Point .env.local at it:
 *   LLM_BASE_URL="http://localhost:4000/v1"
 *   LLM_API_KEY="mock"  LLM_MODEL="mock-1"
 *
 * Behavior:
 *  - streaming + tools provided  → emits a check_mail tool_call on
 *    mail-related prompts, otherwise streams the canned reply.
 *  - streaming, no tools         → streams the canned reply.
 *  - non-streaming               → memory-extraction / triage canned JSON.
 */
import http from "node:http";

const PORT = process.env.MOCK_LLM_PORT ?? 4000;

/* Chaos mode: MOCK_LLM_CHAOS=50 makes ~50% of requests fail with 503
 * so the app's provider-failover logic can be tested end to end. */
const CHAOS = Number(process.env.MOCK_LLM_CHAOS ?? 0);

function sseChunks(res, text) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-store",
  });
  const words = text.split(" ");
  let i = 0;
  const timer = setInterval(() => {
    if (i >= words.length) {
      res.write("data: [DONE]\n\n");
      res.end();
      clearInterval(timer);
      return;
    }
    const delta = (i === 0 ? words[i] : ` ${words[i]}`) + " ";
    const payload = {
      id: "mock",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: { content: delta } }],
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    i++;
  }, 40);
}

function sseToolCall(res, toolName) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-store",
  });
  const frames = [
    { delta: { tool_calls: [{ index: 0, id: "call_mock_1", function: { name: toolName, arguments: "" } }] } },
    { delta: { tool_calls: [{ index: 0, function: { arguments: "{}" } }] } },
  ];
  let i = 0;
  const timer = setInterval(() => {
    if (i >= frames.length) {
      res.write("data: [DONE]\n\n");
      res.end();
      clearInterval(timer);
      return;
    }
    const payload = {
      id: "mock",
      object: "chat.completion.chunk",
      choices: [{ index: 0, ...frames[i] }],
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    i++;
  }, 40);
}

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let parsed = {};
    try {
      parsed = JSON.parse(body);
    } catch {}

    if (CHAOS > 0 && Math.random() * 100 < CHAOS) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "mock chaos: provider down" } }));
      return;
    }

    const wantsTools = Array.isArray(parsed.tools) && parsed.tools.length > 0;
    const lastUser = [...(parsed.messages ?? [])]
      .reverse()
      .find((m) => m.role === "user" || m.role === "developer");
    const lastContent = String(lastUser?.content ?? "");
    const sawToolResult = (parsed.messages ?? []).some(
      (m) => m.role === "tool",
    );

    // Tool call? Only when tools are offered and the user mentions mail or connectors.
    if (wantsTools && !sawToolResult && /\bgithub\b|\blinear\b|connector/i.test(lastContent)) {
      sseToolCall(res, "sync_connectors");
      return;
    }
    if (wantsTools && !sawToolResult && /mail|inbox|email/i.test(lastContent)) {
      sseToolCall(res, "check_mail");
      return;
    }

    if (parsed.stream) {
      sseChunks(
        res,
        sawToolResult
          ? /github|linear|connector/i.test(lastUser?.content ?? "") ||
            JSON.stringify(parsed.messages).includes("sync_connectors")
            ? "Pulled your GitHub and Linear work — any new assigned items are on the board now."
            : "Checked the mailroom — the mock sync ran and any new email is triaged on the board."
          : "Understood — the mock is answering so you can test the full loop. Wire a real key whenever you're ready and I'll sound like myself.",
      );
      return;
    }

    // mail triage calls ask for an action verdict — answer with a task.
    // the request body is JSON, so quotes in the prompt are escaped: \"action\"
    if (body.includes("task_title") && body.includes('\\"action\\"')) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content:
                  '{"action":"task","task_title":"Pay invoice #4471","lane":"In Progress","priority":"high","due_days":3,"reason":"invoice with deadline"}',
              },
            },
          ],
        }),
      );
      return;
    }

    // memory extractor: surface a durable fact from the transcript if present
    const m = body.match(/my (?:sister|brother|mom|dad)['s]* name is (\w+)/i);
    const fact = m
      ? `- User's ${body.match(/sister|brother|mom|dad/i)[0].toLowerCase()}'s name is ${m[1]}.`
      : "- (mock) No new durable facts.";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        choices: [{ message: { role: "assistant", content: fact } }],
      }),
    );
  });
});

server.listen(PORT, () => console.log(`mock LLM on :${PORT}/v1`));
