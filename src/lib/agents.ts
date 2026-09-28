export type AgentKey = "requirement" | "design" | "coding" | "testing" | "review" | "devops";

export const AGENTS: { key: AgentKey; name: string; initials: string; role: string }[] = [
  { key: "requirement", name: "Requirement Agent", initials: "RA", role: "User stories & acceptance criteria" },
  { key: "design", name: "Design Agent", initials: "DA", role: "Architecture, data model, API" },
  { key: "coding", name: "Coding Agent", initials: "CA", role: "Implementation code" },
  { key: "testing", name: "Testing Agent", initials: "TA", role: "Unit tests & edge cases" },
  { key: "review", name: "Review Agent", initials: "RV", role: "Quality, security, coverage" },
  { key: "devops", name: "DevOps Agent", initials: "DO", role: "Deploy plan, CI, rollback" },
];

export const STEP_BUDGET_TOKENS = 6000;
export const MAX_ATTEMPTS = 2;

export type StepStatus = "waiting" | "running" | "done" | "needs_approval" | "failed";

export type RoleKey = "po" | "pm" | "dev" | "qa" | "sre" | "user";
export const ROLES: { key: RoleKey; label: string }[] = [
  { key: "po", label: "Client / Product Owner" },
  { key: "pm", label: "Project Manager" },
  { key: "dev", label: "Developer" },
  { key: "qa", label: "QA Engineer" },
  { key: "sre", label: "DevOps / SRE" },
  { key: "user", label: "End User" },
];

export const GATES: Record<number, { title: string; role: RoleKey; roleLabel: string; after: AgentKey; rerun: AgentKey; revise: AgentKey[] }> = {
  1: { title: "Product Owner approves the stories", role: "po", roleLabel: "Product Owner", after: "requirement", rerun: "requirement", revise: ["requirement"] },
  2: { title: "Developer approves the code", role: "dev", roleLabel: "Developer", after: "review", rerun: "coding", revise: ["coding", "testing", "review"] },
  3: { title: "SRE approves the release", role: "sre", roleLabel: "SRE", after: "review", rerun: "review", revise: ["review"] },
};

/** Which agent card shows "needs approval" for a pending gate. */
export const GATE_CARD: Record<number, AgentKey> = { 1: "requirement", 2: "review", 3: "devops" };
