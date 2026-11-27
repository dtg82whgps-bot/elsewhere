/**
 * Shared data contracts for Elsewhere's analysis engine.
 *
 * These zod schemas are the single source of truth:
 *  - request/response validation on the server,
 *  - validation of Claude's output before anything is returned to the app,
 *  - the JSON Schema sent to Claude as a structured-output constraint
 *    (generated from these schemas, see json-schema.ts).
 *
 * The mobile app imports the inferred types from here (type-only imports).
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Decision context: the decision plus an OPTIONAL personal profile.
// Every profile field is optional; nothing here is a required questionnaire.
// ---------------------------------------------------------------------------

export const ProfileSchema = z
  .object({
    age: z.string().trim().max(20).optional(),
    location: z.string().trim().max(120).optional(),
    savings: z.string().trim().max(60).optional(),
    income: z.string().trim().max(60).optional(),
    education: z.string().trim().max(200).optional(),
    employment: z.string().trim().max(200).optional(),
    careerGoals: z.string().trim().max(400).optional(),
    priorities: z.string().trim().max(400).optional(),
    notes: z.string().trim().max(800).optional(),
  })
  .strict();
export type Profile = z.infer<typeof ProfileSchema>;

export const DecisionContextSchema = z
  .object({
    decision: z
      .string()
      .trim()
      .min(5, "Describe the decision in a few words.")
      .max(500, "Keep the decision under 500 characters."),
    profile: ProfileSchema.optional(),
  })
  .strict();
export type DecisionContext = z.infer<typeof DecisionContextSchema>;

// ---------------------------------------------------------------------------
// Shared research layer.
// ---------------------------------------------------------------------------

export const ResearchFactSchema = z.object({
  topic: z.string().trim().min(1).max(80),
  fact: z.string().trim().min(1).max(400),
  sourceUrl: z.url(),
  sourceTitle: z.string().trim().min(1).max(200),
});
export type ResearchFact = z.infer<typeof ResearchFactSchema>;

/** What Claude returns from the research step (before server-side source checks). */
export const ResearchOutputSchema = z.object({
  summary: z.string().trim().max(1200),
  facts: z.array(ResearchFactSchema).max(15),
  unknowns: z.array(z.string().trim().max(300)).max(8),
});

/**
 * The research brief the server returns and the app passes back on later
 * requests (mode switches, follow-ups). `facts` only contain sources the
 * server actually retrieved; the signature stops the client from editing it.
 */
export const ResearchBriefSchema = z.object({
  status: z.enum(["ok", "unavailable"]),
  summary: z.string().trim().max(1200),
  facts: z.array(ResearchFactSchema).max(15),
  sources: z.array(z.object({ title: z.string().max(200), url: z.url() })).max(15),
  unknowns: z.array(z.string().trim().max(300)).max(8),
  unavailableReason: z.string().max(400).nullable(),
});
export type ResearchBrief = z.infer<typeof ResearchBriefSchema>;

// ---------------------------------------------------------------------------
// Mode A: three possible futures.
// One flat scenario shape keeps the API schema simple; per-kind requirements
// are enforced by superRefine below.
// ---------------------------------------------------------------------------

export const HORIZONS = ["30 days", "3 months", "1 year", "3 years", "5 years"] as const;
export const SCENARIO_KINDS = ["positive", "negative", "mixed"] as const;
export type ScenarioKind = (typeof SCENARIO_KINDS)[number];

const Items = z.array(z.string().trim().min(3).max(400)).max(8);
const Paragraph = z.string().trim().max(1200);

