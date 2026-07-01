// 方位・距離の計算（真北基準、時計回り 0–360°）

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const EARTH_R = 6371000; // m

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * 目的地への初期方位（真北基準、時計回り 0–360°）。
 * θ = atan2( sinΔλ·cosφ2, cosφ1·sinφ2 − sinφ1·cosφ2·cosΔλ )
 */
export function bearing(from: LatLon, to: LatLon): number {
  const φ1 = from.lat * D2R;
  const φ2 = to.lat * D2R;
  const Δλ = (to.lon - from.lon) * D2R;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (θ * R2D + 360) % 360;
}

/** Haversine 距離（m）。 */
export function distance(from: LatLon, to: LatLon): number {
  const φ1 = from.lat * D2R;
  const φ2 = to.lat * D2R;
  const Δφ = (to.lat - from.lat) * D2R;
  const Δλ = (to.lon - from.lon) * D2R;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 距離を人間可読な文字列へ。1km 未満は m、以上は km（小数1桁）。 */
export function formatDistance(meters: number): { value: string; unit: string } {
  if (meters < 1000) {
    return { value: String(Math.round(meters)), unit: 'm' };
  }
  return { value: (meters / 1000).toFixed(1), unit: 'km' };
}

/** マイル系表示。 */
export function formatDistanceImperial(meters: number): { value: string; unit: string } {
  const feet = meters * 3.28084;
  if (feet < 5280) {
    return { value: String(Math.round(feet)), unit: 'ft' };
  }
  return { value: (feet / 5280).toFixed(1), unit: 'mi' };
}

/** 角度差を −180..180 に正規化。 */
export function angleDelta(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** 角度を 0..360 に正規化。 */
export function normalize360(a: number): number {
  return ((a % 360) + 360) % 360;
}
