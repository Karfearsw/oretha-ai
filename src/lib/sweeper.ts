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
 *
 * One tick = run each sweep step in order, each isolated by the same
 * try/catch: a failure in one never stops the others, steps log only when
 * they have something to say, and the message strings are unchanged from
 * the original per-step code.
 */

const SWEEP_INTERVAL_MS = 5 * 60_000;

interface SweepStep {
  /** Appears in the failure log: `[sweeper] <label> failed:`. */
  label: string;
  /** Runs the sweep; resolves to the log line, or null to stay quiet. */
  run: () => Promise<string | null>;
}

const STEPS: SweepStep[] = [
  {
    label: "workflow sweep",
    run: async () => {
      const { sweepDueWorkflows } = await import("@/lib/scheduler");
      const result = await sweepDueWorkflows();
      if (result.executed === 0) return null;
      return `executed ${result.executed} workflow(s): ${result.results
        .map((r) => `${r.workflow}=${r.status}`)
        .join(", ")}`;
    },
  },
  {
    label: "watch sweep",
    run: async () => {
      const { sweepDueWatches } = await import("@/lib/watches");
      const w = await sweepDueWatches();
      if (w.executed === 0) return null;
      return `watch checks: ${w.executed}/${w.checked}, alerts=${w.alerts}, errors=${w.errors}`;
    },
  },
  {
    label: "task recovery",
    run: async () => {
      const { recoverStaleTasks } = await import("@/lib/agentTasks");
      const t = await recoverStaleTasks();
      if (t.resumed === 0 && t.failed === 0) return null;
      return `agent tasks: resumed=${t.resumed} failed=${t.failed}`;
    },
  },
];

export function startSweeper() {
  const g = globalThis as { __orethaSweeper?: boolean };
  if (g.__orethaSweeper) return;
  g.__orethaSweeper = true;

  const tick = async () => {
    for (const step of STEPS) {
      try {
        const message = await step.run();
        if (message) console.log(`[sweeper] ${message}`);
      } catch (err) {
        console.error(`[sweeper] ${step.label} failed:`, err);
      }
    }
  };

  // First sweep shortly after boot, then on an interval.
  setTimeout(tick, 15_000);
  setInterval(tick, SWEEP_INTERVAL_MS);
  console.log("[sweeper] workflow sweeper armed (every 5 min)");
}
