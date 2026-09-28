import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { AGENTS, GATES, ROLES, type RoleKey } from "@/lib/agents";
import { useRole } from "@/lib/role";
import { arr, collectOutputs, type Outputs } from "@/lib/outputs";
import { Card, CodeBlock, StatusChip } from "@/components/agentflow";
import { GatePanel } from "@/components/gate-panel";
import { runQuery } from "./runs.$id";
import type { getRun } from "@/lib/pipeline.functions";

export const Route = createFileRoute("/runs/$id/stakeholder")({
  head: () => ({
    meta: [
      { title: "Stakeholder view — AgentFlow" },
      { name: "description", content: "Each role sees only what matters to them, and approves only their own gate." },
      { property: "og:title", content: "Stakeholder view — AgentFlow" },
      { property: "og:description", content: "Each role sees only what matters to them, and approves only their own gate." },
    ],
  }),
  component: Stakeholder,
});

const Empty = ({ what }: { what: string }) => <p className="text-sm text-muted-foreground">{what} will appear here once the agent has run.</p>;

function Stakeholder() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(runQuery(id));
  const { role, setRole } = useRole();
  const o = collectOutputs(data.steps);
  const pending = data.run.status === "awaiting_approval" ? data.run.pending_gate : null;
  const hasGate = Object.values(GATES).some((g) => g.role === role);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROLES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRole(r.key)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${role === r.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-accent"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div key={role} className="space-y-6 animate-in fade-in slide-in-from-bottom-1">
          <RoleBody role={role} o={o} data={data} />
        </div>
        <aside>
          {hasGate ? (
            <GatePanel runId={id} pendingGate={pending} approvals={data.approvals} />
          ) : (
            <Card><p className="text-sm text-muted-foreground">This role has no approval gate. Gates belong to the Product Owner, Developer and SRE.</p></Card>
          )}
        </aside>
      </div>
    </div>
  );
}

type Data = Awaited<ReturnType<typeof getRun>>;

