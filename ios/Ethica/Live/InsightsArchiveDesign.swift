import Charts
import SwiftUI

/// Used by the live API screen and the isolated design preview.
struct TodayImpactView: View {
  let analysis: TodayAnalysis
  let openToday: () -> Void
  private func percent(_ value: Double) -> String {
    value.formatted(.number.precision(.fractionLength(0...1)))
  }
  private func delta(_ value: Double) -> String {
    (value > 0 ? "+" : "") + percent(value) + "%p"
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 26) {
      if let date = analysis.serviceDate {
        Text("\(date) · 출제일 기준").font(.caption).foregroundStyle(.secondary)
      }
      if analysis.status == "completed", let selected = analysis.selectedPhilosopher,
        let before = analysis.before, let after = analysis.after
      {
        VStack(alignment: .leading, spacing: 18) {
          Text("오늘 더해진 생각").font(.title2.bold())
          HStack(spacing: 14) {
            ContentPortrait(imageKey: selected.imageKey, name: selected.name)
              .frame(width: 58, height: 58).clipShape(Circle())
            VStack(alignment: .leading, spacing: 4) {
              Text(selected.name).font(.headline)
              Text(selected.school).font(.subheadline).foregroundStyle(.secondary)
            }
          }
          if let change = analysis.changes.first(where: { $0.id == selected.id }) {
            Text(delta(change.deltaPercentagePoints))
              .font(.system(.largeTitle, design: .rounded, weight: .semibold))
              .monospacedDigit().foregroundStyle(.teal)
            Text("구성 비율 \(percent(change.beforePercent))% → \(percent(change.afterPercent))%")
              .font(.subheadline).foregroundStyle(.secondary)
          }
        }
        Divider()
        VStack(alignment: .leading, spacing: 18) {
          HStack {
            Text("선택 전과 후").font(.headline)
            Spacer()
            Text("\(before.answerCount) → \(after.answerCount)개 답변")
              .font(.caption).foregroundStyle(.secondary)
          }
          Chart(analysis.changes) { item in
            BarMark(x: .value("비율", item.beforePercent), y: .value("철학자", item.name))
              .foregroundStyle(by: .value("시점", "선택 전"))
              .position(by: .value("시점", "선택 전")).cornerRadius(3)
              .accessibilityLabel("\(item.name), 선택 전")
              .accessibilityValue("\(percent(item.beforePercent))퍼센트")
            BarMark(x: .value("비율", item.afterPercent), y: .value("철학자", item.name))
              .foregroundStyle(by: .value("시점", "선택 후"))
              .position(by: .value("시점", "선택 후")).cornerRadius(3)
              .accessibilityLabel("\(item.name), 선택 후")
              .accessibilityValue("\(percent(item.afterPercent))퍼센트")
          }
          .chartForegroundStyleScale(["선택 전": Color.gray.opacity(0.5), "선택 후": Color.teal])
          .chartXScale(domain: 0...100).chartXAxis(.hidden)
          .chartLegend(position: .bottom, alignment: .leading)
          .frame(height: CGFloat(max(130, analysis.changes.count * 56)))
          ForEach(analysis.changes) { item in
            VStack(alignment: .leading, spacing: 5) {
              Text(item.name).font(.subheadline)
              HStack {
                Text("\(percent(item.beforePercent))% → \(percent(item.afterPercent))%")
                  .foregroundStyle(.secondary)
                Spacer()
                Text(delta(item.deltaPercentagePoints)).monospacedDigit()
              }.font(.caption)
            }.accessibilityElement(children: .combine)
          }
        }
        Divider()
        VStack(alignment: .leading, spacing: 8) {
          Text(analysis.nearestChanged ? "가까운 철학자가 바뀌었어요" : "지금 가까운 철학자")
            .font(.headline)
          if analysis.nearestChanged, let previous = before.nearestPhilosopher {
            Text("\(previous.name) → \(after.nearestPhilosopher?.name ?? "")")
              .font(.subheadline)
          } else {
            Text(after.nearestPhilosopher?.name ?? "").font(.subheadline)
            Text(before.answerCount == 0 ? "첫 생각이 기록됐어요." : "오늘도 가장 가까운 철학자는 같아요.")
              .font(.caption).foregroundStyle(.secondary)
          }
        }
        Text("첫 답변으로 달라진 비율이에요. 추가 답변은 모순 분석에만 반영돼요.")
          .font(.caption).foregroundStyle(.secondary)
      } else {
        VStack(spacing: 16) {
          Image(systemName: "chart.bar.xaxis").font(.system(size: 42, weight: .light))
            .foregroundStyle(.secondary).accessibilityHidden(true)
          Text(analysis.status == "pending" ? "오늘의 변화는 아직이에요" : "새 질문을 기다리고 있어요")
            .font(.title3.bold())
          Text(
            analysis.status == "pending"
              ? "답하면 내 생각이 어떻게 달라졌는지 보여드릴게요." : "지금까지의 생각은 누적에서 볼 수 있어요."
          )
          .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
          if analysis.status == "pending" {
            Button("오늘 질문 풀기", action: openToday).buttonStyle(.borderedProminent)
          }
          if let next = Date.serverDate(analysis.nextDailyAt) {
            Text("다음 질문 · \(next.formatted(date: .abbreviated, time: .shortened))")
              .font(.caption).foregroundStyle(.secondary)
          }
        }.frame(maxWidth: .infinity).padding(.vertical, 44)
      }
    }.frame(maxWidth: .infinity, alignment: .leading)
  }
}

