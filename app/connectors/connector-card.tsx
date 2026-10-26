import { AlertCircleIcon } from "lucide-react";
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
import type { ConnectionStatus } from "@/lib/connect-status";

export function ConnectorCard({
  slug,
  name,
  description,
  uid,
  status,
}: {
  slug: string;
  name: string;
  description: string;
  uid: string;
  status: ConnectionStatus;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <StatusBadge status={status} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-mono text-xs text-muted-foreground">{uid}</p>
        {status.state === "not_attached" && (
          <ErrorNote
            title="Connector not attached to this project"
            detail={`${status.code ?? "error"}: ${status.message}`}
            hint={`vercel connect attach ${uid} --yes`}
          />
        )}
        {status.state === "error" && (
          <ErrorNote
            title="Token request failed"
            detail={`${status.status ?? ""} ${status.code ?? ""} ${status.message}`.trim()}
          />
        )}
      </CardContent>
      <CardFooter className="gap-3">
        <form action={`/api/connectors/${slug}/authorize`} method="post">
          {status.state === "active" ? (
            <Button type="submit" variant="outline" size="sm">
              Reconnect
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={status.state === "not_attached"}
            >
              Connect
            </Button>
          )}
        </form>
        {status.state === "active" && (
          <span className="text-xs text-muted-foreground">
            token valid until{" "}
            {new Date(status.expiresAt).toLocaleTimeString()}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  switch (status.state) {
    case "active":
      return <Badge>Active</Badge>;
    case "not_connected":
      return <Badge variant="outline">Not connected</Badge>;
    case "not_attached":
      return <Badge variant="secondary">Not attached</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
  }
}

export function ErrorNote({
  title,
  detail,
  hint,
}: {
  title: string;
  detail: string;
  hint?: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p className="break-words font-mono text-xs">{detail}</p>
        {hint && (
          <p className="font-mono text-xs text-muted-foreground">
            Fix: {hint}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
