/* Node-only workflow sweeper (started by instrumentation.ts).
 * Runs the due-workflow sweep every 5 minutes while the server is up,
 * complementing the Vercel cron in production.
 *
 * This module lives apart from instrumentation.ts on purpose: Next.js
 * compiles instrumentation for BOTH the node and edge runtimes, and only
 * code lexically inside `if (process.env.NEXT_RUNTIME === "nodejs")` is
 * dead-code-eliminated from the edge bundle. Keeping the heavy imports out
 * of instrumentation.ts entirely guarantees node-only libs (node:crypto via
 * agentmail/mailroom/scheduler) never enter the edge graph.
 */

const SWEEP_INTERVAL_MS = 5 * 60_000;

export function startSweeper() {
  const g = globalThis as { __orethaSweeper?: boolean };
  if (g.__orethaSweeper) return;
  g.__orethaSweeper = true;

  const tick = async () => {
    try {
      const { sweepDueWorkflows } = await import("@/lib/scheduler");
      const result = await sweepDueWorkflows();
      if (result.executed > 0)
        console.log(
          `[sweeper] executed ${result.executed} workflow(s):`,
          result.results.map((r) => `${r.workflow}=${r.status}`).join(", "),
        );
    } catch (err) {
      console.error("[sweeper] sweep failed:", err);
    }
  };

  // First sweep shortly after boot, then on an interval.
  setTimeout(tick, 15_000);
  setInterval(tick, SWEEP_INTERVAL_MS);
  console.log("[sweeper] workflow sweeper armed (every 5 min)");
}
