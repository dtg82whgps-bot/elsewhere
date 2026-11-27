/**
 * Thin wrapper around the Anthropic SDK. All model calls go through here so
 * the model, fallback policy and streaming behaviour live in one place.
 */
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.ELSEWHERE_MODEL ?? "claude-opus-5-5";

/** Thrown when the model's output cannot be used. Carries a safe, user-facing message. */
export class AnalysisError extends Error {
  constructor(
    public readonly code: "refused" | "malformed" | "upstream" | "unavailable",
    message: string,
    public readonly status = 502,
  ) {
    super(message);
  }
}

/**
 * Sends one request with streaming (safe for long outputs) and returns the final
 * message. Server-side fallbacks are enabled by default for refusal handling.
 */
export async function sendMessage(
  client: Anthropic,
  params: Omit<Anthropic.Beta.Messages.MessageCreateParamsNonStreaming, "model" | "stream">,
): Promise<Anthropic.Beta.Messages.BetaMessage> {
  try {
    return await client.beta.messages
      .stream({
        model: MODEL,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        ...params,
      })
      .finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const status = err.status ?? 0;
      console.error(`[anthropic] ${status} ${err.message}`);
      if (status === 429 || status === 529) {
        throw new AnalysisError("unavailable", "Elsewhere is busy right now. Please try again in a minute.", 503);
      }
      if (status === 401 || status === 403) {
        throw new AnalysisError("upstream", "The analysis service is misconfigured. Please try again later.", 500);
      }
      throw new AnalysisError("upstream", "The analysis service could not complete the request. Please try again.");
    }
    throw err;
  }
}

export function textOf(message: { content: readonly unknown[] }): string {
  return message.content
    .flatMap((block) => {
      const b = block as { type?: unknown; text?: unknown };
      return b.type === "text" && typeof b.text === "string" ? [b.text] : [];
    })
    .join("");
}

export class MalformedOutputError extends Error {}

/** Pulls the first JSON object out of model text (handles stray prose or code fences). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const attempts: string[] = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) attempts.push(fenced[1].trim());
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) attempts.push(trimmed.slice(start, end + 1));

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  throw new MalformedOutputError("No valid JSON object in model output.");
}
