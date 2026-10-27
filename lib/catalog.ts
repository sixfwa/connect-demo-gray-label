/**
 * Legato's connector catalog — the "out of the box" providers.
 *
 * Both are Vercel Connect *catalog* services: Connect already knows their
 * endpoints and key formats, so each was created with one CLI/API call (see
 * SETUP.md). Anything not listed here and attached to the project is a
 * "custom connector" Legato registered itself (e.g. Ledgerline).
 */
export type CatalogConnector = {
  slug: string;
  name: string;
  description: string;
  /** Vercel Connect connector UID, e.g. `notion/legato-notion`. */
  uid: string;
  /** How the user authorizes: OAuth consent, or pasting their own API key. */
  auth: "oauth" | "api-key";
  /** MCP server URL the eve agent talks to, when the provider has one. */
  mcpUrl?: string;
  /** Default URL for the Test/probe button (a user-scoped REST endpoint). */
  probeUrl?: string;
};

export const LEDGERLINE_ORIGIN =
  process.env.LEDGERLINE_ORIGIN ?? "https://ledgerline-mock.vercel.app";

export const SEEDED_CONNECTORS: CatalogConnector[] = [
  {
    slug: "notion",
    name: "Notion",
    description: "Pages, databases and comments in your Notion workspace.",
    uid: process.env.CONNECT_NOTION_UID ?? "notion/legato-notion",
    auth: "oauth",
    mcpUrl: "https://mcp.notion.com/mcp",
  },
  {
    slug: "massive",
    name: "Massive",
    description:
      "Market data (stocks, options, forex, crypto) from Massive, formerly Polygon.io. API-key provider: you paste your own key once.",
    uid: process.env.CONNECT_MASSIVE_UID ?? "massive/legato-massive",
    auth: "api-key",
    probeUrl: "https://api.massive.com/v3/reference/tickers?limit=3",
  },
];

export function findSeeded(slug: string): CatalogConnector | undefined {
  return SEEDED_CONNECTORS.find((c) => c.slug === slug);
}
