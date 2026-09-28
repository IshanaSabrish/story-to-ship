import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { addMemory, deleteMemory, listMemory } from "@/lib/pipeline.functions";
import { Card } from "@/components/agentflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const memoryQuery = queryOptions({ queryKey: ["memory"], queryFn: () => listMemory() });
const KINDS = ["context", "decision", "convention", "policy"] as const;

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Shared Memory — AgentFlow" },
      { name: "description", content: "Past decisions and project context every agent reads before it works." },
      { property: "og:title", content: "Shared Memory — AgentFlow" },
      { property: "og:description", content: "Past decisions and project context every agent reads before it works." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(memoryQuery),
  component: MemoryPage,
  errorComponent: ({ error }) => <p className="p-8 text-destructive">{error.message}</p>,
});

function MemoryPage() {
  const { data } = useSuspenseQuery(memoryQuery);
  const qc = useQueryClient();
  const add = useServerFn(addMemory);
  const del = useServerFn(deleteMemory);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("context");
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const shown = data.filter((m) => filter === "all" || m.kind === filter);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await add({ data: { kind, content: text } });
    setText("");
    qc.invalidateQueries({ queryKey: ["memory"] });
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl">Shared Memory</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every agent reads the latest 15 items before working. Finished runs add their key design decisions here.</p>
      </div>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="h-9 rounded-md border bg-background px-2 text-sm capitalize">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. All APIs return errors as { code, message }" className="flex-1 bg-background" />
          <Button type="submit" disabled={text.trim().length < 3} className="rounded-full">Add</Button>
        </form>
      </Card>
      <div className="flex flex-wrap gap-2">
        {["all", ...KINDS].map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${filter === k ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{k}</button>
        ))}
      </div>
      <ul className="space-y-3">
        {shown.map((m) => (
          <li key={m.id} className="group flex items-start gap-3 rounded-2xl bg-card p-4 shadow-soft">
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold capitalize">{m.kind}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{m.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleDateString()}
                {m.source_run && <> · from <Link to="/runs/$id" params={{ id: m.source_run }} className="underline">a run</Link></>}
              </p>
            </div>
            <button aria-label="Remove" onClick={async () => { await del({ data: { id: m.id } }); qc.invalidateQueries({ queryKey: ["memory"] }); }} className="text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {!shown.length && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
      </ul>
    </main>
  );
}
