import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createManagedConnector,
  createOAuthConnector,
  describeError,
  discoverService,
  listProjectConnectors,
  managementConfig,
} from "@/lib/vercel-api";

const scopesField = z
  .string()
  .optional()
  .transform((s) =>
    (s ?? "")
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter(Boolean),
  );

/**
 * Two ways to register a provider Vercel doesn't already know:
 *  - "url":    just a server URL. Connect discovers the OAuth metadata and
 *              registers its own client (DCR). Zero credentials.
 *  - "manual": endpoints + your own client ID/secret, for providers with no
 *              discovery document (e.g. GitHub).
 */
const CreateBody = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("url"),
    name: z.string().trim().min(1).max(80),
    serverUrl: z.url(),
  }),
  z.object({
    mode: z.literal("manual"),
    name: z.string().trim().min(1).max(80),
    authorizationEndpoint: z.url(),
    tokenEndpoint: z.url(),
    clientId: z.string().trim().min(1),
    clientSecret: z.string().trim().optional(),
    scopes: scopesField,
  }),
]);

/**
 * GET /api/connectors            — every connector attached to this project.
 * GET /api/connectors?discover=<url> — what Connect can discover about a URL.
 * GET /api/connectors?diag=1     — runtime ids + token fingerprint.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  if (sp.get("diag") === "1") {
    const cfg = managementConfig();
    const tok = process.env.VERCEL_TOKEN ?? "";
    return NextResponse.json({
      ok: cfg.ok,
      missing: cfg.ok ? [] : cfg.missing,
      teamId: process.env.VERCEL_TEAM_ID ?? null,
      projectId: process.env.VERCEL_PROJECT_ID ?? null,
      tokenFingerprint: tok ? `${tok.slice(0, 4)}…${tok.slice(-4)} (${tok.length})` : null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    });
  }

  const discover = sp.get("discover");
  if (discover) {
    const parsed = z.url().safeParse(discover);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "invalid_url", message: "discover must be a URL" } },
        { status: 400 },
      );
    }
    try {
      const d = await discoverService(parsed.data);
      const sc = d.discovery?.type?.data?.serverConfig ?? {};
      return NextResponse.json({
        service: d.service,
        type: d.discovery?.type?.type ?? d.name,
        supportsManagedCreation: d.supportsManagedCreation,
        supportedSubjectTypes: d.supportedSubjectTypes,
        issuer: sc.issuer,
        authorizationEndpoint: sc.authorization_endpoint,
        tokenEndpoint: sc.token_endpoint,
        registrationEndpoint: sc.registration_endpoint,
        pkce: sc.code_challenge_methods_supported,
        grantTypes: sc.grant_types_supported,
        scopes: sc.scopes_supported,
      });
    } catch (err) {
      const e = describeError(err);
      return NextResponse.json({ error: e }, { status: e.status || 500 });
    }
  }

  try {
    const connectors = await listProjectConnectors();
    return NextResponse.json({ connectors });
  } catch (err) {
    const e = describeError(err);
    return NextResponse.json({ error: e }, { status: e.status || 500 });
  }
}

/** POST /api/connectors — register a provider (see CreateBody). */
export async function POST(req: Request) {
  const raw = await req.json().catch(() => ({}));
  const parsed = CreateBody.safeParse({ mode: "manual", ...raw });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: z.prettifyError(parsed.error) } },
      { status: 400 },
    );
  }
  try {
    const connector =
      parsed.data.mode === "url"
        ? await createManagedConnector(parsed.data)
        : await createOAuthConnector(parsed.data);
    return NextResponse.json({ connector }, { status: 201 });
  } catch (err) {
    const e = describeError(err);
    return NextResponse.json({ error: e }, { status: e.status || 500 });
  }
}
