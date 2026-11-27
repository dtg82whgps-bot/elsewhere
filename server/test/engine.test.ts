import { test } from "node:test";
import assert from "node:assert/strict";
import { generateAnalysis } from "../src/engine.js";
import { getMode } from "../src/modes.js";
import { runResearch, unavailableBrief } from "../src/research.js";
import { answerFollowUp } from "../src/followup.js";
import { fakeClient, message, text, searchBlock, validFutures, validProsCons } from "./helpers.js";
import type { DecisionContext, ResearchBrief } from "../src/schemas.js";

const context: DecisionContext = {
  decision: "What if I moved to New York?",
  profile: { age: "29", savings: "$8,000", employment: "Product designer", location: "Chicago" },
};

const brief: ResearchBrief = {
  status: "ok",
  summary: "Rents are high.",
  facts: [{ topic: "rent", fact: "Median rent is high.", sourceUrl: "https://example.gov/rent", sourceTitle: "Gov rent data" }],
  sources: [{ url: "https://example.gov/rent", title: "Gov rent data" }],
  unknowns: [],
  unavailableReason: null,
};

test("futures mode: valid output is returned after one call and sent with the mode schema", async () => {
  const { client, calls } = fakeClient(() => message([text(JSON.stringify(validFutures()))]));
  const out = (await generateAnalysis(client, getMode("futures"), context, brief)) as any;
  assert.equal(out.scenarios.length, 3);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].output_config.format.type, "json_schema");
  assert.match(calls[0].messages[0].content, /What if I moved to New York/);
  assert.match(calls[0].messages[0].content, /Gov rent data/);
});

test("pros & cons mode: output is validated and exactly five points are returned", async () => {
  const { client } = fakeClient(() => message([text(JSON.stringify(validProsCons()))]));
  const out = (await generateAnalysis(client, getMode("prosCons"), context, brief)) as any;
  assert.equal(out.advantages.length, 5);
  assert.equal(out.disadvantages.length, 5);
});

test("malformed output is repaired once using precise feedback", async () => {
  const bad = validFutures();
  bad.scenarios = bad.scenarios.slice(0, 2);
  const { client, calls } = fakeClient((_p, i) =>
    message([text(JSON.stringify(i === 0 ? bad : validFutures()))]),
  );
  const out = (await generateAnalysis(client, getMode("futures"), context, brief)) as any;
  assert.equal(out.scenarios.length, 3);
  assert.equal(calls.length, 2);
  assert.match(calls[1].messages[0].content, /exactly three scenarios/);
});

test("two malformed responses produce a clear error and nothing unvalidated", async () => {
  const { client } = fakeClient(() => message([text("not json at all")]));
  await assert.rejects(generateAnalysis(client, getMode("prosCons"), context, brief), (err: any) => {
    assert.equal(err.code, "malformed");
    return true;
  });
});

test("refusal is surfaced as a 422 error", async () => {
  const { client } = fakeClient(() => message([], "refusal"));
  await assert.rejects(generateAnalysis(client, getMode("futures"), context, brief), (err: any) => err.status === 422);
});

test("research keeps only facts whose source the search tool actually returned", async () => {
  const { client } = fakeClient(() =>
    message([
      searchBlock([{ url: "https://example.gov/rent", title: "Gov rent data" }]),
      text(
        JSON.stringify({
          summary: "Summary",
          facts: [
            { topic: "rent", fact: "Real", sourceUrl: "https://example.gov/rent", sourceTitle: "Gov rent data" },
            { topic: "rent", fact: "Invented", sourceUrl: "https://made-up.example/stat", sourceTitle: "Made up" },
          ],
          unknowns: ["Exact 2026 median"],
        }),
      ),
    ]),
  );
  const result = await runResearch(client, context);
  assert.equal(result.status, "ok");
  assert.equal(result.facts.length, 1);
  assert.equal(result.facts[0]!.fact, "Real");
  assert.deepEqual(result.sources.map((s) => s.url), ["https://example.gov/rent"]);
});

test("research reports unavailable when no sources were retrieved", async () => {
  const { client } = fakeClient(() => message([text('{"summary":"x","facts":[],"unknowns":[]}')]));
  const result = await runResearch(client, context);
  assert.equal(result.status, "unavailable");
  assert.ok(result.unavailableReason);
});

test("research resumes a paused server-side search", async () => {
  const { client, calls } = fakeClient((_p, i) =>
    i === 0
      ? message([searchBlock([{ url: "https://example.gov/rent", title: "Gov" }])], "pause_turn")
      : message([
          text(JSON.stringify({ summary: "s", facts: [{ topic: "rent", fact: "f", sourceUrl: "https://example.gov/rent", sourceTitle: "Gov" }], unknowns: [] })),
        ]),
  );
  const result = await runResearch(client, context);
  assert.equal(calls.length, 2);
  assert.equal(result.status, "ok");
});

test("follow-up keeps the decision, profile and research in context and does not regenerate", async () => {
  const { client, calls } = fakeClient(() => message([text("If you had $20,000, the buffer would cover four months.")]));
  const answer = await answerFollowUp(client, {
    context,
    mode: getMode("futures"),
    analysis: validFutures(),
    brief,
    history: [],
    question: "What if I had more money saved?",
  });
  assert.match(answer, /four months/);
  assert.equal(calls.length, 1);
  const sent = calls[0].messages;
  assert.equal(sent[0].role, "user");
  assert.match(sent[0].content, /What if I moved to New York/);
  assert.match(sent[0].content, /\$8,000/);
  assert.match(sent.at(-1).content, /more money saved/);
  assert.equal(calls[0].output_config.format, undefined, "follow-ups are plain text, not structured");
});

test("follow-up messages always alternate roles, even with odd client history", async () => {
  const { client, calls } = fakeClient(() => message([text("ok")]));
  await answerFollowUp(client, {
    context,
    mode: getMode("prosCons"),
    analysis: validProsCons(),
    brief: unavailableBrief("none"),
    history: [
      { role: "assistant", content: "stray assistant first" },
      { role: "user", content: "first question" },
      { role: "user", content: "double user" },
    ],
    question: "latest question",
  });
  const roles: string[] = calls[0].messages.map((m: any) => m.role);
  for (let i = 1; i < roles.length; i++) assert.notEqual(roles[i], roles[i - 1]);
  assert.equal(roles.at(-1), "user");
});
