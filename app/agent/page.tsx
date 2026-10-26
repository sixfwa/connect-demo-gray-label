import { AgentChat } from "./agent-chat";

export default function AgentPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Agent</h1>
        <p className="text-sm text-muted-foreground">
          Give Legato a task. It runs inside the systems you connected, as you.
        </p>
      </div>
      <AgentChat />
    </div>
  );
}
