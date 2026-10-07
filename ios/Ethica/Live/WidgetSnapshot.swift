import Foundation
import SwiftUI
import WidgetKit

struct WidgetSnapshot: Codable {
  let title: String
  let completed: Bool
  let expiresAt: Date?
  var status: String? = nil
  var choices: [String]? = nil
  var selectedAnswer: String? = nil
  private static let group = "group.com.ethica.preview"
  static func read() -> WidgetSnapshot? {
    guard let data = UserDefaults(suiteName: group)?.data(forKey: "dailySnapshot") else {
      return nil
    }
    return try? JSONDecoder().decode(Self.self, from: data)
  }
  static func store(_ snapshot: WidgetSnapshot) {
    guard let data = try? JSONEncoder().encode(snapshot) else { return }
    UserDefaults(suiteName: group)?.set(data, forKey: "dailySnapshot")
    WidgetCenter.shared.reloadAllTimelines()
  }
  static func clear() {
    UserDefaults(suiteName: group)?.removeObject(forKey: "dailySnapshot")
    WidgetCenter.shared.reloadAllTimelines()
  }
}
#if !WIDGET_EXTENSION
  extension WidgetSnapshot {
    static func save(_ question: DailyQuestion) {
      store(
        WidgetSnapshot(
          title: (question.needsFollowup ? question.followupBody : question.stage1Body) ?? question
            .message ?? "새 질문을 기다리고 있어요",
          completed: question.userDailyQuestion == "completed",
          expiresAt: Date.serverDate(question.nextDailyAt),
          status: question.userDailyQuestion,
          choices: (question.needsFollowup ? question.followupAnswers : question.answers)?.map(
            \.body),
          selectedAnswer: question.answers?.first(where: { $0.id == question.selectedAnswerId })?
            .body))
    }
  }
#endif

/// Shared layout for WidgetKit and the in-app design gallery. Tapping opens the app.
struct DailyWidgetContent: View {
  enum Layout { case small, medium, lock, circle, inline }
  let snapshot: WidgetSnapshot?
  let layout: Layout
  private var completed: Bool { snapshot?.completed == true }
  private var pending: Bool {
    snapshot != nil && !completed && (snapshot?.status == nil || snapshot?.status == "pending")
  }
  private var symbol: String {
    completed ? "checkmark.circle.fill" : pending ? "quote.bubble" : "sunrise"
  }
  private var heading: String { completed ? "오늘도 기록했어요" : pending ? "오늘의 질문" : "새 질문을 기다려요" }
  var body: some View {
    Group {
      if layout == .circle {
        ZStack {
          AccessoryWidgetBackground()
          Image(systemName: symbol).font(.title2)
        }.accessibilityLabel(heading)
      } else if layout == .inline {
        Label(
          completed ? "오늘의 생각 완료" : pending ? "오늘의 질문이 도착했어요" : "새 질문 준비 중", systemImage: symbol)
      } else if layout == .lock {
        VStack(alignment: .leading, spacing: 3) {
          Label(heading, systemImage: symbol).font(.caption.bold())
          Text(completed ? "내일도 함께 생각해요" : pending ? snapshot!.title : "앱에서 최신 질문 확인")
            .font(.caption).lineLimit(2)
        }.frame(maxWidth: .infinity, alignment: .leading)
      } else {
        VStack(alignment: .leading, spacing: 10) {
          HStack {
            Label("Ethica", systemImage: symbol).font(.caption.bold())
            Spacer()
            if completed { Text("완료").font(.caption2).foregroundStyle(.secondary) }
          }
          if completed {
            Text("오늘의 생각을\n남겼어요").font(.title3.bold())
            Spacer(minLength: 0)
            Text("내일 또 만나요").font(.caption).foregroundStyle(.secondary)
          } else if pending {
            Text(snapshot!.title).font(.headline).lineLimit(layout == .small ? 4 : 3)
            Spacer(minLength: 0)
            if layout == .medium, let choices = snapshot?.choices, !choices.isEmpty {
              HStack(spacing: 8) {
                ForEach(Array(choices.prefix(2).enumerated()), id: \.offset) { index, choice in
                  HStack(spacing: 5) {
                    Text(index == 0 ? "A" : "B").font(.caption2.bold())
                    Text(choice).font(.caption).lineLimit(1)
                  }.padding(.horizontal, 10).padding(.vertical, 7)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.quaternary, in: Capsule())
                }
              }.accessibilityLabel("선택지는 앱에서 답할 수 있어요")
            } else {
              Label("열어서 답하기", systemImage: "arrow.up.right").font(.caption).foregroundStyle(
                .secondary)
            }
          } else {
            Text("새로운 질문을\n기다리고 있어요").font(.headline)
            Spacer(minLength: 0)
            Text("앱에서 최신 질문 확인").font(.caption).foregroundStyle(.secondary)
          }
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
  }
}
