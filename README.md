# AgentFlow Pipeline

Build a lean first version of AgentFlow, starting with the multi-agent pipeline and adding the dashboard and human approval gates afterward.

Build a web app called "AgentFlow" — a multi-agent system that runs a software project through the SDLC. A user submits a plain-English feature request, and a crew of AI agents works on it step by step, with humans approving at key gates.

THE STORY THE APP TELLS
One request enters. Six specialised agents pass it along like a relay team. A human approves at three gates. Nothing ships without a person saying yes.

THE SIX AGENTS (each is a Supabase edge function calling Lovable AI)
1. Requirement Agent – turns the request into user stories with acceptance criteria
2. Design Agent – proposes architecture, data model and API contract
3. Coding Agent – writes the implementation code for the story
4. Testing Agent – writes unit tests and lists edge cases
5. Review Agent – audits the code for quality, security issues and requirement coverage
6. DevOps Agent – produces a deployment plan, CI config and rollback steps
Each agent receives the output of the previous agents plus the shared memory, and returns structured JSON that I can render.

THE ORCHESTRATOR
A central orchestrator function decides which agent runs next, passes shared context, retries a failed step once, caps each agent at a step budget, and escalates to a human if something fails twice.

HUMAN APPROVAL GATES (three)
- Gate 1 after Requirement Agent: "Product Owner approves the stories"
- Gate 2 after Review Agent: "Developer approves the code"
- Gate 3 before DevOps Agent: "SRE approves the release"
At each gate the pipeline pauses with Approve, Request changes (with a comment box), and Reject buttons. If changes are requested, the same agent re-runs with the comment included.

PAGES
1. Dashboard – "New request" box, plus a list of past runs with status chips.
2. Run view (main screen) – a horizontal pipeline of six agent cards with status (waiting, running, done, needs approval, failed). Click a card to see that agent's full output in a side panel. Show a live activity log below.
3. Stakeholder view – a switcher with six roles: Client/Product Owner, Project Manager, Developer, QA Engineer, DevOps/SRE, End User. Each role sees only what matters to them (e.g. PM sees the task board and blockers, QA sees test suites, Developer sees code and PR diff) and only gets the approve buttons for their own gate.
4. Traceability – a table linking each requirement to the design decision, code file, test and deploy step that came from it.
5. Shared Memory – a page listing past decisions and project context that agents read from.

DATA (Supabase)
Tables: projects, runs, agent_steps (agent, input, output, status, tokens, duration), approvals (gate, role, decision, comment), memory_items, activity_log. Store every agent action in activity_log so any decision can be traced and reversed.

GUARDRAILS TO SHOW IN THE UI
A small "Safety" panel showing: step budget per agent, human sign-off required before release, no secrets ever sent to agents, full audit log.

DESIGN
Clean, modern, calm. Deep indigo (#191B2E) as the dominant colour, mint (#00C2A8) as the accent, light grey-blue (#F4F5F9) backgrounds, white rounded cards with soft shadows. Serif headings, sans-serif body. Each agent is a circle with its initials (RA, DA, CA, TA, RV, DO). Smooth transitions when an agent finishes and passes work to the next. Fully responsive.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://story-to-ship.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0f11643d-c897-41d8-b303-18746c2c08f4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
