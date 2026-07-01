// 磁気偏角（declination）。WMM ベースで磁北基準を真北基準へ揃える。

import geomagnetism from 'geomagnetism';
import type { LatLon } from './geo';

/**
 * 現在地の偏角（度）。東偏が正。
 * 真北 = 磁北 + declination（磁北基準ヘディングに declination を足すと真北基準）。
 */
export function declinationAt({ lat, lon }: LatLon, date = new Date()): number {
  try {
    const info = geomagnetism.model(date).point([lat, lon]);
    return info.decl;
  } catch {
    return 0;
  }
}
