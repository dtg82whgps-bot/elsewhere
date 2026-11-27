/**
 * Shared research layer. Runs once per decision and feeds BOTH analysis modes.
 *
 * Claude searches the web for current, credible information relevant to this
 * decision and person. Each fact must cite a URL. The server then keeps only
 * facts whose URL was actually returned by the search tool, so a model cannot
 * invent a source. The brief is signed so later requests (mode switches,
 * follow-ups) can reuse it without the client being able to alter it.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import {
  ResearchBriefSchema,
  ResearchOutputSchema,
  type DecisionContext,
  type ResearchBrief,
} from "./schemas.js";
import { extractJson, MalformedOutputError, sendMessage, textOf } from "./claude.js";

export const RESEARCH_TOOL = {
  type: "web_search_20260209",
  name: "web_search",
  max_uses: 6,
} as const;

const RESEARCH_SYSTEM = `You are the research assistant for Elsewhere, a decision-exploration app.
Your job is to gather current, credible, real-world information that would change how a person should think about a specific decision.

Rules:
- Choose 3 to 6 research topics that materially affect THIS decision and THIS person. Do not research categories that do not matter. Examples for a move to a city: housing costs, typical rents, transport costs, salary ranges for the person's field, cost of living, job market. For a career change: salary ranges, entry requirements, demand for the role. For a business: startup costs, licensing, market size.
- Prefer primary and high-credibility sources: government statistics, official agencies, universities, major news outlets, established industry bodies. Prioritize current information and note the year when it matters.
- Every fact must come from a page you searched or opened, and must include that page's exact URL and title.
- Never invent statistics, prices, or sources. If you cannot find something, put it in "unknowns".
- Keep each fact short and specific (one sentence).

When you have finished searching, reply with ONLY a JSON object of this shape, with no other text:
{"summary": string, "facts": [{"topic": string, "fact": string, "sourceUrl": string, "sourceTitle": string}], "unknowns": [string]}`;

type SearchResultBlock = { type: string; url?: unknown; title?: unknown; content?: unknown };

/** Collects the URLs the search tool actually returned during the turn. */
function collectRetrievedSources(content: unknown[], into: Map<string, string>): void {
  for (const block of content as SearchResultBlock[]) {
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const item of block.content as SearchResultBlock[]) {
      if (item.type === "web_search_result" && typeof item.url === "string") {
        into.set(item.url, typeof item.title === "string" ? item.title : item.url);
      }
    }
  }
}

function describeProfile(context: DecisionContext): string {
  const p = context.profile;
  if (!p) return "(no profile provided; keep assumptions explicit)";
  const lines = Object.entries(p)
    .filter(([, v]) => typeof v === "string" && v.length > 0)
    .map(([k, v]) => `- ${k}: ${v}`);
  return lines.length ? lines.join("\n") : "(no profile details provided)";
}

export function unavailableBrief(reason: string): ResearchBrief {
  return {
    status: "unavailable",
    summary: "",
    facts: [],
    sources: [],
    unknowns: [],
    unavailableReason: reason,
  };
}

export async function runResearch(client: Anthropic, context: DecisionContext): Promise<ResearchBrief> {
  const userPrompt = `<decision>${context.decision}</decision>
<person>
${describeProfile(context)}
</person>

Research the real-world conditions that matter for this decision and this person. Then reply with the JSON object only.`;

  const retrieved = new Map<string, string>();
  let messages: Array<{ role: "user" | "assistant"; content: unknown }> = [{ role: "user", content: userPrompt }];
  let message: Awaited<ReturnType<typeof sendMessage>> | undefined;

  // A long server-side search can pause; resume it (bounded) rather than fail.
  for (let turn = 0; turn < 4; turn++) {
    message = await sendMessage(client, {
      max_tokens: 8000,
      system: RESEARCH_SYSTEM,
      output_config: { effort: "medium" },
      tools: [RESEARCH_TOOL],
      messages: messages as never,
    });
    collectRetrievedSources(message.content as unknown[], retrieved);
    if (message.stop_reason !== "pause_turn") break;
    messages = [...messages, { role: "assistant", content: message.content }];
  }

  if (!message || message.stop_reason === "refusal") {
    return unavailableBrief("Research was not available for this decision.");
  }
  if (retrieved.size === 0) {
    return unavailableBrief("No web sources could be retrieved for this decision right now.");
  }

  let parsed;
  try {
    parsed = ResearchOutputSchema.safeParse(extractJson(textOf(message)));
  } catch (err) {
    if (err instanceof MalformedOutputError) {
      return unavailableBrief("Research results could not be read, so this analysis relies on assumptions only.");
    }
    throw err;
  }
  if (!parsed.success) {
    return unavailableBrief("Research results were incomplete, so this analysis relies on assumptions only.");
  }

  // Keep only facts whose source the search tool really returned.
  const verifiedFacts = parsed.data.facts.filter((f) => retrieved.has(f.sourceUrl));
  const usedUrls = new Set(verifiedFacts.map((f) => f.sourceUrl));
  const sources = [...usedUrls].map((url) => ({ url, title: retrieved.get(url) ?? url }));

  return ResearchBriefSchema.parse({
    status: "ok",
    summary: verifiedFacts.length ? parsed.data.summary : "",
    facts: verifiedFacts,
    sources,
    unknowns: parsed.data.unknowns,
    unavailableReason: verifiedFacts.length ? null : "None of the research findings could be matched to a retrieved source.",
  });
}

// ---------------------------------------------------------------------------
// Signing: the server stamps each brief so it can be reused safely.
// ---------------------------------------------------------------------------

export function makeSigner(key: string) {
  const sign = (brief: ResearchBrief): string =>
    createHmac("sha256", key).update(JSON.stringify(brief)).digest("hex");

  const verify = (brief: ResearchBrief, signature: string): boolean => {
    const expected = Buffer.from(sign(brief), "hex");
    const given = Buffer.from(signature, "hex");
    return expected.length === given.length && timingSafeEqual(expected, given);
  };

  return { sign, verify };
}

