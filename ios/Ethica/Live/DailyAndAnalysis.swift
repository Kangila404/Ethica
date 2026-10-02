import Charts
import SwiftUI
import TipKit

struct LiveTodayView: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.scenePhase) private var scenePhase
  @State private var daily: DailyQuestion?
  @State private var failure: String?
  @State private var followup = false
  @State private var loadID = UUID()
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 28) {
        Text(Date.now.formatted(.dateTime.month(.wide).day().weekday(.wide))).font(.subheadline)
          .foregroundStyle(.secondary)
        if let daily {
          switch daily.userDailyQuestion {
          case "waiting", "preparing":
            EmptyMessage(
              title: daily.userDailyQuestion == "waiting" ? "첫 질문이 곧 찾아와요" : "새 질문을 준비 중이에요",
              symbol: "sunrise", detail: "기다리는 동안 사상가의 글을 읽어보세요")
            Button("학습 둘러보기") { session.selectedTab = 2 }.buttonStyle(.bordered)
          default:
            if let key = daily.imageKey, AppConfiguration.imageURL(key) != nil {
              QuestionArtwork(imageKey: key).aspectRatio(1.65, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 22))
            }
            Label(
              daily.userDailyQuestion == "completed" ? "답변 완료" : "오늘의 질문",
              systemImage: daily.userDailyQuestion == "completed"
                ? "checkmark.circle.fill" : "quote.opening"
            ).font(.caption).foregroundStyle(.secondary)
            Text(daily.stage1Body ?? "").font(.title2.bold())
              .fixedSize(horizontal: false, vertical: true)
            if daily.userDailyQuestion == "completed" {
              if let selected = daily.answers?.first(where: { $0.id == daily.selectedAnswerId }) {
                Label(selected.body, systemImage: "checkmark").font(.headline)
              }
              DisclosureGroup("해설 보기") {
                VStack(alignment: .leading, spacing: 16) {
                  Text(interfaceCopy(daily.selectedAnswer?.explanation ?? "")).multilineTextAlignment(.leading).frame(maxWidth: .infinity, alignment: .leading).textSelection(.enabled)
                  if let explanation = daily.selectedFollowupAnswer?.explanation {
                    ReadingText(title: "추가 답변", bodyText: explanation)
                  }
                }.font(.body).foregroundStyle(.secondary).padding(.top, 10)
                  .frame(maxWidth: .infinity, alignment: .leading)
              }.font(.subheadline)
              if let philosopherID = daily.selectedAnswer?.philosopherId {
                Divider()
                NavigationLink {
                  LivePhilosopherView(id: philosopherID)
                } label: {
                  Label("철학자 살펴보기", systemImage: "person.crop.circle")
                }.font(.headline)
              }
              Button("오늘의 성향 변화 보기") {
                session.analysisSection = 1
                session.analysisPeriod = 0
                session.selectedTab = 1
              }.buttonStyle(.bordered)
            } else if daily.needsFollowup {
              Text("질문 2 / 2").font(.caption).foregroundStyle(.secondary)
              Text(daily.followupBody ?? "").font(.headline)
              ForEach(daily.followupAnswers ?? []) { choice in
                ChoiceButton(text: choice.body) {
                  Task {
                    await session.perform {
                      try await session.api.mutate(
                        "daily/answers/stage2",
                        body: [
                          "questionId": .string(daily.questionId!),
                          "followupAnswerId": .string(choice.id),
                        ])
                      await reload()
                    }
                  }
                }.disabled(session.busy)
              }
            } else {
              ForEach(daily.answers ?? []) { choice in
                ChoiceButton(text: choice.body) { Task { await submit(choice.id) } }.disabled(
                  session.busy)
              }
              Text("정답은 없어요").font(.footnote).foregroundStyle(.secondary)
            }
          }
          if let next = Date.serverDate(daily.nextDailyAt) {
            Divider()
            Label {
              Text("다음 질문 · \(next.formatted(date: .abbreviated, time: .shortened))")
            } icon: {
              Image(systemName: "clock")
            }.font(.footnote).foregroundStyle(.secondary)
          }
          if let failure {
            Text(failure).font(.footnote).foregroundStyle(.secondary)
            Button("새로고침") { Task { await reload() } }
          }
        } else if let failure {
          EmptyMessage(title: "질문을 불러오지 못했어요", symbol: "wifi.exclamationmark", detail: failure) {
            Task { await reload() }
          }
        } else {
          ProgressView().frame(maxWidth: .infinity).padding(60)
        }
      }.readingPage()
    }.navigationTitle("오늘")
      .task { await reload() }.refreshable { await reload() }
      .onChange(of: scenePhase) { if $0 == .active { Task { await reload() } } }
      .onReceive(NotificationCenter.default.publisher(for: .ethicaDailyOpened)) { _ in
        Task { await reload() }
      }
      .sheet(isPresented: $followup) {
        if let daily {
          NavigationStack {
            DailyFollowupView(daily: daily, closed: { followup = false }) {
              followup = false
              Task { await reload() }
            }
          }
        }
      }
  }
  private func reload() async {
    let requestID = UUID()
    loadID = requestID
    do {
      let loaded: DailyQuestion = try await session.api.get("daily/today")
      guard loadID == requestID else { return }
      daily = loaded
      followup = loaded.needsFollowup
      failure = nil
      WidgetSnapshot.save(loaded)
      if loaded.userDailyQuestion == "completed" {
        await PushNotifications.shared.clearDailyAlerts()
      }
    } catch is CancellationError {} catch let error as URLError where error.code == .cancelled {
    } catch {
      failure = (error as? APIError)?.message ?? "연결 상태를 확인해주세요"
      if (error as? APIError)?.status == 401 { await session.report(error) }
    }
  }
  private func submit(_ answer: String) async {
    guard let questionID = daily?.questionId else { return }
    await session.perform {
      do {
        try await session.api.mutate(
          "daily/answers/stage1",
          body: ["questionId": .string(questionID), "answerId": .string(answer)])
        UISelectionFeedbackGenerator().selectionChanged()
        await reload()
      } catch {
        await reload()
        throw error
      }
    }
  }
}
struct DailyFollowupView: View {
  @EnvironmentObject private var session: AppSession
  let daily: DailyQuestion
  let closed: () -> Void
  let finished: () -> Void
  @State private var saving = false
  @State private var failure: String?
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        Text(daily.followupBody ?? "").font(.title2.bold())
        ForEach(daily.followupAnswers ?? []) { choice in
          ChoiceButton(text: choice.body) {
            guard !saving, let questionID = daily.questionId else { return }
            saving = true
            failure = nil
            Task {
              defer { saving = false }
              do {
                try await session.api.mutate(
                  "daily/answers/stage2",
                  body: [
                    "questionId": .string(questionID), "followupAnswerId": .string(choice.id),
                  ])
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                finished()
              } catch {
                failure = (error as? APIError)?.message ?? "저장하지 못했어요. 다시 시도해주세요"
              }
            }
          }.disabled(saving)
        }
        Text("마지막 답변까지 고르면 완료돼요").font(.footnote).foregroundStyle(.secondary)
        if saving { ProgressView() }
        if let failure { Text(failure).font(.footnote).foregroundStyle(.red) }
      }.readingPage()
    }.navigationTitle("질문 2 / 2").navigationBarTitleDisplayMode(.inline)
      .interactiveDismissDisabled(saving)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("나중에", action: closed).disabled(saving)
        }
      }
  }
}
struct CompositionView: View {
  let snapshot: AnalysisSnapshot
  var portraitKey: String? = nil
  var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      if snapshot.composition.isEmpty {
        Text("질문에 답하면 생각의 구성을 볼 수 있어요").foregroundStyle(.secondary)
      } else {
        ThoughtCompositionRing(
          composition: snapshot.composition,
          nearestName: snapshot.nearestPhilosopher, portraitKey: portraitKey)
      }
      Divider()
      HStack {
        Text("분석 참고도").font(.subheadline)
        Spacer()
        Text("\(snapshot.accuracy)%").font(.subheadline.monospacedDigit())
      }
      ProgressView(value: Double(snapshot.accuracy), total: 100).tint(.blue).accessibilityLabel(
        "분석 참고도")
      Text(snapshot.accuracyDescription).font(.footnote).foregroundStyle(.secondary)
      Text("지금까지 \(snapshot.answeredCount)개의 답변").font(.footnote).foregroundStyle(.secondary)
    }
  }
}
struct AIAnalysisControl: View {
  let status: String
  let canRetry: Bool
  var busy = false
  var quota: AnalysisQuota? = nil
  let generate: () -> Void
  let refresh: () -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @Environment(\.scenePhase) private var scenePhase
  @State private var completion = 0
  @State private var glow = 0.0
  private let spectrum: [Color] = [.pink, .orange, .yellow, .green, .cyan, .indigo, .pink]
  private var working: Bool { busy || status == "processing" }
  private var ready: Bool { status == "ready" }
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Group {
        if ready || working {
          face.modifier(AnalysisActionSurface(interactive: false))
        } else {
          Button(action: generate) {
            face.modifier(AnalysisActionSurface(interactive: canRetry))
          }.buttonStyle(.plain).disabled(!canRetry)
            .accessibilityLabel(status == "failed" ? "AI 분석 다시 시도" : "AI 분석하기")
            .accessibilityHint("지금까지의 답변으로 요약과 모순을 함께 분석합니다")
        }
      }
      .overlay {
        RoundedRectangle(cornerRadius: 24)
          .stroke(AngularGradient(colors: spectrum, center: .center), lineWidth: 1.5)
          .opacity(reduceTransparency ? 0 : (ready ? glow : 0.25))
          .allowsHitTesting(false)
      }
      .background {
        if !reduceTransparency {
          RoundedRectangle(cornerRadius: 24)
            .stroke(AngularGradient(colors: spectrum, center: .center), lineWidth: 6)
            .blur(radius: 12).opacity(glow * 0.8).accessibilityHidden(true)
        }
      }
      if working {
        VStack(alignment: .leading, spacing: 10) {
          Capsule().fill(.quaternary).frame(height: 8)
          Capsule().fill(.quaternary).frame(height: 8).padding(.trailing, 36)
          Capsule().fill(.quaternary).frame(height: 8).padding(.trailing, 88)
        }.padding(.horizontal, 8).padding(.vertical, 6).accessibilityHidden(true)
        if !busy {
          Button("상태 새로고침", action: refresh).font(.subheadline)
          if canRetry { Button("분석 다시 시도", action: generate).font(.subheadline) }
        }
      } else if !ready && quota?.remaining == 0 {
        Text("오늘의 분석을 모두 사용했어요. 한국시간 자정에 다시 만나요")
          .font(.caption).foregroundStyle(.secondary)
        Button("상태 새로고침", action: refresh).font(.subheadline)
      } else if !ready && !canRetry {
        Text("먼저 질문에 답해주세요").font(.caption).foregroundStyle(.secondary)
      } else if status == "failed" {
        Text("완료하지 못했어요. 다시 시도해주세요").font(.caption).foregroundStyle(.secondary)
      }
      if !ready, let quota, quota.remaining > 0 {
        Text("오늘 \(quota.remaining)회 남음").font(.caption).foregroundStyle(.secondary)
      }
    }.frame(maxWidth: .infinity, alignment: .leading)
      .onChange(of: status) { value in
        guard value == "ready", scenePhase == .active else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        completion += 1
      }
      .task(id: completion) {
        guard completion > 0, !reduceMotion, !reduceTransparency, scenePhase == .active else {
          return
        }
        withAnimation(.easeOut(duration: 0.35)) { glow = 1 }
        do {
          try await Task.sleep(nanoseconds: 450_000_000)
          withAnimation(.easeOut(duration: 1.2)) { glow = 0 }
        } catch { glow = 0 }
      }
      .onChange(of: scenePhase) { if $0 != .active { glow = 0 } }
      .onChange(of: reduceMotion) { if $0 { glow = 0 } }
  }
  private var face: some View {
    HStack(spacing: 16) {
      ZStack {
        RoundedRectangle(cornerRadius: 16).fill(Color.primary.opacity(0.04))
        Image(systemName: "text.viewfinder").font(.system(size: 27, weight: .light))
          .foregroundStyle(.primary)
      }.frame(width: 52, height: 52).accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 4) {
        Text(ready ? "해석 완료" : working ? "해석 중" : "AI 해석")
          .font(.title3.weight(.semibold))
        if !ready {
          Text(working ? "선택의 흐름을 읽고 있어요" : "요약 · 모순")
            .font(.caption).foregroundStyle(.secondary)
        }
      }
      Spacer(minLength: 8)
      if ready {
        Image(systemName: "checkmark.circle.fill").font(.title2).foregroundStyle(.green)
          .accessibilityHidden(true)
      } else if working {
        ProgressView().controlSize(.regular).accessibilityLabel("AI 응답 대기 중")
      } else if status == "failed" {
        Image(systemName: "arrow.clockwise")
          .font(.headline).foregroundStyle(.secondary).accessibilityHidden(true)
      }
    }.foregroundStyle(.primary).padding(18).frame(maxWidth: .infinity, minHeight: 88)
      .contentShape(RoundedRectangle(cornerRadius: 24))
  }
}

