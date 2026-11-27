import { API_URL } from "./config";
import type { DecisionContext, ModeId, ResearchBrief } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/** A research brief together with the server's signature over it. */
export interface SignedResearch {
  brief: ResearchBrief;
  signature: string;
}

const ANALYSIS_TIMEOUT_MS = 240_000;

async function post<T>(path: string, body: unknown, timeoutMs = ANALYSIS_TIMEOUT_MS): Promise<T> {
  if (!API_URL) {
    throw new ApiError("not_configured", "This build is not connected to the analysis service yet.", 0);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new ApiError(
      aborted ? "timeout" : "network",
      aborted
        ? "That took longer than expected. Please try again."
        : "Elsewhere could not reach the analysis service. Check that the server is running on your computer and that the address is correct, then try again.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    // non-JSON body; handled below
  }
  if (!response.ok) {
    throw new ApiError(
      json?.error?.code ?? "http_error",
      json?.error?.message ?? "Something went wrong. Please try again.",
      response.status,
    );
  }
  if (json === null) {
    throw new ApiError("invalid_response", "The response could not be read. Please try again.", response.status);
  }
  return json as T;
}

export const api = {
  research(context: DecisionContext): Promise<SignedResearch> {
    return post<SignedResearch>("/v1/research", { context });
  },

  async analyze(
    context: DecisionContext,
    mode: ModeId,
    research: SignedResearch,
  ): Promise<{ mode: ModeId; analysis: unknown; brief: ResearchBrief; signature: string }> {
    return post("/v1/analyze", { context, mode, research });
  },

  async followup(input: {
    context: DecisionContext;
    mode: ModeId;
    analysis: unknown;
    research: SignedResearch;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    question: string;
  }): Promise<{ answer: string }> {
    return post("/v1/followup", input, 120_000);
  },
};
