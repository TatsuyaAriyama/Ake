# App Store Connect — Listing Metadata

App: **Suzaku — Tokyo Compass** (朱雀)
Bundle ID: `com.tatsuyaariyama.suzaku`
Version: `1.2.0` · Build: `3`
Primary category: **Travel** · Secondary: **Navigation**
Age rating: **4+** (no objectionable content)
Price: Free · In-app purchases: none

Privacy Policy URL: `https://tatsuyaariyama.github.io/Ake/privacy.html`
Support URL: `https://github.com/TatsuyaAriyama/Ake`
Marketing icon: `store/AppStore-marketing-icon-1024.png` (1024×1024, opaque)

---

## English (Primary — en-US)

**Name** (max 30)
```
Suzaku — Tokyo Compass
```

**Subtitle** (max 30)
```
Point the way, no map needed
```

**Promotional Text** (max 170)
```
New to Tokyo? Suzaku turns your phone into a simple compass that points straight to any station, restaurant, or shop — and keeps pointing even offline.
```

**Description**
```
Welcome to Tokyo.

Suzaku is a pocket compass for exploring the city. Instead of a map to decode, it gives you one clear thing: the direction to where you want to go.

Pick a destination — a train station, a restaurant, a shop, a park — and Suzaku's hand-drawn compass turns to point the way. Walk in that direction. When you're close, it lets you know. No blue dot to chase, no route to follow, no street names to read.

It's made for travelers. Search places by name in English, browse what's nearby by category, and once you've chosen a destination it keeps working even without a signal.

• A single full-screen compass — calm and easy to read at a glance
• Search stations, restaurants, shops, cafés, parks and more
• Browse nearby places by category
• Works offline once a destination is set
• English and Japanese
• No account, no ads, no tracking — your location never leaves your phone

Put the map away. Just follow the needle.
```

**Keywords** (max 100 chars, comma-separated)
```
tokyo,compass,travel,navigation,direction,offline,tourist,walk,station,restaurant,guide,japan,suzaku
```

**What's New** (v1.2.0)
```
• Search, rebuilt for travelers: sights, temples, stations and shops now surface the places people actually visit, not administrative listings
• New browse categories — Sights and Temples & shrines, nearest first
• Full English throughout search results, not just station names
• Many small fixes to duplicate results and mismatched place names
```

**What's New** (v1.1.0)
```
• Home and Lock Screen widgets — your destination and its direction, without opening the app
• Compact view — just the needle and the distance
• Much better search: one clean result per station, no more duplicates
• Full English: station names, lines and operators now read in English
```

**What's New** (v1.0.0)
```
First release. Welcome to Tokyo.
```

---

## 日本語 (ja)

**Name** (max 30)
```
朱雀 Suzaku — 東京コンパス
```

**Subtitle** (max 30)
```
地図いらず、方向だけ。
```

**Promotional Text** (max 170)
```
東京の街歩きに。スマホがシンプルなコンパスになり、駅・レストラン・お店までまっすぐ方向を指し示します。目的地を決めればオフラインでも。
```

**Description**
```
ようこそ、東京へ。

朱雀は街歩きのためのポケットコンパスです。読み解く地図の代わりに、たったひとつのことを示します——行きたい場所への方向。

目的地を選ぶだけ。駅、レストラン、お店、公園。手描きのコンパスがその方向へ静かに向きます。あとはその向きに歩くだけ。近づくと、そっと知らせます。青い点を追う必要も、ルートをたどる必要も、通り名を読む必要もありません。

旅する人のために。場所を名前で検索し、周辺をカテゴリから探せます。目的地を決めれば、電波がなくても動き続けます。

• 全画面のコンパスひとつ——ひと目で読める静けさ
• 駅・レストラン・お店・カフェ・公園などを検索
• 周辺の場所をカテゴリで探す
• 目的地を決めればオフラインでも動作
• 日本語・英語対応
• アカウント不要・広告なし・トラッキングなし——位置情報は端末から出ません

地図をしまって。針に従うだけ。
```

**Keywords** (max 100 chars)
```
東京,コンパス,方位,旅行,ナビ,方向,オフライン,観光,散歩,駅,レストラン,案内,朱雀
```

**What's New** (v1.2.0)
```
• 検索を旅行者向けに作り直しました。行政区画ではなく、観光スポット・寺社・駅・お店など実際に人が向かう場所が上位に出ます
• 新しいカテゴリ「観光スポット」「寺社」を追加。近い順にすぐ探せます
• 検索結果の英語表示を徹底
• 重複表示や表記ゆれの細かな不具合を多数修正
```

