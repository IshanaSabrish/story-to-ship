import { cn } from "@/lib/utils";
import { STEP_BUDGET_TOKENS, type StepStatus } from "@/lib/agents";
import { ShieldCheck } from "lucide-react";

const statusStyle: Record<string, string> = {
  waiting: "bg-muted text-muted-foreground",
  running: "bg-accent/15 text-accent-foreground ring-1 ring-accent",
  done: "bg-accent text-accent-foreground",
  needs_approval: "bg-warning/25 text-foreground",
  failed: "bg-destructive/15 text-destructive",
  completed: "bg-accent text-accent-foreground",
  escalated: "bg-destructive/15 text-destructive",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", statusStyle[status] ?? statusStyle["waiting"])}>
      {status.replace("_", " ")}
    </span>
  );
}

export function AgentAvatar({ initials, status, size = "md" }: { initials: string; status: StepStatus; size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full font-bold transition-all duration-500",
        size === "md" ? "h-14 w-14 text-sm" : "h-9 w-9 text-xs",
        status === "done" && "bg-accent text-accent-foreground",
        status === "running" && "bg-primary text-primary-foreground",
        status === "waiting" && "bg-muted text-muted-foreground",
        status === "failed" && "bg-destructive text-destructive-foreground",
        status === "needs_approval" && "bg-warning text-foreground",
      )}
    >
      {status === "running" && <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />}
      <span className="relative">{initials}</span>
    </div>
  );
}

export function SafetyPanel() {
  const items = [
    `Step budget: ${STEP_BUDGET_TOKENS.toLocaleString()} tokens per agent, 1 retry`,
    "Human sign-off required before release",
    "Secrets redacted — never sent to agents",
    "Full audit log of every agent action",
  ];
  return (
    <div className="rounded-2xl bg-card p-5 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <h3 className="text-lg">Safety</h3>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
