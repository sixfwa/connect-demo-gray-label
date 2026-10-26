import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { connectSubject } from "../../lib/demo-user";

/**
 * Notion MCP server, authorized through Vercel Connect.
 *
 * `createSubject` pins the Connect subject to the same demo user id that the
 * /connectors page uses, so the grant Dana created there is the one the agent
 * uses here. (The default mapping would also include the principal issuer.)
 */
export default defineMcpClientConnection({
  url: "https://mcp.notion.com/mcp",
  description:
    "Notion workspace: search, read, create and update pages and databases.",
  auth: connect({
    connector: process.env.CONNECT_NOTION_UID ?? "notion/legato-notion",
    principalType: "user",
    displayName: "Notion",
    instructions: "Connect Notion from the Legato connectors page to continue.",
    createSubject: () => connectSubject,
  }),
});
