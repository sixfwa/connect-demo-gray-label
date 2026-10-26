import { AgentChat } from "./agent-chat";

export default function AgentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agent</h1>
        <p className="mt-1 text-sm text-muted">
          Give Legato a task. It runs inside the systems you connected, as you.
        </p>
      </div>
      <AgentChat />
    </div>
  );
}
