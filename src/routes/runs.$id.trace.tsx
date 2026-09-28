import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card } from "@/components/agentflow";
import { arr, collectOutputs, linked } from "@/lib/outputs";
import { runQuery } from "./runs.$id";

export const Route = createFileRoute("/runs/$id/trace")({
  head: () => ({
    meta: [
      { title: "Traceability — AgentFlow" },
      { name: "description", content: "Every requirement linked to its design decision, code, test and deploy step." },
      { property: "og:title", content: "Traceability — AgentFlow" },
      { property: "og:description", content: "Every requirement linked to its design decision, code, test and deploy step." },
    ],
  }),
  component: Trace,
});

function Cell({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((t, i) => (
        <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-xs">{t}</span>
      ))}
    </div>
  );
}

function Trace() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(runQuery(id));
  const o = collectOutputs(data.steps);
  const stories = arr(o.requirement?.stories);

  if (!stories.length) return <Card><p className="text-sm text-muted-foreground">Traceability appears once the Requirement Agent has written stories.</p></Card>;

  const rows = stories.map((s) => ({
    s,
    design: arr(o.design?.decisions).filter((d) => linked(d.story_ids, s.id)).map((d) => `${d.id ?? ""} ${d.decision ?? ""}`.trim()),
    code: arr(o.coding?.files).filter((f) => linked(f.story_ids, s.id)).map((f) => f.path ?? "file"),
    tests: arr(o.testing?.suites).filter((t) => linked(t.story_ids, s.id)).map((t) => t.name ?? t.file ?? "suite"),
    deploy: arr(o.devops?.deploy_steps).filter((d) => linked(d.story_ids, s.id)).map((d) => `${d.id ?? ""} ${d.step ?? ""}`.trim()),
  }));

  return (
    <Card title="Requirement traceability">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              {["Requirement", "Design decision", "Code file", "Test", "Deploy step"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, design, code, tests, deploy }) => (
              <tr key={s.id ?? s.title} className="border-b align-top last:border-0">
                <td className="px-3 py-3"><span className="mr-1 font-mono text-xs text-accent-foreground">{s.id}</span><span className="font-medium">{s.title}</span></td>
                <td className="max-w-xs px-3 py-3"><Cell items={design} /></td>
                <td className="px-3 py-3"><Cell items={code} /></td>
                <td className="px-3 py-3"><Cell items={tests} /></td>
                <td className="max-w-xs px-3 py-3"><Cell items={deploy} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
