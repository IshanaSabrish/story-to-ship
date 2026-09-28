import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, RotateCcw } from "lucide-react";
import { advanceRun, getRun, retryRun } from "@/lib/pipeline.functions";
import { AGENTS, type StepStatus } from "@/lib/agents";
import { AgentAvatar, SafetyPanel, StatusChip } from "@/components/agentflow";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const runQuery = (id: string) => queryOptions({ queryKey: ["run", id], queryFn: () => getRun({ data: { id } }) });

export const Route = createFileRoute("/runs/$id")({
  head: () => ({
    meta: [
      { title: "Pipeline run — AgentFlow" },
      { name: "description", content: "Live view of six AI agents working through a feature request." },
      { property: "og:title", content: "Pipeline run — AgentFlow" },
      { property: "og:description", content: "Live view of six AI agents working through a feature request." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(runQuery(params.id)),
  component: RunView,
  errorComponent: ({ error }) => <p className="p-8 text-destructive">{error.message}</p>,
  notFoundComponent: () => <p className="p-8">Run not found.</p>,
});

function RunView() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useQuery(runQuery(id));
  const advance = useServerFn(advanceRun);
  const retry = useServerFn(retryRun);
  const [selected, setSelected] = useState<string | null>(null);
  const driving = useRef(false);

  const status = data?.run.status;
  // Drive the orchestrator one agent at a time while the run is active.
  useEffect(() => {
    if (status !== "running" || driving.current) return;
    driving.current = true;
    let cancelled = false;
    const poll = setInterval(() => qc.invalidateQueries({ queryKey: ["run", id] }), 2000);
    (async () => {
      try {
        while (!cancelled) {
          const r = await advance({ data: { id } });
          await qc.invalidateQueries({ queryKey: ["run", id] });
          if (r.status !== "running") break;
        }
      } finally {
        clearInterval(poll);
        driving.current = false;
        qc.invalidateQueries({ queryKey: ["runs"] });
      }
    })();
    return () => { cancelled = true; };
  }, [status, id, advance, qc]);

  if (!data) return null;
  const stepFor = (key: string) => [...data.steps].reverse().find((s) => s.agent === key);
  const sel = selected ? stepFor(selected) : undefined;
  const selAgent = AGENTS.find((a) => a.key === selected);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="max-w-3xl text-2xl sm:text-3xl">{data.run.request}</h1>
          <div className="flex items-center gap-2">
            <StatusChip status={data.run.status} />
            {data.run.status === "escalated" && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={async () => { await retry({ data: { id } }); qc.invalidateQueries({ queryKey: ["run", id] }); }}>
                <RotateCcw className="h-3.5 w-3.5" /> Resume
              </Button>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-card p-4 shadow-soft sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {AGENTS.map((a, i) => {
            const step = stepFor(a.key);
            const st = (step?.status ?? "waiting") as StepStatus;
            return (
              <div key={a.key} className="flex flex-1 flex-col items-center lg:flex-row lg:items-stretch">
                <button
                  onClick={() => step && setSelected(a.key)}
                  disabled={!step}
                  className="flex w-full flex-1 items-center gap-3 rounded-xl border bg-background p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-accent disabled:hover:translate-y-0 disabled:hover:border-border lg:flex-col lg:text-center"
                >
                  <AgentAvatar initials={a.initials} status={st} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.role}</p>
                    <div className="mt-1.5"><StatusChip status={st} /></div>
                  </div>
                </button>
                {i < AGENTS.length - 1 && (
                  <ChevronRight className={`my-1 h-4 w-4 rotate-90 shrink-0 self-center transition-colors duration-500 lg:mx-1 lg:rotate-0 ${st === "done" ? "text-accent" : "text-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl bg-card p-6 shadow-soft">
          <h2 className="text-xl">Activity log</h2>
          <ul className="mt-4 max-h-96 space-y-2 overflow-auto text-sm">
            {data.logs.map((l) => (
              <li key={l.id} className="flex gap-3 border-b pb-2 last:border-0 animate-in fade-in slide-in-from-top-1">
                <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                <span className="w-10 shrink-0 font-semibold">{AGENTS.find((a) => a.key === l.agent)?.initials ?? "—"}</span>
                <span className="flex-1">
                  {l.action.replaceAll("_", " ")}
                  {l.detail && <span className="ml-2 text-xs text-muted-foreground">{JSON.stringify(l.detail)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <aside><SafetyPanel /></aside>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl">{selAgent?.name}</SheetTitle>
          </SheetHeader>
          {sel && (
            <div className="space-y-4 px-4 pb-6 text-sm">
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Tokens: {sel.tokens}</span>
                <span>Duration: {(sel.duration_ms / 1000).toFixed(1)}s</span>
                <span>Attempts: {sel.attempts}</span>
              </div>
              {sel.error && <p className="rounded-lg bg-destructive/10 p-3 text-destructive">{sel.error}</p>}
              {sel.output ? <OutputView value={sel.output} /> : <p className="text-muted-foreground">Working…</p>}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function OutputView({ value, depth = 0 }: { value: unknown; depth?: number }): React.ReactNode {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return value.includes("\n") ? (
      <pre className="overflow-x-auto rounded-lg bg-primary p-3 font-mono text-xs text-primary-foreground">{value}</pre>
    ) : <span>{value}</span>;
  }
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
          <p className={depth === 0 ? "mb-1 font-serif text-lg capitalize" : "text-xs font-semibold uppercase tracking-wide text-muted-foreground"}>{k.replaceAll("_", " ")}</p>
          <OutputView value={v} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}
