import {
  ConnectError,
  UserAuthorizationRequiredError,
  getTokenResponse,
} from "@vercel/connect";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findSeeded } from "@/lib/catalog";
import { connectSubject } from "@/lib/demo-user";

const Body = z.object({ probeUrl: z.url() });

/**
 * POST /api/connectors/:id/test  { probeUrl }
 *
 * 1. Mint a user token for Dana from Vercel Connect (SDK → POST /v1/connect/token/:connector).
 * 2. Make exactly one authenticated GET to the probe URL.
 * 3. Return both halves verbatim so the UI can show what actually happened.
 *
 * Failure modes are reported with a `stage` so a 401 from the provider is
 * distinguishable from "Connect would not mint a token".
 */
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/connectors/[slug]/test">,
) {
  const { slug } = await ctx.params;
  const connector = findSeeded(slug)?.uid ?? slug;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { stage: "input", error: { message: z.prettifyError(parsed.error) } },
      { status: 400 },
    );
  }
  const { probeUrl } = parsed.data;

  // --- 1. token ------------------------------------------------------------
  let token: Awaited<ReturnType<typeof getTokenResponse>>;
  try {
    token = await getTokenResponse(
      connector,
      { subject: connectSubject },
      { forceRefresh: true },
    );
  } catch (err) {
    const status = err instanceof ConnectError ? (err.status ?? 502) : 502;
    return NextResponse.json(
      {
        stage: "token",
        error: {
          code: err instanceof ConnectError ? err.code : undefined,
          status: err instanceof ConnectError ? err.status : undefined,
          message: err instanceof Error ? err.message : String(err),
          userAuthorizationRequired:
            err instanceof UserAuthorizationRequiredError,
        },
      },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }

  const tokenSummary = {
    connector: token.connector,
    expiresAt: token.expiresAt,
    tokenId: token.tokenId,
    externalSubject: token.externalSubject,
    // Never return the token itself; show just enough to prove it exists.
    tokenPreview: `${token.token.slice(0, 6)}…(${token.token.length} chars)`,
  };

  // --- 2. probe -----------------------------------------------------------
  const started = Date.now();
  try {
    const res = await fetch(probeUrl, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        Accept: "application/json",
        "User-Agent": "legato-connect-demo",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON body stays a string */
    }
    return NextResponse.json({
      stage: res.ok ? "ok" : "probe",
      token: tokenSummary,
      probe: {
        url: probeUrl,
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get("content-type"),
        durationMs: Date.now() - started,
        body: truncate(body),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        stage: "probe",
        token: tokenSummary,
        error: {
          message: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 502 },
    );
  }
}

function truncate(body: unknown, max = 20_000): unknown {
  if (typeof body === "string") {
    return body.length > max ? `${body.slice(0, max)}… [truncated]` : body;
  }
  const s = JSON.stringify(body);
  return s.length > max ? `${s.slice(0, max)}… [truncated]` : body;
}
