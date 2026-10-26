# Demo script — Legato × Vercel Connect

Thesis: **use Vercel as the platform to build your platform.** Legato's users
only ever see Legato. Everything underneath is Vercel Connect, driven by the
CLI and REST API — the Vercel dashboard is never opened.

Logged-in user throughout: **Dana @ Legato** (hardcoded; her id is the Connect
token subject).

---

## Act 1 — Out-of-the-box MCP connector + agent (~2 min)

**Setup already done (show the terminal history, don't run live):**

```bash
vercel connect create notion --help                                   # what Vercel knows about Notion
vercel connect create notion --connection-method mcp --name legato-notion --yes
vercel connect attach notion/legato-notion --yes
```

Say: *"Two commands. No Notion developer app, no client secret, no dashboard.
Vercel registered the OAuth client for us ('automatic registration'). The
connector is a team-level object; `attach` is what lets this project mint
tokens from it."*

1. Open `/connectors`.
   - Point at: Legato branding only. Notion shows **Not connected**. Linear
     shows **Not attached** with the raw Connect error
     (`not_found: Connector not found: linear/legato-linear`).
   - Say: *"The status isn't stored in Legato — the page asks Connect for a
     token for Dana on each load. Connect is the system of record. The Linear
     card is what a misconfigured connector looks like: the error is shown,
     not swallowed."*
2. Click **Connect** on Notion.
   - Point at: the hop to `connect.vercel.com/authorize/…`, then Notion's own
     consent screen, then back to **Legato's** `/connectors/callback`.
   - Say: *"Connect ran the OAuth dance server-side and stored the grant keyed
     by Dana's user id. Legato never saw a refresh token."*
   - Honest note if asked: the intermediate authorize URL is on
     `connect.vercel.com`. For strict white-labelling that hostname is the
     one place Vercel's name is visible to the end user; whether a custom
     domain is possible there is a question to take back internally.
3. Callback page shows **Active**; click **Try it in the agent →**.
4. On `/agent`, click the first suggestion (*create a Notion page titled
   "Acme deal summary"…*) and press **Run**.
   - Point at: streamed steps — the tool search, the `notion__…` tool call
     with its input/output JSON, then the final message with the page link.
   - Say: *"This is an eve agent with `defineMcpClientConnection` + Vercel
     Connect's `connect()` helper. Before every tool call it asks Connect for
     a token for Dana. If Dana hadn't connected Notion, you'd see an
     authorization card right here in the chat instead of a 500."*
5. (Optional) Go back to `/connectors` → Notion → **Reconnect** to show the
   grant can be re-established at any time; or demonstrate the un-connected
   path by opening `/agent` in a fresh deployment before step 2.

What to say about the architecture (one breath): Next.js app + eve agent in
one Vercel project (`withEve`), `@vercel/connect` SDK authenticated with the
deployment's OIDC token — no Vercel API token in the Act 1 runtime at all.

---

## Act 2 — Bring-your-own API connector (~2 min)

_To be written after Act 2 is built._

## Act 3 — Legacy API-key shim (~2 min)

_To be written after Act 3 is built._
