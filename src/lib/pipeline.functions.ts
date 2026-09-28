import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PROJECT_ID = "00000000-0000-0000-0000-000000000001";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listRuns = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db.from("runs").select("id, request, status, current_agent, created_at").order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return data;
});

export const createRun = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ request: z.string().trim().min(10).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { redact, log } = await import("./pipeline.server");
    const { data: run, error } = await db.from("runs").insert({ project_id: PROJECT_ID, request: redact(data.request) }).select("id").single();
    if (error) throw new Error(error.message);
    await log(run.id, null, "run_created");
    return run;
  });

export const getRun = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const [run, steps, logs, approvals] = await Promise.all([
      db.from("runs").select("*").eq("id", data.id).maybeSingle(),
      db.from("agent_steps").select("*").eq("run_id", data.id).order("created_at"),
      db.from("activity_log").select("*").eq("run_id", data.id).order("created_at", { ascending: false }).limit(100),
      db.from("approvals").select("*").eq("run_id", data.id).order("created_at"),
    ]);
    if (!run.data) throw new Error("Run not found");
    return { run: run.data, steps: steps.data ?? [], logs: logs.data ?? [], approvals: approvals.data ?? [] };
  });

export const advanceRun = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { runNext } = await import("./pipeline.server");
    return runNext(data.id);
  });

export const retryRun = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { log } = await import("./pipeline.server");
    await db.from("agent_steps").delete().eq("run_id", data.id).eq("status", "failed");
    await db.from("runs").update({ status: "running" }).eq("id", data.id);
    await log(data.id, null, "human_resumed_run");
    return { ok: true };
  });

export const decideGate = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), gate: z.number().int().min(1).max(3), decision: z.enum(["approve", "changes", "reject"]), comment: z.string().max(1000).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.decision === "changes" && !data.comment?.trim()) throw new Error("Please describe the changes");
    const { decide } = await import("./pipeline.server");
    await decide(data.id, data.gate, data.decision, data.comment?.trim());
    return { ok: true };
  });

export const listMemory = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db.from("memory_items").select("*").eq("project_id", PROJECT_ID).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
});

export const addMemory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ kind: z.enum(["context", "decision", "convention", "policy"]), content: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { redact } = await import("./pipeline.server");
    await db.from("memory_items").insert({ project_id: PROJECT_ID, kind: data.kind, content: redact(data.content) });
    return { ok: true };
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    await db.from("memory_items").delete().eq("id", data.id);
    return { ok: true };
  });
