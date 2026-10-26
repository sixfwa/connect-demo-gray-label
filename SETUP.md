# Setup — legato-connect-demo

Everything is done with the Vercel CLI or REST API. The Vercel dashboard is
never required.

## Prerequisites

| Requirement | Why |
| --- | --- |
| Node.js 24+ | eve requires it |
| pnpm | package manager |
| Vercel CLI **≥ 65** (`pnpm add -g vercel@latest`) | `vercel connect discover`, `--connection-method`, `--yes` do not exist in older CLIs (54.x was missing all of them) |
| A Vercel team | this demo was built on `rthm-vtest314` |

## Environment variables

See `.env.example`. Nothing secret is committed.

| Var | Used by | Source |
| --- | --- | --- |
| `VERCEL_OIDC_TOKEN` | `@vercel/connect`, eve (local dev only) | `vercel env pull` |
| `CONNECT_NOTION_UID` | app + agent | output of `vercel connect create notion …` (default `notion/legato-notion`) |
| `CONNECT_LINEAR_UID` | app | output of `vercel connect create linear …` (default `linear/legato-linear`) |
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
vercel link --scope rthm-vtest314 --project legato-connect-demo --yes
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

#    Linear (optional — not created in the recorded run; the UI shows it as "Not attached"
#    until you do this, which is itself a demo of the failure mode):
vercel connect create linear --help
vercel connect create linear --connection-method mcp --name legato-linear --yes
vercel connect attach linear/legato-linear --yes
#    then add agent/connections/linear.ts (copy notion.ts, change url to https://mcp.linear.app/mcp
#    and connector to linear/legato-linear) and redeploy.

# 3. Act 2 — bring-your-own OAuth connectors through the REST API
#    Management calls (create/list/delete connectors) need a team access token.
#    Token minting still uses the deployment's OIDC token, like Act 1.
vercel env add VERCEL_TEAM_ID    --no-sensitive   # team_YY1Z6a3GnL8sGi39oXfbyIJu  (.vercel/project.json → orgId)
vercel env add VERCEL_PROJECT_ID --no-sensitive   # prj_V8qrhc7HeJr77deDwgGJzxGVOkZ1 (.vercel/project.json → projectId)
vercel env add VERCEL_TOKEN      --sensitive      # paste a token scoped to the team with Connect access
vercel env pull                                   # refresh .env.local
vercel deploy --prod --yes

#    GitHub as the live custom provider:
#    a) Create the connector first in the Legato UI (/connectors → "Fill GitHub endpoints",
#       paste a placeholder Client ID if you don't have one yet) — the success alert shows
#       the Connect callback URL (`redirectUri`).
#    b) https://github.com/settings/developers → New OAuth App → Authorization callback URL =
#       that redirectUri. Copy Client ID + a Client Secret.
#    c) Remove the placeholder connector in the UI and create the real one with the GitHub
#       Client ID/Secret (scopes: read:user). Click Connect, then Test with
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
