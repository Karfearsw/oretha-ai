/* Minimal OpenAI-compatible mock LLM for local dev without an API key.
 * Usage:  node scripts/mock-llm.mjs   → http://localhost:4000/v1
 * Point .env.local at it:
 *   LLM_BASE_URL="http://localhost:4000/v1"
 *   LLM_API_KEY="mock"  LLM_MODEL="mock-1"
 *
 * Chat calls stream a fixed reply; memory-extraction calls (stream=false,
 * max_tokens=300) return a durable-fact line so you can watch MEMORY.md grow.
 */
import http from "node:http";

const PORT = process.env.MOCK_LLM_PORT ?? 4000;

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

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let parsed = {};
    try {
      parsed = JSON.parse(body);
    } catch {}

    if (parsed.stream) {
      sseChunks(
        res,
        "Understood — the mock is answering so you can test the full loop. Wire a real key whenever you're ready and I'll sound like myself.",
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
