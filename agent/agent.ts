import { defineAgent } from "eve";

// Model string routes through Vercel AI Gateway (authenticated with the
// deployment's OIDC token — no provider key needed). Low reasoning keeps
// the demo snappy.
export default defineAgent({
  model: "openai/gpt-6-luna-fast",
  reasoning: "low",
});
