# Demo script — Legato × Vercel Connect

Thesis: **use Vercel as the platform to build your platform.** Legato's users
only ever see Legato. Everything underneath is Vercel Connect, driven by the
CLI and REST API — the Vercel dashboard is never opened.

Logged-in user throughout: **Dana @ Legato** (hardcoded; her id is the Connect
token subject for every token request).

Cast:

| Provider | Role in the story | How it got there |
| --- | --- | --- |
| **Notion** | Out-of-the-box OAuth/MCP provider | `vercel connect create notion --connection-method mcp` (Vercel registers the OAuth client) |
| **Massive** (ex-Polygon, market data) | Out-of-the-box API-key provider | one REST call, `type: api-key`, per-user keys |
| **Ledgerline** (mock legacy accounting SaaS we run) | The custom provider Legato adds live | from Legato's own UI, during the demo |

Before the demo:

- On `/connectors`, **Remove** any Ledgerline card under *Custom connectors*
  so you can add it live in Act 2.
- Have a real **Massive API key** to hand (free account at massive.com) for
  Act 1 step 3.
- Act 3's Ledgerline prompts need the Act 2 connection completed in the same
  session — don't skip ahead.
- URLs: app `https://legato-connect-demo.vercel.app`, mock provider
  `https://ledgerline-mock.vercel.app`.

---

## Act 1 — Out of the box (~2 min)

Show the terminal history, don't run live:

```bash
vercel connect create notion --help                                    # what Vercel knows about Notion
vercel connect create notion --connection-method mcp --name legato-notion --yes
#  → Vercel registered the OAuth client for us. No Notion developer app, no secret, no browser.
```

1. Open `/connectors`. Point at: Legato branding only; **Notion** and
   **Massive** under *Available*, both **Not connected**.
   - Say: *"Status isn't stored in Legato — each load asks Connect for a token
     for Dana. Connect is the system of record."*
2. **Notion → Connect** → Vercel interstitial → Notion consent → back to
   Legato's callback → **Active** → *Try it in the agent*.
   - Say: *"Connect ran the OAuth dance server-side and stored the grant keyed
     by Dana's user id. Legato never saw a refresh token."*
3. **Massive → Add API key**. Connect shows a hosted screen with Legato's own
   instructions; Dana pastes her Massive key → back to Legato → **Active**.
   Click **Test** (probe `api.massive.com/v3/reference/tickers?limit=3`) →
   `200`, raw JSON.
   - Say: *"Massive only has API keys. We wrote nothing — Connect's `api-key`
     connector collects each user's key and hands it back through the same
     `getToken` call as Notion. Legato's code can't tell the difference."*

**White-label gap to be ready for:** the hop through
`connect.vercel.com/authorize/…` is a Vercel-styled interstitial — *"Authorize
notion — legato-connect-demo is requesting access… Secured by Vercel
Connect"* — showing the Vercel brand and Legato's Vercel project name before
the provider's screen. Connector branding flags change the icon, not this
page. This is the number one question to take back internally.

---

## Act 2 — Add a custom provider through Connect (~2 min)

Ledgerline stands in for the finance tools Legato's customers actually run.

1. Scroll to **Add custom connector**, tab **By server URL**. Name
   `Ledgerline`, URL `https://ledgerline-mock.vercel.app` are prefilled.
2. Click **Discover**.
   - Point at: *What Connect found* — `oauth`, **automatic registration
     (DCR)**, PKCE S256, refresh tokens, the issuer/authorize/token/register
     endpoints, the four scopes.
   - Say: *"Connect read Ledgerline's standard OAuth metadata. Any vendor that
     publishes a discovery document is this easy."*
3. Click **Create connector**.
   - Point at: the success alert — Connect registered its own OAuth client
     with Ledgerline and attached the connector to this project. A
     **Ledgerline** card appears under *Custom connectors* with its
     `ledgerline-mock.vercel.app/…` UID.
   - Say: *"That was one API call from Legato's backend —
     `POST /v1/connect/connectors/managed`. Same thing the CLI does."* (the
     equivalent CLI line is printed under the button.)
4. **Connect** → interstitial → Ledgerline's consent page (dated green UI,
   Dana Whitfield prefilled, scopes in plain English) → **Approve** → Legato
   callback → **Active**.
5. **Test** (probe `…/api/v1/me` prefilled) → `200`, JSON with
   `user: Dana Whitfield`, `scopes`, a long DCR-issued `client_id`, `token_exp`.
   - Say: *"Ledgerline tokens live 10 minutes on purpose. Test again later —
     Connect refreshes silently; Legato never handled a refresh token."*
6. Failure-mode beat (pick one):
   - **Discover** on `https://example.com` → `404 Service not found.` shown
     verbatim.
   - **Test** before connecting → *"Dana has not connected this provider yet ·
     401 · user_authorization_required"*.
   - Say: *"Errors are surfaced, not swallowed — `stage` tells you whether
     Connect or the provider said no."*
7. (If asked "what if the vendor has no discovery document?") Switch to the
   **Endpoints + client credentials** tab, **Fill Ledgerline (BYO client)**,
   paste the client secret, Create — the same connector via a hand-registered
   client. GitHub preset is there too.

---

## Act 3 — The agent, across everything (~2 min)

1. `/agent`: *"List Ledgerline invoices that are overdue and tell me the
   total."*
   - Point at: streamed steps — tool search, `ledgerline__list_invoices` with
     input/output JSON, the Markdown answer.
   - Say: *"eve agent, `defineMcpClientConnection` + Connect's `connect()`
     helper. The Ledgerline connection isn't hard-coded: at session start the
     agent asks Connect which connectors this project has and binds to the
     one Dana just added."*
2. *"Record a £500 payment on the first one."* → **Approval required** card
   (writes are gated by the server's `readOnlyHint` annotations) → **Approve**.
3. *"Create a Notion page titled 'Ledgerline overdue — summary' with that
   list."* → `notion__…` tool call, page link.
   - Say: *"Two providers, two grants, one user id, zero credentials in
     Legato."*
4. If Dana hadn't connected something, the chat shows an inline
   *"<Provider> needs your authorization"* card instead of a 500.

Note on the UI: shadcn/ui on its default theme (the brief originally said no
component library; changed on request).