private struct ThoughtCount: Identifiable {
  let name: String
  let count: Int
  let color: Color
  var id: String { name }
}

struct PreviewInsightsView: View {
  var openToday: (() -> Void)? = nil
  @EnvironmentObject private var store: MockStore
  @State private var showDailySheet = false
  @State private var previewWorking = false
  @State private var detail = 0
  private var counts: [ThoughtCount] {
    [
      .init(name: "칸트", count: 5 + (store.completedAnswer == 0 ? 1 : 0), color: .indigo),
      .init(name: "밀", count: 3 + (store.completedAnswer == 1 ? 1 : 0), color: .teal),
      .init(name: "아리스토텔레스", count: 2, color: .orange),
      .init(name: "롤스", count: 1, color: .pink),
      .init(name: "에픽테토스", count: 1, color: .mint),
    ]
  }
  private var total: Int { counts.reduce(0) { $0 + $1.count } }
  var body: some View {
    VStack(spacing: 0) {
      AnalysisNavigation(
        section: $store.analysisSection, detail: $detail, period: $store.analysisPeriod)
      ScrollView {
        VStack(alignment: .leading, spacing: 26) {
          if store.analysisSection == 0 {
            aiInterpretation
          } else if store.analysisPeriod == 0 {
            today
          } else {
            cumulative
          }
          if store.analysisSection == 1 {
            Text("디자인 미리보기 · 예시 기록").font(.caption2).foregroundStyle(.tertiary)
          }
        }.padding(.horizontal, 24).padding(.bottom, 28)
      }.id("\(store.analysisSection)-\(store.analysisPeriod)")
    }.background(Color(uiColor: .systemGroupedBackground)).navigationTitle("분석")
      .sheet(isPresented: $showDailySheet) {
        NavigationStack {
          TodayView().toolbar {
            ToolbarItem(placement: .confirmationAction) {
              Button("분석으로 돌아가기") { showDailySheet = false }
            }
          }
        }
      }
  }
  private var today: some View {
    TodayImpactView(analysis: previewImpact) {
      if let openToday { openToday() } else { showDailySheet = true }
    }
  }
  private var previewImpact: TodayAnalysis {
    let date = Date.now.formatted(.iso8601.year().month().day().dateSeparator(.dash))
    guard let selected = store.completedAnswer else {
      return TodayAnalysis(
        status: "pending", serviceDate: date, nextDailyAt: nil,
        selectedPhilosopher: nil, before: nil, after: nil, changes: [], nearestChanged: false)
    }
    let people = Library.thinkers.enumerated().map { index, person in
      AnalysisPhilosopher(
        id: String(index + 1), name: person.name, school: person.school, imageKey: nil)
    }
    func state(_ values: [Int]) -> CompositionState {
      let sum = values.reduce(0, +)
      let order = values.indices.sorted {
        values[$0] == values[$1] ? $0 < $1 : values[$0] > values[$1]
      }
      var units = values.map { $0 * 1000 / sum }
      let remainder = order.sorted {
        let a = values[$0] * 1000 % sum
        let b = values[$1] * 1000 % sum
        return a == b ? $0 < $1 : a > b
      }
      for i in 0..<(1000 - units.reduce(0, +)) { units[remainder[i]] += 1 }
      return CompositionState(
        answerCount: sum, nearestPhilosopher: people[order[0]],
        composition: order.map {
          Composition(
            philosopherId: people[$0].id, name: people[$0].name, percent: Double(units[$0]) / 10)
        })
    }
    let before = state([5, 3, 2, 1, 1])
    let after = state(counts.map(\.count))
    let changes = after.composition.map { item in
      let previous = before.composition.first { $0.id == item.id }!.percent
      return CompositionChange(
        philosopherId: item.id, name: item.name, beforePercent: previous,
        afterPercent: item.percent,
        deltaPercentagePoints: ((item.percent - previous) * 10).rounded() / 10)
    }
    return TodayAnalysis(
      status: "completed", serviceDate: date, nextDailyAt: nil,
      selectedPhilosopher: people[selected], before: before, after: after,
      changes: changes,
      nearestChanged: before.nearestPhilosopher?.id != after.nearestPhilosopher?.id)
  }
  private var cumulative: some View {
    VStack(alignment: .leading, spacing: 24) {
      HStack(alignment: .firstTextBaseline) {
        Text("나의 생각 구성").font(.title2.bold())
        Spacer()
        Text("\(total)개 답변").font(.subheadline).foregroundStyle(.secondary)
      }
      ThoughtCompositionRing(
        composition: counts.enumerated().map { index, item in
          Composition(
            philosopherId: String(index), name: item.name,
            percent: Double(item.count) / Double(total) * 100)
        }, nearestName: "이마누엘 칸트")
      Divider()
      HStack {
        Label("분석 참고도", systemImage: "chart.bar.xaxis")
        Spacer()
        Text("\(min(100, total * 100 / 30))%").monospacedDigit().bold()
      }.font(.subheadline)
      ProgressView(value: Double(min(total, 30)), total: 30).tint(.blue)
      Text("답변 수 기준 · 30개에서 100%").font(.caption).foregroundStyle(.secondary)
    }
  }
  private var aiInterpretation: some View {
    VStack(alignment: .leading, spacing: 22) {
      AIAnalysisControl(
        status: store.analysisPreviewReady ? "ready" : "pending",
        canRetry: !store.analysisPreviewReady, busy: previewWorking,
        generate: { previewWorking = true }, refresh: {}
      )
      .task(id: previewWorking) {
        guard previewWorking else { return }
        do {
          // Preview-only delay makes the waiting/completion design visible. No network request.
          try await Task.sleep(nanoseconds: 1_800_000_000)
          store.analysisPreviewReady = true
          previewWorking = false
        } catch { previewWorking = false }
      }
      if store.analysisPreviewReady {
        InsightTabs(
          insights: detail == 0 ? previewSummaries : previewContradictions,
          kind: detail == 0 ? "해석" : "모순", preview: true
        )
        .id(detail)
        .padding(20).frame(maxWidth: .infinity, alignment: .leading)
        .background(
          Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18))
      }
      Text("미리보기 · 실제 AI 분석이 아닌 예시예요.")
        .font(.caption).foregroundStyle(.secondary)
    }
  }
  private var previewSummaries: [Insight] {
    [
      Insight(
        userAnswerIds: [], title: "관계 속에서도 기준을 지키려는 시선",
        summary:
          "원칙을 중시하는 선택이 가장 많았어요. 친구와의 관계에서도 사실을 전하는 쪽에 무게를 두었어요. 상대가 스스로 판단할 수 있도록 정보를 주는 일을 중요하게 여긴 것으로 볼 수 있습니다. 다만 원칙을 지키는 이유까지 답변만으로 단정할 수는 없어요."
      ),
      Insight(
        userAnswerIds: [], title: "같은 몫보다 서로 다른 출발선을 살펴요",
        summary:
          "함께 나누는 상황에서는 각자의 형편을 고려했어요. 모두에게 같은 몫을 주는 것보다 참여할 기회를 지키는 데 관심을 둔 선택입니다. 기준을 포기했다기보다 그 기준이 누구에게 어떤 영향을 주는지 살핀 것으로 읽을 수 있어요. 이런 선택이 다른 상황에서도 이어지는지 더 알아볼 수 있습니다."
      ),
      Insight(
        userAnswerIds: [], title: "솔직함과 배려를 함께 지키려는 태도",
        summary:
          "불편한 사실을 피하기보다 전하는 방법을 고민하는 모습이 보여요. 솔직함과 관계를 함께 지킬 수 있다고 보는 관점과 닿아 있습니다. 기준을 지키는 것과 상대를 배려하는 것을 별개의 선택으로만 보지는 않는 셈이에요. 다만 이 둘이 충돌할 때 무엇을 우선하는지는 더 많은 답변이 필요합니다."
      ),
    ]
  }
  private var previewContradictions: [Insight] {
    [
      Insight(
        userAnswerIds: [], title: "가까운 사람에게는 달라지는 판단",
        summary:
          "같은 규칙도 관계가 가까워지면 다르게 적용하는 선택이 있었어요. 원칙보다 상대가 받을 영향을 더 크게 고려했을 수 있습니다. 이것만으로 일관성이 없다고 단정할 수는 없어요. 어떤 조건이 판단을 바꿨는지 돌아볼 만한 지점입니다."
      ),
      Insight(
        userAnswerIds: [], title: "이해관계가 생겼을 때 흔들리는 기준",
        summary:
          "처음에는 모두에게 같은 기준을 적용했지만, 자신과 얽힌 상황에서는 다른 쪽을 골랐어요. 공정함을 바라는 생각과 개인의 경험이 맞부딪힌 장면으로 볼 수 있습니다. 감정이 판단의 일부가 됐을 가능성도 있어요. 비슷한 상황의 답변이 쌓이면 이 차이를 더 구체적으로 살펴볼 수 있습니다."
      ),
    ]
  }

}

