/**
 * Safety check for decision text. Explicit self-harm wording is blocked: the app
 * shows crisis resources instead of running an analysis. This is a simple pattern
 * check, so it errs on the side of showing support.
 */
export const CRISIS_MESSAGE =
  "It sounds like you may be going through something really painful. Elsewhere can't help with this, but people can. " +
  "In the US, call or text 988 (Suicide & Crisis Lifeline), any time. Outside the US, see findahelpline.com. " +
  "If you might hurt yourself, call your local emergency number now.";

const CRISIS_PATTERNS = [
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

export function isCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}
