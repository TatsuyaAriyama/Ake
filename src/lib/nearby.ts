// 現在地まわりのカテゴリ検索（飲食店・カフェ・コンビニ・商業施設・公園・トイレ）。
// OpenStreetMap の Overpass API を半径指定で叩き、距離順に並べて返す（ODbL）。
// テキスト検索（Photon）が「名前で探す」のに対し、こちらは「近くの◯◯へ」を担う。

import type { LatLon } from './geo';
import { distance } from './geo';
import { nameKey, type Place } from './geocoding';
import type { Lang } from './i18n';

export interface NearbyCategory {
  id: string;
  ja: string;
  en: string;
  filter: string; // Overpass のタグフィルタ（node/way/relation に付与）
  /**
   * 名前の無い地物も残すか。トイレや公園は無名でも目的地になるが、
   * 観光スポットや店舗は「観光スポット」とだけ出ても役に立たない。
   */
  keepUnnamed?: boolean;
  /**
   * 知られている場所を先に出すか。観光スポットや寺社は「近い順」だと
   * 名も無い祠や小さな石像が並んでしまうので、著名なものを優先する。
   * コンビニやトイレは純粋に近い順でよいので既定は無効。
   */
  byNotability?: boolean;
  /**
   * 検索半径（m）。既定は RADIUS_M。
   * 飲食店のように密度の高いカテゴリは、渋谷だと 1.5km 圏に 967 件あって
   * 取得に 13 秒かかる。表示は 24 件で、渋谷では 100m 圏で埋まってしまうので、
   * 半径を詰めても失うものは無く、待ち時間だけが減る。
   */
  radiusM?: number;
}

// 徒歩コンパスで「今すぐ向かいたい」場所を厳選。
// 東京に観光で来た人のためのアプリなので、観光スポットと寺社を先頭に置く。
export const NEARBY_CATEGORIES: NearbyCategory[] = [
  {
    id: 'sights',
    ja: '観光スポット',
    en: 'Sights',
    filter: '["tourism"~"^(attraction|museum|viewpoint|artwork|gallery)$"]',
    byNotability: true,
  },
  {
    id: 'worship',
    ja: '寺社',
    en: 'Temples & shrines',
    filter: '["amenity"="place_of_worship"]',
    byNotability: true,
  },
  { id: 'food', ja: '飲食店', en: 'Food', filter: '["amenity"~"^(restaurant|fast_food)$"]', radiusM: 800 },
  { id: 'cafe', ja: 'カフェ', en: 'Cafe', filter: '["amenity"="cafe"]', radiusM: 800 },
  { id: 'convenience', ja: 'コンビニ', en: 'Convenience', filter: '["shop"="convenience"]', radiusM: 800 },
  { id: 'shopping', ja: 'ショッピング', en: 'Shopping', filter: '["shop"~"^(mall|department_store)$"]' },
  { id: 'park', ja: '公園', en: 'Parks', filter: '["leisure"="park"]', keepUnnamed: true },
  { id: 'toilet', ja: 'トイレ', en: 'Toilets', filter: '["amenity"="toilets"]', keepUnnamed: true },
];

export function categoryLabel(cat: NearbyCategory, lang: Lang): string {
  return lang === 'en' ? cat.en : cat.ja;
}

