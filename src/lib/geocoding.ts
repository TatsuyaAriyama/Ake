// MapTiler Geocoding。目的地検索（オートコンプリート）。

import type { LatLon } from './geo';

export interface Place extends LatLon {
  id: string;
  name: string;
  context?: string;
}

const KEY = import.meta.env.VITE_MAPTILER_KEY;

interface MTFeature {
  id: string;
  text?: string;
  place_name?: string;
  center: [number, number]; // [lon, lat]
  place_type?: string[];
  context?: { text?: string }[];
}

export function hasGeocoder(): boolean {
  return Boolean(KEY);
}

export async function searchPlaces(
  query: string,
  near?: LatLon,
  signal?: AbortSignal
): Promise<Place[]> {
  if (!KEY || query.trim().length === 0) return [];
  const url = new URL(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set('key', KEY);
  url.searchParams.set('language', 'ja');
  url.searchParams.set('limit', '6');
  if (near) {
    url.searchParams.set('proximity', `${near.lon},${near.lat}`);
  }

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const data = (await res.json()) as { features: MTFeature[] };

  return data.features.map((f) => ({
    id: f.id,
    name: f.text ?? f.place_name ?? '（無名）',
    context:
      f.context?.map((c) => c.text).filter(Boolean).join(' · ') ||
      f.place_name,
    lat: f.center[1],
    lon: f.center[0],
  }));
}
