import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createOAuthConnector,
  describeError,
  listProjectConnectors,
} from "@/lib/vercel-api";

const CreateBody = z.object({
  name: z.string().trim().min(1).max(80),
  authorizationEndpoint: z.url(),
  tokenEndpoint: z.url(),
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().optional(),
  scopes: z
    .string()
    .optional()
    .transform((s) =>
      (s ?? "")
        .split(/[\s,]+/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
});

/** GET /api/connectors — every connector attached to this project. */
export async function GET() {
  try {
    const connectors = await listProjectConnectors();
    return NextResponse.json({ connectors });
  } catch (err) {
    const e = describeError(err);
    return NextResponse.json({ error: e }, { status: e.status || 500 });
  }
}

/**
 * POST /api/connectors — Act 2: register a bring-your-own OAuth provider.
 * Creates the connector via the Vercel REST API and attaches it to this
 * project in one call. Returns the connector, including `redirectUri`,
 * which must be registered as the callback URL at the provider.
 */
export async function POST(req: Request) {
  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: z.prettifyError(parsed.error) } },
      { status: 400 },
    );
  }
  try {
    const connector = await createOAuthConnector(parsed.data);
    return NextResponse.json({ connector }, { status: 201 });
  } catch (err) {
    const e = describeError(err);
    return NextResponse.json({ error: e }, { status: e.status || 500 });
  }
}
