/**
 * The demo has no real auth system. Every request is "Dana @ Legato".
 *
 * This id is the Vercel Connect token *subject* for every user-scoped
 * token request (`{ type: "user", id }`), so the grant Dana creates on
 * /connectors is the same grant the eve agent uses on /agent.
 */
export const DEMO_USER = {
  id: "legato-user-dana",
  name: "Dana",
  org: "Legato",
  email: "dana@legato.example",
} as const;

export const connectSubject = { type: "user", id: DEMO_USER.id } as const;
