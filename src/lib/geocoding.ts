// 目的地検索。
//  - テキスト検索: Photon（OpenStreetMap 由来のジオコーダ, ODbL）。
//    住所や地名だけでなく飲食店・商業施設・店舗など POI を名前で引ける。
//    キー不要でオフライン以外は常時利用可能。
//  - 逆ジオコーディング（地図ピッカー）: MapTiler（タイルと同じ提供元）。

import type { LatLon } from './geo';
import { distance } from './geo';
import type { Lang } from './i18n';

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

/** POI の所在地を簡潔に（通り＋区・市）まとめる。 */
function placeContext(p: NonNullable<PhotonFeature['properties']>): string {
  const uniq = [...new Set([p.district, p.city, p.state].filter(Boolean))];
  // 日本の住所は街路名を持たないため、OSM の street/housenumber には
  // 「24」「12」といった街区番号の断片が入ることが多い。住所として読めない
  // 数字だけの街路名は落とし、区名などに委ねる。
  const named = p.street && /[^\d\s.\-]/.test(p.street) ? p.street : '';
  const street = named
    ? p.housenumber
      ? `${named} ${p.housenumber}`
      : named
    : '';
  return [street, ...uniq].filter(Boolean).slice(0, 2).join(' · ');
}

/** 駅としてまとめた結果に付く category。UI 側の重複排除の目印にもなる。 */
export const STATION_CATEGORY = 'station';

/**
 * 鉄道関連オブジェクトか。
 *
 * OSM は一つの駅を「駅舎(building=train_station)」「駅(railway=station)」
 * 「のりば(railway=stop)」「ホーム(railway=platform)」…と複数の要素で表す。
 * 実際 Photon で「渋谷」を引くと 25 件中 22 件がこれで埋まる。まとめて
 * 1 件に畳み、収録済みの駅と重なる分は UI 側で落とす。
 */
const STATION_VALUES = new Set([
  'station',
  'stop',
  'halt',
  'tram_stop',
  'subway_entrance',
  'platform',
  'stop_position',
  'station_entrance',
]);

function isRailwayObject(p: NonNullable<PhotonFeature['properties']>): boolean {
  if (p.osm_key === 'building' && p.osm_value === 'train_station') return true;
  if (p.osm_key !== 'railway' && p.osm_key !== 'public_transport') return false;
  return !!p.osm_value && STATION_VALUES.has(p.osm_value);
}

/**
 * 徒歩の目的地になり得ない要素。地物としては正しくても、コンパスが
 * 指し示す先としては意味を成さないので落とす。
 * （tourism=information の「観光案内所」は残したいので value=board のみ除く）
 */
const NOISE_VALUES = new Set([
  'motorway_junction',
  'traffic_signals',
  'crossing',
  'turning_circle',
  'street_lamp',
  'tree',
  'board',
  'guidepost',
  'bench',
  'waste_basket',
  'vending_machine',
  'bicycle_parking',
  'surveillance',
  'fire_hydrant',
  'post_box',
  // 通路・階段・エレベーターなど。駅の階段が「東京」という名前で
  // 登録されていたりするため、目的地の候補からは外す。
  'steps',
  'footway',
  'path',
  'cycleway',
  'corridor',
  'elevator',
  'service',
  'track',
  'construction',
  'proposed',
]);

/**
 * 丁目か。数が多いうえに目的地としては漠然としており、一覧を埋めて
 * 駅や施設を押し出してしまうので落とす。
 * OSM の英語名は表記が揺れる（"Shibuya 1" / "Shibuya 1-chōme" /
 * "1 Chome-Shibuya"）ため、いずれの形にも当てる。
 */
const CHOME_PATTERNS = [
  /丁目$/,
  /\s\d+$/, // "Shibuya 1"
  /[-\s]ch(ō|o)me$/i, // "Shibuya 1-chōme"
  /^\d+\s*ch(ō|o)me/i, // "1 Chome-Shibuya"
];

