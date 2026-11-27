import { randomBytes } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createApp } from "./app.js";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is not set. The server cannot run analyses without it.");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 8080);
// If unset, a random key is used: research tokens then expire when the server restarts,
// and the app simply runs research again. Set it in production for stable tokens.
const signingKey = process.env.RESEARCH_SIGNING_KEY ?? randomBytes(32).toString("hex");

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",");

const app = createApp({
  client: new Anthropic({ apiKey, maxRetries: 2, timeout: 10 * 60 * 1000 }),
  signingKey,
  allowedOrigins,
});

app.listen(port, () => {
  console.log(`Elsewhere API listening on :${port}`);
});
