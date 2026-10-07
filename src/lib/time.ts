/* Shared relative-time formatting.
 * Two variants exist in the UI and both are preserved exactly:
 *  - timeAgo      → "just now" / "5m ago" / "2h ago" / "3d ago"
 *                   (office, activity, workflows, run cards, watch panel)
 *  - timeAgoShort → "now" / "5m" / "2h" / "3d" (chats thread list)
 */

/** "5m ago" — the feeds. */
export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Compact variant without the "ago" suffix — the chats list. */
export function timeAgoShort(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/** "3:04 PM" — clock labels on chat messages (bubbles + history rows). */
export function clockLabel(date: Date = new Date()): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
