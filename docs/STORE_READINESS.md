# Store readiness: Apple App Store and Google Play

This is the checklist for submitting Elsewhere. Each item is marked:

- **Done in code**: implemented and checked in this repository.
- **Owner action**: needs an account, a decision, or a live service that only the owner can provide.
- **Verify before submit**: a store policy that changes over time; confirm it in the current console.

## 1. Technical build

| Item | Status |
|---|---|
| Expo SDK 58, React Native 0.88, New Architecture enabled | Done in code |
| Both platforms bundle with no errors (`expo export --platform ios --platform android`) | Done, verified |
| Typecheck clean (`npm run typecheck` in `mobile/` and `server/`) | Done, verified |
| Server test suite passes (27 tests: schemas, engine, research sourcing, follow-ups, HTTP, rate limits, signatures) | Done, verified |
| Browser end-to-end run at 390px width: consent, mode choice, both analyses, mode switch, follow-up, no console errors, no horizontal scroll | Done, verified against a scripted model (see note) |
| Real model output verified against Claude | **Not verified here**: the sandbox has no `ANTHROPIC_API_KEY`. Run one real analysis per mode before submitting. |
| No secrets in the app bundle; the key lives only on the server | Done in code |
| Works on phone and tablet (`supportsTablet: true`, max content width 680px) | Done in code, tablet not visually verified |
| Portrait only | Done in code |
| Offline and network-error states show a message and a retry | Done in code |

## 2. Identity and configuration (owner action)

| Item | Status |
|---|---|
| Replace bundle identifier `com.elsewhere.app` (iOS) and package `com.elsewhere.app` (Android) with identifiers you own | **Owner action**, set in `mobile/app.json` |
| Confirm the app name "Elsewhere" is available on both stores and does not conflict with a trademark | **Owner action** |
| Set `EXPO_PUBLIC_API_URL` in `eas.json` `production` to your HTTPS API | **Owner action**. Store builds must not point at localhost or example.com. |
| Replace placeholder `privacyPolicyUrl`, `termsUrl`, `supportEmail` in `app.json` | **Owner action** |
| Replace the generated placeholder icon and splash artwork with final brand artwork (1024×1024, no transparency for iOS) | **Owner action**. The current icon is a functional placeholder. |
| Version and build numbers: `version` 1.0.0; iOS `buildNumber` 1; Android `versionCode` 1 (EAS auto-increments the production build) | Done in code |

## 3. Apple App Store

| Requirement | Status |
|---|---|
| Privacy policy URL, entered in App Store Connect and reachable without login | **Owner action**, text in `docs/PRIVACY_POLICY.md` |
| App Privacy "nutrition label": declare the decision text and optional profile data as collected and linked to the user, not used for tracking. Declare any diagnostics you add later. | **Owner action**, answers are in the table below |
| Disclosure and permission before sharing personal data with a third-party AI service (App Review Guideline 5.1 privacy section) | Done in code: consent sheet shown before the first analysis, and re-asked when the consent version changes |
| No tracking (no ATT prompt needed). The app does not link to ad or analytics SDKs. | Done in code |
| Export compliance: `ITSAppUsesNonExemptEncryption` = false (HTTPS only) | Done in code |
| No login, so no Sign in with Apple and no account deletion requirement. If you add accounts later, both apply. | Done (none needed now) |
| In-app privacy policy and terms | Done in code (Privacy & terms screen) |
| Not-professional-advice disclaimer on every analysis | Done in code |
| Account-free app works for review: the reviewer needs a working HTTPS API. Keep it online during review. | **Owner action** |
| App Review notes: explain that analyses are hypothetical, research cites sources, and how to reach the consent screen | **Owner action**, draft: "Enter any decision (e.g. 'What if I moved to New York?'), tap Continue, accept the consent, choose an option." |
| Age rating questionnaire: no user-generated public content, no gambling, no medical content; answer "Infrequent/Mild" only where the AI output could mention finances or health. Expected rating 12+ or 17+ depending on your answers; the app is not intended for under-18s. | **Owner action** |
| Build with the current Xcode and iOS SDK required by Apple at submission time (EAS builds use the current toolchain) | **Verify before submit** |
| Screenshots for required device sizes | **Owner action** |

## 4. Google Play

| Requirement | Status |
|---|---|
| Target API level: Expo's default `targetSdkVersion` is 36, read from the installed Expo build tooling | Done in code. **Verify before submit**: Play Console's current minimum target API for new apps. |
| Privacy policy URL, in Play Console | **Owner action** |
| Data safety form: declare the decision text and optional profile data are collected, sent off-device to the analysis service and to Anthropic, encrypted in transit, not sold, and deletable by the user. Declare no advertising ID. | **Owner action**, answers as above. Matches `docs/PRIVACY_POLICY.md`. |
| Permissions: only `INTERNET`. Location, camera, microphone, storage, and contacts are blocked explicitly in `app.json`. | Done in code |
| Cleartext traffic disabled (HTTPS only) | Done in code (default), confirm in release build |
| Backup disabled for personal data (`allowBackup: false`) | Done in code |
| Content rating questionnaire (IARC) | **Owner action** |
| Target audience: not designed for children; do not select child audiences | **Owner action** |
| Developer verification and account requirements for new personal developer accounts | **Verify before submit** |
| Adaptive icon with monochrome layer | Done in code (placeholder artwork, replace in section 2) |
| Store listing: short description, full description, screenshots, feature graphic | **Owner action** |

## 5. Backend (required for both stores)

| Item | Status |
|---|---|
| Deploy `server/` on HTTPS. A `Dockerfile` is provided. | Done in code. **Owner action** to host it. |
| Set `ANTHROPIC_API_KEY`, `RESEARCH_SIGNING_KEY` (long random string), and optionally `ELSEWHERE_MODEL` | **Owner action**, see `server/.env.example` |
| Leave `ALLOWED_ORIGINS` empty for native builds | Done in code (CORS off by default) |
| Rate limits per IP (20 research, 30 analyze, 60 follow-up per hour) | Done in code. In-memory, so use one instance or move the counter to shared storage before scaling. |
| Logs do not contain decision or profile text | Done in code for error logging; review your hosting provider's request logs and set retention |
| Uptime during review and for users | **Owner action** |

## 6. Known gaps

- Real model output has not been checked against the live Claude API here (no key in this environment).
- The web research step depends on the search tool returning results. When it does not, the analysis says so and treats figures as assumptions.
- Expo's online documentation (`docs.expo.dev`) and `expo install` could not be reached from this environment. Packages were installed with npm and versions chosen from the npm registry to match SDK 58 peer ranges. Run `npx expo install --check` and `npx expo-doctor` on a machine with access before the first build.
- No EAS build has been run. Builds and submission need your Expo account (`npx eas-cli@latest build` and `eas submit`) and store developer accounts.
