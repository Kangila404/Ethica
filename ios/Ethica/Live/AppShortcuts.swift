import AppIntents
import Foundation

struct OpenDailyQuestionIntent: AppIntent {
  static var title: LocalizedStringResource = "오늘의 질문 열기"
  static var description = IntentDescription("Ethica에서 오늘의 질문과 답변을 확인합니다.")
  static var openAppWhenRun = true
  @MainActor func perform() async throws -> some IntentResult {
    NotificationCenter.default.post(name: .ethicaDailyOpened, object: nil)
    return .result()
  }
}
struct EthicaShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: OpenDailyQuestionIntent(),
      phrases: ["\(.applicationName) 오늘의 질문", "\(.applicationName) 열고 생각하기"], shortTitle: "오늘의 질문",
      systemImageName: "quote.bubble")
  }
}
