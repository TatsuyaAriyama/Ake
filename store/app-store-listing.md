# App Store Connect — Listing Metadata

App: **Suzaku — Tokyo Compass** (朱雀)
Bundle ID: `com.tatsuyaariyama.suzaku`
App Store: `https://apps.apple.com/jp/app/id6788317890` (App ID `6788317890`)
Version: `1.0.0` · Build: `1`
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

### Captured set — `store/screenshots/` (1320 × 2868, 6.9")

Captured in English on an iPhone 17 Pro Max simulator (same 6.9" canvas):

1. `01-welcome.png` — Onboarding, "Welcome to Tokyo"
2. `02-home.png` — Home: compass + "Choose a destination" + Tokyo map
3. `03-search.png` — Destination search ("Tokyo Tower") with live results
4. `04-nearby.png` — Nearby Food category (distance-sorted list)
5. `05-compass.png` — Compass pointing to a destination (109 m)
6. `06-arrived.png` — Arrival mark ("Arrived")

Upload directly to App Store Connect. Order 1→6 tells the full story; pick any
5+ for the 6.9" slot. For the 6.5" slot, re-run the capture on an iPhone 11
Pro Max simulator, or let App Store Connect scale the 6.9" set.
