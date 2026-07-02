// 東京の駅データセット生成スクリプト（OpenStreetMap 由来, ODbL）。
//
// 取得元（Overpass API, area=東京都):
//   [out:json][timeout:80];
//   area["name"="東京都"]["admin_level"="4"]->.t;
//   (node["railway"="station"](area.t););
//   out body;
//
// 使い方:
//   1) 上記クエリの結果を .tmp/tokyo_stations_raw.json に保存
//   2) node scripts/buildTokyoStations.mjs
//   -> src/data/tokyoStations.json を生成
//
// 生駅ノード（事業者ごとに分かれている）を「駅名＋近接(700m)」でクラスタリングして
// 1駅に統合し、事業者を正規化、駅ナンバリングの路線コードを路線名へ変換する。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const RAW = '.tmp/tokyo_stations_raw.json';
const OUT = 'src/data/tokyoStations.json';

// ---- 事業者の正規化（雑多な operator/network 値 → 代表的な鉄道会社）----
const OPERATOR_RULES = [
  [/東日本旅客鉄道|JR東日本|JR East|成田エクスプレス/, 'JR東日本'],
  [/東海旅客鉄道|JR東海/, 'JR東海'],
  [/西日本旅客鉄道|JR西日本/, 'JR西日本'],
  [/東京地下鉄|東京メトロ|Tokyo Metro/, '東京メトロ'],
  [/東京都交通局|都営/, '都営地下鉄'],
  [/小田急/, '小田急電鉄'],
  [/京王/, '京王電鉄'],
  [/東京急行|東急/, '東急電鉄'],
  [/西武/, '西武鉄道'],
  [/東武|Tojo/, '東武鉄道'],
  [/京成/, '京成電鉄'],
  [/京浜急行|京急/, '京急電鉄'],
  [/多摩都市モノレール|多摩モノレール/, '多摩都市モノレール'],
  [/ゆりかもめ/, 'ゆりかもめ'],
  [/東京臨海高速|りんかい/, 'りんかい線'],
  [/首都圏新都市|つくばエクスプレス/, 'つくばエクスプレス'],
  [/東京モノレール/, '東京モノレール'],
  [/北総/, '北総鉄道'],
  [/埼玉高速/, '埼玉高速鉄道'],
  [/新京成/, '新京成電鉄'],
];

function normalizeOperators(raw) {
  const out = new Set();
  for (const r of raw) {
    for (const [re, name] of OPERATOR_RULES) {
      if (re.test(r)) {
        out.add(name);
        break;
      }
    }
  }
  return [...out];
}

// ---- 駅ナンバリングの路線コード接頭辞 → 路線名（自信を持って言える主要路線のみ）----
// 不明なコード（JR 駅コード等が ref に混ざる場合）は表示しない。
const LINE_CODES = {
  // JR東日本
  JY: '山手線', JK: '京浜東北線', JC: '中央線快速', JB: '中央・総武線各停',
  JA: '埼京線', JS: '湘南新宿ライン', JT: '東海道線', JU: '上野東京ライン',
  JO: '横須賀・総武快速線', JE: '京葉線', JJ: '常磐線快速', JL: '常磐線各停',
  JM: '武蔵野線', JN: '南武線', JH: '横浜線', JI: '鶴見線',
  // 東京メトロ
  G: '銀座線', M: '丸ノ内線', H: '日比谷線', T: '東西線', C: '千代田線',
  Y: '有楽町線', Z: '半蔵門線', N: '南北線', F: '副都心線',
  // 都営地下鉄
  A: '都営浅草線', I: '都営三田線', S: '都営新宿線', E: '都営大江戸線',
  // 京王
  KO: '京王線', IN: '京王井の頭線',
  // 小田急
  OH: '小田急小田原線', OT: '小田急多摩線', OE: '小田急江ノ島線',
  // 東急
  TY: '東急東横線', MG: '東急目黒線', DT: '東急田園都市線', OM: '東急大井町線',
  IK: '東急池上線', TM: '東急多摩川線', SG: '東急世田谷線',
  // 西武
  SI: '西武池袋線', SS: '西武新宿線',
  // 東武
  TS: '東武スカイツリーライン', TD: '東武野田線', TJ: '東武東上線', TI: '東武伊勢崎線',
  // 京成
  KS: '京成本線', SL: '京成成田スカイアクセス線',
  // 京急
  KK: '京急本線',
  // その他
  U: 'ゆりかもめ', R: 'りんかい線', MO: '多摩都市モノレール', NT: '北総線',
  SR: '埼玉高速鉄道', TX: 'つくばエクスプレス', HS: '東京モノレール',
};