function isChome(p: NonNullable<PhotonFeature['properties']>): boolean {
  if (p.osm_key !== 'place' || !p.name) return false;
  const name = p.name;
  return CHOME_PATTERNS.some((re) => re.test(name));
}

function isNoise(p: NonNullable<PhotonFeature['properties']>): boolean {
  if (isChome(p)) return true;
  // boundary=administrative は行政界のポリゴン。代表点が実体と何十kmも
  // ずれることがあり（「渋谷」で 32km 先が返る）、place=city 側が同じ対象を
  // より正確に指すため不要。
  // junction=yes は交差点。「渋谷駅前」のように駅と重複するだけで意味がない。
  if (p.osm_key === 'boundary' || p.osm_key === 'junction') return true;
  // 駅ではない鉄道要素（線路そのもの・分岐器・踏切）。「Tokyo Metro
  // Marunouchi Line」のような路線の線形が場所として出てきてしまうため落とす。
  if (
    (p.osm_key === 'railway' || p.osm_key === 'public_transport') &&
    !isRailwayObject(p)
  )
    return true;
  return !!p.osm_value && NOISE_VALUES.has(p.osm_value);
}

/**
 * 畳むときにどちらの種別表記を残すか。osm_key によって説明力が違う
 * （「渋谷ヒカリエ」は emergency=assembly_point でもあり shop=mall でもある。
 * 「ショッピング」と出せる後者を残したい）。
 */
const KEY_RANK: Record<string, number> = {
  amenity: 5,
  shop: 5,
  tourism: 5,
  leisure: 5,
  historic: 5,
  office: 4,
  healthcare: 4,
  craft: 4,
  place: 3,
  man_made: 3,
  natural: 3,
  building: 2,
  highway: 1,
  emergency: 1,
};
/**
 * 施設に併設された設備。ランドマークと同じ名前が付いていることが多いので、
 * 畳むときにこちらの種別を採ってはいけない。
 * （東京タワーの脇のシェアサイクルポートも「東京タワー」という名前で、
 *   amenity は man_made より上位のため、本物が「レンタサイクル」と表示された）
 */
const SUB_FEATURE_VALUES = new Set([
  'bicycle_rental',
  'parking',
  'parking_entrance',
  'atm',
  'toilets',
  'drinking_water',
  'telephone',
  'shelter',
  'charging_station',
  'bench',
  'smoking_area',
  'locker',
]);

const keyRank = (k?: string, v?: string): number => {
  if (v && SUB_FEATURE_VALUES.has(v)) return 1;
  return k ? (KEY_RANK[k] ?? 2) : 0;
};

/**
 * 重複判定用の名前キー。大小文字・空白・区切り記号に加えて、
 * ローマ字表記の揺れを吸収する。OSM の英語名は同じ対象でも
 * "Tokyo" / "Tōkyō" / "Toukyou"、"Konno" / "Konnou" のように
 * 長音の書き方がまちまちで、そのままでは同じ場所が 2 行に分かれる。
 */
