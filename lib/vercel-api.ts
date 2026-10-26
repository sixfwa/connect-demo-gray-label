/**
 * Thin client for the Vercel REST API (management plane).
 *
 * Only *management* operations — create / list / delete connectors — use the
 * team-scoped VERCEL_TOKEN. Minting provider tokens and starting user
 * authorization go through the @vercel/connect SDK with the deployment's
 * OIDC token, exactly like Act 1.
 */

const API = "https://api.vercel.com";

export class VercelApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "VercelApiError";
  }
}

export function managementConfig():
  | { ok: true; token: string; teamId: string; projectId: string }
  | { ok: false; missing: string[] } {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const missing = [
    !token && "VERCEL_TOKEN",
    !teamId && "VERCEL_TEAM_ID",
    !projectId && "VERCEL_PROJECT_ID",
  ].filter((x): x is string => Boolean(x));
  if (missing.length) return { ok: false, missing };
  return { ok: true, token: token!, teamId: teamId!, projectId: projectId! };
}

async function vercelFetch<T>(
  path: string,
  init: RequestInit & { token: string; teamId: string },
): Promise<T> {
  const url = new URL(path, API);
  url.searchParams.set("teamId", init.teamId);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    /* keep raw text */
  }
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } })
      ?.error;
    throw new VercelApiError(
      err?.message ?? `${res.status} ${res.statusText}`,
      res.status,
      err?.code,
      body,
    );
  }
  return body as T;
}

/** Subset of the connector object we render. */
export type ConnectorRecord = {
  id: string;
  uid: string;
  name: string;
  displayName: string;
  type: string;
  typeName: string;
  service: string;
  clientUrl?: string;
  redirectUri?: string;
  createdAt: number;
  supportedSubjectTypes: string[];
  userTokens?: { scopes?: string[]; manualCredentialInput?: boolean };
};

export type CreateOAuthConnectorInput = {
  name: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  scopes?: string[];
};

/**
 * POST /v1/connect/connectors — Custom OAuth connector with explicit
 * endpoints, attached to this project in the same request.
 */
export async function createOAuthConnector(
  input: CreateOAuthConnectorInput,
): Promise<ConnectorRecord> {
  const cfg = managementConfig();
  if (!cfg.ok) throw new VercelApiError(`Missing env: ${cfg.missing.join(", ")}`, 0, "env_missing");

  const body = {
    type: "oauth",
    name: input.name,
    projectId: cfg.projectId,
    environments: ["production", "preview", "development"],
    data: {
      clientId: input.clientId,
      ...(input.clientSecret ? { clientSecret: input.clientSecret } : {}),
      // No discovery document (e.g. GitHub) → endpoints given explicitly.
      serverConfig: {
        authorization_endpoint: input.authorizationEndpoint,
        token_endpoint: input.tokenEndpoint,
      },
      userAuthorization: {
        enabled: true,
        ...(input.scopes?.length ? { scopes: input.scopes } : {}),
      },
      refreshTokens: { enabled: true },
    },
  };

  return vercelFetch<ConnectorRecord>("/v1/connect/connectors", {
    method: "POST",
    body: JSON.stringify(body),
    token: cfg.token,
    teamId: cfg.teamId,
  });
}

/**
 * Create an API-key connector (Act 3 native path).
 * `subjectType: "user"` → each user pastes their own key on the Connect
 * authorization screen; `"app"` → one connector-level key in `values`.
 */
export async function createApiKeyConnector(input: {
  name: string;
  serviceUrls: string[];
  instructions?: string;
  subjectType: "user" | "app";
  value?: string;
}): Promise<ConnectorRecord> {
  const cfg = managementConfig();
  if (!cfg.ok) throw new VercelApiError(`Missing env: ${cfg.missing.join(", ")}`, 0, "env_missing");

  const body = {
    type: "api-key",
    name: input.name,
    projectId: cfg.projectId,
    environments: ["production", "preview", "development"],
    data: {
      subjectType: input.subjectType,
      serviceUrls: input.serviceUrls,
      ...(input.instructions ? { instructions: input.instructions } : {}),
      ...(input.subjectType === "app" && input.value
        ? { values: [{ value: input.value }] }
        : {}),
    },
  };

  return vercelFetch<ConnectorRecord>("/v1/connect/connectors", {
    method: "POST",
    body: JSON.stringify(body),
    token: cfg.token,
    teamId: cfg.teamId,
  });
}

/** GET /v2/connect/projects/{projectId}/connectors → full connector records. */
export async function listProjectConnectors(): Promise<ConnectorRecord[]> {
  const cfg = managementConfig();
  if (!cfg.ok) throw new VercelApiError(`Missing env: ${cfg.missing.join(", ")}`, 0, "env_missing");

  const page = await vercelFetch<{
    connectors: { connectorId: string }[];
  }>(`/v2/connect/projects/${cfg.projectId}/connectors?limit=100`, {
    token: cfg.token,
    teamId: cfg.teamId,
  });

  const records = await Promise.all(
    page.connectors.map((c) =>
      vercelFetch<ConnectorRecord>(
        `/v1/connect/connectors/${encodeURIComponent(c.connectorId)}`,
        { token: cfg.token, teamId: cfg.teamId },
      ),
    ),
  );
  return records.sort((a, b) => a.createdAt - b.createdAt);
}

/** DELETE /v1/connect/connectors/{id} */
export async function deleteConnector(id: string): Promise<void> {
  const cfg = managementConfig();
  if (!cfg.ok) throw new VercelApiError(`Missing env: ${cfg.missing.join(", ")}`, 0, "env_missing");
  await vercelFetch<unknown>(
    `/v1/connect/connectors/${encodeURIComponent(id)}`,
    { method: "DELETE", token: cfg.token, teamId: cfg.teamId },
  );
}

export function describeError(err: unknown): {
  status?: number;
  code?: string;
  message: string;
  body?: unknown;
} {
  if (err instanceof VercelApiError) {
    return { status: err.status, code: err.code, message: err.message, body: err.body };
  }
  if (err && typeof err === "object" && "message" in err) {
    const e = err as { message: string; status?: number; code?: string };
    return { status: e.status, code: e.code, message: e.message };
  }
  return { message: String(err) };
}
