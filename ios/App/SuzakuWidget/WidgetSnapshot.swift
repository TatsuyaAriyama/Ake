import Foundation

/// App Group 経由でアプリから受け取る表示スナップショット。
/// フィールドは JS 側 WidgetSnapshot (src/lib/widgetBridge.ts) と一致させる。
struct WidgetSnapshot: Codable {
    var hasDestination: Bool
    var destName: String
    var destLat: Double
    var destLon: Double
    var hasFix: Bool
    var fixLat: Double
    var fixLon: Double
    /// 直線距離(m)。不明なら -1。
    var distanceM: Double
    /// 真北基準の目的地方位(度, 0=北, 時計回り)。不明なら -1。
    var bearingTrue: Double
    var units: String
    var lang: String
    var updatedAt: Double

    static let empty = WidgetSnapshot(
        hasDestination: false, destName: "", destLat: 0, destLon: 0,
        hasFix: false, fixLat: 0, fixLon: 0,
        distanceM: -1, bearingTrue: -1, units: "km", lang: "ja", updatedAt: 0
    )

    /// プレビュー/プレースホルダ用のダミー（東京タワー方向・1.2km）。
    static let placeholder = WidgetSnapshot(
        hasDestination: true, destName: "東京タワー", destLat: 35.6586, destLon: 139.7454,
        hasFix: true, fixLat: 35.6717, fixLon: 139.7640,
        distanceM: 1200, bearingTrue: 218, units: "km", lang: "ja", updatedAt: 0
    )
}

extension WidgetSnapshot {
    /// 距離(m)。未算出なら座標から補完。目的地/現在地が無ければ nil。
    var effectiveDistanceM: Double? {
        if distanceM >= 0 { return distanceM }
        if hasDestination && hasFix {
            return haversineMeters(fixLat, fixLon, destLat, destLon)
        }
        return nil
    }

    /// 真北基準の方位(度)。未算出なら座標から補完。目的地/現在地が無ければ nil。
    var effectiveBearing: Double? {
        if bearingTrue >= 0 { return bearingTrue }
        if hasDestination && hasFix {
            return bearingDegrees(fixLat, fixLon, destLat, destLon)
        }
        return nil
    }
}

/// App Group から最新スナップショットを読む。
enum SnapshotStore {
    /// Plugin 側 (SuzakuWidgetPlugin) と必ず一致させる。
    static let suiteName = "group.com.tatsuyaariyama.ake"
    static let key = "snapshot"

    static func load() -> WidgetSnapshot {
        guard
            let data = UserDefaults(suiteName: suiteName)?.data(forKey: key),
            let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
        else {
            return .empty
        }
        return snap
    }
}

// MARK: - Geo（geo.ts と同じ式）

private let d2r = Double.pi / 180
private let earthR = 6_371_000.0

func haversineMeters(_ lat1: Double, _ lon1: Double, _ lat2: Double, _ lon2: Double) -> Double {
    let φ1 = lat1 * d2r
    let φ2 = lat2 * d2r
    let dφ = (lat2 - lat1) * d2r
    let dλ = (lon2 - lon1) * d2r
    let a = sin(dφ / 2) * sin(dφ / 2)
        + cos(φ1) * cos(φ2) * sin(dλ / 2) * sin(dλ / 2)
    return 2 * earthR * atan2(sqrt(a), sqrt(1 - a))
}

func bearingDegrees(_ lat1: Double, _ lon1: Double, _ lat2: Double, _ lon2: Double) -> Double {
    let φ1 = lat1 * d2r
    let φ2 = lat2 * d2r
    let dλ = (lon2 - lon1) * d2r
    let y = sin(dλ) * cos(φ2)
    let x = cos(φ1) * sin(φ2) - sin(φ1) * cos(φ2) * cos(dλ)
    let θ = atan2(y, x) * 180 / Double.pi
    return (θ + 360).truncatingRemainder(dividingBy: 360)
}

// MARK: - 表示整形（geo.ts の formatDistance と同じ規則）

/// 距離を (値, 単位) に。km 系: <1km は m、以上は km(小数1桁)。mi 系: <1mi は ft。
func formatDistance(_ meters: Double, units: String) -> (value: String, unit: String) {
    if units == "mi" {
        let feet = meters * 3.28084
        if feet < 5280 { return (String(Int(feet.rounded())), "ft") }
        return (String(format: "%.1f", feet / 5280), "mi")
    }
    if meters < 1000 { return (String(Int(meters.rounded())), "m") }
    return (String(format: "%.1f", meters / 1000), "km")
}

/// 8方位のことば。ja: 北/北東/…、en: N/NE/…。
func cardinal(_ bearing: Double, lang: String) -> String {
    let names = lang == "en"
        ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        : ["北", "北東", "東", "南東", "南", "南西", "西", "北西"]
    let idx = Int((bearing / 45).rounded())
    return names[((idx % 8) + 8) % 8]
}

/// 言語別の短い固定文言。
func localized(_ key: String, lang: String) -> String {
    switch (key, lang) {
    case ("noDest", "en"): return "Set a destination"
    case ("noDest", _):    return "目的地を設定"
    case ("locating", "en"): return "Locating…"
    case ("locating", _):    return "現在地を取得中"
    default: return ""
    }
}
