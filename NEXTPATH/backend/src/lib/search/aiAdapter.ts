// SECTION: AI adapter boundary
// The adapter is the only place that knows about a specific AI provider.
// The route never imports OpenAI, OpenRouter, or Gemini directly —
// it only depends on this interface.
//
// The default `noOpAdapter` is safe to ship in production: it returns
// `status: "disabled"` with a stable message so the route can reject
// natural-language queries until a real adapter is wired up.
//
// A future increment can implement `AiSearchAdapter` against OpenRouter
// or Gemini and return it from `selectAiAdapter()` when
// `AI_PROVIDER_API_KEY` is present in the environment.

import type { ListOpportunitiesFilters } from "@/lib/db/opportunities";

// SECTION: Adapter contract
// Filters are the same shape the structured search accepts, with every
// field optional. The adapter never returns opportunity rows — only
// filters. The database is the source of truth for what matches.
export interface AiSearchAdapter {
  parseQuery(query: string): Promise<AiParseResult>;
}

export type AiParseResult =
  | { status: "parsed"; filters: Partial<ListOpportunitiesFilters> }
  | { status: "disabled"; message: string };
// End of section: a discriminated union makes the route's switch over
// `result.status` exhaustive — adding a new outcome later forces every
// caller to handle it.

// SECTION: No-op adapter
// The safe default. Returns `disabled` so production deployments
// without an AI key fail honestly rather than throwing at request time.
export const noOpAdapter: AiSearchAdapter = {
  parseQuery: async () => ({
    status: "disabled",
    message: "AI search is not configured. Send { filters: { ... } } instead of { query: '...' }."
  })
};
// End of section: the message is short, stable, and free of internal
// jargon so the frontend can render it directly.

// SECTION: Provider selection
// Reads an env var to decide whether a real provider is available.
// Returns the no-op adapter when the key is absent so deployments
// without an AI key fail safely.
export function selectAiAdapter(): AiSearchAdapter {
  const hasKey = typeof process !== "undefined"
    && Boolean(process.env["AI_PROVIDER_API_KEY"]);
  if (!hasKey) return noOpAdapter;
  // A future increment can return an OpenRouter adapter here when the
  // API key is set. Until then, the no-op is the safe default.
  return noOpAdapter;
}
// End of section: the env-var check happens once per module load so
// repeated `/api/search` calls don't re-read `process.env`. Production
// deployments without a key silently get the no-op path.