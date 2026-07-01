import { create } from 'zustand';
import { headingSource, type PermissionState } from '../lib/heading';
import { CircularSmoother } from '../lib/smoothing';
import { declinationAt } from '../lib/declination';
import type { LatLon } from '../lib/geo';

interface HeadingState {
  /** 生の磁北基準ヘディング。 */
  rawMagnetic: number | null;
  /** 平滑化後の磁北基準ヘディング。 */
  smoothedMagnetic: number | null;
  /** 現在地に基づく偏角（度、東偏が正）。 */
  declination: number;
  lowAccuracy: boolean;
  permission: PermissionState;
  subscribed: boolean;
  request: () => Promise<PermissionState>;
  start: () => void;
  stop: () => void;
  updateDeclination: (at: LatLon) => void;
}

const smoother = new CircularSmoother(0.18);
let unsub: (() => void) | null = null;

export const useHeading = create<HeadingState>((set, get) => ({
  rawMagnetic: null,
  smoothedMagnetic: null,
  declination: 0,
  lowAccuracy: false,
  permission: 'unknown',
  subscribed: false,

  async request() {
    const p = await headingSource.requestPermission();
    set({ permission: p });
    return p;
  },

  start() {
    if (get().subscribed) return;
    set({ subscribed: true });
    smoother.reset();
    unsub = headingSource.subscribe(({ magnetic, lowAccuracy }) => {
      const smoothed = smoother.push(magnetic);
      set({ rawMagnetic: magnetic, smoothedMagnetic: smoothed, lowAccuracy });
    });
  },

  stop() {
    if (unsub) {
      unsub();
      unsub = null;
    }
    set({ subscribed: false });
  },

  updateDeclination(at) {
    set({ declination: declinationAt(at) });
  },
}));
