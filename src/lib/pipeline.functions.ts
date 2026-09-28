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
    const [run, steps, logs] = await Promise.all([
      db.from("runs").select("*").eq("id", data.id).maybeSingle(),
      db.from("agent_steps").select("*").eq("run_id", data.id).order("created_at"),
      db.from("activity_log").select("*").eq("run_id", data.id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (!run.data) throw new Error("Run not found");
    return { run: run.data, steps: steps.data ?? [], logs: logs.data ?? [] };
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
