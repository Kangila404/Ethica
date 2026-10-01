import SwiftUI
import WidgetKit

struct DailyEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
}
struct DailyProvider: TimelineProvider {
  func placeholder(in context: Context) -> DailyEntry {
    DailyEntry(
      date: .now,
      snapshot: WidgetSnapshot(
        title: "친구를 위한 거짓말도 잘못일까요?", completed: false, expiresAt: nil, status: "pending",
        choices: ["진실을 말한다", "친구를 지킨다"]))
  }
  func getSnapshot(in context: Context, completion: @escaping (DailyEntry) -> Void) {
    completion(
      context.isPreview
        ? placeholder(in: context) : DailyEntry(date: .now, snapshot: WidgetSnapshot.read()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<DailyEntry>) -> Void) {
    let snapshot = WidgetSnapshot.read()
    let now = Date()
    var entries = [DailyEntry(date: now, snapshot: snapshot)]
    if let expiry = snapshot?.expiresAt, expiry > now {
      entries.append(DailyEntry(date: expiry, snapshot: nil))
    }
    completion(
      Timeline(
        entries: entries,
        policy: .after(
          max(snapshot?.expiresAt ?? now.addingTimeInterval(3600), now.addingTimeInterval(900)))))
  }
}
struct DailyWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: DailyEntry
  private var current: WidgetSnapshot? {
    guard let snapshot = entry.snapshot else { return nil }
    if let expiry = snapshot.expiresAt, expiry <= entry.date { return nil }
    return snapshot
  }
  private var layout: DailyWidgetContent.Layout {
    switch family {
    case .systemMedium: return .medium
    case .accessoryRectangular: return .lock
    case .accessoryCircular: return .circle
    case .accessoryInline: return .inline
    default: return .small
    }
  }
  var body: some View {
    DailyWidgetContent(snapshot: current, layout: layout)
      .widgetURL(URL(string: "ethica://daily"))
      .privacySensitive().modifier(WidgetSurface())
  }
}

struct WidgetSurface: ViewModifier {
  func body(content: Content) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      content.containerBackground(.background, for: .widget)
    } else {
      content.padding().background(Color(uiColor: .systemBackground))
    }
  }
}
@main struct EthicaWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "EthicaDaily", provider: DailyProvider()) {
      DailyWidgetView(entry: $0)
    }
    .configurationDisplayName("오늘의 질문").description("매일 한 가지 질문, 나의 생각을 만나는 시간.")
    .supportedFamilies([
      .systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline,
    ])
  }
}
