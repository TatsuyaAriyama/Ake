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

`xcodebuild archive -allowProvisioningUpdates`（Release / 実機向け）まで試し、
**この環境に既にキャッシュされていたXcodeアカウントセッション**（新規ログインはしていない）
で Apple 側と通信できることを確認した上で、根本原因を突き止めました:

```
error: Communication with Apple failed: Your team has no devices from which to
       generate a provisioning profile. Connect a device to use or manually add
       device IDs in Certificates, Identifiers & Profiles.
       https://developer.apple.com/account/
error: No profiles for 'com.tatsuyaariyama.ake(.SuzakuWidget)' were found: ...
```

原因: **Apple Developer アカウント（Team: SZ343VGXTL）に登録済みデバイスが1台もない**。
新しい App ID（今回のウィジェット拡張 `com.tatsuyaariyama.ake.SuzakuWidget` を含む）を
自動プロビジョニングする際、Xcode/xcodebuild はまず開発用プロファイルを内部的に
用意しようとし、それにはチームに登録済みのデバイスが最低1台必要という制約に当たる。
（ついでに `CODE_SIGN_IDENTITY = "iPhone Developer"` がプロジェクトのRelease構成に
無条件で強制されていた不要な設定も発見・削除済み — Automatic Signing では
明示しない方が正しい。）

これは**この環境からは解決できない**（実機を繋ぐか、Developer Portalへの認証操作が
必要なため）。ただし、**Xcode の GUI から Archive すれば、CLIより賢いリトライ/修復フローで
すんなり通ることが多い**（多くのCI/CD事例で報告されている既知の挙動）。

### やること
1. `open ios/App/App.xcworkspace`（Xcodeが自動で開く）
2. 左のターゲット一覧で **App** → **Signing & Capabilities** タブ
   - Team が **ariyama tatsuya (SZ343VGXTL)** になっていることを確認（既に設定済み）
   - App Groups capability が見当たらなければ **+ Capability → App Groups** で
     `group.com.tatsuyaariyama.ake` を追加（entitlementsファイルは用意済みなので
     チェックが入るだけの可能性が高い）
3. ターゲットを **SuzakuWidget** に切り替えて同様に確認・追加
4. **Product → Archive** を実行
   - もし同じ「デバイスが無い」エラーが再現したら: お使いのiPhoneをMacにUSB/Wi-Fi接続
     すると自動でチームに登録される（1台で足りる）。またはブラウザで
     https://developer.apple.com/account/resources/devices/list から手動追加も可能
5. Xcode Organizer が開いたら **Distribute App → App Store Connect → Upload**

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
