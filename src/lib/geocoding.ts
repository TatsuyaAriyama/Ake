// 目的地検索。
//  - テキスト検索: Photon（OpenStreetMap 由来のジオコーダ, ODbL）。
//    住所や地名だけでなく飲食店・商業施設・店舗など POI を名前で引ける。
//    キー不要でオフライン以外は常時利用可能。
//  - 逆ジオコーディング（地図ピッカー）: MapTiler（タイルと同じ提供元）。

import type { LatLon } from './geo';

export interface Place extends LatLon {
  id: string;
  name: string;
  context?: string;
  category?: string; // OSM の osm_value（例: restaurant, cafe, mall）
  distanceM?: number; // 現在地からの距離（判明時）
}

const KEY = import.meta.env.VITE_MAPTILER_KEY;
const PHOTON = 'https://photon.komoot.io/api';

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] }; // [lon, lat]
  properties?: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

// Photon はキー不要のため検索は常に利用可能。
export function hasGeocoder(): boolean {
  return true;
}

/** POI の所在地を簡潔に（区・市＋通り）まとめる。 */
function placeContext(p: NonNullable<PhotonFeature['properties']>): string {
  const locality = [p.district, p.city, p.state].filter(Boolean);
  const uniq = [...new Set(locality)];
  const street = p.street
    ? p.housenumber
      ? `${p.street} ${p.housenumber}`
      : p.street
    : '';
  return [street, ...uniq].filter(Boolean).slice(0, 2).join(' · ');
}

export async function searchPlaces(
  query: string,
  near?: LatLon,
  signal?: AbortSignal
): Promise<Place[]> {
  const q = query.trim();
  if (q.length === 0) return [];
  const url = new URL(PHOTON);
  url.searchParams.set('q', q);
  url.searchParams.set('lang', 'default'); // 現地語（日本では日本語）で返す
  url.searchParams.set('limit', '8');
  if (near) {
    url.searchParams.set('lat', String(near.lat));
    url.searchParams.set('lon', String(near.lon));
  }

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };

  const out: Place[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    const coords = f.geometry?.coordinates;
    if (!p?.name || !coords) continue;
    out.push({
      id: `${p.osm_type ?? ''}${p.osm_id ?? ''}` || p.name,
      name: p.name,
      context: placeContext(p),
      category: p.osm_value,
      lat: coords[1],
      lon: coords[0],
    });
  }
  return out;
}

/**
 * 逆ジオコーディング。地図ピッカーで選んだ座標に最も近い地名を返す。
 * 該当が無い / キー未設定なら座標文字列にフォールバックする。
 */
export async function reverseGeocode(
  at: LatLon,
  signal?: AbortSignal
): Promise<string> {
  const fallback = `${at.lat.toFixed(4)}, ${at.lon.toFixed(4)}`;
  if (!KEY) return fallback;
  const url = new URL(
    `https://api.maptiler.com/geocoding/${at.lon},${at.lat}.json`
  );
  url.searchParams.set('key', KEY);
  url.searchParams.set('language', 'ja');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const data = (await res.json()) as {
    features: { text?: string; place_name?: string }[];
  };
  const f = data.features[0];
  return f?.text ?? f?.place_name ?? fallback;
}
