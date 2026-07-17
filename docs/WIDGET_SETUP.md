# ロック/ホーム画面ウィジェット セットアップ手順（iOS）

目的地の**方角**と**直線距離**をロック画面・ホーム画面のウィジェットに表示する。
リアルタイムのコンパスではなく、「最後に取得した現在地」を基準にした方角・距離を
定期的（＋アプリ起動中は変化のたびに即時）に更新する。

> ⚠️ ウィジェットのソースとプラグインはリポジトリに含めてあるが、**Xcode プロジェクトへの
> ターゲット追加とファイル登録・App Group 有効化は Xcode 上での操作が必要**（`project.pbxproj`
> は提出直前の構成を壊さないよう手編集していない）。所要 10〜15 分。

## 含まれるファイル

| ファイル | 追加先ターゲット | 役割 |
|---|---|---|
| `ios/App/App/SuzakuWidgetPlugin.swift` | **App** | JS→ネイティブのブリッジ。App Group に書き込み、タイムライン更新 |
| `ios/App/App/SuzakuWidgetPlugin.m` | **App** | Capacitor へのプラグイン登録 |
| `ios/App/App/App.entitlements` | **App** | App Group（参照用。Xcode の Capability で自動生成でも可） |
| `ios/App/SuzakuWidget/SuzakuWidgetBundle.swift` | **SuzakuWidget** | `@main` ウィジェットバンドル |
| `ios/App/SuzakuWidget/SuzakuWidget.swift` | **SuzakuWidget** | Provider＋各サイズの View |
| `ios/App/SuzakuWidget/WidgetSnapshot.swift` | **SuzakuWidget** | 共有モデル・距離/方位計算・整形 |
| `ios/App/SuzakuWidget/Info.plist` | **SuzakuWidget** | 拡張の Info.plist（生成物で置換可） |
| `ios/App/SuzakuWidget/SuzakuWidget.entitlements` | **SuzakuWidget** | App Group |

App Group ID は全体で **`group.com.tatsuyaariyama.ake`** に統一している
（`SuzakuWidgetPlugin.swift` と `WidgetSnapshot.swift` の `suiteName` を変える場合は両方揃える）。

## 手順

### 0. Web と Pods を同期
```bash
npm run build
npx cap sync ios
open ios/App/App.xcworkspace
```

### 1. プラグインを App ターゲットへ追加
1. Xcode 左のプロジェクトナビゲータで `App` グループを右クリック →
   **Add Files to "App"…**
2. `SuzakuWidgetPlugin.swift` と `SuzakuWidgetPlugin.m` を選択。
   **Target Membership で `App` にチェック**が入っていることを確認して Add。
   - `.m` 追加時に Objective-C ブリッジングヘッダ作成を聞かれても不要（`Cancel`／
     既存構成のままでよい。Capacitor は `use_frameworks!` のため import 済み）。

### 2. App に App Group を有効化
1. プロジェクト設定 → **App** ターゲット → **Signing & Capabilities**
2. **+ Capability** → **App Groups** を追加
3. `group.com.tatsuyaariyama.ake` を追加してチェック
   - これで `App.entitlements` が生成/更新される（リポジトリ同梱のものと同内容）。

### 3. ウィジェット拡張ターゲットを作成
1. **File → New → Target… → Widget Extension**
2. Product Name: **`SuzakuWidget`**
   - **Include Live Activity: オフ**
   - **Include Configuration App Intent: オフ**（本ウィジェットは `StaticConfiguration`）
   - **Embed in Application: App**
3. 「Activate scheme?」は **Cancel**（App スキームのまま）でよい。

### 4. 生成物を差し替え
Xcode が自動生成する `SuzakuWidget.swift`（サンプル）等を、同梱の実ファイルに置き換える。
1. 生成された **`SuzakuWidget.swift`** のサンプル本文を削除し、
   `ios/App/SuzakuWidget/SuzakuWidget.swift` の内容に置換
   （または生成ファイルを消し、同梱の 3 つの `.swift` を **Add Files** で追加）。
2. `SuzakuWidgetBundle.swift` と `WidgetSnapshot.swift` を **SuzakuWidget ターゲット**に追加。
   - `@main` は `SuzakuWidgetBundle` のみ。生成テンプレに `@main` が残っていたら削除する
     （**`@main` が 2 つあるとビルドエラー**）。
3. 生成された `Info.plist` はそのままで可（`NSExtensionPointIdentifier` が
   `com.apple.widgetkit-extension` であることを確認）。

### 5. ウィジェットの Deployment Target と App Group
1. **SuzakuWidget** ターゲット → General → **Minimum Deployments = iOS 16.0**（必須）
   - ロック画面ウィジェット `accessory*` に必要。かつ `SuzakuWidget.swift` は
     `WidgetFamily.accessoryCircular` 等（iOS16 専用ケース）を `switch` で直接参照するため、
     **14.0 に下げるとコンパイルエラー**になる。ホーム画面だけで使う場合でも 16.0 のままにする。
2. **Signing & Capabilities** → **+ Capability → App Groups** →
   `group.com.tatsuyaariyama.ake` を追加してチェック
3. 両ターゲットの **Team（署名）** を設定

### 6. ビルドして追加
1. 実機（推奨）または Simulator で App を Run
2. アプリで目的地を一度設定（＝ App Group にスナップショットが書かれる）
3. ホーム画面を長押し → **＋** → 「朱雀」→ サイズを選んで配置
4. ロック画面はロック画面編集 → ウィジェット領域 → 「朱雀」

## 動作の要点
- **データが出る条件**: アプリを一度起動し、目的地（と現在地）が取得済みであること。
  未設定なら「目的地を設定」を表示。
- **更新頻度**: アプリ起動中は目的地変更／約40m移動／30秒経過で即時反映。
  バックグラウンド時は WidgetKit のタイムライン（約15分間隔＋iOS判断）で更新。
- **方角の意味**: 端末の向きは使えないため、**北を上に固定**した地図的な方位
  （矢印＋「北東」等）。歩く方向に追従するリアルタイム針はアプリ本体でのみ動く。
- **タップ**: ウィジェットをタップするとアプリが開く（`suzaku://compass`）。
  アプリ内ルーティングまで行うなら URL スキーム `suzaku` を Info.plist に登録する（任意）。

## トラブルシュート
- ウィジェットが常に空/プレースホルダ → App Group ID が 3 箇所（App entitlements /
  Widget entitlements / コード内 `suiteName`）で一致しているか確認。
- `import WidgetKit` でリンクエラー（App ターゲット側）→ App ターゲットの
  General → Frameworks, Libraries, and Embedded Content に **WidgetKit.framework** を追加
  （通常は Swift の自動リンクで不要だが、環境により明示が要ることがある）。
- `SuzakuWidget` メソッドが JS から呼べない（ネイティブログに未登録）→ 手順1の
  Target Membership（`App`）と、`SuzakuWidgetPlugin.m` の `CAP_PLUGIN` 名 `"SuzakuWidget"` を確認。
- `@main` 重複エラー → 生成テンプレの `@main` を削除（`SuzakuWidgetBundle` だけ残す）。
