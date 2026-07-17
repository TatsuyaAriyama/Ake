import Foundation
import Capacitor
import WidgetKit

/// JS 側 (src/lib/widgetBridge.ts) から呼ばれるブリッジ。
/// 目的地・距離・方位などのスナップショットを App Group の UserDefaults に書き込み、
/// ウィジェットのタイムライン更新を要求する。
///
/// 前提: App ターゲットと Widget ターゲットの双方で同じ App Group
///       `group.com.tatsuyaariyama.ake` を有効化しておくこと（docs/WIDGET_SETUP.md 参照）。
@objc(SuzakuWidgetPlugin)
public class SuzakuWidgetPlugin: CAPPlugin {
    /// Widget 側 (SnapshotStore) と必ず一致させる。
    private let suiteName = "group.com.tatsuyaariyama.ake"
    private let key = "snapshot"

    @objc func update(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            call.reject("App Group \(suiteName) is not configured")
            return
        }

        // Capacitor の getter は Optional を返すため ?? で確実に非 Optional 値にする
        // （Optional を Any として JSONSerialization に渡すと失敗するため）。
        let dict: [String: Any] = [
            "hasDestination": call.getBool("hasDestination") ?? false,
            "destName": call.getString("destName") ?? "",
            "destLat": call.getDouble("destLat") ?? 0,
            "destLon": call.getDouble("destLon") ?? 0,
            "hasFix": call.getBool("hasFix") ?? false,
            "fixLat": call.getDouble("fixLat") ?? 0,
            "fixLon": call.getDouble("fixLon") ?? 0,
            "distanceM": call.getDouble("distanceM") ?? -1,
            "bearingTrue": call.getDouble("bearingTrue") ?? -1,
            "units": call.getString("units") ?? "km",
            "lang": call.getString("lang") ?? "ja",
            "updatedAt": call.getDouble("updatedAt") ?? 0,
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: dict) else {
            call.reject("Failed to encode snapshot")
            return
        }
        defaults.set(data, forKey: key)

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        if let defaults = UserDefaults(suiteName: suiteName) {
            defaults.removeObject(forKey: key)
        }
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
