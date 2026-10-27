import { connect } from "@vercel/connect/eve";
import { defineDynamic, defineMcpClientConnection } from "eve/connections";
import { connectSubject } from "../../lib/demo-user";
import { LEDGERLINE_ORIGIN } from "../../lib/catalog";
import { listProjectConnectors } from "../../lib/vercel-api";

/**
 * Ledgerline — the mock "legacy accounting" SaaS — is a *custom* connector
 * that Legato registers at runtime through its own UI (Act 2). Its Connect
 * id is therefore not known at build time, so this connection is resolved
 * when a session starts: list the connectors attached to this project, pick
 * the one that points at Ledgerline, and expose its MCP server.
 *
 * If no Ledgerline connector exists yet, the agent simply has no such
 * connection — nothing fails until Dana adds one on /connectors.
 */
export default defineDynamic({
  events: {
    "session.started": async () => {
      let connectors: Awaited<ReturnType<typeof listProjectConnectors>>;
      try {
        connectors = await listProjectConnectors();
      } catch (err) {
        console.warn("[ledgerline] could not list connectors:", err);
        return null;
      }

      const host = new URL(LEDGERLINE_ORIGIN).host;
      const match = connectors
        .filter((c) => c.type === "oauth")
        .find(
          (c) =>
            (c.clientUrl ?? "").includes(host) ||
            (c.service ?? "").includes(host) ||
            c.uid.includes(host) ||
            /ledgerline/i.test(c.name),
        );
      if (!match) return null;

      return defineMcpClientConnection({
        url: `${LEDGERLINE_ORIGIN}/mcp`,
        description:
          "Ledgerline accounting: list/get invoices, vendors, aging report; create invoices and record payments.",
        instanceKey: match.id,
        auth: connect({
          connector: match.id,
          principalType: "user",
          displayName: "Ledgerline",
          instructions:
            "Connect Ledgerline from the Legato connectors page to continue.",
          createSubject: () => connectSubject,
        }),
        // Writes (create_invoice, record_payment) need a human; reads don't.
        approval: ({ toolAnnotations }) =>
          toolAnnotations?.readOnlyHint === true
            ? "not-applicable"
            : "user-approval",
      });
    },
  },
});
