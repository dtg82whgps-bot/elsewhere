/**
 * Types shared with the API. Type-only re-exports: they are erased at build
 * time, so no server code (or zod) is bundled into the app.
 */
export type {
  Profile,
  DecisionContext,
  ResearchBrief,
  ResearchFact,
  FuturesOutput,
  Scenario,
  ScenarioKind,
  ProsConsOutput,
  Advantage,
  Disadvantage,
  ModeId,
} from "../../server/src/schemas";
