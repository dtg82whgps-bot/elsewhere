/**
 * On-device safety check, so the support message appears even if the server is down.
 * Keep the crisis list in step with server/src/safety.ts.
 */
const CRISIS = [
  /\bkill (myself|me)\b/i,
  /\bend (my|it all|my life)\b/i,
  /\bsuicid/i,
  /\bwant to die\b/i,
  /\bdon'?t want to (live|be alive|exist|wake up)\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bself[- ]?harm/i,
  /\bnot worth living\b/i,
  /\bno reason to live\b/i,
];

// Softer signals: show support resources, but let the person continue.
const SUPPORT = [/\bdepress/i, /\bhopeless/i, /\bcan'?t go on\b/i, /\bfeel(ing)? (empty|worthless)\b/i, /\bso sad\b/i];

export type SafetyLevel = "crisis" | "support" | "none";

export function safetyLevel(text: string): SafetyLevel {
  if (CRISIS.some((p) => p.test(text))) return "crisis";
  if (SUPPORT.some((p) => p.test(text))) return "support";
  return "none";
}
