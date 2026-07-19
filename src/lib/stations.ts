// 東京の駅データセット（OpenStreetMap 由来, ODbL）。
// コンパス本体はオフライン動作のため、駅データは行き先選択時に遅延ロードする。

import type { LatLon } from './geo';
import { distance } from './geo';
import type { Lang } from './i18n';
import { LINE_EN, OPERATOR_EN } from './railwayNames';

export interface Station {
  name: string; // 漢字表記（例: 新宿）
  kana: string; // ひらがな読み（例: しんじゅく）
  en: string; // ローマ字（例: Shinjuku）
  lat: number;
  lon: number;
  operators: string[]; // 事業者（例: JR東日本, 東京メトロ）
  lines: string[]; // 路線名（判明分, 例: 山手線）
  wikidata: string; // Wikidata Q番号（画像取得に使用, 無い場合は空）
  wikipedia: string; // 例: "ja:新宿駅"
}

let cache: Station[] | null = null;

/** 駅データセットを遅延ロード（初回のみ import、以降はキャッシュ）。 */
export async function loadStations(): Promise<Station[]> {
  if (cache) return cache;
  const mod = await import('../data/tokyoStations.json');
  cache = mod.default as Station[];
  return cache;
}

/** 表示用の駅名。英語 UI ではローマ字表記を使う。 */
export function stationName(st: Station, lang: Lang): string {
  return lang === 'en' && st.en ? st.en : st.name;
}

/** 表示用の路線名。未知の路線は原文のまま返す。 */
export function stationLines(st: Station, lang: Lang): string[] {
  return lang === 'en' ? st.lines.map((l) => LINE_EN[l] ?? l) : st.lines;
}

/** 表示用の事業者名。未知の事業者は原文のまま返す。 */
export function stationOperators(st: Station, lang: Lang): string[] {
  return lang === 'en'
    ? st.operators.map((o) => OPERATOR_EN[o] ?? o)
    : st.operators;
}

/** カタカナ → ひらがな（読み検索の正規化）。 */
function kataToHira(s: string): string {
  return s.replace(/[\u30a1-\u30f6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

/** ローマ字の正規化：小文字化＋発音記号（マクロン等）除去。「tokyo」で「Tōkyō」に当てる。 */
function deburr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** 「駅」サフィックスや空白を除いた検索キー。 */
function stripStation(s: string): string {
  return s.replace(/駅$/, '').trim();
}

interface Scored {
  station: Station;
  score: number;
}

/**
 * 駅名検索。漢字・ひらがな・カタカナ・ローマ字のいずれでも当たる。
 * 前方一致を部分一致より優先し、規模（路線数）でタイブレークする。
 */
export function searchStations(
  stations: Station[],
  query: string,
  limit = 8
): Station[] {
  const raw = stripStation(query.trim());
  if (!raw) return [];
  const qHira = kataToHira(raw);
  const qRoma = deburr(raw);

  const scored: Scored[] = [];
  for (const st of stations) {
    const name = st.name;
    const kana = st.kana;
    const en = deburr(st.en);

    let score = 0;
    // 完全一致
    if (name === raw || kana === qHira || en === qRoma) score = 100;
    // 前方一致
    else if (name.startsWith(raw) || kana.startsWith(qHira) || en.startsWith(qRoma))
      score = 60;
    // 部分一致
    else if (
      name.includes(raw) ||
      kana.includes(qHira) ||
      (qRoma.length >= 2 && en.includes(qRoma))
    )
      score = 30;

    if (score > 0) {
      // 規模（路線数＋事業者数）でタイブレーク。ターミナル駅を上位に。
      const size = st.lines.length + st.operators.length;
      scored.push({ station: st, score: score * 100 + Math.min(size, 30) });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.station);
}

/** 現在地に最も近い駅（任意機能）。 */
export function nearestStation(
  stations: Station[],
  at: LatLon
): { station: Station; distanceM: number } | null {
  let best: { station: Station; distanceM: number } | null = null;
  for (const st of stations) {
    const d = distance(at, st);
    if (!best || d < best.distanceM) best = { station: st, distanceM: d };
  }
  return best;
}
