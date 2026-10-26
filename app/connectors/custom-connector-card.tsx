"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import type { ConnectionStatus } from "@/lib/connect-status";
import type { ConnectorRecord } from "@/lib/vercel-api";
import { ErrorNote, StatusBadge } from "./connector-card";

type TestResult = {
  stage: "ok" | "token" | "probe" | "input";
  token?: {
    expiresAt: number;
    tokenPreview: string;
    externalSubject?: string;
  };
  probe?: {
    url: string;
    status: number;
    statusText: string;
    contentType: string | null;
    durationMs: number;
    body: unknown;
  };
  error?: {
    code?: string;
    status?: number;
    message: string;
    userAuthorizationRequired?: boolean;
  };
};

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
  const [probeUrl, setProbeUrl] = useState(defaultProbeUrl);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [removing, setRemoving] = useState(false);

  async function test() {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/connectors/${connector.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probeUrl }),
      });
      setResult(await res.json());
    } catch (err) {
      setResult({
        stage: "probe",
        error: { message: err instanceof Error ? err.message : String(err) },
      });
    } finally {
      setTesting(false);
    }
  }

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

        <div className="flex gap-2">
          <Input
            value={probeUrl}
            onChange={(e) => setProbeUrl(e.target.value)}
            placeholder="Probe URL, e.g. https://api.github.com/user"
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            onClick={test}
            disabled={testing || !probeUrl}
          >
            {testing ? "Testing…" : "Test"}
          </Button>
        </div>

        {result && <TestResultView result={result} />}
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

function TestResultView({ result }: { result: TestResult }) {
  if (result.stage === "token" || result.stage === "input") {
    return (
      <Alert variant="destructive">
        <AlertTitle>
          {result.error?.userAuthorizationRequired
            ? "Dana has not connected this provider yet"
            : "Connect would not mint a token"}
        </AlertTitle>
        <AlertDescription>
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {[result.error?.status, result.error?.code, result.error?.message]
              .filter(Boolean)
              .join(" · ")}
          </pre>
        </AlertDescription>
      </Alert>
    );
  }

  const ok = result.stage === "ok";
  return (
    <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={ok ? "default" : "destructive"}>
          {result.probe
            ? `${result.probe.status} ${result.probe.statusText}`
            : "probe failed"}
        </Badge>
        {result.probe && (
          <span className="text-muted-foreground">
            {result.probe.durationMs} ms · {result.probe.contentType ?? "no content-type"}
          </span>
        )}
        {result.token && (
          <span className="ml-auto font-mono text-muted-foreground">
            token {result.token.tokenPreview}, expires{" "}
            {new Date(result.token.expiresAt).toLocaleTimeString()}
          </span>
        )}
      </div>
      {result.error && (
        <p className="font-mono text-destructive">{result.error.message}</p>
      )}
      {result.probe && (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-background p-2 font-mono text-[11px]">
          {typeof result.probe.body === "string"
            ? result.probe.body
            : JSON.stringify(result.probe.body, null, 2)}
        </pre>
      )}
    </div>
  );
}
