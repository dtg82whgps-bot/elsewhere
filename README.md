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

## Run the full version on your phone (your computer + Expo Go)

This runs the real AI analysis without deploying anything. Your computer runs the API, and your phone runs the app through Expo Go. Both need to be on the same Wi-Fi.

**You need:** Node.js 20.11 or newer, an Anthropic API key with billing enabled (console.anthropic.com), and Expo Go installed on your phone (update it from the App Store or Google Play first).

1. **Start the API** (terminal 1):
   ```bash
   cd server
   npm install
   cp .env.example .env          # Windows: copy .env.example .env
   ```
   Open `.env` and set `ANTHROPIC_API_KEY=` to your key. Then:
   ```bash
   npm run smoke                 # optional: one real research and analysis per mode; a few cents
   npm run dev                   # leave this running; it prints "listening on :8080"
   ```

2. **Find your computer's address on the Wi-Fi.** macOS: `ipconfig getifaddr en0`. Windows: `ipconfig`, the IPv4 address. Linux: `hostname -I`. It looks like `192.168.1.23`.

3. **Start the app** (terminal 2):
   ```bash
   cd mobile
   npm install
   EXPO_PUBLIC_API_URL=http://192.168.1.23:8080 npx expo start
   ```
   Windows PowerShell: `$env:EXPO_PUBLIC_API_URL="http://192.168.1.23:8080"; npx expo start`

4. **Open it on your phone.** Scan the QR code shown in the terminal: with Expo Go on Android, or with the Camera app on iPhone.

5. **Try it:** type "What if I moved to New York?", accept the consent screen, choose an option, wait one to three minutes, then switch modes and ask a follow-up question.

**If it says "could not reach the analysis service":**
- Check that the address is your computer's current Wi-Fi address and that terminal 1 is still running.
- Allow Node through the firewall when prompted (Windows), or allow incoming connections on port 8080.
- Make sure the phone is on the same Wi-Fi and not on mobile data or a VPN.
- iPhone sometimes blocks plain `http://` addresses. Use a secure tunnel instead: run `npx cloudflared tunnel --url http://localhost:8080` in a third terminal, copy the `https://…trycloudflare.com` address it prints, and use that as `EXPO_PUBLIC_API_URL` when you restart step 3.

Expo Go is for testing only. Store builds are covered in `docs/STORE_READINESS.md`.

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
