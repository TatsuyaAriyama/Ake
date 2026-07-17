import WidgetKit
import SwiftUI

// MARK: - ブランド色（デザインシステムの HEX）

extension Color {
    static let suzakuSurface = Color(red: 0.988, green: 0.984, blue: 0.973) // #FCFBF8
    static let suzakuInk     = Color(red: 0.094, green: 0.075, blue: 0.067) // #181311
    static let suzakuAccent  = Color(red: 0.624, green: 0.200, blue: 0.153) // #9F3327
    static let suzakuMuted   = Color(red: 0.541, green: 0.506, blue: 0.486) // #8A817C
}

// MARK: - Timeline

struct SuzakuEntry: TimelineEntry {
    let date: Date
    let snap: WidgetSnapshot
}

struct SuzakuProvider: TimelineProvider {
    func placeholder(in context: Context) -> SuzakuEntry {
        SuzakuEntry(date: Date(), snap: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (SuzakuEntry) -> Void) {
        let snap = context.isPreview ? .placeholder : SnapshotStore.load()
        completion(SuzakuEntry(date: Date(), snap: snap))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SuzakuEntry>) -> Void) {
        let entry = SuzakuEntry(date: Date(), snap: SnapshotStore.load())
        // 距離は「最後に取得した現在地」ベースの推定なので長めの間隔で十分。
        // アプリ起動中は Plugin 側が move/目的地変更ごとに即時 reload する。
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())
            ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - 方位ダイアル（北を上に固定した矢印）

/// 上向き（北）の矢印シェイプ。frame の中心を軸に bearing 度だけ時計回りに回す。
struct BearingArrow: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        let w = r.width, h = r.height
        let cx = r.midX
        p.move(to: CGPoint(x: cx, y: r.minY))                       // 先端（北）
        p.addLine(to: CGPoint(x: cx + w * 0.5, y: r.minY + h * 0.44))
        p.addLine(to: CGPoint(x: cx + w * 0.18, y: r.minY + h * 0.44))
        p.addLine(to: CGPoint(x: cx + w * 0.18, y: r.maxY))
        p.addLine(to: CGPoint(x: cx - w * 0.18, y: r.maxY))
        p.addLine(to: CGPoint(x: cx - w * 0.18, y: r.minY + h * 0.44))
        p.addLine(to: CGPoint(x: cx - w * 0.5, y: r.minY + h * 0.44))
        p.closeSubpath()
        return p
    }
}

/// 円環 + N印 + 目的地方位の矢印。bearing が nil のときは中央のドット。
struct BearingDial: View {
    let bearing: Double?
    var tint: Color = .suzakuAccent
    var ring: Color = .suzakuInk

    var body: some View {
        GeometryReader { geo in
            let s = min(geo.size.width, geo.size.height)
            ZStack {
                Circle()
                    .stroke(ring.opacity(0.22), lineWidth: max(1.5, s * 0.03))
                    .frame(width: s * 0.94, height: s * 0.94)

                Text("N")
                    .font(.system(size: s * 0.16, weight: .semibold))
                    .foregroundColor(.suzakuMuted)
                    .offset(y: -s * 0.4)

                if let b = bearing {
                    BearingArrow()
                        .fill(tint)
                        .frame(width: s * 0.24, height: s * 0.56)
                        .rotationEffect(.degrees(b))
                } else {
                    Circle()
                        .fill(Color.suzakuMuted)
                        .frame(width: s * 0.12, height: s * 0.12)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }
}

// MARK: - 距離テキスト

struct DistanceText: View {
    let meters: Double
    let units: String
    var valueSize: CGFloat = 30
    var unitSize: CGFloat = 15

    var body: some View {
        let d = formatDistance(meters, units: units)
        HStack(alignment: .firstTextBaseline, spacing: 3) {
            Text(d.value)
                .font(.system(size: valueSize, weight: .semibold))
                .foregroundColor(.suzakuInk)
            Text(d.unit)
                .font(.system(size: unitSize, weight: .medium))
                .foregroundColor(.suzakuMuted)
        }
        .minimumScaleFactor(0.6)
        .lineLimit(1)
    }
}

// MARK: - 家族別ビュー

struct SuzakuWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: SuzakuEntry
    var snap: WidgetSnapshot { entry.snap }

    var body: some View {
        content
            .widgetURL(URL(string: "suzaku://compass"))
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .systemMedium:
            mediumView.suzakuContainer(.suzakuSurface)
        case .accessoryCircular:
            accessoryCircularView.suzakuContainer(.clear)
        case .accessoryRectangular:
            accessoryRectangularView.suzakuContainer(.clear)
        case .accessoryInline:
            accessoryInlineView.suzakuContainer(.clear)
        default: // .systemSmall ほか
            smallView.suzakuContainer(.suzakuSurface)
        }
    }

    // 目的地なし共通表示
    @ViewBuilder private func emptyState(compact: Bool) -> some View {
        VStack(spacing: 8) {
            BearingDial(bearing: nil)
                .frame(width: compact ? 40 : 66, height: compact ? 40 : 66)
            Text(localized("noDest", lang: snap.lang))
                .font(.system(size: compact ? 11 : 13, weight: .medium))
                .foregroundColor(.suzakuMuted)
                .multilineTextAlignment(.center)
        }
    }

    // systemSmall
    @ViewBuilder private var smallView: some View {
        if !snap.hasDestination {
            emptyState(compact: false)
        } else {
            VStack(spacing: 6) {
                BearingDial(bearing: snap.effectiveBearing)
                    .frame(width: 74, height: 74)
                if let m = snap.effectiveDistanceM {
                    DistanceText(meters: m, units: snap.units, valueSize: 30, unitSize: 15)
                } else {
                    Text(localized("locating", lang: snap.lang))
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.suzakuMuted)
                }
                Text(snap.destName)
                    .font(.system(size: 12))
                    .foregroundColor(.suzakuMuted)
                    .lineLimit(1)
            }
            .padding(4)
        }
    }

