/**
 * HTTP API for the Elsewhere app.
 *
 *   GET  /healthz
 *   POST /v1/research   { context }                      -> { brief, signature }
 *   POST /v1/analyze    { context, mode, research? }     -> { mode, analysis, brief, signature }
 *   POST /v1/followup   { context, mode, analysis, research, history, question } -> { answer }
 *
 * The client never sees the Anthropic key. Research is shared across modes:
 * switching modes sends the existing research back and skips a second search.
 */
import express, { type NextFunction, type Request, type Response } from "express";
import type Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";
import { AnalysisError } from "./claude.js";
import { generateAnalysis } from "./engine.js";
import { answerFollowUp } from "./followup.js";
import { getMode } from "./modes.js";
import { makeSigner, runResearch } from "./research.js";
import {
  AnalysisRequestSchema,
  FollowUpRequestSchema,
  ResearchRequestSchema,
  type ResearchBrief,
} from "./schemas.js";

export interface AppOptions {
  client: Anthropic;
  signingKey: string;
  /** Requests allowed per client IP per hour, per endpoint. */
  limits?: { research?: number; analyze?: number; followup?: number };
  /** Origins allowed to call the API from a browser (web preview only). Empty by default. */
  allowedOrigins?: string[];
  /** Milliseconds per window; overridable for tests. */
  windowMs?: number;
}

class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

/** Fixed-window per-IP limiter. Simple and sufficient for a single instance. */
function rateLimit(name: string, max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        return next(new HttpError(429, "rate_limited", "You have made many requests recently. Please wait a little and try again."));
      }
    }
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    next();
  };
}

export function createApp(options: AppOptions): express.Express {
  const { client, signingKey } = options;
  const signer = makeSigner(signingKey);
  const windowMs = options.windowMs ?? 60 * 60 * 1000;
  const limits = { research: 20, analyze: 30, followup: 60, ...options.limits };

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "64kb" }));

  // CORS is opt-in. Native apps do not need it; it exists for the web preview only.
  const allowedOrigins = (options.allowedOrigins ?? []).map((o) => o.trim()).filter(Boolean);
  if (allowedOrigins.length > 0) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "content-type, accept");
      }
      if (req.method === "OPTIONS") return res.status(204).end();
      next();
    });
  }

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/v1/research", rateLimit("research", limits.research, windowMs), async (req, res) => {
    const parsed = ResearchRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_request", firstIssue(parsed.error));
    const brief = await runResearch(client, parsed.data.context);
    res.json({ brief, signature: signer.sign(brief) });
  });

  app.post("/v1/analyze", rateLimit("analyze", limits.analyze, windowMs), async (req, res) => {
    const parsed = AnalysisRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_request", firstIssue(parsed.error));
    const { context, mode: modeId } = parsed.data;

    let brief: ResearchBrief;
    let signature: string;
    if (parsed.data.research) {
      const { brief: given, signature: sig } = parsed.data.research;
      if (!signer.verify(given, sig)) {
        throw new HttpError(400, "research_invalid", "The research for this decision has expired. Please try again.");
      }
      brief = given;
      signature = sig;
    } else {
      brief = await runResearch(client, context);
      signature = signer.sign(brief);
    }

    const analysis = await generateAnalysis(client, getMode(modeId), context, brief);
    res.json({ mode: modeId, analysis, brief, signature });
  });

  app.post("/v1/followup", rateLimit("followup", limits.followup, windowMs), async (req, res) => {
    const parsed = FollowUpRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_request", firstIssue(parsed.error));
    const { context, mode, analysis, research, history, question } = parsed.data;
    if (!signer.verify(research.brief, research.signature)) {
      throw new HttpError(400, "research_invalid", "The research for this decision has expired. Please try again.");
    }
    const answer = await answerFollowUp(client, {
      context,
      mode: getMode(mode),
      analysis,
      brief: research.brief,
      history,
      question,
    });
    res.json({ answer });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: "not_found", message: "Not found." } });
  });

  // Error mapping: callers only ever receive a safe, human-readable message.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof AnalysisError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof ZodError) {
      return res.status(400).json({ error: { code: "invalid_request", message: firstIssue(err) } });
    }
    if (err instanceof SyntaxError && "body" in (err as object)) {
      return res.status(400).json({ error: { code: "invalid_json", message: "The request was not valid JSON." } });
    }
    if (err instanceof Error && /request entity too large/i.test(err.message)) {
      return res.status(413).json({ error: { code: "too_large", message: "The request is too large." } });
    }
    console.error("[server] unhandled error:", err);
    return res.status(500).json({ error: { code: "internal", message: "Something went wrong. Please try again." } });
  });

  return app;
}

function firstIssue(error: ZodError): string {
  return error.issues[0]?.message ?? "The request is not valid.";
}
