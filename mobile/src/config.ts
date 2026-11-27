import Constants from "expo-constants";

/**
 * Base URL of the Elsewhere API. Set per build profile in eas.json
 * (EXPO_PUBLIC_API_URL). The app never holds an AI provider key.
 */
export const API_URL: string = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const PRIVACY_URL = extra.privacyPolicyUrl ?? "";
export const TERMS_URL = extra.termsUrl ?? "";
export const SUPPORT_EMAIL = extra.supportEmail ?? "";

/** Bump when the description of what is sent to the AI provider changes; users are asked again. */
export const AI_CONSENT_VERSION = "2026-11-27";
