import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { createRun, listRuns } from "@/lib/pipeline.functions";
import { StatusChip } from "@/components/agentflow";
import { ProcessMap } from "@/components/process-map";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const runsQuery = queryOptions({ queryKey: ["runs"], queryFn: () => listRuns() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgentFlow — Dashboard" },
      { name: "description", content: "Submit a feature request and watch six AI agents carry it through the SDLC." },
      { property: "og:title", content: "AgentFlow — Dashboard" },
      { property: "og:description", content: "Submit a feature request and watch six AI agents carry it through the SDLC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(runsQuery),
  component: Dashboard,
  errorComponent: ({ error }) => <p className="p-8 text-destructive">{error.message}</p>,
});

function Dashboard() {
  const { data: runs } = useSuspenseQuery(runsQuery);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const create = useServerFn(createRun);
  const navigate = useNavigate();

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const run = await create({ data: { request: text } });
      navigate({ to: "/runs/$id", params: { id: run.id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="relative overflow-hidden rounded-lg border bg-card p-5 shadow-soft sm:p-7">
        <div className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse" />System operational</div>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Software delivery, orchestrated</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">One request moves through six specialist agents and three human checkpoints before release.</p>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-accent" /> Lightweight sequential processing
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-[11px] font-bold uppercase text-muted-foreground">SDLC relay map</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Stories → architecture → code → tests → review → release</p>
          </div>
          <ProcessMap />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-mono text-[10px] font-bold uppercase text-accent">Start a run</p><h2 className="mt-1 text-xl font-semibold">New request</h2></div>
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">6 AGENTS · 3 GATES</span>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the feature, goal, and any constraints…"
              className="mt-5 min-h-32 resize-none bg-background font-mono text-sm"
            />
            {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Agents run one at a time to control cost.</p>
              <Button onClick={submit} disabled={busy || text.trim().length < 10}>
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Starting</> : <>Execute run <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Safety guardrails</h2><span className="flex items-center gap-1 font-mono text-[10px] text-accent"><ShieldCheck className="h-3.5 w-3.5" />ACTIVE</span></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {["6,000 token step budget", "One retry per agent", "Human release sign-off", "Secrets always redacted"].map((item, i) => (
                <div key={item} className="flex items-center gap-2 rounded-md border bg-background p-3 text-xs"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" /><span>{item}</span>{i > 1 && <LockKeyhole className="ml-auto h-3 w-3 text-muted-foreground" />}</div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-lg border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex items-end justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase text-muted-foreground">Execution history</p><h2 className="mt-1 text-xl font-semibold">Recent runs</h2></div><span className="font-mono text-xs text-muted-foreground">{runs.length} TOTAL</span></div>
          {runs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No runs yet. Your first request will appear here.</p>
          ) : (
            <ul className="mt-5 space-y-2">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link to="/runs/$id" params={{ id: r.id }} className="group flex items-center justify-between gap-4 rounded-md border bg-background p-4 transition-colors hover:border-accent/60">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${r.status === "running" ? "bg-accent motion-safe:animate-pulse" : r.status === "completed" ? "bg-accent" : "bg-warning"}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium group-hover:text-accent">{r.request}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <StatusChip status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
