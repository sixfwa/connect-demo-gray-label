"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConnectionStatus } from "@/lib/connect-status";
import type { ConnectorRecord } from "@/lib/vercel-api";
import { ErrorNote, StatusBadge } from "./connector-card";
import { ProbeTester } from "./probe-tester";

export function CustomConnectorCard({
  connector,
  status,
  defaultProbeUrl,
}: {
  connector: ConnectorRecord;
  status: ConnectionStatus;
  defaultProbeUrl: string;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function remove() {
    if (!confirm(`Delete connector ${connector.uid}?`)) return;
    setRemoving(true);
    const res = await fetch(`/api/connectors/${connector.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Delete failed: ${json.error?.message ?? res.status}`);
      setRemoving(false);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {connector.displayName || connector.name}
          <Badge variant="outline" className="font-normal">
            {connector.typeName}
          </Badge>
        </CardTitle>
        <CardDescription>
          {connector.clientUrl ?? connector.service}
        </CardDescription>
        <CardAction>
          <StatusBadge status={status} />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="font-mono text-xs text-muted-foreground">
          {connector.uid} · {connector.id}
        </p>
        {connector.redirectUri && (
          <p className="text-xs text-muted-foreground">
            Callback URL registered at provider:{" "}
            <code className="break-all font-mono">{connector.redirectUri}</code>
          </p>
        )}
        {status.state === "not_attached" && (
          <ErrorNote
            title="Connector not attached to this project"
            detail={`${status.code ?? "error"}: ${status.message}`}
            hint={`vercel connect attach ${connector.uid} --yes`}
          />
        )}
        {status.state === "error" && (
          <ErrorNote
            title="Token request failed"
            detail={`${status.status ?? ""} ${status.code ?? ""} ${status.message}`.trim()}
          />
        )}
        <ProbeTester
          connectorRef={connector.id}
          defaultProbeUrl={defaultProbeUrl}
        />
      </CardContent>

      <CardFooter className="gap-2">
        <form action={`/api/connectors/${connector.id}/authorize`} method="post">
          <Button
            type="submit"
            size="sm"
            variant={status.state === "active" ? "outline" : "default"}
            disabled={status.state === "not_attached"}
          >
            {status.state === "active" ? "Reconnect" : "Connect"}
          </Button>
        </form>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto text-muted-foreground"
          onClick={remove}
          disabled={removing}
        >
          {removing ? "Removing…" : "Remove"}
        </Button>
      </CardFooter>
    </Card>
  );
}
