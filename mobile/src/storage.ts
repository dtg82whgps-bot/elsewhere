import AsyncStorage from "@react-native-async-storage/async-storage";
import { AI_CONSENT_VERSION } from "./config";
import type { Profile } from "./types";

/*
 * Everything stored here stays on the device. Storage failures never block the
 * app: the profile simply does not persist and the user can continue.
 */
const PROFILE_KEY = "elsewhere.profile.v1";
const CONSENT_KEY = "elsewhere.aiConsent.v1";

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : {};
  } catch {
    return {};
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // non-fatal
  }
}

export async function hasAiConsent(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as { version?: string }).version === AI_CONSENT_VERSION;
  } catch {
    return false;
  }
}

export async function grantAiConsent(): Promise<void> {
  try {
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({ version: AI_CONSENT_VERSION, at: new Date().toISOString() }));
  } catch {
    // non-fatal: the user will simply be asked again next time
  }
}

/** Deletes everything the app keeps on this device. */
export async function deleteLocalData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
    await AsyncStorage.removeItem(CONSENT_KEY);
  } catch {
    // non-fatal
  }
}

/** Returns a profile with empty fields removed, or undefined if nothing was entered. */
export function compactProfile(profile: Profile): Profile | undefined {
  const entries = Object.entries(profile).filter(([, v]) => typeof v === "string" && v.trim().length > 0);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries.map(([k, v]) => [k, (v as string).trim()])) as Profile;
}
