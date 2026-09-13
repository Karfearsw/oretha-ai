/* Local workflow sweeper: runs the due-workflow sweep every 5 minutes
 * while the server is up (complements the Vercel cron in production). */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as { __orethaSweeper?: boolean };
  if (g.__orethaSweeper) return;
  g.__orethaSweeper = true;

  const SWEEP_INTERVAL_MS = 5 * 60_000;

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