private struct AnalysisActionSurface: ViewModifier {
  let interactive: Bool
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  func body(content: Content) -> some View {
    if reduceTransparency {
      content.background(
        Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 24))
    } else if #available(iOS 26.0, *) {
      content.glassEffect(.regular.interactive(interactive), in: .rect(cornerRadius: 24))
    } else {
      content.background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24))
    }
  }
}

struct SummarySection: View {
  enum Part { case all, overview, contradictions }
  var part: Part = .all
  @EnvironmentObject private var session: AppSession
  let initial: ThoughtSummary
  var automaticallyGenerate = false
  @State private var updated: ThoughtSummary?
  @State private var generating = false
  @State private var showConsent = false
  private var summary: ThoughtSummary { updated ?? initial }
  var body: some View {
    VStack(alignment: .leading, spacing: 22) {
      if part == .all { Text("생각 요약").font(.title2.bold()) }
      AIAnalysisControl(
        status: summary.status, canRetry: summary.canRetry,
        busy: generating, quota: summary.quota, generate: { Task { await generate() } },
        refresh: { Task { await refresh() } })
      if summary.status == "ready" {
        if part != .contradictions {
          InsightTabs(insights: summary.overallSummaries, kind: "해석")
        }
        if part != .overview {
          if part == .all { Text("선택의 차이").font(.title3.bold()).padding(.top, 8) }
          if summary.contradictions.isEmpty {
            Text("아직 드러난 모순이 없어요").foregroundStyle(.secondary)
          }
          InsightTabs(insights: summary.contradictions, kind: "모순")
        }
      }
    }.task { if automaticallyGenerate && summary.status == "pending" { await generate() } }
      .sheet(isPresented: $showConsent) {
        AIConsentSheet {
          showConsent = false
          Task { await generate() }
        }
      }
  }
  private func generate() async {
    guard !generating && summary.canRetry else { return }
    guard session.hasAiConsent else { showConsent = true; return }
    generating = true
    defer { generating = false }
    do { updated = try await session.api.send("analysis/contradictions") } catch {
      if (error as? APIError)?.code == "AI_CONSENT_REQUIRED" { showConsent = true; return }
      if (error as? APIError)?.status == 429 { await refresh() }
      await session.report(error)
    }
  }
  private func refresh() async {
    do { updated = try await session.api.get("analysis/contradictions") } catch {
      await session.report(error)
    }
  }
}
/// Each response item is independently readable; long text remains in the parent's vertical scroll view.
struct InsightTabs: View {
  let insights: [Insight]
  let kind: String
  var preview = false
  @State private var selection = 0
  private var selectedIndex: Int { min(selection, max(0, insights.count - 1)) }
  var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      if insights.count > 1 {
        Picker("\(kind) 항목", selection: $selection) {
          ForEach(insights.indices, id: \.self) { index in
            Text("\(kind) \(index + 1)").tag(index)
              .accessibilityLabel("\(kind) \(index + 1), \(insights[index].title)")
          }
        }.pickerStyle(.segmented)
      }
      if !insights.isEmpty {
        InsightView(insight: insights[selectedIndex], preview: preview)
          .padding(22)
          .background(Color(uiColor: .secondarySystemGroupedBackground),
            in: RoundedRectangle(cornerRadius: 22))
      }
    }.frame(maxWidth: .infinity, alignment: .leading)
      .onChange(of: insights.map { $0.title + $0.summary }) { _ in selection = 0 }
  }
}