function RoleBody({ role, o, data }: { role: RoleKey; o: Outputs; data: Data }) {
  const stories = arr(o.requirement?.stories);
  switch (role) {
    case "po":
      return (
        <Card title="User stories">
          {o.requirement?.summary && <p className="mb-4 text-sm text-muted-foreground">{o.requirement.summary}</p>}
          {stories.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {stories.map((s) => (
                <div key={s.id ?? s.title} className="rounded-xl border bg-background p-4">
                  <p className="font-mono text-xs text-muted-foreground">{s.id}</p>
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm">As a {s.as_a}, I want {s.i_want}, so that {s.so_that}.</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {arr(s.acceptance_criteria).map((c, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />{c}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          ) : <Empty what="Stories" />}
        </Card>
      );
    case "pm": {
      const cols = { Waiting: [] as string[], "In progress": [] as string[], Done: [] as string[] };
      for (const a of AGENTS) {
        const s = [...data.steps].reverse().find((x) => x.agent === a.key && x.status !== "revised");
        (s?.status === "done" ? cols.Done : s?.status === "running" ? cols["In progress"] : cols.Waiting).push(a.name);
      }
      const blockers = [
        ...(data.run.status === "awaiting_approval" && data.run.pending_gate ? [`Waiting on ${GATES[data.run.pending_gate]!.roleLabel}: ${GATES[data.run.pending_gate]!.title}`] : []),
        ...data.steps.filter((s) => s.status === "failed").map((s) => `${s.agent} agent failed: ${s.error}`),
        ...arr(o.review?.issues).filter((i) => i.severity === "high").map((i) => `High-severity review issue: ${i.message}`),
        ...(data.run.status === "rejected" ? ["Run was rejected at a gate"] : []),
      ];
      const tokens = data.steps.reduce((n, s) => n + s.tokens, 0);
      return (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Status", <StatusChip key="s" status={data.run.status} />], ["Stories", stories.length], ["Tokens used", tokens.toLocaleString()]].map(([k, v]) => (
              <Card key={String(k)}><p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p><div className="mt-1 font-serif text-2xl">{v}</div></Card>
            ))}
          </div>
          <Card title="Task board">
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(cols).map(([col, items]) => (
                <div key={col} className="rounded-xl bg-background p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col} · {items.length}</p>
                  <div className="space-y-2">{items.map((t) => <div key={t} className="rounded-lg bg-card p-2 text-sm shadow-soft">{t}</div>)}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Blockers">
            {blockers.length ? (
              <ul className="space-y-2 text-sm">{blockers.map((b, i) => <li key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{b}</li>)}</ul>
            ) : <p className="text-sm text-muted-foreground">No blockers right now.</p>}
          </Card>
        </>
      );
    }
    case "dev":
      return (
        <>
          <Card title="Code changes">
            {arr(o.coding?.files).length ? (
              <div className="space-y-4">
                {arr(o.coding?.files).map((f, i) => (
                  <div key={i}>
                    <p className="mb-1 flex items-center gap-2 font-mono text-xs"><span className="rounded bg-accent/20 px-1.5 text-accent-foreground">+ added</span>{f.path}</p>
                    <CodeBlock>{f.content ?? ""}</CodeBlock>
                  </div>
                ))}
              </div>
            ) : <Empty what="Code" />}
          </Card>
          <Card title="Review findings">
            {o.review ? (
              <>
                <p className="mb-3 text-sm">Verdict: <b>{o.review.verdict?.replace("_", " ")}</b>{o.review.score != null && <> · Score {o.review.score}</>}</p>
                <ul className="space-y-2 text-sm">
                  {arr(o.review.issues).map((i, k) => (
                    <li key={k} className="flex gap-2 rounded-lg border bg-background p-2">
                      <span className={`h-fit rounded-full px-2 text-xs font-semibold ${i.severity === "high" ? "bg-destructive/15 text-destructive" : i.severity === "medium" ? "bg-warning/30" : "bg-muted"}`}>{i.severity}</span>
                      <span><span className="font-mono text-xs text-muted-foreground">{i.file}</span> {i.message}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : <Empty what="Review" />}
          </Card>
        </>
      );
    case "qa":
      return (
        <>
          <Card title="Test suites">
            {arr(o.testing?.suites).length ? arr(o.testing?.suites).map((s, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <p className="mb-1 text-sm font-semibold">{s.name} <span className="font-mono text-xs text-muted-foreground">{s.file}</span></p>
                <CodeBlock>{s.content ?? ""}</CodeBlock>
              </div>
            )) : <Empty what="Tests" />}
          </Card>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card title="Edge cases">
              <ul className="space-y-1 text-sm">{arr(o.testing?.edge_cases).map((e, i) => <li key={i} className="flex gap-2"><Circle className="mt-1 h-2.5 w-2.5 shrink-0 text-accent" />{e}</li>)}</ul>
            </Card>
            <Card title="Requirement coverage">
              <ul className="space-y-1 text-sm">{arr(o.review?.coverage).map((c, i) => <li key={i} className="flex gap-2">{c.covered ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}<span><b>{c.story_id}</b> {c.note}</span></li>)}</ul>
            </Card>
          </div>
        </>
      );
    case "sre":
      return o.devops ? (
        <>
          <Card title="Deployment plan">
            <ol className="space-y-2 text-sm">{arr(o.devops.deploy_steps).map((d, i) => <li key={i} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>{d.step}</li>)}</ol>
          </Card>
          <Card title="CI configuration">{o.devops.ci_config ? <CodeBlock>{o.devops.ci_config}</CodeBlock> : null}</Card>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card title="Rollback"><ul className="list-disc space-y-1 pl-5 text-sm">{arr(o.devops.rollback).map((r, i) => <li key={i}>{r}</li>)}</ul></Card>
            <Card title="Monitoring"><ul className="list-disc space-y-1 pl-5 text-sm">{arr(o.devops.monitoring).map((r, i) => <li key={i}>{r}</li>)}</ul></Card>
          </div>
        </>
      ) : (
        <Card title="Release readiness">
          <p className="text-sm text-muted-foreground">The DevOps Agent runs only after the Developer and SRE approve. {o.review ? `Review verdict: ${o.review.verdict ?? "—"}.` : ""}</p>
        </Card>
      );
    case "user":
      return (
        <Card title="What's coming">
          <p className="mb-4 text-sm text-muted-foreground">{data.run.status === "completed" ? "This feature is ready to ship." : "This feature is being built."}</p>
          {stories.length ? (
            <ul className="space-y-3">
              {stories.map((s) => <li key={s.id ?? s.title} className="rounded-xl bg-background p-4 text-sm"><p className="font-semibold">{s.title}</p><p className="text-muted-foreground">You'll be able to {s.i_want}.</p></li>)}
            </ul>
          ) : <Empty what="Features" />}
        </Card>
      );
  }
}
