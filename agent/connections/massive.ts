import { connect } from "@vercel/connect/eve";
import { defineOpenAPIConnection } from "eve/connections";
import { connectSubject } from "../../lib/demo-user";
import spec from "../specs/massive.json";

/**
 * Massive (ex-Polygon.io) market data — an API-key provider with no MCP
 * server, so the agent gets an OpenAPI connection instead: one tool per
 * operation, from a trimmed, pinned copy of https://api.massive.com/openapi
 * (10 read-only operations; the full spec is 1.2 MB / 149 operations).
 *
 * Auth is the same Vercel Connect token Dana created on /connectors
 * ("Add API key"): for an api-key connector, the token *is* her Massive key,
 * sent as `Authorization: Bearer` — which Massive accepts alongside the
 * `?apiKey=` form its spec declares.
 */
export default defineOpenAPIConnection({
  spec: spec as never,
  baseUrl: "https://api.massive.com",
  description:
    "Massive market data: look up tickers, daily/previous-close bars, open/close, dividends, market status and holidays for US stocks.",
  auth: connect({
    connector: process.env.CONNECT_MASSIVE_UID ?? "massive/legato-massive",
    principalType: "user",
    displayName: "Massive",
    instructions:
      "Add your Massive API key from the Legato connectors page to continue.",
    createSubject: () => connectSubject,
  }),
});
