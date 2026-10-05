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
  rejected: "bg-destructive/15 text-destructive",
  awaiting_approval: "bg-warning/30 text-foreground",
  revised: "bg-muted text-muted-foreground",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", statusStyle[status] ?? statusStyle["waiting"])}>
      {status.replaceAll("_", " ")}
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
    <div className="rounded-lg border bg-card p-5 shadow-soft">
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

export function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card p-5 shadow-soft sm:p-6", className)}>
      {title && <h2 className="mb-3 text-xl">{title}</h2>}
      {children}
    </section>
  );
}

export function CodeBlock({ children }: { children: string }) {
  return <pre className="max-h-96 overflow-auto rounded-lg bg-primary p-3 font-mono text-xs leading-relaxed text-primary-foreground">{children}</pre>;
}

export function OutputView({ value, depth = 0 }: { value: unknown; depth?: number }): React.ReactNode {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.includes("\n") ? <CodeBlock>{value}</CodeBlock> : <span>{value}</span>;
  if (typeof value !== "object") return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-2">
        {value.map((v, i) => (
          <li key={i} className={typeof v === "object" ? "rounded-lg border bg-background p-3" : "ml-4 list-disc"}>
            <OutputView value={v} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-2">
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <div key={k}>
          <p className={depth === 0 ? "mb-1 font-serif text-lg capitalize" : "text-xs font-semibold uppercase text-muted-foreground"}>{k.replaceAll("_", " ")}</p>
          <OutputView value={v} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}
