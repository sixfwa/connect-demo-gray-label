import { getConnectorMetadata } from "@vercel/connect";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { findSeeded } from "@/lib/catalog";
import { getConnectionStatus } from "@/lib/connect-status";
import { ErrorNote, StatusBadge } from "../connector-card";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Legato-branded landing page after the Connect authorization flow.
 * Connect redirects here (returnUrl) once the OAuth handshake is finished.
 * We re-check the grant so the page reflects truth, not just "you came back".
 */
export default function CallbackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const sp = await searchParams;
  const slug = str(sp.connector);
  const error = str(sp.error);
  const connector = slug ? await resolveConnector(slug) : undefined;
  const status = connector ? await getConnectionStatus(connector.uid) : null;

  // Anything else Connect/provider appended to the return URL — shown for transparency.
  const extra = Object.entries(sp).filter(
    ([k]) => !["connector", "error"].includes(k),
  );

  return (
    <Card>
      <CardHeader>
        <CardDescription>Connection result</CardDescription>
        <CardTitle className="flex items-center gap-3 text-xl">
          {connector ? connector.name : (slug ?? "Unknown connector")}
          {status && <StatusBadge status={status} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <ErrorNote
            title="Authorization could not be started"
            detail={error}
          />
        )}
        {status && (
          <p className="text-sm text-muted-foreground">
            {status.state === "active" &&
              `Connected. Legato can now act in ${connector!.name} on your behalf.`}
            {status.state === "not_connected" &&
              "The authorization did not complete. Try connecting again."}
            {status.state === "not_attached" && status.message}
            {status.state === "error" && status.message}
          </p>
        )}
        {extra.length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Return parameters</summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
              {JSON.stringify(Object.fromEntries(extra), null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          render={<Link href="/connectors" />}
        >
          Back to connectors
        </Button>
        {status?.state === "active" && (
          <Button render={<Link href="/agent" />}>Try it in the agent →</Button>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * Seeded connectors are addressed by catalog slug; custom ones (Act 2) by
 * Connect id. For the latter, read the connector's metadata with the
 * deployment's OIDC token — no VERCEL_TOKEN needed on this path.
 */
async function resolveConnector(
  slug: string,
): Promise<{ name: string; uid: string } | undefined> {
  const seeded = findSeeded(slug);
  if (seeded) return seeded;
  try {
    const meta = await getConnectorMetadata(slug);
    return { name: meta.name, uid: meta.uid };
  } catch {
    return undefined;
  }
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
