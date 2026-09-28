import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { createRun, listRuns } from "@/lib/pipeline.functions";
import { SafetyPanel, StatusChip } from "@/components/agentflow";
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
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="rounded-2xl bg-card p-6 shadow-soft">
          <h1 className="text-3xl">New request</h1>
          <p className="mt-1 text-sm text-muted-foreground">Describe a feature in plain English. Six agents will take it from stories to a release plan.</p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Let users reset their password via an emailed link that expires after 30 minutes."
            className="mt-4 min-h-28 bg-background"
          />
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          <div className="mt-4 flex justify-end">
            <Button onClick={submit} disabled={busy || text.trim().length < 10} className="rounded-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start pipeline <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl bg-card p-6 shadow-soft">
          <h2 className="text-2xl">Past runs</h2>
          {runs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No runs yet. Your first request will appear here.</p>
          ) : (
            <ul className="mt-4 divide-y">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link to="/runs/$id" params={{ id: r.id }} className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-accent">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.request}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <StatusChip status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <aside><SafetyPanel /></aside>
    </main>
  );
}
