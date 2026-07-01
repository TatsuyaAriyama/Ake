// 現在地取得。Capacitor Geolocation（ネイティブ）/ ブラウザ Geolocation。

import { Geolocation } from '@capacitor/geolocation';
import type { LatLon } from './geo';

export interface Fix extends LatLon {
  accuracy: number;
}

export type LocationPermission = 'unknown' | 'granted' | 'denied';

export async function requestLocationPermission(): Promise<LocationPermission> {
  try {
    const status = await Geolocation.requestPermissions({
      permissions: ['location'],
    });
    const s = status.location;
    if (s === 'granted') return 'granted';
    if (s === 'denied') return 'denied';
    return 'unknown';
  } catch {
    // Web ではプラグインの requestPermissions が使えないことがある → watch 時に確認
    return 'unknown';
  }
}

/**
 * 位置の監視。移動閾値ベースの再計算は購読側で行う想定だが、
 * ここでは生 fix をコールバックする。
 */
export function watchLocation(
  onFix: (f: Fix) => void,
  onError: (msg: string) => void
): () => void {
  let watchId: string | null = null;
  let cancelled = false;

  Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 },
    (pos, err) => {
      if (cancelled) return;
      if (err) {
        onError(err.message ?? 'location error');
        return;
      }
      if (!pos) return;
      onFix({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? 0,
      });
    }
  )
    .then((id) => {
      if (cancelled) {
        Geolocation.clearWatch({ id });
      } else {
        watchId = id;
      }
    })
    .catch((e) => onError(String(e?.message ?? e)));

  return () => {
    cancelled = true;
    if (watchId) Geolocation.clearWatch({ id: watchId });
  };
}
