/**
 * Default "probe URL" for the Test button, guessed from the provider's token
 * endpoint. Per-connector probe URLs are not stored anywhere (no DB in this
 * demo); the UI lets you edit the URL before each test.
 */
export function defaultProbeUrl(clientUrl?: string, service?: string): string {
  const s = `${clientUrl ?? ""} ${service ?? ""}`.toLowerCase();
  if (s.includes("github")) return "https://api.github.com/user";
  if (s.includes("gitlab")) return "https://gitlab.com/api/v4/user";
  if (s.includes("google")) return "https://www.googleapis.com/oauth2/v3/userinfo";
  if (s.includes("slack")) return "https://slack.com/api/auth.test";
  return "";
}
