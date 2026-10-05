import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Lock, MessageSquare, X } from "lucide-react";
import { decideGate } from "@/lib/pipeline.functions";
import { GATES, ROLES } from "@/lib/agents";
import { useRole } from "@/lib/role";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Approval = { id: string; gate: number; decision: string; comment: string | null; created_at: string };

export function GatePanel({ runId, pendingGate, approvals }: { runId: string; pendingGate: number | null; approvals: Approval[] }) {
  const { role, setRole } = useRole();
  const qc = useQueryClient();
  const decide = useServerFn(decideGate);
  const [comment, setComment] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const gates = [1, 2, 3].map((g) => {
    const last = [...approvals].reverse().find((a) => a.gate === g);
    return { g, info: GATES[g]!, last, open: pendingGate === g };
  });

  async function act(g: number, decision: "approve" | "changes" | "reject") {
    setBusy(true);
    setErr("");
    try {
      await decide({ data: { id: runId, gate: g, decision, comment: decision === "changes" ? comment : undefined } });
      setComment("");
      setAsking(false);
      await qc.invalidateQueries({ queryKey: ["run", runId] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5 shadow-soft">
      <h3 className="text-lg">Human approval gates</h3>
      <ol className="mt-3 space-y-3">
        {gates.map(({ g, info, last, open }) => {
          const mine = info.role === role;
          return (
            <li key={g} className={`rounded-xl border p-3 transition-colors ${open ? "border-warning bg-warning/10" : "bg-background"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gate {g} · {info.roleLabel}</p>
                  <p className="text-sm font-medium">{info.title}</p>
                </div>
                {last && !open && <DecisionChip d={last.decision} />}
              </div>
              {last?.comment && !open && <p className="mt-1 text-xs text-muted-foreground">“{last.comment}”</p>}
              {open && mine && (
                <div className="mt-3 space-y-2">
                  {asking && (
                    <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What should the agent change?" className="min-h-20 bg-card text-sm" />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={busy} onClick={() => act(g, "approve")}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" disabled={busy || (asking && !comment.trim())} onClick={() => (asking ? act(g, "changes") : setAsking(true))}>
                      <MessageSquare className="h-3.5 w-3.5" /> {asking ? "Send changes" : "Request changes"}
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full text-destructive" disabled={busy} onClick={() => act(g, "reject")}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                  {err && <p className="text-xs text-destructive">{err}</p>}
                </div>
              )}
              {open && !mine && (
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Waiting for {info.roleLabel}</span>
                  <button className="font-semibold text-foreground underline-offset-2 hover:underline" onClick={() => setRole(info.role)}>
                    Switch to {ROLES.find((r) => r.key === info.role)?.label}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DecisionChip({ d }: { d: string }) {
  const map: Record<string, string> = { approve: "bg-accent text-accent-foreground", changes: "bg-warning/30 text-foreground", reject: "bg-destructive/15 text-destructive" };
  const label: Record<string, string> = { approve: "Approved", changes: "Changes requested", reject: "Rejected" };
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${map[d] ?? ""}`}>{label[d] ?? d}</span>;
}
