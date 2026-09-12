/* ── Oretha AI · shared domain types ─────────────────────────── */

export type AgentDomain =
  | "Dev"
  | "Office"
  | "Real Estate"
  | "Security"
  | "Media";

export type AgentStatus = "online" | "idle" | "working";

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  domain: AgentDomain;
  capabilities: string[];
  connectors: string[];
  examplePrompts: string[];
  status: AgentStatus;
  pinned?: boolean;
}

export type ThreadCategory =
  | "Work"
  | "Code"
  | "Real Estate"
  | "Media"
  | "Personal";

export interface Thread {
  id: string;
  title: string;
  preview: string;
  time: string;
  category: ThreadCategory;
  unread?: number;
  running?: boolean;
  agentIds: string[];
}

export type MessageRole = "user" | "oretha" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  time: string;
  toolLabel?: string;
}

export type RunStatus = "running" | "complete" | "failed";

export interface RunStep {
  label: string;
  detail: string;
  status: RunStatus;
}

export interface AgentRun {
  id: string;
  agentId: string;
  title: string;
  summary: string;
  time: string;
  status: RunStatus;
  steps: RunStep[];
}

export type TaskSource = "Email" | "GitHub" | "Linear" | "Manual";
export type TaskLane = "Inbox" | "In Progress" | "Waiting" | "Done";
export type Priority = "low" | "med" | "high";

export interface Task {
  id: string;
  title: string;
  source: TaskSource;
  lane: TaskLane;
  assigneeId: string;
  due: string;
  overdue?: boolean;
  priority: Priority;
}

export type Department =
  | "Engineering"
  | "Marketing"
  | "Real Estate"
  | "Media"
  | "Ops";

export interface Employee {
  id: string;
  name: string;
  title: string;
  department: Department;
  capabilities: string;
  skills: { name: string; level: number }[];
  status: AgentStatus;
  sampleTasks: string[];
}

export interface PulseMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  spark: number[];
}

export interface PulseNote {
  id: string;
  agentId: string;
  text: string;
  time: string;
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  summary: string;
  readTime: string;
  category: ThreadCategory;
  steps: { title: string; body: string }[];
}

export interface Connector {
  id: string;
  name: string;
  desc: string;
  connected: boolean;
}

export interface OutputItem {
  id: string;
  kind: "image" | "video" | "music" | "social";
  title: string;
  meta: string;
  gradient: string;
}
