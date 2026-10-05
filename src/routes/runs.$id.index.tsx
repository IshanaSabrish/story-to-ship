import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Clock3 } from "lucide-react";
import { AGENTS, GATE_CARD, type AgentKey, type StepStatus } from "@/lib/agents";
import { OutputView, SafetyPanel } from "@/components/agentflow";
import { ProcessMap } from "@/components/process-map";
import { GatePanel } from "@/components/gate-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { runQuery } from "./runs.$id";

export const Route = createFileRoute("/runs/$id/")({ component: PipelineView });

function PipelineView() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(runQuery(id));
  const [selected, setSelected] = useState<string | null>(null);

  const stepFor = (key: string) => [...data.steps].reverse().find((s) => s.agent === key && s.status !== "revised");
  const gateCard = data.run.status === "awaiting_approval" && data.run.pending_gate ? GATE_CARD[data.run.pending_gate] : null;
  const statusFor = (key: string): StepStatus => (gateCard === key ? "needs_approval" : ((stepFor(key)?.status ?? "waiting") as StepStatus));
  const sel = selected ? stepFor(selected) : undefined;
  const selAgent = AGENTS.find((a) => a.key === selected);

  return (
    <>
      <section className="rounded-lg border bg-card p-5 shadow-soft sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase text-accent">Live orchestration</p><h2 className="mt-1 text-xl font-semibold">SDLC processing map</h2></div><p className="hidden text-xs text-muted-foreground sm:block">Select a completed stage to inspect its work</p></div>
        <ProcessMap statusFor={(key) => statusFor(key)} canSelect={(key) => Boolean(stepFor(key))} onSelect={(key) => setSelected(key)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /><h2 className="text-lg font-semibold">Activity stream</h2></div>
          <ul className="mt-4 max-h-[28rem] space-y-2 overflow-auto text-sm">
            {data.logs.map((l) => (
              <li key={l.id} className="flex gap-3 rounded-md border bg-background p-3 animate-in fade-in slide-in-from-top-1">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                <span className="w-7 shrink-0 font-mono text-[10px] font-bold text-accent">{AGENTS.find((a) => a.key === l.agent)?.initials ?? "—"}</span>
                <span className="min-w-0 flex-1 break-words">
                  {l.action.replaceAll("_", " ")}
                  {l.detail && <span className="ml-2 text-xs text-muted-foreground">{JSON.stringify(l.detail)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <aside className="space-y-6">
          <GatePanel runId={id} pendingGate={data.run.status === "awaiting_approval" ? data.run.pending_gate : null} approvals={data.approvals} />
          <SafetyPanel />
        </aside>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
          <SheetTitle className="font-serif text-2xl">{selAgent?.name}</SheetTitle>
          </SheetHeader>
          {sel && (
            <div className="space-y-4 px-4 pb-6 text-sm">
              <div className="flex flex-wrap gap-2 text-xs">
                {[`${sel.tokens} tokens`, `${(sel.duration_ms / 1000).toFixed(1)}s`, `${sel.attempts} attempt${sel.attempts === 1 ? "" : "s"}`].map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{t}</span>
                ))}
              </div>
              {sel.error && <p className="rounded-lg bg-destructive/10 p-3 text-destructive">{sel.error}</p>}
              <Tabs defaultValue="output">
                <TabsList>
                  <TabsTrigger value="output">Output</TabsTrigger>
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="json">Raw JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="output" className="pt-3">{sel.output ? <OutputView value={sel.output} /> : <p className="text-muted-foreground">Working…</p>}</TabsContent>
                <TabsContent value="input" className="pt-3"><OutputView value={sel.input} /></TabsContent>
                <TabsContent value="json" className="pt-3"><pre className="overflow-x-auto rounded-lg bg-primary p-3 font-mono text-xs text-primary-foreground">{JSON.stringify(sel.output, null, 2)}</pre></TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
