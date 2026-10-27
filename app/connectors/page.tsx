import { AlertCircleIcon } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SEEDED_CONNECTORS } from "@/lib/catalog";
import { getConnectionStatus } from "@/lib/connect-status";
import { defaultProbeUrl } from "@/lib/probe-defaults";
import { describeError, listProjectConnectors } from "@/lib/vercel-api";
import { AddConnectorForm } from "./add-connector-form";
import { ConnectorCard } from "./connector-card";
import { CustomConnectorCard } from "./custom-connector-card";

export default function ConnectorsPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Connectors</h1>
        <p className="text-sm text-muted-foreground">
          Connect the systems you want Legato to deploy into. Credentials are
          never stored by Legato.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Available</h2>
        <Suspense fallback={<CardsSkeleton count={SEEDED_CONNECTORS.length} />}>
          <SeededConnectors />
        </Suspense>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Custom connectors
        </h2>
        <Suspense fallback={<CardsSkeleton count={1} />}>
          <CustomConnectors />
        </Suspense>
      </section>

      <AddConnectorForm />
    </div>
  );
}

async function SeededConnectors() {
  // Connection state is per-request truth from Vercel Connect; never prerender it.
  await connection();
  const rows = await Promise.all(
    SEEDED_CONNECTORS.map(async (c) => ({
      connector: c,
      status: await getConnectionStatus(c.uid),
    })),
  );
  return (
    <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2">
      {rows.map(({ connector, status }) => (
        <ConnectorCard
          key={connector.slug}
          slug={connector.slug}
          name={connector.name}
          description={connector.description}
          uid={connector.uid}
          status={status}
          probeUrl={connector.probeUrl}
          auth={connector.auth}
        />
      ))}
    </div>
  );
}

/**
 * Act 2: connectors Legato registered through the REST API. Listed from
 * Connect itself (the project's connector links), minus the seeded catalog.
 */
async function CustomConnectors() {
  await connection();
  const seededUids = new Set(SEEDED_CONNECTORS.map((c) => c.uid));

  let records;
  try {
    records = (await listProjectConnectors()).filter(
      (c) => !seededUids.has(c.uid),
    );
  } catch (err) {
    const e = describeError(err);
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Could not list connectors from the Vercel API</AlertTitle>
        <AlertDescription>
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {[e.status, e.code, e.message].filter(Boolean).join(" · ")}
          </pre>
          {e.code === "env_missing" && (
            <p className="text-xs">
              Set the missing variables with <code>vercel env add</code> and
              redeploy (see SETUP.md).
            </p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        None yet. Add one below.
      </p>
    );
  }

  const rows = await Promise.all(
    records.map(async (c) => ({
      connector: c,
      status: await getConnectionStatus(c.id),
    })),
  );

  return (
    <div className="grid gap-4">
      {rows.map(({ connector, status }) => (
        <CustomConnectorCard
          key={connector.id}
          connector={connector}
          status={status}
          defaultProbeUrl={defaultProbeUrl(connector.clientUrl, connector.service)}
        />
      ))}
    </div>
  );
}

function CardsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}
