"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TestResult = {
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

/**
 * "Test" panel: mints Dana's token for `connectorRef` (catalog slug or
 * Connect id) and makes one authenticated GET to the probe URL, then shows
 * exactly what came back.
 */
export function ProbeTester({
  connectorRef,
  defaultProbeUrl,
}: {
  connectorRef: string;
  defaultProbeUrl: string;
}) {
  const [probeUrl, setProbeUrl] = useState(defaultProbeUrl);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function test() {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/connectors/${connectorRef}/test`, {
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

  return (
    <div className="space-y-3">
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
    </div>
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
            {result.probe.durationMs} ms ·{" "}
            {result.probe.contentType ?? "no content-type"}
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
