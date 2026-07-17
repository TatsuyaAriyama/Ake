# 朱雀（Suzaku）

方角コンパス**だけ**で目的地の方向を直感的に示す、ミニマルなナビアプリ。
「道順」ではなく「あっちだよ」を美しいコンパス1枚で伝える。

- デザイン哲学: **変化させる、足さない**
- bundle id: `com.tatsuyaariyama.suzaku` ／ appName: `朱雀`
- App Store: https://apps.apple.com/jp/app/id6788317890

## なぜ Google マップではなくこれか

Google マップは「**どう行くか**（経路）」に答える。朱雀は「**どっちか**（方角）」だけに答える。
経路案内は画面を見続けさせ、曲がり角ごとに注意を要求し、道を選ぶ楽しみを奪う。
朱雀を選ぶ人が得るのは:

1. **一瞥で済む** — 取り出して 1 秒、針と距離を見て、しまう。読む地図がない。
2. **画面から解放される** — 方向が合えばハプティクスが知らせる。歩きスマホをしなくていい。
3. **道は自分で選ぶ** — 目的地は方角として引力のように働き、どの路地を通るかは自由。散歩・旅先の探索・「だいたいあっち」で十分な移動のためのもの。
4. **目的地を決めたら通信不要** — コンパスは完全オフライン。電池も食わない。行き先を検索する瞬間以外、位置情報はどこにも送られない。

この価値が成立する条件は 2 つで、実装はすべてここに奉仕する:

- **リアルタイム性** — 針が身体の回転に遅れず付いてくること。遅れる針は「デジタルの表示」で、遅れない針は「世界に張り付いた道具」になる。
- **分かりやすさ** — 一瞥で迷わないこと。針・ことば・ハプティクスの三重表現で、解釈の余地を残さない。

## デザインシステム

| 用途 | HEX |
|---|---|
| Surface / 背景 | `#FCFBF8` |
| Ink / 文字・構造・南針 | `#181311` |
| Accent / 北針・整列時 | `#9F3327` |
| Muted / 副次テキスト | `#8A817C` |

コンパスは同梱アイコン `42_compass.svg` と同じ手描き言語で描画。

## セットアップ

```bash
npm install
cp .env.example .env   # VITE_MAPTILER_KEY を設定（検索用。コンパス自体は不要）
npm run dev
```

- 開発サーバー: http://localhost:5173
- MapTiler キー: https://cloud.maptiler.com/account/keys/
  未設定でもコンパスは完全に動作する（検索のみ無効）。

## アーキテクチャ

```
src/
  lib/
    geo.ts            方位(bearing)・距離(haversine)・角度正規化
    smoothing.ts      循環平均スムージング / 累積角（折り返し安全）
    declination.ts    磁気偏角（WMM, geomagnetism）
    heading.ts        DeviceOrientation パイプライン（権限・画面回転補正）
    location.ts       現在地（Capacitor Geolocation, 移動閾値は store 側）
    storage.ts        永続化（Capacitor Preferences）
    geocoding.ts      MapTiler Geocoding（目的地検索）
    haptics.ts        整列 / 到着のハプティクス
    i18n.ts           ja / en 文言
    useDampedAngle.ts 針の連続回転 + ダンピング（rAF・最短方向）
  store/              Zustand: location / heading / destination / settings
    useNavigation.ts  派生値 bearing/distance/needle/isAligned/hasArrived
  components/         Compass / ArrivalMark
  screens/            Onboarding / Compass / Destination / Settings
```

### 方位パイプライン（要点）

1. iOS 13+ は `DeviceOrientationEvent.requestPermission()` を**ユーザー操作起点**で呼ぶ（オンボードの「はじめる」）
2. iOS: `webkitCompassHeading`（磁北基準）／ Android: `deviceorientationabsolute` の `alpha`（`360 − alpha`）
3. `screen.orientation.angle` で画面回転補正
4. 現在地から WMM 偏角を算出し磁北→真北へ変換（既定・真北、設定で磁北）
5. **1€ フィルタ**（角速度適応・折り返し安全）でジッター除去 — 静止時は強く平滑、
   回転時はカットオフが開いて即応する。固定 α の EMA が抱える
   「滑らかさ ↔ 遅延」のトレードオフを外す（リアルタイム性の要）