    // systemMedium
    @ViewBuilder private var mediumView: some View {
        if !snap.hasDestination {
            emptyState(compact: false)
        } else {
            HStack(spacing: 18) {
                BearingDial(bearing: snap.effectiveBearing)
                    .frame(width: 92, height: 92)
                VStack(alignment: .leading, spacing: 6) {
                    Text(snap.destName)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.suzakuInk)
                        .lineLimit(2)
                    if let m = snap.effectiveDistanceM {
                        DistanceText(meters: m, units: snap.units, valueSize: 34, unitSize: 17)
                        if let b = snap.effectiveBearing {
                            Text(cardinal(b, lang: snap.lang))
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.suzakuMuted)
                        }
                    } else {
                        Text(localized("locating", lang: snap.lang))
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.suzakuMuted)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 6)
        }
    }

    // accessoryCircular（ロック画面・円形）
    @ViewBuilder private var accessoryCircularView: some View {
        ZStack {
            if #available(iOS 16.0, *) {
                AccessoryWidgetBackground()
            }
            if snap.hasDestination, let b = snap.effectiveBearing {
                VStack(spacing: 1) {
                    BearingDial(bearing: b, tint: .primary, ring: .primary)
                        .frame(width: 26, height: 26)
                    if let m = snap.effectiveDistanceM {
                        let d = formatDistance(m, units: snap.units)
                        Text(d.value + d.unit)
                            .font(.system(size: 10, weight: .semibold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }
            } else {
                BearingDial(bearing: nil, tint: .primary, ring: .primary)
                    .frame(width: 26, height: 26)
            }
        }
    }

    // accessoryRectangular（ロック画面・横長）
    @ViewBuilder private var accessoryRectangularView: some View {
        HStack(spacing: 8) {
            BearingDial(bearing: snap.effectiveBearing, tint: .primary, ring: .primary)
                .frame(width: 34, height: 34)
            VStack(alignment: .leading, spacing: 1) {
                Text(snap.hasDestination ? snap.destName : localized("noDest", lang: snap.lang))
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
                if snap.hasDestination, let m = snap.effectiveDistanceM {
                    let d = formatDistance(m, units: snap.units)
                    let card = snap.effectiveBearing.map { cardinal($0, lang: snap.lang) } ?? ""
                    Text("\(d.value) \(d.unit) · \(card)")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                } else if snap.hasDestination {
                    Text(localized("locating", lang: snap.lang))
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
    }

    // accessoryInline（ロック画面・1行）
    @ViewBuilder private var accessoryInlineView: some View {
        if snap.hasDestination, let m = snap.effectiveDistanceM {
            let d = formatDistance(m, units: snap.units)
            let card = snap.effectiveBearing.map { cardinal($0, lang: snap.lang) } ?? ""
            Text("\(card) \(d.value)\(d.unit) · \(snap.destName)")
        } else if snap.hasDestination {
            Text(snap.destName)
        } else {
            Text(localized("noDest", lang: snap.lang))
        }
    }
}

// MARK: - iOS17 の containerBackground を安全に適用

extension View {
    @ViewBuilder func suzakuContainer(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(color, for: .widget)
        } else {
            self.background(color)
        }
    }
}

// MARK: - Widget 定義

struct SuzakuWidget: Widget {
    let kind = "SuzakuWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SuzakuProvider()) { entry in
            SuzakuWidgetView(entry: entry)
        }
        .configurationDisplayName("朱雀")
        .description("目的地の方角と距離")
        .supportedFamilies(supportedFamilies)
    }

    private var supportedFamilies: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .systemMedium,
                    .accessoryCircular, .accessoryRectangular, .accessoryInline]
        } else {
            return [.systemSmall, .systemMedium]
        }
    }
}
