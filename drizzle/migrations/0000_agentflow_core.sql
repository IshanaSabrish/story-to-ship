CREATE TABLE public.projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.runs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE, request text NOT NULL, status text NOT NULL DEFAULT 'running', current_agent text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.agent_steps (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE, agent text NOT NULL, input jsonb, output jsonb, status text NOT NULL DEFAULT 'waiting', attempts int NOT NULL DEFAULT 0, tokens int NOT NULL DEFAULT 0, duration_ms int NOT NULL DEFAULT 0, error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.approvals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE, gate int NOT NULL, role text NOT NULL, decision text NOT NULL, comment text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.memory_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE, kind text NOT NULL DEFAULT 'context', content text NOT NULL, source_run uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.activity_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid REFERENCES public.runs(id) ON DELETE CASCADE, agent text, action text NOT NULL, detail jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.projects, public.runs, public.agent_steps, public.approvals, public.memory_items, public.activity_log TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.agent_steps(run_id);
CREATE INDEX ON public.activity_log(run_id, created_at);
INSERT INTO public.projects (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Default project');
INSERT INTO public.memory_items (project_id, kind, content) VALUES
('00000000-0000-0000-0000-000000000001','convention','Stack: TypeScript, React, PostgreSQL. Prefer small, testable functions.'),
('00000000-0000-0000-0000-000000000001','policy','Never include secrets, API keys or credentials in code or prompts.');