6. 針角 = `(目的地方位 − 端末ヘディング)`、累積角で最短方向に連続回転、
   rAF のクリティカルダンプばね（stiffness 12）で補間
7. 整列判定はヒステリシス付き（±10° で入り ±15° で出る）— 境界の明滅と
   ハプティクス連打を防ぐ。整列外では針に加えて「← 左へ」等のことばを併記

数値検証（東京駅→渋谷）: bearing 246.5°、distance 6.5km、Tokyo 偏角 −7.9°。

方位パイプラインの応答（50Hz センサー、シミュレーション実測）:

| 条件 | 旧: EMA α=0.18 + ばね 5.5 | 新: 1€ + ばね 12 |
|---|---|---|
| 静止（±3° ノイズ）の残留ジッター σ | 0.55° | **0.51°** |
| 90°/s 回転時のフィルタ遅れ | 8.1° | **1.4°** |
| 90°/s 回転時のパイプライン全体の遅れ | 39.4° | **14.9°** |

## Capacitor / ネイティブ

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

### 権限文言（審査対策・ja/en 必須）

> 過去に Kasane で permission string 未ローカライズが原因でリジェクトされた。同じ轍を踏まないこと。

`native/` に配置済みのファイルを各プラットフォームへ反映する:

- **iOS**
  - `native/ios/Info.plist.additions.xml` → `App/App/Info.plist` にマージ
  - `native/ios/Base.lproj/InfoPlist.strings`・`native/ios/ja.lproj/InfoPlist.strings`
    → `App/App/Base.lproj/`・`App/App/ja.lproj/` に配置し、Xcode の Localizations に ja を追加
  - キー: `NSLocationWhenInUseUsageDescription` / `NSMotionUsageDescription`
- **Android**
  - `native/android/AndroidManifest.additions.xml` → `AndroidManifest.xml` にマージ
    （`ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`）
  - `native/android/values/strings.xml`・`native/android/values-ja/strings.xml`
    → `app/src/main/res/values/`・`values-ja/` に配置

### アイコン / スプラッシュ

`resources/icon.svg`・`resources/splash.svg`（オフホワイト背景）から生成:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#FCFBF8' --splashBackgroundColor '#FCFBF8'
```

## 受け入れ基準の対応状況

- [x] bearing/distance を数値検証（東京駅→渋谷ほか、真北・偏角込み）
- [x] 針の連続回転 + ダンピング（最短方向・折り返しで長回りしない）
- [x] 整列で Accent 色 + ハプティクス、到着で到着状態
- [x] 距離の m / km（および mi）表示
- [x] 目的地確定後はオフラインでコンパス動作（検索/地図のみ通信）
- [x] 権限文言 ja / en ローカライズ
- [x] 全画面オフホワイト、3色 + 補助グレー、"足さない"
- [ ] **実機検証**（iOS/Android で実際の方向を指すか）— 要実機
- [x] 地図ピッカー（MapLibre 再スタイル）— 検索に加え、地図を動かして中央のピンで目的地を確定できる

### 地図ピッカー

行き先画面の「地図で選ぶ」から、朱雀の3色 + 補助グレーで塗り直した MapLibre 地図
（`src/lib/mapStyle.ts`）を開く。地図を動かして中央の固定ピンに目的地を合わせ、
「ここに向かう」で確定 → 逆ジオコーディングで地名を付与して保存する。
地図（maplibre-gl）は初期バンドルに含めず、この画面を開いたときだけ遅延ロードするので
コンパス本体のオフライン起動は軽いまま。MapTiler キー未設定時はボタンごと非表示。
