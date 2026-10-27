"use client";

import { AlertCircleIcon, CheckCircle2Icon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LEDGERLINE_ORIGIN =
  process.env.NEXT_PUBLIC_LEDGERLINE_ORIGIN ?? "https://ledgerline-mock.vercel.app";

const GITHUB_PRESET = {
  name: "GitHub",
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  scopes: "read:user",
};

// Ledgerline also exposes a pre-registered "bring your own credentials"
// client, for the manual path. Client ID is public; paste the secret.
const LEDGERLINE_MANUAL_PRESET = {
  name: "Ledgerline",
  authorizationEndpoint: `${LEDGERLINE_ORIGIN}/authorize`,
  tokenEndpoint: `${LEDGERLINE_ORIGIN}/token`,
  clientId: "ledgerline-connect-demo",
  scopes: "invoices:read vendors:read reports:read",
};

type Created = { id: string; uid: string; name: string; redirectUri?: string };

type Discovery = {
  service: string;
  type: string;
  supportsManagedCreation: boolean;
  supportedSubjectTypes: string[];
  issuer?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  registrationEndpoint?: string;
  pkce?: string[];
  grantTypes?: string[];
  scopes?: string[];
};

type ApiError = { status?: number; code?: string; message: string; body?: unknown };

function formatError(err: ApiError) {
  return (
    [err.status, err.code, err.message].filter(Boolean).join(" · ") +
    (err.body ? `\n${JSON.stringify(err.body, null, 2)}` : "")
  );
}

export function AddConnectorForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add custom connector</CardTitle>
        <CardDescription>
          Register a provider Legato doesn&apos;t ship with. Legato creates the
          connector through the Vercel Connect API and attaches it to this
          project — nothing is stored in Legato.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="url">
          <TabsList>
            <TabsTrigger value="url">By server URL</TabsTrigger>
            <TabsTrigger value="manual">Endpoints + client credentials</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="pt-4">
            <ByUrlForm />
          </TabsContent>
          <TabsContent value="manual" className="pt-4">
            <ManualForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------ */
/* Mode 1: a URL. Connect discovers the OAuth server and registers a client. */
/* ------------------------------------------------------------------------ */

function ByUrlForm() {
  const router = useRouter();
  const [name, setName] = useState("Ledgerline");
  const [serverUrl, setServerUrl] = useState(LEDGERLINE_ORIGIN);
  const [discovering, setDiscovering] = useState(false);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function discover() {
    setDiscovering(true);
    setError(null);
    setDiscovery(null);
    setCreated(null);
    try {
      const res = await fetch(
        `/api/connectors?discover=${encodeURIComponent(serverUrl)}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(formatError(json.error ?? { message: res.statusText }));
        return;
      }
      setDiscovery(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiscovering(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "url", name, serverUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(formatError(json.error ?? { message: res.statusText }));
        return;
      }
      setCreated(json.connector);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        For any provider that publishes standard OAuth metadata. Connect reads
        its discovery document and registers the OAuth client itself — no app
        registration, no client secret.
      </p>
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Field label="Display name" id="url-name">
          <Input id="url-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Server URL" id="url-server">
          <div className="flex gap-2">
            <Input
              id="url-server"
              required
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://accounting.example.com"
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={discover}
              disabled={discovering || !serverUrl}
            >
              <SearchIcon />
              {discovering ? "Discovering…" : "Discover"}
            </Button>
          </div>
        </Field>
      </div>

      {discovery && (
        <div className="rounded-lg border bg-muted/40 p-3 text-xs">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-medium">What Connect found</span>
            <Badge variant="outline">{discovery.type}</Badge>
            <Badge variant={discovery.supportsManagedCreation ? "default" : "secondary"}>
              {discovery.supportsManagedCreation
                ? "automatic registration (DCR)"
                : "credentials required"}
            </Badge>
            {discovery.pkce?.includes("S256") && <Badge variant="outline">PKCE S256</Badge>}
            {discovery.grantTypes?.includes("refresh_token") && (
              <Badge variant="outline">refresh tokens</Badge>
            )}
          </div>
          <dl className="grid gap-x-4 gap-y-1 font-mono sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">issuer</dt>
            <dd className="break-all">{discovery.issuer}</dd>
            <dt className="text-muted-foreground">authorize</dt>
            <dd className="break-all">{discovery.authorizationEndpoint}</dd>
            <dt className="text-muted-foreground">token</dt>
            <dd className="break-all">{discovery.tokenEndpoint}</dd>
            <dt className="text-muted-foreground">register</dt>
            <dd className="break-all">{discovery.registrationEndpoint ?? "—"}</dd>
            <dt className="text-muted-foreground">scopes</dt>
            <dd className="break-all">{discovery.scopes?.join(" ") ?? "—"}</dd>
            <dt className="text-muted-foreground">subjects</dt>
            <dd>{discovery.supportedSubjectTypes.join(", ")}</dd>
          </dl>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create connector"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Equivalent CLI: <code>vercel connect create {serverUrl || "<url>"} --name {name || "<name>"}</code>
        </span>
      </div>

      {error && <ErrorAlert text={error} />}
      {created && <CreatedAlert created={created} dcr />}
    </form>
  );
}

/* ------------------------------------------------------------------------ */
/* Mode 2: explicit endpoints + your own OAuth client.                       */
/* ------------------------------------------------------------------------ */

function ManualForm() {
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
        body: JSON.stringify({ mode: "manual", ...values }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(formatError(json.error ?? { message: res.statusText }));
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
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <p className="text-sm text-muted-foreground sm:col-span-2">
        For providers without a discovery document, or when you must use an
        OAuth app you registered yourself. Register{" "}
        <code className="font-mono text-xs">https://connect.vercel.com/callback</code>{" "}
        as the callback URL at the provider.
      </p>
      <Field label="Display name" id="name">
        <Input id="name" required value={values.name} onChange={set("name")} placeholder="GitHub" />
      </Field>
      <Field label="Scopes (optional, space-separated)" id="scopes">
        <Input id="scopes" value={values.scopes} onChange={set("scopes")} placeholder="read:user" />
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
        <Input id="clientId" required autoComplete="off" value={values.clientId} onChange={set("clientId")} />
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

      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create connector"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setValues((v) => ({ ...v, ...LEDGERLINE_MANUAL_PRESET }))}
        >
          Fill Ledgerline (BYO client)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setValues((v) => ({ ...v, ...GITHUB_PRESET }))}
        >
          Fill GitHub endpoints
        </Button>
      </div>

      {error && (
        <div className="sm:col-span-2">
          <ErrorAlert text={error} />
        </div>
      )}
      {created && (
        <div className="sm:col-span-2">
          <CreatedAlert created={created} />
        </div>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------------ */

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ErrorAlert({ text }: { text: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Connector creation failed</AlertTitle>
      <AlertDescription>
        <pre className="whitespace-pre-wrap font-mono text-xs">{text}</pre>
      </AlertDescription>
    </Alert>
  );
}

function CreatedAlert({ created, dcr }: { created: Created; dcr?: boolean }) {
  return (
    <Alert>
      <CheckCircle2Icon />
      <AlertTitle>
        Created {created.name}{" "}
        <span className="font-mono text-xs text-muted-foreground">{created.uid}</span>
      </AlertTitle>
      <AlertDescription className="space-y-1">
        {dcr ? (
          <p>
            Connect registered its own OAuth client with the provider and
            attached the connector to this project. It&apos;s listed above —
            click <strong>Connect</strong> to authorize.
          </p>
        ) : created.redirectUri ? (
          <>
            <p>Make sure this callback URL is registered in the provider&apos;s OAuth app:</p>
            <code className="block break-all rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
              {created.redirectUri}
            </code>
          </>
        ) : (
          <p>Attached to this project. Click <strong>Connect</strong> on the new card.</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
