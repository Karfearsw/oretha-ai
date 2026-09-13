export interface SetupPayload {
  agentName: string;
  agentEmoji: string;
  voice: "straight" | "warm" | "playful" | "balanced";
  censorship: "open" | "guarded" | "strict";
  empowerment: boolean;
  responseLength: "concise" | "balanced" | "detailed";
  timezone: string | null;
  userFirstName: string;
  userWork: string | null;
  userInterests: string[];
  /** Optional AgentMail key — provisioning the mailroom inbox is step 6. */
  mailboxApiKey: string | null;
}
