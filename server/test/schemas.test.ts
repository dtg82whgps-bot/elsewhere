import { test } from "node:test";
import assert from "node:assert/strict";
import { FuturesOutputSchema, ProsConsOutputSchema, DecisionContextSchema } from "../src/schemas.js";
import { toClaudeJsonSchema } from "../src/json-schema.js";
import { extractJson } from "../src/claude.js";
import { validFutures, validProsCons, point } from "./helpers.js";

test("futures: accepts exactly three scenarios in positive, negative, mixed order", () => {
  assert.equal(FuturesOutputSchema.safeParse(validFutures()).success, true);
});

test("futures: rejects two scenarios", () => {
  const bad = validFutures();
  bad.scenarios = bad.scenarios.slice(0, 2);
  assert.equal(FuturesOutputSchema.safeParse(bad).success, false);
});

test("futures: rejects wrong order or a duplicated kind", () => {
  const bad = validFutures();
  bad.scenarios = [bad.scenarios[1]!, bad.scenarios[0]!, bad.scenarios[2]!];
  assert.equal(FuturesOutputSchema.safeParse(bad).success, false);
  const dup = validFutures();
  dup.scenarios[2] = { ...dup.scenarios[0]! };
  assert.equal(FuturesOutputSchema.safeParse(dup).success, false);
});

test("futures: each kind must fill its own required fields", () => {
  const bad = validFutures();
  bad.scenarios[1]!.warningSigns = []; // negative requires warning signs
  const r = FuturesOutputSchema.safeParse(bad);
  assert.equal(r.success, false);
  assert.match(JSON.stringify(r.error?.issues), /warningSigns/);
});

test("pros & cons: exactly five of each", () => {
  assert.equal(ProsConsOutputSchema.safeParse(validProsCons()).success, true);
  const four = validProsCons();
  four.advantages = four.advantages.slice(0, 4);
  assert.equal(ProsConsOutputSchema.safeParse(four).success, false);
  const six = validProsCons();
  six.disadvantages.push(point(6, "dis"));
  assert.equal(ProsConsOutputSchema.safeParse(six).success, false);
});

test("pros & cons: duplicate titles are rejected", () => {
  const dup = validProsCons();
  dup.advantages[1]!.title = dup.advantages[0]!.title.toUpperCase();
  assert.equal(ProsConsOutputSchema.safeParse(dup).success, false);
});

test("JSON schema sent to Claude has no unsupported keywords and closes objects", () => {
  const json = JSON.stringify(toClaudeJsonSchema(FuturesOutputSchema));
  for (const kw of ["minLength", "maxLength", "minItems", "maxItems", "$schema"]) {
    assert.equal(json.includes(`"${kw}"`), false, `${kw} must be removed`);
  }
  const schema = toClaudeJsonSchema(ProsConsOutputSchema) as any;
  assert.equal(schema.additionalProperties, false);
});

test("decision context: rejects empty and oversized input and unknown fields", () => {
  assert.equal(DecisionContextSchema.safeParse({ decision: "hi" }).success, false);
  assert.equal(DecisionContextSchema.safeParse({ decision: "x".repeat(501) }).success, false);
  assert.equal(DecisionContextSchema.safeParse({ decision: "Move to New York", extra: 1 }).success, false);
  assert.equal(DecisionContextSchema.safeParse({ decision: "What if I moved to New York?" }).success, true);
});

test("extractJson handles bare JSON, fenced JSON, and prose around JSON", () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('Here you go:\n```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(extractJson('Sure. {"a":3} Thanks.'), { a: 3 });
  assert.throws(() => extractJson("no json here"));
});
