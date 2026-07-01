// ローカル永続化。Capacitor Preferences（ネイティブ）/ localStorage フォールバック。

import { Preferences } from '@capacitor/preferences';

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const { value } = await Preferences.get({ key });
    if (value == null) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await Preferences.set({ key, value: JSON.stringify(value) });
  } catch {
    // ignore
  }
}

export const KEYS = {
  destination: 'ake.destination',
  history: 'ake.history',
  settings: 'ake.settings',
  onboarded: 'ake.onboarded',
} as const;
