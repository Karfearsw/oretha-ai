/* Local workflow sweeper bootstrap.
 *
 * Next.js compiles this file for BOTH runtimes (node + edge). The dynamic
 * import MUST sit lexically inside the `if` block: NEXT_RUNTIME is inlined
 * at build time, so the edge copy dead-code-eliminates the branch and never
 * bundles the node-only sweeper (which pulls node:crypto through the
 * scheduler/mailroom/agentmail chain). An import outside the if — even one
 * guarded by an early return — is still bundled for edge and 500s every
 * route with "Reading from node:crypto is not handled by plugins".
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSweeper } = await import("@/lib/sweeper");
    startSweeper();
  }
}
