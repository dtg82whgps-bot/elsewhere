/**
 * QA-only server: the real HTTP app with a scripted model in place of Claude.
 * Used to exercise the mobile UI in a browser without spending API credits.
 * Run:  npx tsx test/mock-server.ts   (listens on :8080)
 */
import { createApp } from "../src/app.js";
import { fakeClient, message, searchBlock, text, validFutures, validProsCons } from "./helpers.js";

function respond(params: any) {
  if (params.tools) {
    return message([
      searchBlock([
        { url: "https://www.census.gov/quickfacts/newyorkcitynewyork", title: "U.S. Census Bureau QuickFacts: New York city" },
        { url: "https://www.bls.gov/oes/current/oes_nat.htm", title: "BLS Occupational Employment Statistics" },
      ]),
      text(
        JSON.stringify({
          summary: "Mock research summary for local QA.",
          facts: [
            { topic: "Population", fact: "Mock fact for layout testing only.", sourceUrl: "https://www.census.gov/quickfacts/newyorkcitynewyork", sourceTitle: "U.S. Census Bureau QuickFacts: New York city" },
          ],
          unknowns: ["Current median rent for a one-bedroom (mock)."],
        }),
      ),
    ]);
  }
  if (params.output_config?.format) {
    const isProsCons = JSON.stringify(params.output_config.format.schema).includes("disadvantages");
    return message([text(JSON.stringify(isProsCons ? validProsCons() : validFutures()))]);
  }
  return message([text("Mock follow-up answer: this is scripted text for layout QA only.")]);
}

const { client } = fakeClient(respond);
const app = createApp({
  client,
  signingKey: "qa-key",
  allowedOrigins: ["http://localhost:8081", "http://127.0.0.1:8081"],
  limits: { research: 1000, analyze: 1000, followup: 1000 },
});
app.listen(8080, () => console.log("mock Elsewhere API on :8080"));
