import { NextResponse } from "next/server";
import { deleteConnector, describeError } from "@/lib/vercel-api";

/** DELETE /api/connectors/:id — remove a custom connector (demo cleanup). */
export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/connectors/[slug]">,
) {
  const { slug } = await ctx.params;
  try {
    await deleteConnector(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = describeError(err);
    return NextResponse.json({ error: e }, { status: e.status || 500 });
  }
}
