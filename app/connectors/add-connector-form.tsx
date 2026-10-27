"use client";

import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GITHUB_PRESET = {
  name: "GitHub",
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  scopes: "read:user",
};

// Ledgerline (the mock legacy accounting SaaS) exposes a pre-registered
// "bring your own credentials" client. Client ID is public; paste the secret.
const LEDGERLINE_ORIGIN =
  process.env.NEXT_PUBLIC_LEDGERLINE_ORIGIN ?? "https://ledgerline-mock.vercel.app";
const LEDGERLINE_PRESET = {
  name: "Ledgerline",
  authorizationEndpoint: `${LEDGERLINE_ORIGIN}/authorize`,
  tokenEndpoint: `${LEDGERLINE_ORIGIN}/token`,
  clientId: "ledgerline-connect-demo",
  scopes: "invoices:read vendors:read reports:read",
};

type Created = {
  id: string;
  uid: string;
  name: string;
  redirectUri?: string;
};

export function AddConnectorForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [values, setValues] = useState({
    name: "",
    authorizationEndpoint: "",
    tokenEndpoint: "",
    clientId: "",
    clientSecret: "",
    scopes: "",
  });

  const set =
    (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        const err = json.error ?? {};
        setError(
          [err.status, err.code, err.message].filter(Boolean).join(" · ") +
            (err.body ? `\n${JSON.stringify(err.body, null, 2)}` : ""),
        );
        return;
      }
      setCreated(json.connector);
      setValues((v) => ({ ...v, clientId: "", clientSecret: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add custom connector</CardTitle>
        <CardDescription>
          Register any OAuth 2.0 provider. Legato creates the connector through
          the Vercel REST API and attaches it to this project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" id="name">
            <Input
              id="name"
              required
              value={values.name}
              onChange={set("name")}
              placeholder="GitHub"
            />
          </Field>
          <Field label="Scopes (optional, space-separated)" id="scopes">
            <Input
              id="scopes"
              value={values.scopes}
              onChange={set("scopes")}
              placeholder="read:user"
            />
          </Field>
          <Field label="Authorization endpoint" id="authz">
            <Input
              id="authz"
              required
              type="url"
              value={values.authorizationEndpoint}
              onChange={set("authorizationEndpoint")}
              placeholder="https://github.com/login/oauth/authorize"
            />
          </Field>
          <Field label="Token endpoint" id="token">
            <Input
              id="token"
              required
              type="url"
              value={values.tokenEndpoint}
              onChange={set("tokenEndpoint")}
              placeholder="https://github.com/login/oauth/access_token"
            />
          </Field>
          <Field label="Client ID" id="clientId">
            <Input
              id="clientId"
              required
              autoComplete="off"
              value={values.clientId}
              onChange={set("clientId")}
            />
          </Field>
          <Field label="Client secret (optional)" id="clientSecret">
            <Input
              id="clientSecret"
              type="password"
              autoComplete="off"
              value={values.clientSecret}
              onChange={set("clientSecret")}
            />
          </Field>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create connector"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setValues((v) => ({ ...v, ...GITHUB_PRESET }))}
            >
              Fill GitHub endpoints
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setValues((v) => ({ ...v, ...LEDGERLINE_PRESET }))}
            >
              Fill Ledgerline endpoints
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertCircleIcon />
              <AlertTitle>Connector creation failed</AlertTitle>
              <AlertDescription>
                <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
              </AlertDescription>
            </Alert>
          )}

          {created && (
            <Alert className="sm:col-span-2">
              <CheckCircle2Icon />
              <AlertTitle>
                Created {created.name}{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {created.uid}
                </span>
              </AlertTitle>
              <AlertDescription className="space-y-1">
                {created.redirectUri ? (
                  <>
                    <p>
                      Register this callback URL in the provider&apos;s OAuth
                      app before connecting:
                    </p>
                    <code className="block break-all rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                      {created.redirectUri}
                    </code>
                  </>
                ) : (
                  <p>
                    No <code>redirectUri</code> was returned by the API — check
                    the connector record for the callback URL.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
