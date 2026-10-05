import {
  Braces,
  CheckCircle2,
  ClipboardCheck,
  CloudCog,
  FileSearch,
  FlaskConical,
  LockKeyhole,
  type LucideIcon,
} from "lucide-react";
import { AGENTS, type AgentKey, type StepStatus } from "@/lib/agents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const stageMeta: Record<AgentKey, { phase: string; icon: LucideIcon }> = {
  requirement: { phase: "Discover", icon: FileSearch },
  design: { phase: "Design", icon: Braces },
  coding: { phase: "Build", icon: ClipboardCheck },
  testing: { phase: "Test", icon: FlaskConical },
  review: { phase: "Verify", icon: CheckCircle2 },
  devops: { phase: "Release", icon: CloudCog },
};

type ProcessMapProps = {
  statusFor?: (key: AgentKey) => StepStatus;
  onSelect?: (key: AgentKey) => void;
  canSelect?: (key: AgentKey) => boolean;
  compact?: boolean;
};

export function ProcessMap({ statusFor = () => "waiting", onSelect, canSelect = () => false, compact = false }: ProcessMapProps) {
  return (
    <div className="process-map overflow-x-auto pb-2">
      <div className="relative min-w-[760px] px-2 pt-2">
        <div className="absolute left-[7%] right-[7%] top-[3.1rem] h-px bg-border" />
        <div className="grid grid-cols-6 gap-3">
          {AGENTS.map((agent, index) => {
            const status = statusFor(agent.key);
            const Icon = stageMeta[agent.key].icon;
            const selectable = canSelect(agent.key);
            const content = (
              <>
                <span className={cn(
                  "relative z-10 grid place-items-center border bg-card transition-all duration-500",
                  compact ? "h-12 w-12 rounded-md" : "h-14 w-14 rounded-lg",
                  status === "done" && "border-accent bg-accent/10 text-accent shadow-signal",
                  status === "running" && "border-accent bg-accent/10 text-accent shadow-signal motion-safe:animate-stage-pulse",
                  status === "needs_approval" && "border-warning bg-warning/10 text-warning",
                  status === "failed" && "border-destructive bg-destructive/10 text-destructive",
                  status === "waiting" && "border-border text-muted-foreground",
                )}>
                  <Icon className="h-5 w-5" />
                  {status === "running" && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-background" />}
                </span>
                <span className="mt-3 font-mono text-[10px] font-bold uppercase text-muted-foreground">{String(index + 1).padStart(2, "0")} / {agent.initials}</span>
                <span className={cn("mt-0.5 text-sm font-semibold", status === "running" && "text-accent")}>{stageMeta[agent.key].phase}</span>
                {!compact && <span className="mt-1 max-w-28 text-center text-[11px] leading-4 text-muted-foreground">{agent.role}</span>}
              </>
            );

            return (
              <div key={agent.key} className="relative flex min-w-0 flex-col items-center">
                {onSelect ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!selectable}
                    onClick={() => onSelect(agent.key)}
                    className="h-auto w-full flex-col p-0 hover:bg-transparent disabled:opacity-100"
                    aria-label={`Open ${agent.name} output`}
                  >
                    {content}
                  </Button>
                ) : content}
              </div>
            );
          })}
        </div>
        {!compact && (
          <div className="mt-5 grid grid-cols-6 gap-3 border-t border-border/70 pt-3">
            <GateMarker className="col-start-1" label="Product sign-off" gate="G1" />
            <GateMarker className="col-start-5" label="Code sign-off" gate="G2" />
            <GateMarker className="col-start-6" label="Release sign-off" gate="G3" />
          </div>
        )}
      </div>
    </div>
  );
}

function GateMarker({ label, gate, className }: { label: string; gate: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground", className)}>
      <LockKeyhole className="h-3 w-3 text-warning" />
      <span className="font-mono text-warning">{gate}</span>
      <span>{label}</span>
    </div>
  );
}