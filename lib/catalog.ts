/**
 * Legato's connector catalog.
 *
 * Act 1: seeded "out of the box" MCP connectors. The Vercel Connect connector
 * behind each entry is created with the CLI (see SETUP.md); the UID is what
 * the app uses to request tokens and to start user authorization.
 */
export type CatalogConnector = {
  slug: string;
  name: string;
  description: string;
  /** Vercel Connect connector UID, e.g. `notion/legato-notion`. */
  uid: string;
  /** MCP server URL the eve agent talks to once a token exists. */
  mcpUrl: string;
  kind: "mcp";
  /** Default URL for the Test/probe button (a user-scoped REST endpoint). */
  probeUrl?: string;
};

export const LEDGERLINE_ORIGIN =
  process.env.LEDGERLINE_ORIGIN ?? "https://ledgerline-mock.vercel.app";

export const SEEDED_CONNECTORS: CatalogConnector[] = [
  {
    slug: "ledgerline",
    name: "Ledgerline",
    description:
      "Legacy accounting: invoices, vendors and aging reports. Registered by URL — Connect discovered the OAuth server and registered its own client.",
    uid:
      process.env.CONNECT_LEDGERLINE_UID ??
      "ledgerline-mock.vercel.app/ledgerline",
    mcpUrl: `${LEDGERLINE_ORIGIN}/mcp`,
    kind: "mcp",
    probeUrl: `${LEDGERLINE_ORIGIN}/api/v1/me`,
  },
  {
    slug: "notion",
    name: "Notion",
    description: "Pages, databases and comments in your Notion workspace.",
    uid: process.env.CONNECT_NOTION_UID ?? "notion/legato-notion",
    mcpUrl: "https://mcp.notion.com/mcp",
    kind: "mcp",
  },
  {
    slug: "linear",
    name: "Linear",
    description: "Issues, projects and cycles in your Linear workspace.",
    uid: process.env.CONNECT_LINEAR_UID ?? "linear/legato-linear",
    mcpUrl: "https://mcp.linear.app/mcp",
    kind: "mcp",
  },
];

export function findSeeded(slug: string): CatalogConnector | undefined {
  return SEEDED_CONNECTORS.find((c) => c.slug === slug);
}
