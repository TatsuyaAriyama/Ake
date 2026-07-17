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
  /** グランス表示（針＋距離だけの最小表示）。 */
  glance: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setUnits: (u: Units) => void;
  setNorthRef: (n: NorthRef) => void;
  setHaptics: (h: boolean) => void;
  setLang: (l: Lang) => void;
  setGlance: (g: boolean) => void;
  toggleGlance: () => void;
}

interface Persisted {
  units: Units;
  northRef: NorthRef;
  haptics: boolean;
  lang: Lang;
  glance: boolean;
}

function persist(s: SettingsState) {
  const data: Persisted = {
    units: s.units,
    northRef: s.northRef,
    haptics: s.haptics,
    lang: s.lang,
    glance: s.glance,
  };
  void saveJSON(KEYS.settings, data);
}

export const useSettings = create<SettingsState>((set, get) => ({
  units: 'km',
  northRef: 'true',
  haptics: true,
  lang: detectLang(),
  glance: false,
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
  setLang(lang) {
    set({ lang });
    persist(get());
  },
  setGlance(glance) {
    set({ glance });
    persist(get());
  },
  toggleGlance() {
    set({ glance: !get().glance });
    persist(get());
  },
}));