/// Native chart and selectable legend, shared by preview and live analysis.
struct ThoughtCompositionRing: View {
  let composition: [Composition]
  let nearestName: String?
  var portraitKey: String? = nil
  @State private var selectedID: String?
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  private let palette: [Color] = [.blue, .teal, .orange, .purple, .pink, .indigo]
  private func color(_ index: Int) -> Color { palette[index % palette.count] }
  private var focused: Composition? {
    composition.first { $0.id == selectedID } ?? composition.max { $0.percent < $1.percent }
  }
  private func percent(_ value: Double) -> String {
    value.formatted(.number.precision(.fractionLength(1))) + "%"
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      Label("사상 구성", systemImage: "chart.pie.fill")
        .font(.headline).foregroundStyle(.blue)
      if #available(iOS 17.0, *) {
        Chart(Array(composition.enumerated()), id: \.element.id) { index, item in
          SectorMark(angle: .value("비율", item.percent), innerRadius: .ratio(0.72), angularInset: 2)
            .cornerRadius(4).foregroundStyle(color(index))
            .opacity(selectedID == nil || focused?.id == item.id ? 1 : 0.3)
            .accessibilityLabel(item.name).accessibilityValue(percent(item.percent))
        }.frame(height: 232)
          .chartBackground { _ in
            if let focused {
              VStack(spacing: 5) {
                Text(focused.name).font(.subheadline).foregroundStyle(.secondary)
                  .lineLimit(1).minimumScaleFactor(0.75)
                Text(percent(focused.percent))
                  .font(.system(size: 34, weight: .bold, design: .rounded)).monospacedDigit()
                  .lineLimit(1).minimumScaleFactor(0.75)
                Text("전체 선택 중").font(.caption2).foregroundStyle(.secondary)
              }.frame(width: 140).accessibilityElement(children: .combine)
            }
          }
      } else {
        Chart(Array(composition.enumerated()), id: \.element.id) { index, item in
          BarMark(x: .value("비율", item.percent), y: .value("철학자", item.name))
            .foregroundStyle(color(index)).cornerRadius(3)
        }.frame(height: CGFloat(max(140, composition.count * 36))).chartXAxis(.hidden)
      }
      VStack(spacing: 0) {
        ForEach(Array(composition.enumerated()), id: \.element.id) { index, item in
          Button {
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) {
              selectedID = selectedID == item.id ? nil : item.id
            }
          } label: {
            HStack(spacing: 10) {
              Circle().fill(color(index)).frame(width: 9, height: 9)
              VStack(alignment: .leading, spacing: 4) {
                Text(item.name).font(.subheadline).fixedSize(horizontal: false, vertical: true)
                if dynamicTypeSize.isAccessibilitySize {
                  Text(percent(item.percent)).font(.subheadline.weight(.semibold)).monospacedDigit()
                }
              }
              Spacer(minLength: 6)
              if !dynamicTypeSize.isAccessibilitySize {
                Text(percent(item.percent)).font(.subheadline.weight(.semibold)).monospacedDigit()
              }
              Image(systemName: focused?.id == item.id ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(focused?.id == item.id ? Color.blue : Color.secondary.opacity(0.35))
            }.foregroundStyle(.primary).frame(minHeight: 46)
              .padding(.vertical, dynamicTypeSize.isAccessibilitySize ? 8 : 0)
              .contentShape(Rectangle())
          }.buttonStyle(.plain)
            .accessibilityLabel("\(item.name), \(percent(item.percent))")
            .accessibilityHint("차트에서 이 비율을 강조합니다")
            .accessibilityAddTraits(focused?.id == item.id ? .isSelected : [])
          if index < composition.count - 1 { Divider() }
        }
      }
    }.padding(20)
      .background(
        Color(uiColor: .secondarySystemGroupedBackground),
        in: RoundedRectangle(cornerRadius: 20))
  }
}

