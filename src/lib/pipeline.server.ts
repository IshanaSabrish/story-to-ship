import { AGENTS, MAX_ATTEMPTS, STEP_BUDGET_TOKENS, type AgentKey } from "./agents";

const PROMPTS: Record<AgentKey, string> = {
  requirement: `You are the Requirement Agent. Turn the feature request into user stories.
Return JSON: {"summary": string, "stories": [{"id": "US-1", "title": string, "as_a": string, "i_want": string, "so_that": string, "acceptance_criteria": string[]}]}`,
  design: `You are the Design Agent. Propose architecture, data model and API contract for the stories.
Return JSON: {"architecture": string, "components": [{"name": string, "responsibility": string}], "data_model": [{"entity": string, "fields": string[]}], "api": [{"method": string, "path": string, "description": string, "story_ids": string[]}], "decisions": [{"id": "D-1", "decision": string, "story_ids": string[]}]}`,
  coding: `You are the Coding Agent. Write concise TypeScript implementation code for the stories following the design.
Return JSON: {"files": [{"path": string, "language": string, "story_ids": string[], "content": string}], "notes": string}`,
  testing: `You are the Testing Agent. Write unit tests for the code and list edge cases.
Return JSON: {"suites": [{"name": string, "file": string, "story_ids": string[], "content": string}], "edge_cases": string[]}`,
  review: `You are the Review Agent. Audit the code for quality, security issues and requirement coverage.
Return JSON: {"verdict": "approve" | "changes_needed", "score": number, "issues": [{"severity": "low"|"medium"|"high", "file": string, "message": string}], "coverage": [{"story_id": string, "covered": boolean, "note": string}]}`,
  devops: `You are the DevOps Agent. Produce a deployment plan, CI config and rollback steps.
Return JSON: {"deploy_steps": [{"id": "DP-1", "step": string, "story_ids": string[]}], "ci_config": string, "rollback": string[], "monitoring": string[]}`,
};

const SECRET_RE = /(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----)/g;
export const redact = (s: string) => s.replace(SECRET_RE, "[REDACTED]");

async function callAgent(agent: AgentKey, context: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI key missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      max_tokens: STEP_BUDGET_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPTS[agent] + "\nRespond with valid JSON only. Keep it focused and compact." },
        { role: "user", content: context },
      ],
    }),
  });
  if (res.status === 429) throw new Error("Rate limited, try again shortly");
  if (res.status === 402) throw new Error("AI credits exhausted");
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? "";
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
  return { output: JSON.parse(cleaned), tokens: json.usage?.total_tokens ?? 0 };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function log(runId: string, agent: string | null, action: string, detail?: unknown) {
  const db = await admin();
  await db.from("activity_log").insert({ run_id: runId, agent, action, detail: (detail ?? null) as never });
}

/** Orchestrator: decides the next agent, runs it with one retry, escalates on second failure. */
export async function runNext(runId: string) {
  const db = await admin();
  const { data: run } = await db.from("runs").select("*").eq("id", runId).single();
  if (!run) throw new Error("Run not found");
  if (run.status !== "running") return { status: run.status };

  const { data: steps } = await db.from("agent_steps").select("*").eq("run_id", runId).order("created_at");
  const done = (steps ?? []).filter((s) => s.status === "done");
  const next = AGENTS.find((a) => !done.some((s) => s.agent === a.key));
  if (!next) {
    await db.from("runs").update({ status: "completed", current_agent: null, updated_at: new Date().toISOString() }).eq("id", runId);
    await log(runId, null, "run_completed");
    return { status: "completed" };
  }

  const { data: memory } = await db.from("memory_items").select("kind, content").eq("project_id", run.project_id!);
  const prior = Object.fromEntries(done.map((s) => [s.agent, s.output]));
  const context = redact(
    `FEATURE REQUEST:\n${run.request}\n\nSHARED MEMORY:\n${(memory ?? []).map((m) => `- [${m.kind}] ${m.content}`).join("\n")}\n\nPREVIOUS AGENT OUTPUTS:\n${JSON.stringify(prior)}`,
  );

  await db.from("runs").update({ current_agent: next.key, updated_at: new Date().toISOString() }).eq("id", runId);
  const { data: step } = await db
    .from("agent_steps")
    .insert({ run_id: runId, agent: next.key, status: "running", input: { request: run.request, prior_agents: Object.keys(prior) } })
    .select()
    .single();
  await log(runId, next.key, "agent_started", { budget_tokens: STEP_BUDGET_TOKENS });

  let lastErr = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const t0 = Date.now();
    try {
      const { output, tokens } = await callAgent(next.key, context);
      await db.from("agent_steps").update({ status: "done", output, tokens, attempts: attempt, duration_ms: Date.now() - t0, updated_at: new Date().toISOString() }).eq("id", step!.id);
      await log(runId, next.key, "agent_completed", { tokens, duration_ms: Date.now() - t0, attempt });
      return { status: "running", finished: next.key };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      await log(runId, next.key, attempt < MAX_ATTEMPTS ? "agent_retry" : "agent_failed", { attempt, error: lastErr });
    }
  }
  await db.from("agent_steps").update({ status: "failed", error: lastErr, attempts: MAX_ATTEMPTS, updated_at: new Date().toISOString() }).eq("id", step!.id);
  await db.from("runs").update({ status: "escalated", updated_at: new Date().toISOString() }).eq("id", runId);
  await log(runId, null, "escalated_to_human", { agent: next.key, error: lastErr });
  return { status: "escalated" };
}
