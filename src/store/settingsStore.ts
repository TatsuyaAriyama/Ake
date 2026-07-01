import { create } from 'zustand';
import { KEYS, loadJSON, saveJSON } from '../lib/storage';
import { detectLang, type Lang } from '../lib/i18n';

export type Units = 'km' | 'mi';
export type NorthRef = 'true' | 'magnetic';

interface SettingsState {
  units: Units;
  northRef: NorthRef;
  haptics: boolean;
  lang: Lang;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setUnits: (u: Units) => void;
  setNorthRef: (n: NorthRef) => void;
  setHaptics: (h: boolean) => void;
}

interface Persisted {
  units: Units;
  northRef: NorthRef;
  haptics: boolean;
  lang: Lang;
}

function persist(s: SettingsState) {
  const data: Persisted = {
    units: s.units,
    northRef: s.northRef,
    haptics: s.haptics,
    lang: s.lang,
  };
  void saveJSON(KEYS.settings, data);
}

export const useSettings = create<SettingsState>((set, get) => ({
  units: 'km',
  northRef: 'true',
  haptics: true,
  lang: detectLang(),
  hydrated: false,

  async hydrate() {
    const data = await loadJSON<Persisted | null>(KEYS.settings, null);
    if (data) {
      set({ ...data, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },

  setUnits(units) {
    set({ units });
    persist(get());
  },
  setNorthRef(northRef) {
    set({ northRef });
    persist(get());
  },
  setHaptics(haptics) {
    set({ haptics });
    persist(get());
  },
}));
