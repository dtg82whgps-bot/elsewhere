# Elsewhere

Explore the realistic consequences of a decision. Describe it, optionally add some details about yourself, then choose how to see it:

- **Three possible futures**: a positive, a negative, and a mixed narrative, each with timelines, financial, career, and lifestyle consequences.
- **Pros & cons**: five advantages and five disadvantages, each tied to your situation.

Both modes share one decision context and one research layer. You can switch between them without re-entering anything, and ask follow-up questions that stay grounded in your decision and the research.

## Layout

| Path | What it is |
|---|---|
| `mobile/` | Expo (React Native) app for iOS and Android. Expo Router, TypeScript. |
| `server/` | Node/TypeScript API. Holds the AI key, runs research and analysis, validates every output. |
| `docs/` | Privacy policy, terms, store-readiness checklist, design notes. |

## Run it locally

Server (needs an Anthropic API key):

```bash
cd server
npm install
cp .env.example .env          # add ANTHROPIC_API_KEY
npm run dev                   # http://localhost:8080
```

App (in a second terminal):

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:8080 npx expo start
```

For a browser preview, set `ALLOWED_ORIGINS=http://localhost:8081` on the server and run `npx expo start --web`.

Without a key, you can run the same HTTP app against a scripted model for UI work: `cd server && npx tsx test/mock-server.ts` (port 8080; its output is placeholder text).

## Tests and checks

```bash
cd server && npm run typecheck && npm test      # 27 tests
cd mobile && npm run typecheck                  # plus: npx expo export --platform ios --platform android
```

## Store releases

See [docs/STORE_READINESS.md](docs/STORE_READINESS.md) for the full checklist: what is already done in code, and what the owner must provide (developer accounts, bundle identifiers, hosted HTTPS API, privacy URL, icons, store forms). Builds use EAS (`eas.json` profiles: `development`, `preview`, `production`).

## How the analysis works

1. **Research** (shared by both modes): Claude searches the web for current, relevant information for the decision and the person. Each fact must cite a URL. Facts whose URL was not returned by the search tool are dropped, so sources cannot be invented. The result is signed.
2. **Analysis**: the mode's schema, the decision, the profile, and the research go to Claude. The output is validated against the mode's schema (exactly three scenarios in order, or exactly five advantages and five disadvantages). One repair attempt is made with precise error messages; otherwise a clear error is shown.
3. **Switch or follow up**: the signed research and the decision context are reused. Switching modes does not run research again.

Analyses are hypothetical and are not financial, legal, or professional advice.