struct InsightView: View {
  let insight: Insight
  var preview = false
  @State private var showingAnswers = false
  private var answerIDs: [String] { Array(NSOrderedSet(array: insight.userAnswerIds)) as? [String] ?? [] }
  var body: some View {
    VStack(alignment: .leading, spacing: 24) {
      ReadingText(title: insight.title, bodyText: insight.summary)
      if !answerIDs.isEmpty {
        Divider()
        Button { showingAnswers = true } label: {
          HStack(spacing: 10) {
            Image(systemName: "text.bubble").foregroundStyle(.blue)
            Text("관련 답변").foregroundStyle(.primary)
            Spacer()
            Text("\(answerIDs.count)개").foregroundStyle(.secondary)
            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
          }.font(.subheadline).frame(minHeight: 44).contentShape(Rectangle())
        }.buttonStyle(.plain)
      }
    }
    .sheet(isPresented: $showingAnswers) {
      NavigationStack {
        List {
          ForEach(Array(answerIDs.enumerated()), id: \.element) { index, id in
            if preview {
              VStack(alignment: .leading, spacing: 8) {
                Text(index == 0 ? "친구를 위한 거짓말" : "함께 정하는 기준").font(.headline)
                Text(index == 0 ? "진실을 말한다" : "모두가 납득할 원칙을 정한다")
                  .font(.subheadline).foregroundStyle(.secondary)
              }.padding(.vertical, 6)
            } else {
              RelatedAnswerRow(id: id)
            }
          }
        }.navigationTitle("관련 답변").navigationBarTitleDisplayMode(.inline)
          .toolbar { ToolbarItem(placement: .confirmationAction) { Button("닫기") { showingAnswers = false } } }
      }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
    }
  }
}
private struct RelatedAnswerRow: View {
  @EnvironmentObject private var session: AppSession
  let id: String
  var body: some View {
    LoadView(load: { () -> ArchiveDetail in try await session.api.get("archive/\(id)") }) { answer in
      NavigationLink { LiveArchiveDetailView(id: id) } label: {
        VStack(alignment: .leading, spacing: 8) {
          Text(interfaceCopy(answer.questionBody)).font(.headline).lineLimit(2)
          Text(interfaceCopy(answer.myAnswer)).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
          Text(answer.serviceDate).font(.caption).foregroundStyle(.tertiary)
        }.multilineTextAlignment(.leading).padding(.vertical, 6)
      }
    }
  }
}
struct LiveAnalysisView: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.scenePhase) private var scenePhase
  @State private var reloadID = UUID()
  @State private var detail = 0
  var body: some View {
    VStack(spacing: 0) {
      AnalysisNavigation(
        section: $session.analysisSection, detail: $detail, period: $session.analysisPeriod)
      if session.analysisSection == 0 {
        LoadView(load: { () -> ThoughtSummary in
          try await session.api.get("analysis/contradictions")
        }) { summary in
          ScrollView {
            VStack(alignment: .leading, spacing: 22) {
              SummarySection(part: detail == 0 ? .overview : .contradictions, initial: summary)
            }.padding(.horizontal, 24).padding(.bottom, 28).frame(
              maxWidth: .infinity, alignment: .leading)
          }
        }.id(reloadID)
      } else {
        if session.analysisPeriod == 0 {
          LoadView(load: { () -> TodayAnalysis in
            try await session.api.get("analysis/today")
          }) { today in
            ScrollView {
              TodayImpactView(analysis: today) { session.selectedTab = 0 }.padding(.horizontal, 24)
                .padding(.bottom, 28)
            }
          }.id(reloadID)
        } else {
          LoadView(load: { () -> AnalysisSnapshot in
            try await session.api.get("analysis/summary")
          }) { snapshot in
            ScrollView {
              VStack(alignment: .leading, spacing: 22) {
                Text("나의 생각 구성").font(.title2.bold())
                CompositionView(snapshot: snapshot)
                if let id = snapshot.nearestPhilosopherId {
                  NavigationLink("가까운 철학자 살펴보기") { LivePhilosopherView(id: id) }
                    .font(.subheadline)
                }
              }.padding(.horizontal, 24).padding(.bottom, 28)
            }
          }.id(reloadID)
        }
      }
    }.background(Color(uiColor: .systemGroupedBackground)).navigationTitle("분석")
      .onChange(of: scenePhase) { if $0 == .active { reloadID = UUID() } }
      .onChange(of: session.selectedTab) { if $0 == 1 { reloadID = UUID() } }
  }
}

