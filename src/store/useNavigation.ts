// 派生値のセレクタ。bearing / distance / needle / isAligned / hasArrived。

import { useLocation } from './locationStore';
import { useHeading } from './headingStore';
import { useDestination } from './destinationStore';
import { useSettings } from './settingsStore';
import { bearing, distance, angleDelta, normalize360, type LatLon } from '../lib/geo';

export const ALIGN_THRESHOLD_DEG = 10; // ±10° で整列
export const ARRIVE_THRESHOLD_M = 35; // 35m 以内で到着

export interface NavDerived {
  hasDestination: boolean;
  hasFix: boolean;
  bearingTrue: number | null; // 目的地への真北基準方位
  distanceM: number | null;
  /** 針の回転角（度）。0 = 正面（目的地方向が真上）。時計回り正。 */
  needle: number | null;
  isAligned: boolean;
  hasArrived: boolean;
}

export function useNavigation(): NavDerived {
  const fix = useLocation((s) => s.fix);
  const dest = useDestination((s) => s.current);
  const smoothedMagnetic = useHeading((s) => s.smoothedMagnetic);
  const declination = useHeading((s) => s.declination);
  const northRef = useSettings((s) => s.northRef);

  const hasDestination = Boolean(dest);
  const hasFix = Boolean(fix);

  if (!fix || !dest) {
    return {
      hasDestination,
      hasFix,
      bearingTrue: null,
      distanceM: null,
      needle: null,
      isAligned: false,
      hasArrived: false,
    };
  }

  const from: LatLon = fix;
  const bearingTrue = bearing(from, dest);
  const distanceM = distance(from, dest);
  const hasArrived = distanceM <= ARRIVE_THRESHOLD_M;

  let needle: number | null = null;
  let isAligned = false;

  if (smoothedMagnetic != null) {
    // 端末ヘディングを設定に合わせた基準へ。
    // magnetic を真北基準へ: trueHeading = magnetic + declination
    const headingTrue = normalize360(smoothedMagnetic + declination);
    // 目的地方位も基準を揃える。
    const targetBearing =
      northRef === 'true' ? bearingTrue : normalize360(bearingTrue - declination);
    const deviceHeading = northRef === 'true' ? headingTrue : smoothedMagnetic;

    // 針 = (目的地方位 − 端末ヘディング) を 0..360 に。
    const raw = normalize360(targetBearing - deviceHeading);
    needle = raw;
    isAligned = Math.abs(angleDelta(raw, 0)) <= ALIGN_THRESHOLD_DEG;
  }

  return {
    hasDestination,
    hasFix,
    bearingTrue,
    distanceM,
    needle,
    isAligned,
    hasArrived,
  };
}