/// A shared image slot for generated question illustrations and future server image keys.
struct QuestionArtwork: View {
  var imageKey: String? = nil
  var assetName: String? = nil
  var body: some View {
    GeometryReader { geometry in
      Group {
        if let assetName, let image = UIImage(named: assetName) {
          Image(uiImage: image).resizable().scaledToFill()
        } else if let url = AppConfiguration.imageURL(imageKey) {
          AsyncImage(url: url) { phase in
            if let image = phase.image {
              image.resizable().scaledToFill()
            } else if phase.error != nil {
              placeholder
            } else {
              ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            }
          }
        } else {
          placeholder
        }
      }.frame(width: geometry.size.width, height: geometry.size.height).clipped()
    }.background(Color(uiColor: .secondarySystemBackground)).accessibilityHidden(true)
  }
  private var placeholder: some View {
    Image(systemName: "photo").font(.system(size: 26, weight: .light)).foregroundStyle(.tertiary)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct PreviewArchiveEntry: Identifiable {
  let id: String
  let daysAgo: Int
  let title: String
  let question: String
  let answer: String
  let explanation: String
  let asset: String
  var date: Date { Calendar.current.date(byAdding: .day, value: -daysAgo, to: .now) ?? .now }
  static let history: [Self] = [
    .init(
      id: "garden", daysAgo: 1, title: "같은 기회, 다른 출발선", question: "마을 정원을 나눠 쓴다면 어떤 기준이 공정할까요?",
      answer: "필요한 사람에게 더 나눠요", explanation: "서로 다른 출발선을 고려했어요. 공정한 기회를 고민하는 롤스의 관점과 이어져요.",
      asset: "archive-garden"),
    .init(
      id: "truth", daysAgo: 2, title: "친구에게 건네는 진실", question: "친구에게 상처가 될 수 있는 사실도 전해야 할까요?",
      answer: "솔직하되 조심스럽게 전해요", explanation: "친구가 스스로 판단할 수 있도록 사실을 전하는 선택이에요.",
      asset: "archive-truth"),
    .init(
      id: "share", daysAgo: 3, title: "함께 나누는 몫", question: "모임의 같은 회비가 누군가에게는 부담이라면?",
      answer: "형편에 따라 조정해요", explanation: "모임에 참여할 기회를 모두에게 열어 두려는 선택이에요.", asset: "archive-garden"),
    .init(
      id: "care", daysAgo: 4, title: "기다림 끝의 대화", question: "약속을 잊은 친구에게 어떤 말을 건넬까요?",
      answer: "서운함을 차분히 전해요", explanation: "관계를 지키며 자신의 감정도 표현하는 선택이에요.", asset: "archive-truth"),
  ]
}

struct PreviewArchiveGrid: View {
  @EnvironmentObject private var store: MockStore
  @State private var search = ""
  private var records: [PreviewArchiveEntry] {
    var result = PreviewArchiveEntry.history
    if let answer = store.completedAnswer {
      result.insert(
        .init(
          id: "today", daysAgo: 0, title: "친구를 위한 거짓말",
          question: Library.question.replacingOccurrences(of: "\n", with: " "),
          answer: Library.answers[answer], explanation: store.explanation, asset: "archive-truth"),
        at: 0)
    }
    return result.filter {
      search.isEmpty
        || ($0.title + $0.question + $0.answer).localizedCaseInsensitiveContains(search)
    }
  }
  private var months: [Date] {
    Set(records.map { Calendar.current.dateInterval(of: .month, for: $0.date)!.start }).sorted(
      by: >)
  }
  var body: some View {
    List {
      ForEach(months, id: \.self) { month in
        Section {
          ForEach(
            records.filter {
              Calendar.current.isDate($0.date, equalTo: month, toGranularity: .month)
            }
          ) { entry in
            NavigationLink {
              PreviewArchiveDetail(entry: entry)
            } label: {
              HStack(spacing: 14) {
                QuestionArtwork(assetName: entry.asset).frame(width: 68, height: 76)
                  .clipShape(RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 5) {
                  Text(entry.date.formatted(.dateTime.day().weekday()))
                    .font(.caption).foregroundStyle(.secondary)
                  Text(entry.title).font(.headline).lineLimit(2)
                  Text(entry.answer).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                }.padding(.vertical, 5)
              }.padding(.vertical, 6)
            }
          }
        } header: {
          HStack {
            Text(month.formatted(.dateTime.year().month(.wide)))
            Spacer()
            Text(
              "\(records.filter { Calendar.current.isDate($0.date, equalTo: month, toGranularity: .month) }.count)개"
            )
          }.font(.subheadline).textCase(nil)
        }
      }
      if records.isEmpty { Text("검색 결과가 없어요.").foregroundStyle(.secondary) }
      Text("디자인 미리보기 · 예시 기록").font(.caption2).foregroundStyle(.tertiary)
        .listRowSeparator(.hidden)
    }.listStyle(.plain)
      .navigationTitle("보관함").searchable(text: $search, prompt: "질문, 내 답변")
  }
}

private struct PreviewArchiveDetail: View {
  let entry: PreviewArchiveEntry
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        QuestionArtwork(assetName: entry.asset).aspectRatio(1.25, contentMode: .fit)
          .clipShape(RoundedRectangle(cornerRadius: 20))
        Text(entry.date.formatted(.dateTime.year().month().day())).font(.subheadline)
          .foregroundStyle(.secondary)
        Text(entry.question).font(.title2.bold())
        VStack(alignment: .leading, spacing: 10) {
          Text("내 선택").font(.caption).foregroundStyle(.secondary)
          Label(entry.answer, systemImage: "checkmark.circle.fill").font(.headline)
        }
        Divider()
        Text(entry.explanation).lineSpacing(5)
        Text("AI 이미지 · 질문을 위한 예시 장면").font(.caption).foregroundStyle(.secondary)
      }.padding(24)
    }.navigationTitle("그날의 생각").navigationBarTitleDisplayMode(.inline)
  }
}

