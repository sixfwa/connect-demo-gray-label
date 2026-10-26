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
    <li className="flex flex-col justify-between rounded-lg border border-border bg-panel p-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">{name}</h3>
          <StatusBadge status={status} />
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
        <p className="mt-2 font-mono text-[11px] text-muted/70">{uid}</p>
        {status.state === "not_attached" && (
          <ErrorNote
            title="Connector not attached to this project"
            detail={`${status.code ?? "error"}: ${status.message}`}
            hint={`Run: vercel connect attach ${uid} --yes`}
          />
        )}
        {status.state === "error" && (
          <ErrorNote
            title="Token request failed"
            detail={`${status.status ?? ""} ${status.code ?? ""} ${status.message}`.trim()}
          />
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {status.state === "active" ? (
          <form action={`/api/connectors/${slug}/authorize`} method="post">
            <button className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-text">
              Reconnect
            </button>
          </form>
        ) : (
          <form action={`/api/connectors/${slug}/authorize`} method="post">
            <button
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-black hover:brightness-110 disabled:opacity-40"
              disabled={status.state === "not_attached"}
            >
              Connect
            </button>
          </form>
        )}
        {status.state === "active" && (
          <span className="text-[11px] text-muted">
            token valid until{" "}
            {new Date(status.expiresAt).toLocaleTimeString()}
          </span>
        )}
      </div>
    </li>
  );
}

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  const map = {
    active: { label: "Active", cls: "text-ok border-ok/40 bg-ok/10" },
    not_connected: {
      label: "Not connected",
      cls: "text-muted border-border bg-panel-2",
    },
    not_attached: {
      label: "Not attached",
      cls: "text-warn border-warn/40 bg-warn/10",
    },
    error: { label: "Error", cls: "text-err border-err/40 bg-err/10" },
  } as const;
  const s = map[status.state];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
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
    <div className="mt-3 rounded-md border border-err/30 bg-err/5 p-3 text-xs">
      <p className="font-medium text-err">{title}</p>
      <p className="mt-1 break-words font-mono text-[11px] text-text/80">
        {detail}
      </p>
      {hint && <p className="mt-1 font-mono text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
