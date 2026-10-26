import { eveChannel } from "eve/channels/eve";
import type { AuthFn } from "eve/channels/auth";
import { DEMO_USER } from "../../lib/demo-user";

/**
 * Route auth for the agent's HTTP routes (/eve/v1/*).
 *
 * Demo only: every caller is "Dana @ Legato". In production this is where
 * Legato's real session cookie / JWT would be verified. The important bit for
 * Vercel Connect is `principalType: "user"` — user-scoped connections need a
 * user principal to bind the OAuth grant to.
 */
const legatoDemoSession: AuthFn<Request> = async () => ({
  authenticator: "legato-demo",
  principalId: DEMO_USER.id,
  principalType: "user",
  attributes: { email: DEMO_USER.email, org: DEMO_USER.org },
});

export default eveChannel({
  auth: [legatoDemoSession],
});
