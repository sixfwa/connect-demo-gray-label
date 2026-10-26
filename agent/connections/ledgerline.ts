import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { connectSubject } from "../../lib/demo-user";

/**
 * Ledgerline — the mock "legacy accounting" SaaS (separate project,
 * ledgerline-mock). Its MCP server is OAuth-protected; the connector was
 * created with `vercel connect create https://ledgerline-mock.vercel.app`,
 * which discovered the authorization server and registered a client via DCR.
 *
 * Writes (create_invoice, record_payment) require `invoices:write`; gate them
 * behind user approval so the demo can show human-in-the-loop on a finance
 * action.
 */
const ORIGIN =
  process.env.LEDGERLINE_ORIGIN ?? "https://ledgerline-mock.vercel.app";

export default defineMcpClientConnection({
  url: `${ORIGIN}/mcp`,
  description:
    "Ledgerline accounting: list/get invoices, vendors, aging report; create invoices and record payments.",
  auth: connect({
    connector:
      process.env.CONNECT_LEDGERLINE_UID ??
      "ledgerline-mock.vercel.app/ledgerline",
    principalType: "user",
    displayName: "Ledgerline",
    instructions:
      "Connect Ledgerline from the Legato connectors page to continue.",
    createSubject: () => connectSubject,
  }),
  approval: ({ toolAnnotations }) =>
    toolAnnotations?.readOnlyHint === true ? "not-applicable" : "user-approval",
});
