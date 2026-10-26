import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SEEDED_CONNECTORS } from "@/lib/catalog";
import { getConnectionStatus } from "@/lib/connect-status";
import { ConnectorCard } from "./connector-card";

export default function ConnectorsPage() {
  return (
    <div className="space-y-8">
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
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map(({ connector, status }) => (
        <ConnectorCard
          key={connector.slug}
          slug={connector.slug}
          name={connector.name}
          description={connector.description}
          uid={connector.uid}
          status={status}
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
