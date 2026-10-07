import SwiftUI

struct OnboardingFlow: View {
  private enum ResultStep { case analysis, time, welcome }
  @EnvironmentObject private var session: AppSession
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var progress: OnboardingProgress?
  @State private var questions: [OnboardingQuestion] = []
  @State private var categories: [InterestCategory] = []
  @State private var selectedCategory: String?
  @State private var result: OnboardingResult?
  @State private var resultStep: ResultStep = .analysis
  @State private var time = Calendar.current.date(from: DateComponents(hour: 8)) ?? .now
  @State private var failure: String?
  @State private var questionTransitioning = false

  var body: some View {
    Group {
      if let progress {
        VStack(spacing: 0) {
          content(progress).frame(maxWidth: .infinity, maxHeight: .infinity)
          VStack(spacing: 10) {
            actions(progress)
          }
          .padding(.horizontal, 28).padding(.top, 12).padding(.bottom, 16)
        }
        .disabled(session.busy)
      } else if let failure {
        EmptyMessage(title: "시작을 준비하지 못했어요", symbol: "wifi.exclamationmark", detail: failure) {
          Task { await reload() }
        }
      } else {
        ProgressView()
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.black.ignoresSafeArea())
    .preferredColorScheme(.dark)
    .toolbarBackground(.hidden, for: .navigationBar)
    .navigationTitle("").navigationBarTitleDisplayMode(.inline)
    .task { await reload() }
  }

  @ViewBuilder private func content(_ progress: OnboardingProgress) -> some View {
    if let result {
      switch resultStep {
      case .analysis:
        ThoughtResultView(
          snapshot: result.analysis, summary: result.summary, automaticallyGenerate: true)
      case .time:
        OnboardingTimePage(time: $time)
      case .welcome:
        OnboardingCelebration()
      }
    } else if progress.canViewResult {
      OnboardingQuestionsCompleted(totalCount: progress.totalCount)
    } else if progress.interestCategoryId == nil {
      OnboardingCategoryPage(categories: categories, selection: $selectedCategory)
    } else if let question = questions.first(where: { $0.id == progress.nextQuestionId }) {
      OnboardingQuestionStage(
        entries: questionTrail(progress, current: question),
        answeredCount: progress.answeredCount, totalCount: progress.totalCount,
        isFollowup: progress.nextStage == 2, isTransitioning: $questionTransitioning)
    } else {
      EmptyMessage(
        title: "진행 상황을 다시 불러와주세요", symbol: "arrow.clockwise", detail: "저장된 답변은 그대로 유지됩니다"
      ) {
        Task { await reload() }
      }
    }
  }

  @ViewBuilder private func actions(_ progress: OnboardingProgress) -> some View {
    if result != nil {
      switch resultStep {
      case .analysis:
        Button("알림 시간 정하기") { advance(to: .time) }.buttonStyle(OnboardingActionStyle())
      case .time:
        Button("계속") { advance(to: .welcome) }.buttonStyle(OnboardingActionStyle())
        Button("이전") { advance(to: .analysis) }.font(.footnote).foregroundStyle(.secondary)
      case .welcome:
        Button("시작하기") { Task { await finish() } }.buttonStyle(OnboardingActionStyle())
        Button("알림 시간 바꾸기") { advance(to: .time) }.font(.footnote).foregroundStyle(.secondary)
      }
    } else if progress.canViewResult {
      Button("결과 보기") { Task { await showResult() } }.buttonStyle(OnboardingActionStyle())
    } else if progress.interestCategoryId == nil {
      if categories.isEmpty {
        Button("다시 불러오기") { Task { await reload() } }.buttonStyle(OnboardingActionStyle())
      } else {
        Button("계속") { Task { await chooseCategory() } }
          .buttonStyle(OnboardingActionStyle(dimWhenDisabled: true)).disabled(selectedCategory == nil)
        Text("5개의 짧은 질문").font(.footnote).foregroundStyle(.secondary)
      }
    } else if let question = questions.first(where: { $0.id == progress.nextQuestionId }) {
      // Keep the choices scrollable at accessibility text sizes and on smaller iPhones.
      ViewThatFits(in: .vertical) {
        choices(question, progress: progress)
        ScrollView { choices(question, progress: progress) }.frame(maxHeight: 240)
      }.fixedSize(horizontal: false, vertical: true)
    }
  }

  private func choices(_ question: OnboardingQuestion, progress: OnboardingProgress) -> some View {
    let followup = progress.nextStage == 2
    let options = followup
      ? (question.followup?.answers.map { DailyChoice(id: $0.id, body: $0.body) } ?? [])
      : question.answers.map { DailyChoice(id: $0.id, body: $0.body) }
    return OnboardingChoiceButtons(
      stepID: question.id + "-\(progress.nextStage)", choices: options,
      locked: session.busy || questionTransitioning, saving: session.busy,
      completedText: questionTransitioning
        ? (followup ? "선택했어요" : "\(progress.answeredCount) / \(progress.totalCount) 완료") : nil
    ) { id in
      Task {
        await submit(question, answerID: followup ? progress.draftAnswerId : id,
          followupID: followup ? id : nil)
      }
    }
  }

  private func questionTrail(_ progress: OnboardingProgress, current: OnboardingQuestion)
    -> [OnboardingTextEntry]
  {
    var entries: [OnboardingTextEntry] = []
    // Reconstruct from the server's assigned order, so resuming has the same visual history.
    for question in questions.prefix(progress.answeredCount) {
      entries.append(.init(id: question.id + "-1", text: question.stage1Body))
      if let followup = question.followup {
        entries.append(.init(id: question.id + "-2", text: followup.followupBody))
      }
    }
    entries.append(.init(id: current.id + "-1", text: current.stage1Body))
    if progress.nextStage == 2, let followup = current.followup {
      entries.append(.init(id: current.id + "-2", text: followup.followupBody))
    }
    return Array(entries.suffix(4))
  }

  private func advance(to step: ResultStep) {
    UISelectionFeedbackGenerator().selectionChanged()
    withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.35)) { resultStep = step }
  }

  private func reload() async {
    do {
      let latest: OnboardingProgress = try await session.api.get("onboarding/status")
      if latest.interestCategoryId == nil {
        let list: CategoryList = try await session.api.get("categories")
        categories = list.items
      } else if !latest.canViewResult {
        let list: OnboardingQuestions = try await session.api.get("onboarding/questions")
        questions = list.items
      }
      progress = latest
      failure = nil
      if latest.resultRequested, result == nil {
        result = try await session.api.send("onboarding/result")
      }
    } catch {
      failure = (error as? APIError)?.message ?? "연결 상태를 확인해주세요"
      await session.report(error)
    }
  }

  private func chooseCategory() async {
    guard let selectedCategory else { return }
    await session.perform {
      do {
        try await session.api.mutate(
          "onboarding/question", body: ["categoryId": .string(selectedCategory)])
        await reload()
      } catch {
        await reload()
        throw error
      }
    }
  }

  private func submit(_ question: OnboardingQuestion, answerID: String?, followupID: String? = nil)
    async
  {
    guard !questionTransitioning else { return }
    guard let answerID else {
      await reload()
      return
    }
    await session.perform {
      var body: [String: JSONValue] = [
        "questionId": .string(question.id), "answerId": .string(answerID),
      ]
      if let followupID { body["followupAnswerId"] = .string(followupID) }
      let endpoint =
        question.followup != nil && followupID == nil
        ? "onboarding/answers/draft" : "onboarding/answers"
      do {
        try await session.api.mutate(endpoint, body: body)
        if question.followup != nil && followupID == nil {
          UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } else {
          UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        await reload()
      } catch {
        await reload()
        throw error
      }
    }
  }

  private func showResult() async {
    await session.perform { result = try await session.api.send("onboarding/result") }
  }

  private func finish() async {
    await session.perform {
      try await session.api.mutate(
        "onboarding/daily-time",
        body: [
          "dailyQuestionTime": .string(time.hourMinute),
          "timezone": .string(TimeZone.current.identifier),
        ])
      // Permission denial must not undo the saved schedule or block onboarding.
      if PushNotifications.shared.configured {
        if (try? await PushNotifications.shared.requestPermission()) == true {
          try? await PushNotifications.shared.register(api: session.api)
        }
      }
      try await session.reloadProfile()
    }
  }
}

extension Date {
  var hourMinute: String {
    let c = Calendar.current.dateComponents([.hour, .minute], from: self)
    return String(format: "%02d:%02d", c.hour ?? 8, c.minute ?? 0)
  }
  static func serverDate(_ value: String?) -> Date? {
    guard let value else { return nil }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.date(from: value) ?? ISO8601DateFormatter().date(from: value)
  }
}
