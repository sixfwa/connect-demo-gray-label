"use client";

import {
  openConversationInputs,
  useEveAgent,
  type EveMessagePart,
} from "eve/react";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  LoaderIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const SUGGESTIONS = [
  "Create a Notion page titled “Acme deal summary” with three bullet points about a fictional $120k ARR deal closing next quarter.",
  "Search my Notion workspace for pages mentioning “Acme” and summarise them.",
];

export function AgentChat() {
  const agent = useEveAgent();
  const [draft, setDraft] = useState("");
  const busy = agent.status === "submitted" || agent.status === "streaming";
  const resuming = agent.status === "resuming";
  const pending = openConversationInputs(agent.data).map((i) => i.request);

  const submit = (text: string) => {
    const message = text.trim();
    if (!message || resuming) return;
    setDraft("");
    void agent.send(message, busy ? { turnPolicy: "steer" } : undefined);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Card className="flex min-h-[560px] flex-col py-0">
        <CardContent className="flex-1 space-y-5 overflow-y-auto p-6">
          {agent.data.messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No messages yet. Try one of the suggestions, or type a task.
            </p>
          )}
          {agent.data.messages.map((m) => (
            <article key={m.id} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {m.role === "user" ? "Dana" : "Legato agent"}
              </p>
              {m.parts.map((part, i) => (
                <Part key={partKey(part, i)} part={part} />
              ))}
            </article>
          ))}
          {pending.map((request) => (
            <Alert key={request.requestId}>
              <AlertCircleIcon />
              <AlertTitle>
                {request.kind === "tool-approval"
                  ? "Approval required"
                  : request.kind === "question"
                    ? "The agent has a question"
                    : "Session limit reached"}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="whitespace-pre-wrap">{request.prompt}</p>
                <div className="flex flex-wrap gap-2">
                  {request.options?.map((option) => (
                    <Button
                      key={option.id}
                      size="sm"
                      variant={option.id === "approve" ? "default" : "outline"}
                      disabled={resuming}
                      onClick={() =>
                        void agent.respond([
                          { requestId: request.requestId, optionId: option.id },
                        ])
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ))}
          {agent.error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Agent error</AlertTitle>
              <AlertDescription>
                <pre className="whitespace-pre-wrap font-mono text-xs">
                  {String(agent.error.message ?? agent.error)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="border-t p-3 [.border-t]:pt-3">
          <form
            className="flex w-full gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(draft);
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. create a Notion page summarising the Acme deal"
              disabled={resuming}
            />
            <Button
              type="submit"
              disabled={resuming || draft.trim().length === 0}
            >
              {busy ? "Steer" : "Run"}
            </Button>
            {busy && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void agent.cancel()}
              >
                Stop
              </Button>
            )}
          </form>
        </CardFooter>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle className="font-mono text-sm">{agent.status}</CardTitle>
          </CardHeader>
          {agent.session?.sessionId && (
            <CardContent>
              <p className="break-all font-mono text-[11px] text-muted-foreground">
                {agent.session.sessionId}
              </p>
            </CardContent>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Try</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="block w-full rounded-md border p-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </CardContent>
        </Card>
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => agent.reset()}
        >
          New session
        </Button>
      </div>
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
        <Collapsible className="text-xs text-muted-foreground">
          <CollapsibleTrigger className="group flex items-center gap-1">
            <ChevronRightIcon className="size-3 transition-transform group-data-[panel-open]:rotate-90" />
            Thinking
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="mt-1 whitespace-pre-wrap">{part.text}</p>
          </CollapsibleContent>
        </Collapsible>
      ) : null;
    case "dynamic-tool":
      return <ToolStep part={part} />;
    case "authorization":
      return <AuthorizationPrompt part={part} />;
    case "step-start":
      return <Separator />;
    case "file":
      return (
        <p className="text-xs text-muted-foreground">
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
  const icon =
    part.state === "output-error" ? (
      <XIcon className="size-3.5 text-destructive" />
    ) : part.state === "output-available" ? (
      <CheckIcon className="size-3.5" />
    ) : (
      <LoaderIcon className="size-3.5 animate-spin text-muted-foreground" />
    );
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-xs">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{label}</span>
        <Badge variant="outline" className="ml-auto font-mono text-[10px]">
          {part.state}
        </Badge>
      </div>
      {part.input !== undefined && (
        <JsonBlock label="input" value={part.input} />
      )}
      {"output" in part && part.output !== undefined && (
        <JsonBlock label="output" value={part.output} />
      )}
      {"errorText" in part && part.errorText && (
        <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-destructive">
          {part.errorText}
        </pre>
      )}
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <Collapsible className="mt-2">
      <CollapsibleTrigger className="group flex items-center gap-1 text-muted-foreground">
        <ChevronRightIcon className="size-3 transition-transform group-data-[panel-open]:rotate-90" />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-background p-2 font-mono text-[11px]">
          {safeJson(value)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AuthorizationPrompt({
  part,
}: {
  part: Extract<EveMessagePart, { type: "authorization" }>;
}) {
  if (part.state === "completed") {
    return (
      <p className="text-xs text-muted-foreground">
        {part.outcome === "authorized"
          ? `${part.displayName} connected.`
          : `${part.displayName} authorization ${part.outcome}${
              part.reason ? ` (${part.reason})` : ""
            }.`}
      </p>
    );
  }
  return (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>{part.displayName} needs your authorization</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{part.authorization?.instructions ?? part.description}</p>
        {part.authorization?.userCode && (
          <code className="block font-mono">{part.authorization.userCode}</code>
        )}
        {part.authorization?.url && (
          <Button
            size="sm"
            render={
              <a
                href={part.authorization.url}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            Connect {part.displayName}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

function safeJson(v: unknown) {
  try {
    return typeof v === "string" ? v : JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