// Photon / Overpass の種別値 → 短いバッジ表記。未知の値はバッジ非表示。
const POI_LABELS: Record<string, [ja: string, en: string]> = {
  station: ['駅', 'Station'],
  sights: ['観光スポット', 'Sight'],
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
  gallery: ['ギャラリー', 'Gallery'],
  shrine: ['神社', 'Shrine'],
  temple: ['寺', 'Temple'],
  hostel: ['ホステル', 'Hostel'],
  guest_house: ['ゲストハウス', 'Guest house'],
  theme_park: ['テーマパーク', 'Theme park'],
  monument: ['記念碑', 'Monument'],
  memorial: ['記念碑', 'Memorial'],
  ruins: ['遺跡', 'Ruins'],
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

/**
 * その地物がどれだけ知られているか。Wikipedia / Wikidata に項目があるかで測る。
 * 浅草で「寺社」を開いたとき、名も無い祠が距離順に並ぶより、
 * 浅草寺・浅草神社が先に出てほしい——旅行者向けのアプリなので。
 *
 * tourism=attraction は使わない。「観光スポット」カテゴリの絞り込み条件が
 * すでに attraction を含んでいるため、著名さではなく単に美術館や展望台より
 * attraction を優遇するだけの偏りになる。
 */
function notability(tags: Record<string, string>): number {
  return tags.wikidata || tags.wikipedia ? 2 : 0;
}

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
  const around = `(around:${cat.radiusM ?? RADIUS_M},${near.lat},${near.lon})`;
  const f = cat.filter;
  // relation まで拾うこと。大きな寺社・公園は面（way / マルチポリゴン）で
  // 表されており、node だけでは欠落する。
  // 件数で打ち切ってはいけない。Overpass は「近い順」ではなく
  // type → id の昇順で返すので、`out center 250` は「最寄り250件」ではなく
  // 「OSM に古くから登録されている250件」になる。渋谷の飲食店は範囲内に
  // 967件あり、上限を付けると最寄り24件のうち18件が落ちていた（way は
  // 一件も届かない）。範囲は半径 1.5km で押さえてあるので、全件取って
  // こちらで距離順に並べる。
  const query =
    `[out:json][timeout:25];` +
    `(node${f}${around};way${f}${around};relation${f}${around};);` +
    `out center;`;

  const data = await runOverpass(query, signal);

  const seen = new Set<string>();
  const out: { place: Place; note: number; named: boolean }[] = [];
  for (const el of data.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const id = `${el.type}${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const tags = el.tags ?? {};
    const named = tags.name || tags['name:ja'] || tags['name:en'];
    if (!named && !cat.keepUnnamed) continue;
    out.push({
      named: !!named,
      place: {
        id,
        name: displayName(tags, fallbackName, lang),
        context: nearbyContext(tags, lang),
        // 寺社は神社と寺を取り違えないよう religion タグから判定する
        // （まとめて「寺」と出すと神社を仏教寺院だと言うことになる）。
        category:
          cat.id === 'worship'
            ? tags.religion === 'shinto'
              ? 'shrine'
              : tags.religion === 'buddhist'
                ? 'temple'
                : 'place_of_worship'
            : cat.id,
        lat,
        lon,
        distanceM: distance(near, { lat, lon }),
      },
      note: cat.byNotability ? notability(tags) : 0,
    });
  }
  // 既定は近い順。観光スポットと寺社だけは著名さを混ぜる。
  // 著名さ 1 点 ≒ 1km ぶんの近さ、という重みにしてある。こうしないと
  // 1km 先の名所が目の前のハチ公像より上に来てしまう。
  const rank = (o: { place: Place; note: number }) =>
    o.note - (o.place.distanceM ?? 0) / 1000;
  out.sort((a, b) => rank(b) - rank(a));

  // 名前の無い地物は畳まない。名前が無いものは表示名がカテゴリ名
  // （「トイレ」等）で全部同じになるため、名前で重複判定すると
  // 別々のトイレが軒並み消える（上野公園で 81 件中 46 件が消えていた）。

  // 同じ対象が node と way の二重で登録されていることがある
  // （金王八幡宮が 419m と 438m に 2 件など）。近接した同名は 1 件に畳む。
  // 近接していて、片方の名前がもう片方の頭から一致するなら同じ対象とみなす。
  // 英語名は "Konno Hachimangu" と "Konnou Hachimangu Shrine" のように
  // 種別語が付いたり付かなかったりするため、完全一致では畳めない。
  // 前方一致に限るので「雷門」と「仲見世商店街」のような別物は残る。
  const picked: Place[] = [];
  const namedPicked: Place[] = [];
  for (const { place, named } of out) {
    if (named) {
      const key = nameKey(place.name);
      const dup = namedPicked.some((p) => {
        if (distance(p, place) >= 250) return false;
        const k = nameKey(p.name);
        return k === key || k.startsWith(key) || key.startsWith(k);
      });
      if (dup) continue;
      namedPicked.push(place);
    }
    picked.push(place);
    if (picked.length >= 24) break;
  }
  return picked;
}