/// Shared by onboarding and the analysis tab, so long sections stay behind a native picker.
struct ThoughtResultView: View {
  @EnvironmentObject private var session: AppSession
  let snapshot: AnalysisSnapshot
  let summary: ThoughtSummary
  var automaticallyGenerate = false
  @State private var tab = 0
  @State private var portraitKey: String?
  var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      Text("나의 생각 구성").font(.largeTitle.bold())
      if let name = snapshot.nearestPhilosopher {
        HStack(spacing: 12) {
          ContentPortrait(imageKey: portraitKey, name: name)
            .frame(width: 48, height: 48).clipShape(Circle())
          VStack(alignment: .leading, spacing: 3) {
            Text("가까운 철학자").font(.caption).foregroundStyle(.secondary)
            Text(name).font(.headline)
          }
        }
      }
      Picker("분석", selection: $tab) {
        Text("구성").tag(0)
        Text("요약").tag(1)
        Text("모순").tag(2)
      }.pickerStyle(.segmented)
      ScrollView {
        VStack(alignment: .leading, spacing: 22) {
          if tab == 0 {
            CompositionView(snapshot: snapshot, portraitKey: portraitKey)
            if !automaticallyGenerate, let id = snapshot.nearestPhilosopherId {
              NavigationLink("철학자 살펴보기") { LivePhilosopherView(id: id) }
                .font(.subheadline)
            }
          } else {
            SummarySection(
              part: tab == 1 ? .overview : .contradictions,
              initial: summary, automaticallyGenerate: automaticallyGenerate)
          }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(.bottom, 16)
      }
    }.padding(.horizontal, 28).padding(.top, 16)
      .task(id: snapshot.nearestPhilosopherId) {
        guard !AppConfiguration.onboardingPreview, let id = snapshot.nearestPhilosopherId else {
          return
        }
        let profile: PhilosopherProfile? = try? await session.api.get("philosophers/\(id)")
        portraitKey = profile?.imageKey
      }
  }
}

