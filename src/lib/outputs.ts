/* Loose accessors for agent JSON outputs (model output is untrusted, so everything is optional). */
type Step = { agent: string; status: string; output: unknown };

export type Story = { id?: string; title?: string; as_a?: string; i_want?: string; so_that?: string; acceptance_criteria?: string[] };
export type Outputs = {
  requirement?: { summary?: string; stories?: Story[] };
  design?: { architecture?: string; components?: { name?: string; responsibility?: string }[]; data_model?: { entity?: string; fields?: string[] }[]; api?: { method?: string; path?: string; description?: string; story_ids?: string[] }[]; decisions?: { id?: string; decision?: string; story_ids?: string[] }[] };
  coding?: { files?: { path?: string; language?: string; story_ids?: string[]; content?: string }[]; notes?: string };
  testing?: { suites?: { name?: string; file?: string; story_ids?: string[]; content?: string }[]; edge_cases?: string[] };
  review?: { verdict?: string; score?: number; issues?: { severity?: string; file?: string; message?: string }[]; coverage?: { story_id?: string; covered?: boolean; note?: string }[] };
  devops?: { deploy_steps?: { id?: string; step?: string; story_ids?: string[] }[]; ci_config?: string; rollback?: string[]; monitoring?: string[] };
};

export function collectOutputs(steps: Step[]): Outputs {
  const out: Record<string, unknown> = {};
  for (const s of steps) if (s.status === "done" && s.output) out[s.agent] = s.output;
  return out as Outputs;
}

export const arr = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);
export const linked = (ids: string[] | undefined, id?: string) => !!id && arr(ids).includes(id);