// 路線名 → 運行事業者（node の operator と突き合わせて誤タグを弾く）。
function lineOperatorOf(lineName) {
  if (/^(山手線|京浜東北線|中央線|中央・総武線|埼京線|湘南新宿|東海道線|上野東京|横須賀|京葉線|常磐線|武蔵野線|南武線|横浜線|鶴見線)/.test(lineName)) return 'JR東日本';
  if (/^(銀座線|丸ノ内線|日比谷線|東西線|千代田線|有楽町線|半蔵門線|南北線|副都心線)$/.test(lineName)) return '東京メトロ';
  if (/^都営/.test(lineName)) return '都営地下鉄';
  if (/^京王/.test(lineName)) return '京王電鉄';
  if (/^小田急/.test(lineName)) return '小田急電鉄';
  if (/^東急/.test(lineName)) return '東急電鉄';
  if (/^西武/.test(lineName)) return '西武鉄道';
  if (/^東武/.test(lineName)) return '東武鉄道';
  if (/^京成/.test(lineName)) return '京成電鉄';
  if (/^京急/.test(lineName)) return '京急電鉄';
  if (lineName === 'ゆりかもめ') return 'ゆりかもめ';
  if (lineName === 'りんかい線') return 'りんかい線';
  if (lineName === '多摩都市モノレール') return '多摩都市モノレール';
  if (lineName === '北総線') return '北総鉄道';
  if (lineName === '埼玉高速鉄道') return '埼玉高速鉄道';
  if (lineName === 'つくばエクスプレス') return 'つくばエクスプレス';
  if (lineName === '東京モノレール') return '東京モノレール';
  return null;
}

// node 単位で路線コードを解読。その node の事業者と路線事業者が明確に食い違う場合は
// 誤タグ（例: 東急ノードに付いた "T01" を東西線と誤読）として棄却する。
function decodeLinesForNode(codes, nodeOperators) {
  const out = new Set();
  for (const c of codes) {
    const m = c.match(/^[A-Za-z]+/);
    if (!m) continue;
    const name = LINE_CODES[m[0]];
    if (!name) continue;
    const lineOp = lineOperatorOf(name);
    if (lineOp && nodeOperators.length && !nodeOperators.includes(lineOp)) continue;
    out.add(name);
  }
  return [...out];
}

// ---- ハバサイン距離（m）----
const toRad = (d) => (d * Math.PI) / 180;
function dist(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const splitClean = (s) =>
  (s || '')
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);

const raw = JSON.parse(readFileSync(RAW, 'utf8'));
const items = raw.elements
  .filter((e) => e.tags && (e.tags.name || e.tags['name:ja']))
  .map((e) => {
    const t = e.tags;
    // 表示用の事業者は operator+network の広い集合（どの会社が乗り入れるか）。
    const operators = normalizeOperators([
      ...splitClean(t.operator),
      ...splitClean(t.network),
    ]);
    // 路線帰属の突き合わせには operator タグのみ使う（相互直通で network に
    // 他社が入るため。厳しめにして「渋谷に東西線」のような誤タグを弾く）。
    const ownerOps = normalizeOperators(splitClean(t.operator));
    return {
      name: t['name:ja'] || t.name,
      kana: t['name:ja-Hira'] || '',
      en: t['name:en'] || t['name:ja-Latn'] || '',
      lat: e.lat,
      lon: e.lon,
      operators,
      lines: decodeLinesForNode(splitClean(t.ref), ownerOps),
      wikidata: t.wikidata || '',
      wikipedia: t.wikipedia || '',
    };
  });

// 駅名でまとめ、近接(700m)でクラスタリングして統合
const byName = {};
for (const it of items) (byName[it.name] = byName[it.name] || []).push(it);

const merged = [];
for (const name in byName) {
  const clusters = [];
  for (const it of byName[name]) {
    let c = clusters.find((cl) => dist(cl.rep, it) < 700);
    if (!c) clusters.push({ rep: it, items: [it] });
    else c.items.push(it);
  }
  for (const cl of clusters) {
    const its = cl.items;
    const uniq = (a) => [...new Set(a.filter(Boolean))];
    merged.push({
      name,
      kana: uniq(its.map((x) => x.kana))[0] || '',
      en: uniq(its.map((x) => x.en))[0] || '',
      lat: +(its.reduce((s, x) => s + x.lat, 0) / its.length).toFixed(6),
      lon: +(its.reduce((s, x) => s + x.lon, 0) / its.length).toFixed(6),
      operators: uniq(its.flatMap((x) => x.operators)),
      lines: uniq(its.flatMap((x) => x.lines)),
      wikidata: uniq(its.map((x) => x.wikidata))[0] || '',
      wikipedia: uniq(its.map((x) => x.wikipedia))[0] || '',
    });
  }
}

merged.sort((a, b) => (a.kana || a.name).localeCompare(b.kana || b.name, 'ja'));

mkdirSync('src/data', { recursive: true });
writeFileSync(OUT, JSON.stringify(merged));

console.log(`wrote ${merged.length} stations -> ${OUT}`);
console.log(
  `  kana:${merged.filter((m) => m.kana).length} en:${merged.filter((m) => m.en).length}` +
    ` lines:${merged.filter((m) => m.lines.length).length} ops:${merged.filter((m) => m.operators.length).length}` +
    ` wikidata:${merged.filter((m) => m.wikidata).length}`
);