export function nameKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // マクロン等の結合文字
    .toLowerCase()
    .replace(/[\s　・･,.'’\-–—]/g, '')
    .replace(/ou/g, 'o') // Konnou -> Konno
    .replace(/oo/g, 'o') // Oosaka -> Osaka
    .replace(/uu/g, 'u');
}

// 同名かつこの距離以内なら「同じ場所を指す別要素」とみなして 1 件にまとめる。
// 既定はチェーン店の別店舗（数百m離れている）を潰さない値。
const DEDUPE_M = 250;
// 駅・地区は「面」を指すため要素ごとに代表点が大きくぶれる（渋谷の駅要素は
// 半径 250m に散らばり、place=quarter の「渋谷」は 388m と 553m に 2 つある）。
// 同名ならこの半径までは同一とみなす。
const DEDUPE_AREA_M = 2000;
// 別々の対象だと分かっていても、まったく同じ名前がずらりと並ぶと一覧は読めない。
// 同名はこの件数までに留める（チェーン店なら近い順に数件、で十分役に立つ）。
const MAX_PER_NAME = 3;
// 東京に観光で来た人のためのアプリなので、名前で検索したときに
// 「そもそも誰も行かない施設」を下に送る。
//
// 降格しかしない。観光地を昇格させてはいけない——一度そうしたところ、
// 「Tokyo Tower」で Cerulean Tower Tokyo Hotel が 1 位になり、本物の
// 東京タワーが押し出された。「Imperial Palace」では海外の Imperial Palace
// Hotel が並び、「pharmacy」ではトロントの地下鉄駅が 1 位に来た。
// 名前がどれだけ一致しているかは Photon の関連度が持っているので、そこは崩さない。

/**
 * 名前で検索してたどり着きたい人がまずいない施設。
 *
 * 医療・警察・消防は入れないこと。旅行者が本当に困ったときに探すのは
 * まさにそれで、下に送ると危険。同じ理由で役所・議事堂・裁判所も入れない
 * （都庁の展望室も国会議事堂も観光の行き先になる）。
 */
const TOURIST_LOW = new Set([
  'school', 'kindergarten', 'childcare', 'college', 'driving_school',
  'veterinary', 'nursing_home', 'social_facility', 'prison',
  'company', 'office', 'industrial', 'warehouse', 'garages', 'depot',
  'car_repair', 'car_wash', 'works', 'funeral_directors', 'storage_rental',
  'recycling', 'waste_disposal',
]);

/**
 * 後ろに送る度合い（0 なら据え置き）。安定ソートと組み合わせるので、
 * 降格対象以外の並びは Photon の関連度のまま変わらない。
 */
function demotion(place: Place, lang: Lang): number {
  let d = 0;
  if (place.category && TOURIST_LOW.has(place.category)) d += 2;
  // 英語表示で、ラテン文字を一つも含まない名前は読めない。
  // 落としはしない（OSM に英語名が無いだけで、場所自体は有用なため）。
  if (lang === 'en' && !/[A-Za-z]/.test(place.name)) d += 1;
  return d;
}

// 遠方の同名候補を落とす距離。ただし判定は同名グループ単位で行うこと。
// 一律に切ると成田空港・鎌倉・高尾山・横浜駅のように圏外にしか存在しない
// 目的地がまるごと 0 件になり、「その場所は無い」と区別が付かなくなる。
const MAX_DISTANCE_M = 25_000;
// 圏外にしか無いなら遠くても返す、という上の例外にも天井は要る。
// 「pharmacy」で 10,344km 先のトロントの駅が 1 位に来ていた。
// 日本国内の日帰り圏（箱根 78km・富士山 100km）は残る値。
const HARD_MAX_DISTANCE_M = 150_000;

/**
 * 畳み込みの単位。種別をまたいだ統合はしない。
 * 英語表示では地区も駅も同じ "Shibuya" になるため、これを分けないと
 * 「渋谷区」が駅のホーム座標に化けてしまう。
 */
type Kind = 'station' | 'area' | 'poi';

const AREAL_KEYS = new Set([
  'place',
  'highway',
  'waterway',
  'natural',
  'bridge',
  'tunnel',
  'landuse',
]);

function kindOf(p: NonNullable<PhotonFeature['properties']>): Kind {
  if (isRailwayObject(p)) return 'station';
  // place（地区）に加え、通り・川・湾・橋のような広がりを持つ地物も「面」扱い。
  // 一つの対象が複数のセグメントに分かれて同名で並ぶため（「渋谷センター街」は
  // 3 件、「横浜港」は 3 件返る）、広めの半径で 1 件に畳む。
  if (AREAL_KEYS.has(p.osm_key ?? '')) return 'area';
  return 'poi';
}

export interface SearchOptions {
  near?: LatLon;
  lang?: Lang;
  signal?: AbortSignal;
}

export async function searchPlaces(
  query: string,
  opts: SearchOptions = {}
): Promise<Place[]> {
  const { near, lang = 'ja', signal } = opts;
  const q = query.trim();
  if (q.length === 0) return [];
  const url = new URL(PHOTON);
  url.searchParams.set('q', q);
  // en は英語名、ja は現地語（＝日本語）。Photon が解するのは de/en/fr/it/default。
  url.searchParams.set('lang', lang === 'en' ? 'en' : 'default');
  // 鉄道要素と重複を落としてから絞るので多めに引く。「渋谷」では上位 25 件の
  // うち 22 件が同じ駅の構成要素で埋まり、実際の施設がここに入ってこない。
  url.searchParams.set('limit', '50');
  if (near) {
    url.searchParams.set('lat', String(near.lat));
    url.searchParams.set('lon', String(near.lon));
  }

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };

  // 畳み込みの種別・半径は対象ごとに変わるので、Place と一緒に持ち回る。
  const entries: { place: Place; kind: Kind; rank: number }[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    const coords = f.geometry?.coordinates;
    if (!p?.name || !coords) continue;
    if (isNoise(p)) continue;

    const kind = kindOf(p);
    const place: Place = {
      id: `${p.osm_type ?? ''}${p.osm_id ?? ''}` || p.name,
      name: p.name,
      context: placeContext(p),
      category: kind === 'station' ? STATION_CATEGORY : p.osm_value,
      lat: coords[1],
      lon: coords[0],
    };
    if (near) {
      place.distanceM = distance(near, place);
      if (place.distanceM > HARD_MAX_DISTANCE_M) continue;
    }
    // 駅と地区は「面」なので要素ごとに代表点が大きくぶれる。店舗は狭く。
    const radius = kind === 'poi' ? DEDUPE_M : DEDUPE_AREA_M;

    // 同じ対象を指す重複は畳む。文脈（通り名・区）は残っている方を採る。
    const key = nameKey(place.name);
    const dup = entries.find(
      (e) =>
        e.kind === kind &&
        nameKey(e.place.name) === key &&
        distance(e.place, place) < radius
    );
    if (dup) {
      if (!dup.place.context && place.context) dup.place.context = place.context;
      // 説明力の高い種別表記を残す（assembly_point より shop=mall）。
      const rank = keyRank(p.osm_key, p.osm_value);
      if (rank > dup.rank) {
        dup.place.category = place.category;
        dup.rank = rank;
      }
      // 駅は最寄りの要素を代表にする（ホームより駅舎が近いことが多い）。
      if (
        near &&
        (place.distanceM ?? Infinity) < (dup.place.distanceM ?? Infinity)
      ) {
        dup.place.lat = place.lat;
        dup.place.lon = place.lon;
        dup.place.distanceM = place.distanceM;
      }
      continue;
    }
    entries.push({ place, kind, rank: keyRank(p.osm_key, p.osm_value) });
  }
  const out = entries.map((e) => e.place);

  // 同名の候補（チェーン店など）は距離順に。異なる名前どうしは Photon の
  // 関連度順を保つ——遠方の著名スポットが、たまたま近くにある別の場所に
  // 埋もれないようにするため。
  const groups = new Map<string, Place[]>();
  for (const pl of out) {
    const k = nameKey(pl.name);
    const g = groups.get(k);
    if (g) g.push(pl);
    else groups.set(k, [pl]);
  }
  const ordered: Place[] = [];
  for (const g of groups.values()) {
    if (near && g.length > 1)
      g.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
    let list = g;
    if (near) {
      const close = g.filter((p) => (p.distanceM ?? 0) <= MAX_DISTANCE_M);
      // 同名の候補が圏内にもあるなら、圏外のものは別物なので落とす
      // （渋谷を探しているときの茂原市の「渋谷」）。逆に圏内に一つも
      // 無いなら、その名前の場所は本当にそこにしか無い——成田空港も
      // 鎌倉も横浜駅も 25km 圏外なので、切ると検索できなくなる。
      if (close.length) list = close;
    }
    ordered.push(...list.slice(0, MAX_PER_NAME));
  }

  // 学校や車庫など、名前で探す人がいない施設だけを後ろに送る。
  // sort は安定なので、それ以外の並びは Photon の関連度のまま残る。
  ordered.sort((a, b) => demotion(a, lang) - demotion(b, lang));
  return ordered.slice(0, 10);
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
