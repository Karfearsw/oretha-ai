/* ── One run-state model (Epic 0 / R0.3) ─────────────────────────────
 * A run is queued, running, succeeded, or failed — identical on the
 * card, in Recent Runs, and in Pulse. Legacy rows stored "complete"
 * for success; they normalize to "succeeded" on read. Never invent a
 * state: an unknown value passes through and labels as "Finished".
 */

export const RUN_STATUSES = ["queued", "running", "succeeded", "failed"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

/** Map a stored status to the single model ("complete" → "succeeded"). */
export function normalizeRunStatus(raw: string | null | undefined): string {
  if (!raw) return "failed";
  if (raw === "complete") return "succeeded";
  return raw;
}

export function isRunFailed(raw: string | null | undefined): boolean {
  return normalizeRunStatus(raw) === "failed";
}

export function isRunRunning(raw: string | null | undefined): boolean {
  return normalizeRunStatus(raw) === "running";
}

export function isRunSucceeded(raw: string | null | undefined): boolean {
  return normalizeRunStatus(raw) === "succeeded";
}

/** The word the UI shows for a (normalized) status. */
export function runStatusLabel(raw: string | null | undefined): string {
  switch (normalizeRunStatus(raw)) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    default:
      return "Finished";
  }
}
