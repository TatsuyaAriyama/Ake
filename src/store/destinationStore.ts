import { create } from 'zustand';
import { KEYS, loadJSON, saveJSON } from '../lib/storage';
import type { Place } from '../lib/geocoding';

export interface Destination {
  name: string;
  lat: number;
  lon: number;
}

interface DestinationState {
  current: Destination | null;
  history: Destination[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setDestination: (d: Destination | Place) => void;
  clear: () => void;
}

const HISTORY_MAX = 8;

function toDest(d: Destination | Place): Destination {
  return { name: d.name, lat: d.lat, lon: d.lon };
}

export const useDestination = create<DestinationState>((set, get) => ({
  current: null,
  history: [],
  hydrated: false,

  async hydrate() {
    const [current, history] = await Promise.all([
      loadJSON<Destination | null>(KEYS.destination, null),
      loadJSON<Destination[]>(KEYS.history, []),
    ]);
    set({ current, history, hydrated: true });
  },

  setDestination(input) {
    const d = toDest(input);
    const history = [
      d,
      ...get().history.filter(
        (h) => !(Math.abs(h.lat - d.lat) < 1e-6 && Math.abs(h.lon - d.lon) < 1e-6)
      ),
    ].slice(0, HISTORY_MAX);
    set({ current: d, history });
    void saveJSON(KEYS.destination, d);
    void saveJSON(KEYS.history, history);
  },

  clear() {
    set({ current: null });
    void saveJSON(KEYS.destination, null);
  },
}));
