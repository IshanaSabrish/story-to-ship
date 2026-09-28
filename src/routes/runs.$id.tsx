import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { advanceRun, getRun, retryRun } from "@/lib/pipeline.functions";
import { StatusChip } from "@/components/agentflow";
import { Button } from "@/components/ui/button";

export const runQuery = (id: string) => queryOptions({ queryKey: ["run", id], queryFn: () => getRun({ data: { id } }) });

export const Route = createFileRoute("/runs/$id")({
  head: () => ({
    meta: [
      { title: "Pipeline run — AgentFlow" },
      { name: "description", content: "Six AI agents carrying a feature request through the SDLC, with human sign-off." },
      { property: "og:title", content: "Pipeline run — AgentFlow" },
      { property: "og:description", content: "Six AI agents carrying a feature request through the SDLC, with human sign-off." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(runQuery(params.id)),
  component: RunLayout,
  errorComponent: ({ error }) => <p className="p-8 text-destructive">{error.message}</p>,
  notFoundComponent: () => <p className="p-8">Run not found.</p>,
});

const tabs = [
  { to: "/runs/$id", label: "Pipeline", exact: true },
  { to: "/runs/$id/stakeholder", label: "Stakeholder view", exact: false },
  { to: "/runs/$id/trace", label: "Traceability", exact: false },
] as const;

function RunLayout() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(runQuery(id));
  const advance = useServerFn(advanceRun);
  const retry = useServerFn(retryRun);
  const driving = useRef(false);
  const status = data.run.status;

  // Drive the orchestrator one agent per call while the run is active; poll lightly for log updates.
  useEffect(() => {
    if (status !== "running" || driving.current) return;
    driving.current = true;
    let cancelled = false;
    const poll = setInterval(() => qc.invalidateQueries({ queryKey: ["run", id] }), 3000);
    (async () => {
      try {
        while (!cancelled) {
          const r = await advance({ data: { id } });
          await qc.invalidateQueries({ queryKey: ["run", id] });
          if (r.status !== "running") break;
        }
      } catch {
        /* surfaced via run status on next fetch */
      } finally {
        clearInterval(poll);
        driving.current = false;
        qc.invalidateQueries({ queryKey: ["runs"] });
      }
    })();
    return () => { cancelled = true; };
  }, [status, id, advance, qc]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="max-w-3xl text-2xl sm:text-3xl">{data.run.request}</h1>
          <div className="flex items-center gap-2">
            <StatusChip status={status} />
            {status === "escalated" && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={async () => { await retry({ data: { id } }); qc.invalidateQueries({ queryKey: ["run", id] }); }}>
                <RotateCcw className="h-3.5 w-3.5" /> Resume
              </Button>
            )}
          </div>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto rounded-full bg-card p-1 shadow-soft sm:inline-flex">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              params={{ id }}
              activeOptions={{ exact: t.exact }}
              className="whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-primary !text-primary-foreground" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <Outlet />
    </main>
  );
}
