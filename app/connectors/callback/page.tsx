import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { findSeeded } from "@/lib/catalog";
import { getConnectionStatus } from "@/lib/connect-status";
import { ErrorNote, StatusBadge } from "../connector-card";

/**
 * Legato-branded landing page after the Connect authorization flow.
 * Connect redirects here (returnUrl) once the OAuth handshake is finished.
 * We re-check the grant so the page reflects truth, not just "you came back".
 */
export default function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<p className="text-sm text-muted">Checking connection…</p>}>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const sp = await searchParams;
  const slug = str(sp.connector);
  const error = str(sp.error);
  const connector = slug ? findSeeded(slug) : undefined;
  const status = connector ? await getConnectionStatus(connector.uid) : null;

  // Anything else Connect/provider appended to the return URL — shown for transparency.
  const extra = Object.entries(sp).filter(
    ([k]) => !["connector", "error"].includes(k),
  );

  return (
    <div className="rounded-lg border border-border bg-panel p-6">
      <p className="text-xs uppercase tracking-wider text-muted">
        Connection result
      </p>
      <h1 className="mt-1 text-xl font-semibold">
        {connector ? connector.name : slug ?? "Unknown connector"}
      </h1>

      {error && (
        <ErrorNote title="Authorization could not be started" detail={error} />
      )}

      {status && (
        <div className="mt-4 flex items-center gap-3">
          <StatusBadge status={status} />
          <span className="text-sm text-muted">
            {status.state === "active" &&
              `Connected. Legato can now act in ${connector!.name} on your behalf.`}
            {status.state === "not_connected" &&
              "The authorization did not complete. Try connecting again."}
            {status.state === "not_attached" && status.message}
            {status.state === "error" && status.message}
          </span>
        </div>
      )}

      {extra.length > 0 && (
        <details className="mt-4 text-xs text-muted">
          <summary className="cursor-pointer">Return parameters</summary>
          <pre className="mt-2 overflow-x-auto rounded bg-panel-2 p-2 font-mono text-[11px]">
            {JSON.stringify(Object.fromEntries(extra), null, 2)}
          </pre>
        </details>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href="/connectors"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-panel-2"
        >
          Back to connectors
        </Link>
        {status?.state === "active" && (
          <Link
            href="/agent"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:brightness-110"
          >
            Try it in the agent →
          </Link>
        )}
      </div>
    </div>
  );
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
