import { ConnectError, startAuthorization } from "@vercel/connect";
import { NextResponse, type NextRequest } from "next/server";
import { findSeeded } from "@/lib/catalog";
import { connectSubject } from "@/lib/demo-user";

/**
 * Kick off the Vercel Connect user-authorization flow for a connector.
 *
 * POST /api/connectors/:slug/authorize  →  303 to the provider consent URL.
 * Connect completes the OAuth handshake server-side and sends the user back
 * to /connectors/callback (Legato-branded); the grant is stored by Connect,
 * keyed by { type: "user", id: DEMO_USER.id }.
 */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/connectors/[slug]/authorize">,
) {
  const { slug } = await ctx.params;
  const origin = publicOrigin(req);

  // Seeded catalog entries are addressed by slug; custom connectors (Act 2)
  // by their Connect id (scl_…) or UID, which the SDK accepts directly.
  const connectorUid = findSeeded(slug)?.uid ?? slug;
  const callbackUrl = `${origin}/connectors/callback?connector=${encodeURIComponent(slug)}`;

  try {
    const { url } = await startAuthorization(
      connectorUid,
      { subject: connectSubject },
      { callbackUrl },
    );
    return NextResponse.redirect(url, 303);
  } catch (err) {
    const detail =
      err instanceof ConnectError
        ? `${err.status ?? ""} ${err.code ?? ""} ${err.message}`.trim()
        : err instanceof Error
          ? err.message
          : String(err);
    return NextResponse.redirect(
      `${origin}/connectors/callback?connector=${encodeURIComponent(slug)}&error=${encodeURIComponent(detail)}`,
      303,
    );
  }
}

function publicOrigin(req: NextRequest): string {
  // Prefer the forwarded host so callback URLs are correct behind Vercel's proxy.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return `http://${host}`;
  }
  return `${proto}://${host}`;
}