struct AIConsentSheet: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.dismiss) private var dismiss
  @State private var saving = false
  @State private var failure: String?
  let onAgree: () -> Void
  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 24) {
          Text("AI와 함께 살펴볼까요?").font(.title2.bold())
          ReadingText(title: "OpenAI에 보내는 정보",
            bodyText: "문제와 선택한 답변, 후속 답변, 사상 구성과 답변 기록 식별자를 보내 해석을 만들어요")
          Text("이메일·닉네임·로그인 정보는 보내지 않아요\n동의하지 않아도 질문·통계·학습을 이용할 수 있어요")
            .font(.subheadline).foregroundStyle(.secondary).lineSpacing(5)
          Text("계정 설정에서 언제든 동의를 철회할 수 있어요")
            .font(.footnote).foregroundStyle(.secondary)
          NavigationLink("개인정보 처리방침") { LegalView(type: "privacy") }
          if let failure { Text(interfaceCopy(failure)).font(.footnote).foregroundStyle(.red) }
        }.readingPage()
      }
      .safeAreaInset(edge: .bottom) {
        VStack(spacing: 12) {
          Button {
            guard !saving else { return }
            saving = true
            Task {
              defer { saving = false }
              do { try await session.setAiConsent(true); onAgree(); dismiss() }
              catch { failure = (error as? APIError)?.message ?? "동의를 저장하지 못했어요" }
            }
          } label: {
            HStack { if saving { ProgressView() }; Text("동의하고 계속") }
              .frame(maxWidth: .infinity, minHeight: 36)
          }.buttonStyle(.borderedProminent).disabled(saving)
          Button("나중에") { dismiss() }.disabled(saving).frame(minHeight: 44)
        }.padding(.horizontal, 24).padding(.vertical, 12).background(.bar)
      }
      .navigationTitle("AI 정보 전송").navigationBarTitleDisplayMode(.inline)
    }.presentationDetents([.large]).interactiveDismissDisabled(saving)
  }
}
