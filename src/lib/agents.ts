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
