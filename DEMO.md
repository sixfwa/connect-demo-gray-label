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
   - **White-label gap (be ready for the question):** the hop through
     `connect.vercel.com/authorize/…` is not a silent redirect. It renders a
     Vercel-styled interstitial: *"Authorize ledgerline — legato-connect-demo
     is requesting access to ledgerline · Service · Environment: production ·
     Cancel / Continue · Secured by Vercel Connect"*. The end user sees the
     Vercel *project name* and the Vercel brand before the provider's consent
     screen. Connector branding (`vercel connect update --icon/--colors`)
     changes the icon, not the hostname or the footer. Whether this page can
     be skipped, white-labelled or custom-domained is the single most
     important question to take back internally for Legato.
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

The third party is **Ledgerline** — a mock legacy accounting SaaS we run
ourselves at https://ledgerline-mock.vercel.app (OAuth 2.1 server with
discovery + dynamic client registration, OAuth-protected MCP server, REST API,
and a static-API-key "legacy" endpoint). It stands in for the finance tools
Legato's customers actually use. GitHub remains an optional real-world
alternative (see SETUP.md).

Two ways to register a provider Vercel doesn't know about — show both:

**2a. By URL (zero configuration).** Already done; show the terminal history:

```bash
vercel connect create https://ledgerline-mock.vercel.app --name ledgerline --yes
#  → Connect fetched /.well-known/oauth-authorization-server, saw a
#    registration_endpoint, and registered its own OAuth client (DCR).
#    No app registration, no secrets, no browser. UID: ledgerline-mock.vercel.app/ledgerline
```

1. On `/connectors`, point at the **Ledgerline** card (seeded, **Not
   connected**).
   - Say: *"Any provider that publishes standard OAuth metadata is one command
     — Connect discovers the endpoints and registers the client itself. For
     a vendor that doesn't, there's the form below."*
2. Click **Connect** → Vercel interstitial → Ledgerline consent (dated green
   UI, Dana Whitfield prefilled, scopes in plain English) → **Approve** →
   Legato callback → **Active**.
3. On the card, the probe URL is prefilled with `…/api/v1/me`. Click **Test**.
   - Point at: `200 OK`, JSON with `user: Dana Whitfield`, `scopes`,
     `client_id` (a long DCR-issued id), `token_exp`; token preview + expiry.
   - Say: *"Ledgerline tokens live 10 minutes on purpose. Click Test again in
     ten minutes — Connect refreshes silently; Legato never handled a refresh
     token."*

**2b. By hand (bring your own client).** Scroll to **Add custom connector**.

4. Click **Fill Ledgerline endpoints** (fills name, both endpoints, scopes,
   and Ledgerline's pre-registered client ID), paste the client secret,
   **Create connector**.
   - Point at: success alert with the new UID and the callback URL
     `https://connect.vercel.com/callback`; a second Ledgerline card appears
     under **Custom connectors**.
   - Say: *"Same outcome from Legato's own UI: `POST /v1/connect/connectors`
     with `type: oauth`, explicit endpoints, your client credentials, and
     `projectId` — created and attached in a single request. This is the path
     for a vendor with no discovery document."*
5. **Connect** → **Test** on the new card: same `200`, but `client_id` is now
   `ledgerline-connect-demo` — proof it went through the BYO client.
6. Failure-mode beat (pick one):
   - **Test** on a card Dana hasn't connected → *"Dana has not connected this
     provider yet · 401 · user_authorization_required"*.
   - Change the probe URL to `…/api/v1/invoices?status=overdue` with a
     connector created with only `vendors:read` → **403 insufficient_scope**,
     Ledgerline's error body verbatim.
   - Say: *"Errors are surfaced, not swallowed — `stage` tells you whether
     Connect or the provider said no."*
7. (Optional) Switch to `/agent`: *"List Ledgerline invoices that are overdue
   and tell me the total."* — streamed MCP tool calls against Ledgerline. Then
   *"Record a £500 payment on the first one"* → an **Approval required** card
   appears (writes are gated), click Approve.
8. (Optional) **Remove** the BYO connector to show the lifecycle is
   API-complete.

Note on the design change: the UI is shadcn/ui on its default theme (the
brief originally said no component library; this was changed on request).

## Act 3 — Legacy API key (~2 min)

_To be written after Act 3 is built._ Plan: Connect's native `api-key`
connector type pointed at Ledgerline's `/legacy/*` endpoints (static
`LEGACY_API_KEY`). The standalone `oauth-shim/` from the original brief is
superseded — Ledgerline's own OAuth server already demonstrates "OAuth in
front of a legacy system", and the native path is simpler.
