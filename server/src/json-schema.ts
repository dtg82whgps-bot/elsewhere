/**
 * Converts a zod schema into the JSON Schema subset Claude's structured
 * outputs accept. Keywords the API does not support (length/size/numeric
 * constraints, formats other than uri/date-time, $schema) are removed here;
 * the full zod schema is still applied to the output afterwards.
 */
import { z } from "zod";

const UNSUPPORTED_KEYWORDS = new Set([
  "$schema",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "pattern",
  "default",
  "examples",
]);

type JsonNode = Record<string, unknown>;

function sanitize(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitize);
  if (node === null || typeof node !== "object") return node;

  const out: JsonNode = {};
  for (const [key, value] of Object.entries(node as JsonNode)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;
    if (key === "format" && value !== "uri" && value !== "date-time") continue;
    out[key] = sanitize(value);
  }
  // Every object must declare additionalProperties: false.
  if (out.type === "object" && out.properties !== undefined) {
    out.additionalProperties = false;
  }
  return out;
}

export function toClaudeJsonSchema(schema: z.ZodType): JsonNode {
  const raw = z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }) as JsonNode;
  return sanitize(raw) as JsonNode;
}