struct AnalysisNavigation: View {
  @Binding var section: Int
  @Binding var detail: Int
  @Binding var period: Int
  private var labels: [String] { section == 0 ? ["요약", "모순"] : ["오늘", "누적"] }
  private var selection: Binding<Int> { section == 0 ? $detail : $period }
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      Picker("분석 종류", selection: $section) {
        Text("AI 해석").tag(0)
        Text("통계").tag(1)
      }.pickerStyle(.segmented)
      HStack(spacing: 8) {
        ForEach(labels.indices, id: \.self) { index in
          Button {
            selection.wrappedValue = index
          } label: {
            Text(labels[index])
              .font(.subheadline.weight(selection.wrappedValue == index ? .semibold : .regular))
              .foregroundStyle(selection.wrappedValue == index ? Color.blue : Color.secondary)
              .frame(minWidth: 60, minHeight: 44)
              .overlay(alignment: .bottom) {
                Capsule().fill(selection.wrappedValue == index ? Color.blue : .clear)
                  .frame(height: 2)
              }.contentShape(Rectangle())
          }.buttonStyle(.plain)
            .accessibilityAddTraits(selection.wrappedValue == index ? .isSelected : [])
        }
        Spacer(minLength: 0)
      }.overlay(alignment: .bottom) {
        Rectangle().fill(Color.primary.opacity(0.08)).frame(height: 0.5)
          .allowsHitTesting(false)
      }
      .accessibilityElement(children: .contain)
      .accessibilityLabel(section == 0 ? "해석 내용" : "통계 기간")
    }.padding(.horizontal, 24).padding(.top, 8).padding(.bottom, 20)
  }
}
