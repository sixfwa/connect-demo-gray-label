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
};

export const SEEDED_CONNECTORS: CatalogConnector[] = [
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
