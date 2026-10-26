"use client";

import { useEveAgent, type EveMessagePart } from "eve/react";
import { useState } from "react";

const SUGGESTIONS = [
  "Create a Notion page titled “Acme deal summary” with three bullet points about a fictional $120k ARR deal closing next quarter.",
  "Search my Notion workspace for pages mentioning “Acme” and summarise them.",
];

export function AgentChat() {
  const agent = useEveAgent();
  const [draft, setDraft] = useState("");
  const busy = agent.status === "submitted" || agent.status === "streaming";

  const submit = (text: string) => {
    const message = text.trim();
    if (!message || agent.status === "resuming") return;
    setDraft("");
    void agent.send(message, busy ? { turnPolicy: "steer" } : undefined);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <section className="flex min-h-[520px] flex-col rounded-lg border border-border bg-panel">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {agent.data.messages.length === 0 && (
            <p className="text-sm text-muted">
              No messages yet. Try one of the suggestions, or type a task.
            </p>
          )}
          {agent.data.messages.map((m) => (
            <article key={m.id} className="space-y-2">
              <header className="text-[11px] uppercase tracking-wider text-muted">
                {m.role === "user" ? "Dana" : "Legato agent"}
              </header>
              {m.parts.map((part, i) => (
                <Part key={partKey(part, i)} part={part} />
              ))}
            </article>
          ))}
          {agent.error && (
            <div className="rounded-md border border-err/30 bg-err/5 p-3 text-xs">
              <p className="font-medium text-err">Agent error</p>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-text/80">
                {String(agent.error.message ?? agent.error)}
              </pre>
            </div>
          )}
        </div>

        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. create a Notion page summarising the Acme deal"
            className="flex-1 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-accent"
            disabled={agent.status === "resuming"}
          />
          <button
            type="submit"
            disabled={agent.status === "resuming" || draft.trim().length === 0}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110 disabled:opacity-40"
          >
            {busy ? "Steer" : "Run"}
          </button>
          {busy && (
            <button
              type="button"
              onClick={() => void agent.cancel()}
              className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:text-text"
            >
              Stop
            </button>
          )}
        </form>
      </section>

      <aside className="space-y-4 text-sm">
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Status
          </p>
          <p className="mt-1 font-mono text-xs">{agent.status}</p>
          {agent.session?.sessionId && (
            <p className="mt-1 break-all font-mono text-[10px] text-muted">
              session {agent.session.sessionId}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Try
          </p>
          <ul className="mt-2 space-y-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => submit(s)}
                  className="text-left text-xs text-muted hover:text-text"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => agent.reset()}
          className="text-xs text-muted hover:text-text"
        >
          New session
        </button>
      </aside>
    </div>
  );
}

function partKey(part: EveMessagePart, i: number) {
  if ("id" in part && part.id) return part.id;
  if (part.type === "dynamic-tool") return part.toolCallId;
  if (part.type === "authorization") return `auth-${part.attemptId ?? i}`;
  return `${part.type}-${i}`;
}

function Part({ part }: { part: EveMessagePart }) {
  switch (part.type) {
    case "text":
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {part.text}
        </p>
      );
    case "reasoning":
      return part.text ? (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer">Thinking</summary>
          <p className="mt-1 whitespace-pre-wrap">{part.text}</p>
        </details>
      ) : null;
    case "dynamic-tool":
      return <ToolStep part={part} />;
    case "authorization":
      return <AuthorizationPrompt part={part} />;
    case "step-start":
      return <hr className="border-border/60" />;
    case "file":
      return (
        <p className="text-xs text-muted">
          file: {part.filename ?? part.mediaType}
        </p>
      );
    default:
      return null;
  }
}

function ToolStep({
  part,
}: {
  part: Extract<EveMessagePart, { type: "dynamic-tool" }>;
}) {
  const label = part.toolMetadata?.eve?.label ?? part.toolName;
  const dotCls =
    part.state === "output-error"
      ? "bg-err"
      : part.state === "output-available"
        ? "bg-ok"
        : "bg-warn animate-pulse";
  return (
    <div className="rounded-md border border-border bg-panel-2 p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${dotCls}`} />
        <span className="font-medium">{label}</span>
        <span className="font-mono text-[10px] text-muted">{part.state}</span>
      </div>
      {part.input !== undefined && (
        <details className="mt-2">
          <summary className="cursor-pointer text-muted">input</summary>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-text/80">
            {safeJson(part.input)}
          </pre>
        </details>
      )}
      {"output" in part && part.output !== undefined && (
        <details className="mt-2">
          <summary className="cursor-pointer text-muted">output</summary>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-text/80">
            {safeJson(part.output)}
          </pre>
        </details>
      )}
      {"errorText" in part && part.errorText && (
        <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-err">
          {part.errorText}
        </pre>
      )}
    </div>
  );
}

function AuthorizationPrompt({
  part,
}: {
  part: Extract<EveMessagePart, { type: "authorization" }>;
}) {
  if (part.state === "completed") {
    return (
      <p className="text-xs text-muted">
        {part.outcome === "authorized"
          ? `${part.displayName} connected.`
          : `${part.displayName} authorization ${part.outcome}${
              part.reason ? ` (${part.reason})` : ""
            }.`}
      </p>
    );
  }
  return (
    <div className="rounded-md border border-accent/40 bg-accent/5 p-3 text-xs">
      <p className="font-medium">{part.displayName} needs your authorization</p>
      <p className="mt-1 text-muted">
        {part.authorization?.instructions ?? part.description}
      </p>
      {part.authorization?.userCode && (
        <code className="mt-2 block font-mono">{part.authorization.userCode}</code>
      )}
      {part.authorization?.url && (
        <a
          href={part.authorization.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block rounded-md bg-accent px-3 py-1.5 font-medium text-black"
        >
          Connect {part.displayName}
        </a>
      )}
    </div>
  );
}

function safeJson(v: unknown) {
  try {
    return typeof v === "string" ? v : JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
