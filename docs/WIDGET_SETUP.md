# ロック/ホーム画面ウィジェット — セットアップ状況

目的地の**方角**と**直線距離**をロック画面・ホーム画面のウィジェットに表示する。
リアルタイムのコンパスではなく、「最後に取得した現在地」を基準にした方角・距離を
定期的（＋アプリ起動中は変化のたびに即時）に更新する。

## 状況（2026-07-18 時点）

**ターゲット追加・ビルド設定・シミュレータでの起動確認まで完了済み。**
`SuzakuWidget` Extension ターゲットは `project.pbxproj` に組み込み済みで、
Xcode で GUI操作をする必要は**もう無い**（`xcodeproj` gem でプログラム的に追加し、
`xcodebuild` でビルド成功・シミュレータへインストールして起動確認まで実施）。

検証済み:
- `xcodebuild build`（Debug / Simulator）: **成功**（`SuzakuWidget.appex` が `App.app/PlugIns/` に正しく埋め込まれている）
- `pod install`: 成功（Podfile.lock 通り5ポッド導入）
- シミュレータへインストール・起動: 成功（クラッシュなし、オンボーディング画面を確認）
- `DEVELOPMENT_TEAM = SZ343VGXTL` を App / SuzakuWidget 両ターゲットに設定済み

## 残っている作業（あなたの Xcode で・数分）

`xcodebuild archive`（Release / 実機向け）を試したところ、**唯一残る失敗点**はこちら:

```
error: No profiles for 'com.tatsuyaariyama.ake.SuzakuWidget' were found:
       Xcode couldn't find any iOS App Development provisioning profiles matching
       'com.tatsuyaariyama.ake.SuzakuWidget'. Automatic signing is disabled and
       unable to generate a profile.
error: No profiles for 'com.tatsuyaariyama.ake' were found: (同様)
```

原因: `com.tatsuyaariyama.ake.SuzakuWidget` という App ID が Apple Developer Portal に
まだ存在せず、App Groups capability も未登録のため。これは **Apple ID でサインインした
Xcode でしか解決できない**（この環境では意図的にApple ID認証を行っていない）。

### やること
1. `open ios/App/App.xcworkspace`（Xcodeが自動で開く）
2. 左のターゲット一覧で **App** → **Signing & Capabilities** タブ
   - Team が **ariyama tatsuya (SZ343VGXTL)** になっていることを確認（既に設定済みのはず）
   - まだ App Groups capability が見当たらなければ **+ Capability → App Groups** で
     `group.com.tatsuyaariyama.ake` を追加（`App.entitlements` に既に定義済みなので
     既存のentitlementsファイルを検出してチェックが入るだけの可能性が高い）
3. ターゲットを **SuzakuWidget** に切り替えて同様に **Signing & Capabilities** を確認
   - Team を同じ **SZ343VGXTL** に設定
   - **+ Capability → App Groups** → `group.com.tatsuyaariyama.ake` を追加
4. どちらのターゲットも「自動的に署名」でエラーが消えれば（Xcodeが自動でApp ID登録・
   プロファイル生成・ダウンロードを行う）、**Product → Archive** でアーカイブ作成
5. Xcode Organizer が開いたら **Distribute App → App Store Connect → Upload**

これで完了です。ここから先（Archive〜Upload〜審査提出）はXcodeのGUIで数クリックです。

## 含まれるファイル（参考・すでに反映済み）

| ファイル | ターゲット | 役割 |
|---|---|---|
| `ios/App/App/SuzakuWidgetPlugin.swift` | App | JS→ネイティブのブリッジ |
| `ios/App/App/SuzakuWidgetPlugin.m` | App | Capacitorへのプラグイン登録 |
| `ios/App/App/App.entitlements` | App | App Group |
| `ios/App/SuzakuWidget/SuzakuWidgetBundle.swift` | SuzakuWidget | `@main` ウィジェットバンドル |
| `ios/App/SuzakuWidget/SuzakuWidget.swift` | SuzakuWidget | Provider＋各サイズの View |
| `ios/App/SuzakuWidget/WidgetSnapshot.swift` | SuzakuWidget | 共有モデル・距離/方位計算・整形 |
| `ios/App/SuzakuWidget/Info.plist` | SuzakuWidget | 拡張の Info.plist |
| `ios/App/SuzakuWidget/SuzakuWidget.entitlements` | SuzakuWidget | App Group |
| `ios/App/SuzakuWidget/PrivacyInfo.xcprivacy` | SuzakuWidget | プライバシーマニフェスト（審査必須） |

App Group ID は全体で **`group.com.tatsuyaariyama.ake`** に統一している。

## 動作の要点
- **データが出る条件**: アプリを一度起動し、目的地（と現在地）が取得済みであること。
  未設定なら「目的地を設定」を表示。
- **更新頻度**: アプリ起動中は目的地変更／約40m移動／30秒経過／現在地の有無が切り替わった
  瞬間に即時反映。バックグラウンド時は WidgetKit のタイムライン（約15分間隔＋iOS判断）で更新。
- **方角の意味**: 端末の向きは使えないため、**北を上に固定**した地図的な方位
  （矢印＋「北東」等）。歩く方向に追従するリアルタイム針はアプリ本体でのみ動く。
- **タップ**: ウィジェットをタップするとアプリが開く（`suzaku://compass`）。

## トラブルシュート
- ウィジェットが常に空/プレースホルダ → App Group ID が3箇所（App entitlements /
  Widget entitlements / コード内 `suiteName`）で一致しているか確認（変更していなければ一致済み）。
- `@main` 重複エラー → 発生しないはず（テンプレ生成物を使っていないため）。もし
  Xcode上で手動修正を加えた場合は `SuzakuWidgetBundle.swift` の `@main` のみ残す。
- Archive時に再び provisioning エラーが出る → Xcode右上のアカウント（⌘,→Accounts）に
  Apple ID が追加されているか確認。
