import type Anthropic from "@anthropic-ai/sdk";

export type Responder = (params: any, callIndex: number) => any;

/** A fake Anthropic client. Records every request and answers with `respond`. */
export function fakeClient(respond: Responder) {
  const calls: any[] = [];
  const client = {
    beta: {
      messages: {
        stream(params: any) {
          const msg = respond(params, calls.length);
          calls.push(params);
          return { finalMessage: async () => msg };
        },
      },
    },
  };
  return { client: client as unknown as Anthropic, calls };
}

export const text = (t: string) => ({ type: "text", text: t });

export function message(content: any[], stop_reason = "end_turn") {
  return { content, stop_reason };
}

export function searchBlock(results: Array<{ url: string; title: string }>) {
  return {
    type: "web_search_tool_result",
    tool_use_id: "srvtoolu_1",
    content: results.map((r) => ({ type: "web_search_result", url: r.url, title: r.title, encrypted_content: "x" })),
  };
}

const longText = (label: string) =>
  `${label}: this is a specific, personalized statement that is long enough to pass validation checks in the schema.`;

export function scenario(kind: string) {
  const base = {
    kind,
    title: `${kind} path for this person`,
    narrative: longText(`${kind} narrative`) + " ".repeat(10) + "You would see the change unfold over several months in concrete ways.",
    timeframe: "about 18 months",
    events: [],
    opportunities: [],
    challenges: [],
    financial: "Savings of $8,000 cover roughly two months of rent at the researched median.",
    career: "Job search takes about four months in this field.",
    lifestyle: "Daily routine shifts toward a longer commute.",
    keyFactors: [],
    actions: [],
    warningSigns: [],
    mitigations: [],
    goesWell: [],
    goesWrong: [],
    unexpectedOpportunities: [],
    unexpectedDifficulties: [],
    gains: [],
    sacrifices: [],
    longTermEffects: "",
    timeline: [{ horizon: "3 months", development: "First rent payment made from savings." }],
  } as Record<string, any>;
  if (kind === "positive") Object.assign(base, { events: ["Lands an interview"], opportunities: ["Network grows"], keyFactors: ["Skills match"], actions: ["Apply to 10 roles a week"] });
  if (kind === "negative") Object.assign(base, { challenges: ["Rent takes most income"], keyFactors: ["Thin savings"], warningSigns: ["Savings under 3 months"], mitigations: ["Keep a 6-month buffer"] });
  if (kind === "mixed") Object.assign(base, { goesWell: ["Career growth"], goesWrong: ["Higher cost"], unexpectedOpportunities: ["New community"], unexpectedDifficulties: ["Loneliness early on"], gains: ["Independence"], sacrifices: ["Savings buffer"], longTermEffects: "Over three years the trade-off settles into a pattern you choose." });
  return base;
}

export function validFutures() {
  return { scenarios: ["positive", "negative", "mixed"].map(scenario), assumptions: ["Salary is the researched median."], unknowns: [], followUpQuestions: [] };
}

export function point(i: number, label = "adv") {
  return {
    title: `${label} consideration number ${i}`,
    explanation: "A detailed explanation of this consideration that is long enough to satisfy the schema constraints.",
    whyItCouldOccur: "The mechanism that makes this likely in practice for this person.",
    relevance: "Relates directly to this person's savings and stated career goals.",
    impact: "Moderate financial effect within the first year.",
    timeframe: "first 6 months",
    mitigation: label === "dis" ? "Keep a three month cash buffer." : undefined,
  };
}

export function validProsCons() {
  const advantages = [1, 2, 3, 4, 5].map((i) => point(i, "adv"));
  const disadvantages = [1, 2, 3, 4, 5].map((i) => point(i, "dis"));
  return { advantages, disadvantages, assumptions: ["Rent is an estimate."], unknowns: [], followUpQuestions: [] };
}
