/**
 * Follow-up questions. These answer a specific question about the analysis the
 * user is looking at. They do NOT regenerate the analysis, and they keep the
 * original decision, profile and research as the ground truth.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { sendMessage, textOf } from "./claude.js";
import type { AnalysisMode } from "./modes.js";
import type { DecisionContext, ResearchBrief } from "./schemas.js";

const FOLLOWUP_SYSTEM = `You are Elsewhere's decision analyst, continuing a conversation about one decision.
- The decision, the person's profile, the research, and the analysis already shown are the ground truth. Stay consistent with them.
- If the question is a hypothetical ("what if I had more savings", "what if I moved with a friend", "what if I waited a year"), say clearly that it is hypothetical, then reason from the person's own numbers and the research. Quantify when you can.
- Answer the question directly first, in about 120 to 300 words. Do not restate the whole analysis.
- When you rely on research, name the source title in the sentence. Never invent figures or sources; if the research does not cover something, say so.
- Plain text only. No headings, no bullet lists unless the question asks for a list.`;

export interface FollowUpInput {
  context: DecisionContext;
  mode: AnalysisMode;
  analysis: unknown;
  brief: ResearchBrief;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  question: string;
}

const MAX_ANALYSIS_CHARS = 60_000;

export async function answerFollowUp(client: Anthropic, input: FollowUpInput): Promise<string> {
  const analysisJson = JSON.stringify(input.analysis).slice(0, MAX_ANALYSIS_CHARS);
  const contextBlock = [
    `<decision>${input.context.decision}</decision>`,
    `<person>${JSON.stringify(input.context.profile ?? {})}</person>`,
    `<research>${JSON.stringify({ summary: input.brief.summary, facts: input.brief.facts, unknowns: input.brief.unknowns })}</research>`,
    `<analysis_shown_to_user format="${input.mode.id}">${analysisJson}</analysis_shown_to_user>`,
  ].join("\n");

  // Context leads the conversation. Consecutive same-role turns are merged so the
  // alternation the API requires always holds, whatever the client sent.
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  const push = (role: "user" | "assistant", content: string) => {
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += `\n\n${content}`;
    else messages.push({ role, content });
  };
  push("user", contextBlock);
  for (const turn of input.history) push(turn.role, turn.content);
  push("user", input.question);

  const message = await sendMessage(client, {
    max_tokens: 2000,
    system: FOLLOWUP_SYSTEM,
    output_config: { effort: "medium" },
    messages,
  });
  if (message.stop_reason === "refusal") {
    return "I can't answer that one. Try asking about a specific part of the decision.";
  }
  return textOf(message).trim();
}
