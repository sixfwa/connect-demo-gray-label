# Setup — legato-connect-demo

Everything is done with the Vercel CLI or REST API. The Vercel dashboard is
never required.

## Prerequisites

| Requirement | Why |
| --- | --- |
| Node.js 24+ | eve requires it |
| pnpm | package manager |
| Vercel CLI **≥ 65** (`pnpm add -g vercel@latest`) | `vercel connect discover`, `--connection-method`, `--yes` do not exist in older CLIs (54.x was missing all of them) |
| A Vercel team | this demo runs on `rthm-unbundled-vtest314` (the Ledgerline mock stays on `rthm-vtest314`; it is public, so the team does not matter) |

## Environment variables

See `.env.example`. Nothing secret is committed.

| Var | Used by | Source |
| --- | --- | --- |
| `VERCEL_OIDC_TOKEN` | `@vercel/connect`, eve (local dev only) | `vercel env pull` |
| `CONNECT_NOTION_UID` | app + agent | output of `vercel connect create notion …` (default `notion/legato-notion`) |
| `VERCEL_TOKEN` | Act 2 `POST /api/connectors` | Vercel account token |
| `VERCEL_TEAM_ID` | Act 2 | `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | Act 2 | `.vercel/project.json` → `projectId` |

## Commands, in order

```bash
# 0. Tooling
pnpm add -g vercel@latest
vercel --version          # must be >= 65

# 1. Project
cd legato-connect-demo
pnpm install
vercel link --scope rthm-unbundled-vtest314 --project legato-connect-demo --yes
#   → creates the project if missing, writes .vercel/project.json and .env.local (VERCEL_OIDC_TOKEN)

# 2. Act 1 — out-of-the-box MCP connectors
#    See what Notion supports (products, connection methods, required credentials):
vercel connect create notion --help
#    Create the Notion MCP connector. "mcp" is an automatic-registration method:
#    no Notion developer app, no client secret. No browser step was needed.
vercel connect create notion --connection-method mcp --name legato-notion --yes
#   → Success! notion connector created via MCP: scl_… (UID notion/legato-notion)
#    Attach it to this project (production, preview, development).
#    (When run from a linked directory, create already attached it — attach is idempotent.)
vercel connect attach notion/legato-notion --yes
#    Verify:
vercel connect list


# 2b. Ledgerline — the mock third-party used in Acts 2 and 3 (separate project: ../ledgerline-mock,
#     deployed at https://ledgerline-mock.vercel.app). Register it by URL: Connect reads the
#     discovery document and performs dynamic client registration. No browser, no secrets.
vercel connect create https://ledgerline-mock.vercel.app --name ledgerline --yes
#   → scl_r0FFQRc2kfofdVEhHYOA, UID ledgerline-mock.vercel.app/ledgerline (note: <host>/<name>, not oauth/<name>)
vercel connect attach ledgerline-mock.vercel.app/ledgerline --yes
#     The app defaults to that UID and origin; override with CONNECT_LEDGERLINE_UID / LEDGERLINE_ORIGIN
#     (+ NEXT_PUBLIC_LEDGERLINE_ORIGIN for the form preset) if you deploy Ledgerline elsewhere.

# 3. Act 2 — bring-your-own OAuth connectors through the REST API
#    Management calls (create/list/delete connectors) need a team access token.
#    Token minting still uses the deployment's OIDC token, like Act 1.
vercel env add VERCEL_TEAM_ID    --no-sensitive   # team_G9RQezokwA3rOIpkO5zmu7cZ  (.vercel/project.json → orgId)
vercel env add VERCEL_PROJECT_ID --no-sensitive   # prj_hS9S3cJzAMc9viQ05cDYpIsFkenN (.vercel/project.json → projectId)
vercel env add VERCEL_TOKEN      --sensitive      # paste a token scoped to the team with Connect access
vercel env pull                                   # refresh .env.local
vercel deploy --prod --yes

#    Ledgerline as the BYO-client provider (default for the demo): in the form click
#    "Fill Ledgerline endpoints" — client ID `ledgerline-connect-demo` is pre-registered on the
#    mock — paste its STATIC_CLIENT_SECRET (set when ledgerline-mock was deployed), Create.
#
#    GitHub as an alternative real-world provider. Connect's OAuth callback URL is the same for
#    every connector on the team — https://connect.vercel.com/callback — so the provider
#    app can be created up front:
#    a) https://github.com/settings/developers → New OAuth App
#         Homepage URL:                https://legato-connect-demo.vercel.app
#         Authorization callback URL:  https://connect.vercel.com/callback
#       Copy the Client ID and generate a Client Secret.
#    b) In Legato: /connectors → "Fill GitHub endpoints", paste Client ID/Secret,
#       scopes `read:user`, Create connector. Click Connect, then Test with
#       https://api.github.com/user.
#    Equivalent CLI, if you'd rather not use the form:
#      printf '{"clientId":"…","clientSecret":"…","serverConfig":{"authorization_endpoint":"https://github.com/login/oauth/authorize","token_endpoint":"https://github.com/login/oauth/access_token"},"userAuthorization":{"enabled":true,"scopes":["read:user"]},"refreshTokens":{"enabled":true}}' > /tmp/gh.json
#      vercel connect create github.com --connector-type oauth --name legato-github --data @/tmp/gh.json
#      vercel connect attach oauth/legato-github --yes

# 4. Run locally
vercel env pull            # refresh VERCEL_OIDC_TOKEN (expires after ~12h)
pnpm dev                   # Next.js + eve agent on http://localhost:3000

# 5. Deploy
vercel deploy --prod
```

## HTTP surface (Act 2)

| Route | Does |
| --- | --- |
| `GET /api/connectors` | lists every connector attached to this project (`GET /v2/connect/projects/:id/connectors` + `GET /v1/connect/connectors/:id`) |
| `POST /api/connectors` | creates a Custom OAuth connector (`POST /v1/connect/connectors`, `type: "oauth"`, explicit `serverConfig` endpoints, `projectId` attaches in the same call) |
| `DELETE /api/connectors/:id` | deletes a connector |
| `POST /api/connectors/:id/authorize` | starts user authorization for Dana (SDK `startAuthorization`, OIDC) |
| `POST /api/connectors/:id/test` `{ probeUrl }` | mints Dana's token (SDK `getTokenResponse` → `POST /v1/connect/token/:id`) and makes one `GET probeUrl` with it; returns `stage: ok \| token \| probe` |

## Useful checks

```bash
# Does Dana have a Notion grant? (user token for the connector)
vercel connect token notion/legato-notion --format=json

# Which connectors can this project use?
vercel connect list --format=json

# Everything on the team
vercel connect list --all-projects
```
