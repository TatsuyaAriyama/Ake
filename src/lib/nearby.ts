// 現在地まわりのカテゴリ検索（飲食店・カフェ・コンビニ・商業施設・公園・トイレ）。
// OpenStreetMap の Overpass API を半径指定で叩き、距離順に並べて返す（ODbL）。
// テキスト検索（Photon）が「名前で探す」のに対し、こちらは「近くの◯◯へ」を担う。

import type { LatLon } from './geo';
import { distance } from './geo';
import type { Place } from './geocoding';
import type { Lang } from './i18n';

export interface NearbyCategory {
  id: string;
  ja: string;
  en: string;
  filter: string; // Overpass のタグフィルタ（node/way に付与）
}

// 徒歩コンパスで「今すぐ向かいたい」場所を厳選。
export const NEARBY_CATEGORIES: NearbyCategory[] = [
  { id: 'food', ja: '飲食店', en: 'Food', filter: '["amenity"~"^(restaurant|fast_food)$"]' },
  { id: 'cafe', ja: 'カフェ', en: 'Cafe', filter: '["amenity"="cafe"]' },
  { id: 'convenience', ja: 'コンビニ', en: 'Convenience', filter: '["shop"="convenience"]' },
  { id: 'shopping', ja: 'ショッピング', en: 'Shopping', filter: '["shop"~"^(mall|department_store)$"]' },
  { id: 'park', ja: '公園', en: 'Parks', filter: '["leisure"="park"]' },
  { id: 'toilet', ja: 'トイレ', en: 'Toilets', filter: '["amenity"="toilets"]' },
];

export function categoryLabel(cat: NearbyCategory, lang: Lang): string {
  return lang === 'en' ? cat.en : cat.ja;
}

// Photon / Overpass の種別値 → 短いバッジ表記。未知の値はバッジ非表示。
const POI_LABELS: Record<string, [ja: string, en: string]> = {
  station: ['駅', 'Station'],
  // 地名・行政区画。駅や店舗と区別が付くようにバッジを出す。
  quarter: ['地区', 'District'],
  neighbourhood: ['地区', 'District'],
  suburb: ['地区', 'District'],
  city: ['市・区', 'City'],
  town: ['町', 'Town'],
  village: ['村', 'Village'],
  province: ['都道府県', 'Prefecture'],
  restaurant: ['飲食店', 'Restaurant'],
  fast_food: ['ファストフード', 'Fast food'],
  food: ['飲食店', 'Food'],
  cafe: ['カフェ', 'Cafe'],
  bar: ['バー', 'Bar'],
  pub: ['パブ', 'Pub'],
  convenience: ['コンビニ', 'Convenience'],
  supermarket: ['スーパー', 'Supermarket'],
  mall: ['商業施設', 'Mall'],
  department_store: ['百貨店', 'Department store'],
  shopping: ['ショッピング', 'Shopping'],
  clothes: ['衣料品', 'Clothing'],
  books: ['書店', 'Books'],
  park: ['公園', 'Park'],
  toilets: ['トイレ', 'Toilets'],
  toilet: ['トイレ', 'Toilets'],
  hotel: ['ホテル', 'Hotel'],
  hospital: ['病院', 'Hospital'],
  pharmacy: ['薬局', 'Pharmacy'],
  bank: ['銀行', 'Bank'],
  atm: ['ATM', 'ATM'],
  cinema: ['映画館', 'Cinema'],
  museum: ['美術館・博物館', 'Museum'],
  library: ['図書館', 'Library'],
  attraction: ['観光地', 'Attraction'],
  hairdresser: ['美容室', 'Hair salon'],
  fuel: ['ガソリンスタンド', 'Fuel'],
  // 東京観光でよく検索される種別
  tower: ['タワー', 'Tower'],
  viewpoint: ['展望台', 'Viewpoint'],
  place_of_worship: ['寺社・教会', 'Place of worship'],
  garden: ['庭園', 'Garden'],
  stadium: ['スタジアム', 'Stadium'],
  theatre: ['劇場', 'Theatre'],
  zoo: ['動物園', 'Zoo'],
  aquarium: ['水族館', 'Aquarium'],
  university: ['大学', 'University'],
  marketplace: ['市場', 'Market'],
  artwork: ['アート', 'Artwork'],
  castle: ['城', 'Castle'],
};

/** POI 種別の短いラベル（未知なら null）。 */
export function poiLabel(value: string | undefined, lang: Lang): string | null {
  if (!value) return null;
  const pair = POI_LABELS[value];
  if (!pair) return null;
  return lang === 'en' ? pair[1] : pair[0];
}

// CORS 対応の Overpass ミラーを順に試す（主インスタンスは mod_security で
// ブラウザからの POST を弾くことがあるため、実績のあるミラーを先頭に置く）。
const OVERPASS_ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
const RADIUS_M = 1500;

async function runOverpass(
  query: string,
  signal?: AbortSignal
): Promise<{ elements?: OverpassEl[] }> {
  let lastErr: unknown = new Error('overpass unavailable');
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });
      if (!res.ok) throw new Error(`overpass ${res.status}`);
      return (await res.json()) as { elements?: OverpassEl[] };
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

interface OverpassEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * 表示名。英語 UI では OSM の name:en を優先する。
 * 日本の POI は name が日本語なので、これを見ないと英語表示でも
 * 「スターバックス コーヒー 渋谷スクランブルスクエア店」のままになる。
 */
function displayName(
  tags: Record<string, string>,
  fallback: string,
  lang: Lang
): string {
  if (lang === 'en') {
    return tags['name:en'] || tags.name || tags['name:ja'] || fallback;
  }
  return tags.name || tags['name:ja'] || tags['name:en'] || fallback;
}

/** 所在地の補足。英語 UI では日本語だけの住所タグを出さない。 */
function nearbyContext(tags: Record<string, string>, lang: Lang): string {
  const parts =
    lang === 'en'
      ? [tags['addr:neighbourhood:en'], tags['brand:en'] || tags.brand]
      : [tags['addr:neighbourhood'], tags['addr:full'], tags.brand];
  return parts.filter(Boolean).join(' · ');
}

/**
 * 現在地から半径 1.5km 以内の該当 POI を距離順で返す。
 * ネットワーク不通や Overpass 混雑時は例外を投げる（UI 側でメッセージ表示）。
 */
export async function searchNearby(
  cat: NearbyCategory,
  near: LatLon,
  fallbackName: string,
  lang: Lang,
  signal?: AbortSignal
): Promise<Place[]> {
  const around = `(around:${RADIUS_M},${near.lat},${near.lon})`;
  const f = cat.filter;
  const query =
    `[out:json][timeout:20];` +
    `(node${f}${around};way${f}${around};);` +
    `out center 60;`;

  const data = await runOverpass(query, signal);

  const seen = new Set<string>();
  const out: Place[] = [];
  for (const el of data.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const id = `${el.type}${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const tags = el.tags ?? {};
    out.push({
      id,
      name: displayName(tags, fallbackName, lang),
      context: nearbyContext(tags, lang),
      category: cat.id,
      lat,
      lon,
      distanceM: distance(near, { lat, lon }),
    });
  }
  out.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  return out.slice(0, 24);
}
