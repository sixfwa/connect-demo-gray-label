import {
  ConnectError,
  ConnectorInstallationRequiredError,
  NoValidTokenError,
  UserAuthorizationRequiredError,
  getTokenResponse,
} from "@vercel/connect";
import { connectSubject } from "./demo-user";

/**
 * Per-user connection state, derived from Vercel Connect itself rather than
 * stored in Legato. One token request per connector tells us everything:
 *
 *  - active         → Connect holds a grant for this user and minted a token
 *  - not_connected  → connector exists, this user hasn't authorized it yet
 *  - not_attached   → connector missing, or not attached to this project/env
 *  - error          → anything else (surfaced verbatim in the UI)
 */
export type ConnectionStatus =
  | { state: "active"; expiresAt: number; externalSubject?: string }
  | { state: "not_connected" }
  | { state: "not_attached"; code?: string; message: string }
  | { state: "error"; code?: string; status?: number; message: string };

export async function getConnectionStatus(
  connectorUid: string,
): Promise<ConnectionStatus> {
  try {
    const res = await getTokenResponse(
      connectorUid,
      { subject: connectSubject },
      // Always ask Connect; don't let the in-process cache mask a revoked grant.
      { forceRefresh: true },
    );
    return {
      state: "active",
      expiresAt: res.expiresAt,
      externalSubject: res.externalSubject,
    };
  } catch (err) {
    if (err instanceof UserAuthorizationRequiredError) {
      return { state: "not_connected" };
    }
    if (err instanceof NoValidTokenError) {
      // Grant existed but can't produce a token (revoked upstream, etc.).
      return { state: "not_connected" };
    }
    if (err instanceof ConnectorInstallationRequiredError) {
      return {
        state: "not_attached",
        code: err.code,
        message: err.message,
      };
    }
    if (err instanceof ConnectError) {
      const status = err.status;
      const code = err.code;
      // Connector unknown to this project, or project not linked / env not enabled.
      if (
        status === 404 ||
        status === 403 ||
        code === "client_not_linked_to_project" ||
        code === "client_not_enabled_for_environment" ||
        code === "not_found"
      ) {
        return { state: "not_attached", code, message: err.message };
      }
      return { state: "error", code, status, message: err.message };
    }
    return {
      state: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