**What's New** (v1.1.0)
```
• ホーム画面・ロック画面のウィジェットに対応。アプリを開かずに方向と距離がわかります
• コンパクト表示を追加。針と距離だけの、いちばん静かな画面です
• 検索を大きく改善。ひとつの駅がいくつも並ぶことがなくなりました
• 英語表示を徹底。駅名・路線・事業者名も英語で表示されます
```

**What's New** (v1.0.0)
```
初回リリース。ようこそ、東京へ。
```

---

## App Privacy — "Nutrition Label" answers

In App Store Connect → App Privacy, answer:

- **Do you collect data from this app?** → **No.**
  - Location is used on-device only to compute direction; it is not collected,
    transmitted, or linked to the user. Search queries go to third-party map
    providers to return results but are not collected/stored by this app.
  - This matches `native/ios/PrivacyInfo.xcprivacy`
    (`NSPrivacyTracking = false`, empty `NSPrivacyCollectedDataTypes`).

---

## Screenshots (required sizes)

- 6.9" (iPhone 16 Pro Max) — 1320 × 2868 — **required**
- 6.5" (iPhone 11 Pro Max / XS Max) — 1242 × 2688 — recommended fallback

### 掲載用セット — `store/screenshots/ja/` ・ `store/screenshots/en/`

朱雀のパレット（ink `#181311` / surface `#FCFBF8` / accent `#9F3327` / sand）で
組んだマーケティング用フレーム。各 1320 × 2868（6.9"）、日英それぞれ5枚。

構成は**方位盤**。朱雀はコンパスなので、掲載画も計器の面立てにしている。

- 上端に**方位読み**（方位角＋方位名）と**方位テープ**（目盛り＋現在位置の標）
- 画面を貫く細い**方位線**。その角度は本当にその目的地への方位で、
  起点から先へ薄れさせて「向き」に見せている
- 端末は中央に置かず左右へ振り、わずかに傾ける

方位角は撮影ハーネスと同じ座標（渋谷 35.6595, 139.7005）から算出した実数値。
コンパスのアプリで架空の数値を載せるわけにはいかないため。

| # | 方位 | 目的地 |
|---|---|---|
| 1 | 091° 東 | 東京タワー 4.1km |
| 2 | 169° 南 | 忠犬ハチ公像 51m |
| 3 | 357° 北 | 明治神宮 1.9km |
| 4 | 339° 北北西 | 代々木公園 1.5km |
| 5 | 031° 北北東 | ブルーボトル 21m |

背景は 濃 → 淡 → 朱 → 淡 → 濃 のリズム、見出しは上／下、端末は右／左と交互。

| # | ファイル | 背景 | 見出し(ja) | 見出し(en) |
|---|---|---|---|---|
| 1 | `01-direction.png` | ink | 方角だけで、街は歩ける。 | Only the direction. Nothing more. |
| 2 | `02-find.png` | sand | 名所は、近い順に。 | The sights, nearest first. |
| 3 | `03-aligned.png` | accent | 合っていれば、この方向です。 | When it lines up, you'll know. |
| 4 | `04-glance.png` | sand | 針と距離、それだけ。 | A needle and a distance. |
| 5 | `05-arrive.png` | ink | 着いたら、そっと知らせる。 | A quiet nudge when you arrive. |

App Store Connect の 6.9" スロットへ、言語ごとにこの順で並べる。
6.5" スロットは 6.9" セットの自動スケールで足りる。

**再生成**（コピーや配色を変えたいとき）:

```bash
npm run dev                          # :5173 で起動しておく
bash scripts/store/make-screenshots.sh
```

- 文言・配色・構成は `scripts/store/build-frames.mjs` の `COPY` / `THEMES` / `FRAMES`
- アプリ画面の状態（目的地・方位・言語）は `scripts/store/capture-harness.html`
- 端末モックアップは下端からはみ出させ、ミニマップがフレーム外に落ちるようにしている。
  `.env` に `VITE_MAPTILER_KEY` を入れて撮り直せば、地図入りの構図にもできる。

### 旧素材 — `store/screenshots/raw-v1.0/`

v1.0 提出時に実機シミュレータで撮った素のキャプチャ6点（英語・実地図入り）。
装飾なし。当時の MapTiler キーで撮影しており、キー無しでは再生成できないため保管。
