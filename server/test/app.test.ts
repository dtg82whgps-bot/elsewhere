import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { makeSigner } from "../src/research.js";
import { fakeClient, message, text, searchBlock, validFutures, validProsCons } from "./helpers.js";

const KEY = "test-signing-key";

/** Routes the fake model by its purpose: research (has tools) vs analysis (has a schema). */
function router(params: any) {
  if (params.tools) {
    return message([
      searchBlock([{ url: "https://example.gov/rent", title: "Gov rent data" }]),
      text(JSON.stringify({ summary: "Rents are high.", facts: [{ topic: "rent", fact: "Median rent is high.", sourceUrl: "https://example.gov/rent", sourceTitle: "Gov rent data" }], unknowns: ["Exact figure"] })),
    ]);
  }
  if (params.output_config?.format) {
    const isProsCons = JSON.stringify(params.output_config.format.schema).includes("disadvantages");
    return message([text(JSON.stringify(isProsCons ? validProsCons() : validFutures()))]);
  }
  return message([text("Answer about the decision.")]);
}

const { client, calls } = fakeClient(router);
const app = createApp({ client, signingKey: KEY, limits: { research: 100, analyze: 100, followup: 100 } });
let server: Server;
let base = "";

before(async () => {
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const post = (path: string, body: unknown) =>
  fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const context = { decision: "Moving to New York for a design job", profile: { savings: "$8,000" } };

test("health check and unknown routes", async () => {
  assert.equal((await fetch(base + "/healthz")).status, 200);
  assert.equal((await fetch(base + "/nope")).status, 404);
});

test("analyze in futures mode returns exactly three scenarios with research attached", async () => {
  const res = await post("/v1/analyze", { context, mode: "futures" });
  assert.equal(res.status, 200);
  const body: any = await res.json();
  assert.equal(body.mode, "futures");
  assert.equal(body.analysis.scenarios.length, 3);
  assert.equal(body.brief.status, "ok");
  assert.match(body.signature, /^[0-9a-f]{64}$/);
});

test("switching modes reuses the research and keeps the same decision and profile", async () => {
  const first: any = await (await post("/v1/analyze", { context, mode: "futures" })).json();
  const before = calls.length;
  const second: any = await (
    await post("/v1/analyze", { context, mode: "prosCons", research: { brief: first.brief, signature: first.signature } })
  ).json();

  assert.equal(second.analysis.advantages.length, 5);
  assert.equal(second.analysis.disadvantages.length, 5);
  // Only one analysis call was made for the switch: no second web research.
  assert.equal(calls.length - before, 1);
  assert.ok(!calls.slice(before).some((c) => c.tools), "no research call on mode switch");
  const sentPrompt = calls.at(-1).messages[0].content as string;
  assert.match(sentPrompt, /Moving to New York for a design job/);
  assert.match(sentPrompt, /savings: \$8,000/);
});

test("a tampered research brief is refused", async () => {
  const first: any = await (await post("/v1/analyze", { context, mode: "futures" })).json();
  const tampered = { ...first.brief, facts: [{ ...first.brief.facts[0], fact: "Invented" }] };
  const res = await post("/v1/analyze", { context, mode: "prosCons", research: { brief: tampered, signature: first.signature } });
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as any).error.code, "research_invalid");
});

test("follow-up answers using the existing analysis, research and signature", async () => {
  const first: any = await (await post("/v1/analyze", { context, mode: "futures" })).json();
  const res = await post("/v1/followup", {
    context,
    mode: "futures",
    analysis: first.analysis,
    research: { brief: first.brief, signature: first.signature },
    history: [],
    question: "What if I waited another year?",
  });
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as any).answer, "Answer about the decision.");
});

test("invalid requests are rejected with a safe message", async () => {
  const res = await post("/v1/analyze", { context: { decision: "hi" }, mode: "futures" });
  assert.equal(res.status, 400);
  const bad = await post("/v1/analyze", { context, mode: "tarot" });
  assert.equal(bad.status, 400);
  const notJson = await fetch(base + "/v1/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: "{oops" });
  assert.equal(notJson.status, 400);
});

test("rate limits are enforced per endpoint", async () => {
  const limited = createApp({ client, signingKey: KEY, limits: { research: 1 } });
  const s = limited.listen(0);
  await new Promise<void>((r) => s.once("listening", () => r()));
  const url = `http://127.0.0.1:${(s.address() as AddressInfo).port}/v1/research`;
  const send = () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ context }) });
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 429);
  s.close();
});

test("signature helper agrees with the server's own signatures", async () => {
  const first: any = await (await post("/v1/analyze", { context, mode: "futures" })).json();
  assert.equal(makeSigner(KEY).verify(first.brief, first.signature), true);
  assert.equal(makeSigner("other").verify(first.brief, first.signature), false);
});
