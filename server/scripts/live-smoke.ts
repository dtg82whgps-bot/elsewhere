/**
 * Live smoke test: calls the real Claude API once for research and once per analysis mode.
 * Needs ANTHROPIC_API_KEY. It costs a small amount per run.
 *
 *   ANTHROPIC_API_KEY=... npm run smoke
 */
import Anthropic from "@anthropic-ai/sdk";
import { generateAnalysis } from "../src/engine.js";
import { getMode } from "../src/modes.js";
import { runResearch } from "../src/research.js";
import type { DecisionContext } from "../src/schemas.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY first.");
  process.exit(2);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
const context: DecisionContext = {
  decision: "What if I moved to New York?",
  profile: { age: "29", location: "Chicago, IL", savings: "$8,000", employment: "Product designer, 3 years" },
};

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
};

async function main() {
  console.log("Researching…");
  const brief = await runResearch(client, context);
  console.log(`  status=${brief.status}, verified facts=${brief.facts.length}, sources=${brief.sources.length}`);
  for (const s of brief.sources) console.log(`  - ${s.title} <${s.url}>`);
  check(brief.status === "ok" && brief.facts.length > 0, "research returned at least one verified, sourced fact");

  for (const id of ["futures", "prosCons"] as const) {
    console.log(`Analyzing (${id})…`);
    const out = (await generateAnalysis(client, getMode(id), context, brief)) as any;
    if (id === "futures") {
      check(out.scenarios.length === 3, "three futures returned");
      check(out.scenarios.map((s: any) => s.kind).join() === "positive,negative,mixed", "futures in order positive, negative, mixed");
    } else {
      check(out.advantages.length === 5 && out.disadvantages.length === 5, "five advantages and five disadvantages returned");
    }
    console.log(`  personalized to profile (mentions $8,000 or Chicago): ${JSON.stringify(out).match(/8,000|Chicago/) ? "yes" : "no"}`);
  }

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