export const ScenarioSchema = z.object({
  kind: z.enum(SCENARIO_KINDS),
  title: z.string().trim().min(3).max(120),
  narrative: z.string().trim().min(80).max(3000),
  timeframe: z.string().trim().min(3).max(160),
  events: Items, // how events unfold, in order
  opportunities: Items,
  challenges: Items,
  financial: Paragraph,
  career: Paragraph,
  lifestyle: Paragraph,
  keyFactors: Items, // factors contributing to this outcome
  actions: Items, // positive: what the person could do to make it more likely
  warningSigns: Items, // negative: early signals
  mitigations: Items, // negative: ways to reduce likelihood or impact
  goesWell: Items, // mixed
  goesWrong: Items, // mixed
  unexpectedOpportunities: Items, // mixed
  unexpectedDifficulties: Items, // mixed
  gains: Items, // mixed: what the person gains
  sacrifices: Items, // mixed: what the person gives up
  longTermEffects: Paragraph, // mixed: how it affects them over time
  timeline: z
    .array(
      z.object({
        horizon: z.enum(HORIZONS),
        development: z.string().trim().min(10).max(500),
      }),
    )
    .max(5),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

type ScenarioArrayField =
  | "events"
  | "opportunities"
  | "challenges"
  | "keyFactors"
  | "actions"
  | "warningSigns"
  | "mitigations"
  | "goesWell"
  | "goesWrong"
  | "unexpectedOpportunities"
  | "unexpectedDifficulties"
  | "gains"
  | "sacrifices";

/** Fields that must be non-empty for each kind of future. */
const REQUIRED_BY_KIND: Record<ScenarioKind, ScenarioArrayField[]> = {
  positive: ["events", "opportunities", "keyFactors", "actions"],
  negative: ["challenges", "keyFactors", "warningSigns", "mitigations"],
  mixed: ["goesWell", "goesWrong", "unexpectedOpportunities", "unexpectedDifficulties", "gains", "sacrifices"],
};

export const FuturesOutputSchema = z
  .object({
    scenarios: z.array(ScenarioSchema),
    assumptions: Items,
    unknowns: Items,
    followUpQuestions: z.array(z.string().trim().min(5).max(300)).max(2),
  })
  .superRefine((val, ctx) => {
    const kinds = val.scenarios.map((s) => s.kind).join(",");
    if (kinds !== SCENARIO_KINDS.join(",")) {
      ctx.addIssue({
        code: "custom",
        path: ["scenarios"],
        message: "Return exactly three scenarios, in this order: positive, negative, mixed.",
      });
    }
    val.scenarios.forEach((s, i) => {
      for (const field of REQUIRED_BY_KIND[s.kind]) {
        if (s[field].length === 0) {
          ctx.addIssue({
            code: "custom",
            path: ["scenarios", i, field],
            message: `${field} needs at least one item for a ${s.kind} scenario.`,
          });
        }
      }
      if (s.kind === "mixed" && s.longTermEffects.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["scenarios", i, "longTermEffects"],
          message: "A mixed scenario needs a long-term effects paragraph.",
        });
      }
    });
  });
export type FuturesOutput = z.infer<typeof FuturesOutputSchema>;

// ---------------------------------------------------------------------------
// Mode B: five advantages and five disadvantages.
// ---------------------------------------------------------------------------

const PointBase = {
  title: z.string().trim().min(3).max(120),
  explanation: z.string().trim().min(40).max(1200),
  whyItCouldOccur: z.string().trim().min(20).max(800),
  relevance: z.string().trim().min(20).max(800), // how it relates to this person's circumstances
  impact: z.string().trim().min(10).max(600),
  timeframe: z.string().trim().min(3).max(160),
};

export const AdvantageSchema = z.object(PointBase);
export const DisadvantageSchema = z.object({
  ...PointBase,
  mitigation: z.string().trim().max(800), // may be empty when no mitigation is meaningful
});
export type Advantage = z.infer<typeof AdvantageSchema>;
export type Disadvantage = z.infer<typeof DisadvantageSchema>;

const distinctTitles = (titles: string[]) => new Set(titles.map((t) => t.toLowerCase())).size === titles.length;

export const ProsConsOutputSchema = z
  .object({
    advantages: z.array(AdvantageSchema),
    disadvantages: z.array(DisadvantageSchema),
    assumptions: Items,
    unknowns: Items,
    followUpQuestions: z.array(z.string().trim().min(5).max(300)).max(2),
  })
  .superRefine((val, ctx) => {
    if (val.advantages.length !== 5) {
      ctx.addIssue({ code: "custom", path: ["advantages"], message: "Return exactly five advantages." });
    }
    if (val.disadvantages.length !== 5) {
      ctx.addIssue({ code: "custom", path: ["disadvantages"], message: "Return exactly five disadvantages." });
    }
    if (!distinctTitles(val.advantages.map((a) => a.title))) {
      ctx.addIssue({ code: "custom", path: ["advantages"], message: "Each advantage needs a distinct title." });
    }
    if (!distinctTitles(val.disadvantages.map((d) => d.title))) {
      ctx.addIssue({ code: "custom", path: ["disadvantages"], message: "Each disadvantage needs a distinct title." });
    }
  });
export type ProsConsOutput = z.infer<typeof ProsConsOutputSchema>;

// ---------------------------------------------------------------------------
// Analysis modes exposed to the app.
// ---------------------------------------------------------------------------

export const MODE_IDS = ["futures", "prosCons"] as const;
export type ModeId = (typeof MODE_IDS)[number];
export const ModeIdSchema = z.enum(MODE_IDS);

export const AnalysisRequestSchema = z
  .object({
    context: DecisionContextSchema,
    mode: ModeIdSchema,
    research: z
      .object({ brief: ResearchBriefSchema, signature: z.string().length(64) })
      .optional(),
  })
  .strict();

export const ResearchRequestSchema = z.object({ context: DecisionContextSchema }).strict();

export const FollowUpRequestSchema = z
  .object({
    context: DecisionContextSchema,
    mode: ModeIdSchema,
    analysis: z.unknown(), // the analysis the user is looking at; grounding only, re-validated by size below
    research: z.object({ brief: ResearchBriefSchema, signature: z.string().length(64) }),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(2000),
        }),
      )
      .max(12),
    question: z.string().trim().min(3, "Ask a question.").max(500),
  })
  .strict();
