<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Agents + orchestrator live in `src/lib/pipeline.server.ts`, called via server functions (not edge functions); the client drives one agent per call to avoid request timeouts.
- v1 has no auth: tables are RLS-locked and only reached server-side via the admin client.
- Render the six-stage SDLC journey through the shared ProcessMap component so dashboard and run views communicate the same workflow.
