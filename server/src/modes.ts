/**
 * Analysis mode registry. Each mode is a self-contained definition: its output
 * schema, the instructions it adds to the shared engine, and its token budget.
 * To add a format later, add an entry here; the engine and API do not change.
 */
import { z } from "zod";
import {
  FuturesOutputSchema,
  ProsConsOutputSchema,
  type ModeId,
} from "./schemas.js";
import { toClaudeJsonSchema } from "./json-schema.js";

export interface AnalysisMode {
  id: ModeId;
  label: string;
  description: string;
  schema: z.ZodType;
  jsonSchema: Record<string, unknown>;
  maxTokens: number;
  instructions: string;
}

const FUTURES_INSTRUCTIONS = `
FORMAT: THREE POSSIBLE FUTURES.
Return exactly three scenarios, in this order: "positive", "negative", "mixed".
- Each scenario is a realistic, personalized narrative of how this person's life could unfold after the decision.
- Use the "kind" field to label each scenario.
- positive: predominantly favorable. Fill events, opportunities, keyFactors, and actions (what this person could do to make the outcome more plausible).
- negative: predominantly unfavorable, but NOT exaggerated. Fill challenges, keyFactors, warningSigns, and mitigations (ways to reduce the likelihood or impact).
- mixed: a distinct, believable path with real gains and real costs. It must not be an average of the other two. Fill goesWell, goesWrong, unexpectedOpportunities, unexpectedDifficulties, gains, sacrifices, and longTermEffects.
- Every scenario fills financial, career, and lifestyle with specific, personalized text.
- Every scenario gives a timeframe and a timeline of developments using only these horizons where meaningful: "30 days", "3 months", "1 year", "3 years", "5 years". A timeline does not need every horizon.
- Write the narrative in second person ("you") and make it concrete.
- Describe developments as possibilities, never as guarantees.
`;

const PROS_CONS_INSTRUCTIONS = `
FORMAT: FIVE ADVANTAGES AND FIVE DISADVANTAGES.
Return exactly five entries in "advantages" and exactly five in "disadvantages".
- Every entry has a descriptive, distinct title. No two entries may cover the same consideration.
- explanation: what the point is, in detail.
- whyItCouldOccur: the mechanism that makes it likely or possible.
- relevance: how it connects to this person's specific circumstances (use their profile details, not generic statements).
- impact: the potential size and kind of effect.
- timeframe: when it is most relevant.
- disadvantages also have mitigation: concrete ways to reduce the problem. Leave it an empty string if no mitigation is meaningful.
- Avoid generic observations. If the profile makes a point important (for example a small savings balance), say so and quantify it using the person's numbers.
`;

export const MODES: Record<ModeId, AnalysisMode> = {
  futures: {
    id: "futures",
    label: "Three possible futures",
    description: "Explore three different ways your future could unfold.",
    schema: FuturesOutputSchema,
    jsonSchema: toClaudeJsonSchema(FuturesOutputSchema),
    maxTokens: 32000,
    instructions: FUTURES_INSTRUCTIONS,
  },
  prosCons: {
    id: "prosCons",
    label: "Pros & cons",
    description: "Understand five potential advantages and five potential disadvantages.",
    schema: ProsConsOutputSchema,
    jsonSchema: toClaudeJsonSchema(ProsConsOutputSchema),
    maxTokens: 16000,
    instructions: PROS_CONS_INSTRUCTIONS,
  },
};

export function getMode(id: ModeId): AnalysisMode {
  return MODES[id];
}
