/**
 * The shared analysis engine. Both modes run through generateAnalysis():
 * the same decision context, the same research brief, the same system rules;
 * only the mode's instructions and output schema differ.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { AnalysisError, extractJson, MalformedOutputError, sendMessage, textOf } from "./claude.js";
import type { AnalysisMode } from "./modes.js";
import type { DecisionContext, ResearchBrief } from "./schemas.js";

const SYSTEM = `You are Elsewhere's decision analyst. You help a person see realistic consequences of a decision they are considering.

Ground rules:
- Personalize everything. Use the person's profile details wherever they matter, and quantify with their numbers when the profile gives them (for example, savings against the cost of a move).
- Decide which factors actually matter for this decision. Do not fill categories with generic points, and do not force irrelevant categories in.
- Facts vs. hypotheticals: statements about the real world (prices, wages, rules, statistics) must come from the RESEARCH section and may be cited by source title. Anything not in RESEARCH is an assumption or a hypothetical estimate: say so in the text, and list it under "assumptions". Never invent statistics, prices, sources, or citations.
- Describe possibilities, never guarantees. Do not exaggerate risks or benefits.
- If important information is missing, state a clear assumption. Ask at most two follow-up questions, and only if the answer would change the analysis materially. Otherwise leave followUpQuestions empty.
- Write in plain, warm, specific language. No moralizing, no hype.
- Reply with ONLY a JSON object matching the required schema. No text outside the JSON.`;

function formatResearch(brief: ResearchBrief): string {
  if (brief.status !== "ok" || brief.facts.length === 0) {
    return `RESEARCH: unavailable (${brief.unavailableReason ?? "no verified research"}). Treat all real-world figures as assumptions and say so.`;
  }
  const facts = brief.facts
    .map((f, i) => `${i + 1}. [${f.topic}] ${f.fact} (source: ${f.sourceTitle} <${f.sourceUrl}>)`)
    .join("\n");
  const unknowns = brief.unknowns.length ? `\nKnown unknowns:\n- ${brief.unknowns.join("\n- ")}` : "";
  return `RESEARCH (verified facts; each cites a retrieved source):\n${brief.summary}\n${facts}${unknowns}`;
}

function describeProfile(context: DecisionContext): string {
  const p = context.profile;
  if (!p) return "(no profile provided)";
  const lines = Object.entries(p)
    .filter(([, v]) => typeof v === "string" && v.length > 0)
    .map(([k, v]) => `- ${k}: ${v}`);
  return lines.length ? lines.join("\n") : "(no profile details provided)";
}

function buildUserPrompt(mode: AnalysisMode, context: DecisionContext, brief: ResearchBrief, feedback?: string): string {
  return [
    `<decision>${context.decision}</decision>`,
    `<person>\n${describeProfile(context)}\n</person>`,
    `<research>\n${formatResearch(brief)}\n</research>`,
    `<task>\n${mode.instructions.trim()}\n</task>`,
    feedback
      ? `<fix_required>Your previous reply did not match the required schema. Fix these problems and reply with the complete corrected JSON:\n${feedback}</fix_required>`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function summarizeIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues
    .slice(0, 12)
    .map((i) => `- ${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

/**
 * Generates and validates one analysis. The output is checked against the mode's
 * zod schema before it is returned; one repair attempt is made with precise
 * feedback, then a clear error is raised. Nothing unvalidated is returned.
 */
export async function generateAnalysis(
  client: Anthropic,
  mode: AnalysisMode,
  context: DecisionContext,
  brief: ResearchBrief,
): Promise<unknown> {
  let feedback: string | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const message = await sendMessage(client, {
      max_tokens: mode.maxTokens,
      system: SYSTEM,
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: mode.jsonSchema },
      },
      messages: [{ role: "user", content: buildUserPrompt(mode, context, brief, feedback) }],
    });

    if (message.stop_reason === "refusal") {
      throw new AnalysisError("refused", "This decision could not be analyzed. Try rephrasing it.", 422);
    }

    let raw: unknown;
    try {
      raw = extractJson(textOf(message));
    } catch (err) {
      if (!(err instanceof MalformedOutputError)) throw err;
      feedback = "- The reply was not a single valid JSON object.";
      continue;
    }

    const parsed = mode.schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    feedback = summarizeIssues(parsed.error);
  }

  throw new AnalysisError("malformed", "The analysis could not be completed in a valid format. Please try again.");
}
