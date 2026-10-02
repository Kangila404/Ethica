import SwiftUI
import TipKit

struct LoadView<Value, Content: View>: View {
  @EnvironmentObject private var session: AppSession
  let load: () async throws -> Value
  @ViewBuilder let content: (Value) -> Content
  @State private var value: Value?
  @State private var failure: String?
  var body: some View {
    Group {
      if let value {
        content(value)
      } else if let failure {
        EmptyMessage(title: "불러오지 못했어요", symbol: "wifi.exclamationmark", detail: failure) {
          Task { await reload() }
        }
      } else {
        ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity).accessibilityLabel("불러오는 중")
      }
    }.task { await reload() }.refreshable { await reload() }
      .safeAreaInset(edge: .bottom) {
        if value != nil, let failure {
          HStack {
            Text(failure).font(.footnote)
            Spacer()
            Button("다시 시도") { Task { await reload() } }
          }.padding().background(.regularMaterial)
        }
      }
  }
  private func reload() async {
    failure = nil
    do { value = try await load() } catch is CancellationError {} catch let error as URLError
      where error.code == .cancelled
    {} catch {
      failure = (error as? APIError)?.message ?? "네트워크 상태를 확인하고 다시 시도해주세요"
      if let e = error as? APIError, e.status == 401 { await session.report(e) }
    }
  }
}
struct EmptyMessage: View {
  let title: String
  let symbol: String
  let detail: String
  var retry: (() -> Void)? = nil
  var body: some View {
    VStack(spacing: 18) {
      Image(systemName: symbol).font(.system(size: 36, weight: .light)).foregroundStyle(.secondary)
        .accessibilityHidden(true)
      Text(title).font(.title3.bold())
      Text(detail).font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
      if let retry { Button("다시 시도", action: retry).buttonStyle(.bordered) }
    }.padding(32).frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}
struct ContentPortrait: View {
  let imageKey: String?
  let name: String
  var body: some View {
    AsyncImage(url: AppConfiguration.imageURL(imageKey)) { phase in
      if let image = phase.image {
        image.resizable().scaledToFill()
      } else if name == "이마누엘 칸트" {
        Portrait()
      } else {
        ZStack {
          Color(uiColor: .secondarySystemFill)
          Text(String(name.prefix(1))).font(.system(.largeTitle, design: .serif)).foregroundStyle(
            .secondary)
        }
      }
    }.accessibilityLabel(name)
  }
}
struct ChoiceButton: View {
  let text: String
  var selected = false
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(spacing: 14) {
        Text(text).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
        Spacer(minLength: 8)
        Image(systemName: selected ? "checkmark.circle.fill" : "circle").foregroundStyle(
          selected ? Color.blue : Color.secondary)
      }.padding(18).frame(maxWidth: .infinity, minHeight: 56)
        .background(
          Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }.buttonStyle(.plain).accessibilityAddTraits(selected ? .isSelected : [])
  }
}
struct ReadingText: View {
  let title: String
  let bodyText: String
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(interfaceCopy(title)).font(.title3.weight(.semibold))
        .foregroundStyle(.primary).fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
      CitedText(text: interfaceCopy(bodyText)).font(.body).foregroundStyle(.secondary)
        .lineSpacing(7).multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading).textSelection(.enabled)
    }.frame(maxWidth: .infinity, alignment: .leading)
  }
}
/// Shared by profiles, learning cards and question explanations. Full attribution
/// remains available without making long credits part of the reading surface.
struct CitedText: View {
  let text: String
  @State private var showSources = false
  var body: some View {
    let content = ContentAttribution(text)
    VStack(alignment: .leading, spacing: 8) {
      if !content.body.isEmpty { Text(content.body).textSelection(.enabled) }
      if let sources = content.sources {
        Button { showSources = true } label: {
          Label("출처 보기", systemImage: "doc.text.magnifyingglass")
            .font(.caption).frame(minHeight: 44)
        }.buttonStyle(.plain).foregroundStyle(.secondary)
          .accessibilityHint("문헌과 이미지의 출처 및 이용 조건을 엽니다")
          .sheet(isPresented: $showSources) { ContentSourcesSheet(sources: sources) }
      }
    }.frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct ContentSourcesSheet: View {
  @Environment(\.dismiss) private var dismiss
  let sources: String
  private var linkedSources: AttributedString {
    let text = NSMutableAttributedString(string: sources)
    if let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) {
      for match in detector.matches(in: sources, range: NSRange(sources.startIndex..., in: sources)) {
        if let url = match.url, ["https", "http"].contains(url.scheme?.lowercased() ?? "") {
          text.addAttribute(.link, value: url, range: match.range)
        }
      }
    }
    return AttributedString(text)
  }
  var body: some View {
    NavigationStack {
      ScrollView {
        Text(linkedSources).font(.body).lineSpacing(6).textSelection(.enabled)
          .frame(maxWidth: .infinity, alignment: .leading).padding(24)
      }.navigationTitle("출처 및 이용 조건").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("닫기") { dismiss() } } }
    }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
  }
}

extension View {
  func readingPage() -> some View {
    padding(24).frame(maxWidth: 680, alignment: .leading).frame(maxWidth: .infinity)
  }
}
@available(iOS 17.0, *) struct DailyLearningTip: Tip {
  var title: Text { Text("하루에 한 가지 생각") }
  var message: Text? { Text("답변은 분석과 보관함에 남아요. 가까운 사상가의 글도 읽어보세요") }
  var image: Image? { Image(systemName: "book.closed") }
}
/// The introduction is device-local presentation, not account onboarding or an AI chat.
struct SignedOutWelcomeView: View {
  @AppStorage("ethica.hasSeenWelcomeIntro") private var hasSeenIntro = false
  @State private var replayIntro = false

  var body: some View {
    if !hasSeenIntro || replayIntro {
      WelcomeConversation {
        hasSeenIntro = true
        replayIntro = false
      }
    } else {
      WelcomeView { replayIntro = true }
    }
  }
}

private struct WelcomeConversation: View {
  private struct Line {
    let title: String
    let detail: String
    let response: String
  }
  private let lines = [
    Line(title: "안녕하세요", detail: "에티카에 오신 걸 환영해요", response: "안녕하세요!"),
    Line(title: "살다 보면,\n선택이 어려울 때가 있죠", detail: "사소한 일부터 중요한 순간까지요", response: "네, 그럴 때가 있어요"),
    Line(title: "무엇이 나다운 선택인지\n헷갈리기도 하고요", detail: "내 마음인데, 나도 잘 모를 때가 있죠", response: "맞아요"),
    Line(title: "그럴 땐, 나만의 기준을\n찾아보면 어떨까요?", detail: "철학은 내가 무엇을 중요하게 여기는지 묻는 일이에요", response: "어디서 시작하나요?"),
    Line(title: "하루 한 질문에\n답해보세요", detail: "정답은 없어요\n내 생각에 가까운 쪽을 고르면 돼요", response: "그다음은요?"),
    Line(title: "선택에 담긴 생각을\n함께 살펴봐요", detail: "AI 해석으로 내 관점을 돌아보고,\n나와 닮은 철학자의 이야기를 읽어요", response: "함께 해볼게요"),
    Line(title: "철학을 쉽게,\n나를 조금 더 깊이", detail: "에티카와 함께 시작해요", response: "에티카 시작하기")
  ]
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.colorScheme) private var scheme
  @AccessibilityFocusState private var headingFocused: Int?
  @State private var step = 0
  @State private var destination: Int?
  @State private var contentOpacity = 1.0
  @State private var contentScale = 1.0
  @State private var contentOffset = 0.0
  @State private var contentBlur = 0.0
  @State private var depthStep = 0
  @ScaledMetric(relativeTo: .largeTitle) private var historyBand = 184
  @State private var finalBrandVisible = false
  let finish: () -> Void

  private var changingStep: Bool { destination != nil }
  private var isLast: Bool { step == lines.count - 1 }
  private var line: Line { lines[step] }

  var body: some View {
    GeometryReader { geometry in
      ScrollViewReader { scroll in
        ScrollView {
          VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
              ForEach(lines.indices, id: \.self) { index in
                Capsule().fill(index <= step ? Color.primary : Color.primary.opacity(0.16))
                  .frame(width: index == step ? 28 : 12, height: 4)
              }
              Spacer()
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("소개 \(step + 1)/\(lines.count)")
            .padding(.top, 28).id("introTop")
            Spacer(minLength: 24)
            // Each passage keeps its identity as it travels from the foreground into history.
            ZStack(alignment: .topLeading) {
              ForEach(lines.indices, id: \.self) { index in
                passage(at: index)
                  .scaleEffect(scale(at: index), anchor: .top)
                  .offset(y: verticalPosition(at: index))
                  .blur(radius: reduceMotion ? 0 : depth(at: index) == 0 ? contentBlur : depth(at: index) == 1 ? 2.4 : 3.2)
                  .opacity(opacity(at: index))
                  .zIndex(Double(index))
                  .accessibilityHidden(index != step || changingStep)
              }
            }
            .padding(.bottom, historyBand)
            Spacer(minLength: 36)
            Button {
              guard !changingStep else { return }
              if isLast { finish() } else { destination = step + 1 }
            } label: {
              Text(line.response).font(.system(.body, weight: .medium))
                .multilineTextAlignment(.center)
                .opacity(contentOpacity)
                .frame(maxWidth: .infinity, minHeight: 56)
                .padding(.horizontal, 16)
                .foregroundStyle(scheme == .dark ? Color.black : Color.white)
                .background(scheme == .dark ? Color.white : Color.black, in: Capsule())
            }
            .buttonStyle(WelcomeResponseButtonStyle())
            .disabled(changingStep)
            .padding(.top, 24)
          }
          .padding(.horizontal, 28).padding(.bottom, 28)
          .frame(maxWidth: 440)
          .frame(minHeight: geometry.size.height, alignment: .leading)
          .frame(maxWidth: .infinity)
        }
        .task(id: destination) {
          guard let next = destination else { return }
          await move(to: next) { scroll.scrollTo("introTop", anchor: .top) }
        }
      }
    }
    .background(Color(uiColor: .systemBackground))
    .task { headingFocused = step }
  }

  private func depth(at index: Int) -> Int { max(0, depthStep - index) }

  @ViewBuilder private func passage(at index: Int) -> some View {
    VStack(alignment: .leading, spacing: 18) {
      Text(lines[index].title)
        .font(.system(.largeTitle, weight: .semibold))
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
        .accessibilityFocused($headingFocused, equals: index)
      Text(lines[index].detail).font(.body).foregroundStyle(.secondary)
        .lineSpacing(4).fixedSize(horizontal: false, vertical: true)
      if index == lines.count - 1 {
        // Reserve the finale's space so changing passages never shifts the whole stage.
        ZStack(alignment: .leading) {
          Text("Ethica").font(.system(size: 70, weight: .medium, design: .serif))
            .hidden().accessibilityHidden(true)
          if isLast {
            EthicaWelcomeWordmark(size: 70, emphasis: finalBrandVisible)
              .opacity(finalBrandVisible || reduceMotion ? 1 : 0)
              .scaleEffect(finalBrandVisible || reduceMotion ? 1 : 0.88, anchor: .leading)
              .offset(y: finalBrandVisible || reduceMotion ? 0 : 12)
          }
        }.padding(.top, 28)
      }
    }.frame(maxWidth: .infinity, alignment: .leading)
  }

  private func scale(at index: Int) -> CGFloat {
    switch depth(at: index) {
    case 0: return contentScale
    case 1: return 0.46
    case 2: return 0.40
    default: return 0.34
    }
  }
  private func verticalPosition(at index: Int) -> CGFloat {
    switch depth(at: index) {
    case 0: return historyBand + contentOffset
    case 1: return historyBand * 0.30
    case 2: return -historyBand * 0.40
    default: return -historyBand * 0.85
    }
  }
  private func opacity(at index: Int) -> Double {
    guard index <= step else { return 0 }
    switch depth(at: index) {
    case 0: return contentOpacity
    case 1: return 0.24
    case 2: return 0.14
    default: return 0
    }
  }

  @MainActor private func move(to next: Int, resetScroll: () -> Void) async {
    headingFocused = nil
    do {
      // The current passage remains visible throughout its journey; it becomes the history itself.
      withAnimation(reduceMotion ? nil : .timingCurve(0.22, 0.7, 0.25, 1, duration: 0.85)) {
        depthStep = next
      }
      withAnimation(.easeOut(duration: reduceMotion ? 0.1 : 0.18)) {
        contentOpacity = 0
      }
      // Allow the outgoing passage to clear the reading area, then reveal the next
      // while the same outgoing view continues its slower journey into the distance.
      try await Task.sleep(nanoseconds: reduceMotion ? 120_000_000 : 300_000_000)
      var replacement = Transaction(animation: nil)
      replacement.disablesAnimations = true
      withTransaction(replacement) {
        step = next
        contentScale = reduceMotion ? 1 : 0.985
        contentOffset = reduceMotion ? 0 : 14
        contentBlur = reduceMotion ? 0 : 5
        finalBrandVisible = false
        resetScroll()
      }
      try await Task.sleep(nanoseconds: 30_000_000)
      withAnimation(.easeOut(duration: reduceMotion ? 0.12 : 0.55)) {
        contentOpacity = 1
        contentScale = 1
        contentOffset = 0
        contentBlur = 0
      }
      try await Task.sleep(nanoseconds: reduceMotion ? 150_000_000 : 580_000_000)
      if isLast {
        withAnimation(reduceMotion ? nil : .spring(response: 0.85, dampingFraction: 0.9)) {
          finalBrandVisible = true
        }
      }
      destination = nil
      headingFocused = step
    } catch {
      var reset = Transaction(animation: nil)
      reset.disablesAnimations = true
      withTransaction(reset) {
        depthStep = step
        contentOpacity = 1
        contentScale = 1
        contentOffset = 0
        contentBlur = 0
        finalBrandVisible = isLast
        destination = nil
      }
    }
  }

}

private struct EthicaWelcomeWordmark: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @Environment(\.scenePhase) private var scenePhase
  @State private var glowing = false
  var size: CGFloat = 52
  var emphasis = false

  private var letters: some View {
    Text("Ethica").font(.system(size: size, weight: .medium, design: .serif))
      .lineLimit(1).minimumScaleFactor(0.6)
  }
  var body: some View {
    letters.foregroundStyle(.primary)
      .background {
        if !reduceTransparency {
          letters
            .foregroundStyle(LinearGradient(
              colors: [.pink, .orange, .mint, .cyan], startPoint: .leading, endPoint: .trailing
            ))
            .blur(radius: glowing ? 15 : 9)
            .opacity(reduceMotion ? 0.14 : glowing ? 0.34 : 0.08)
            .animation(
              reduceMotion || scenePhase != .active
                ? nil : .easeInOut(duration: 2.8).repeatForever(autoreverses: true),
              value: glowing
            )
            .accessibilityHidden(true)
        }
      }
      .background {
        if !reduceTransparency {
          letters
            .foregroundStyle(LinearGradient(
              colors: [.pink, .orange, .mint, .cyan], startPoint: .leading, endPoint: .trailing
            ))
            .blur(radius: emphasis ? 24 : 8)
            .scaleEffect(emphasis ? 1.12 : 0.94)
            .opacity(emphasis ? 0.44 : 0)
            .animation(reduceMotion ? nil : .easeOut(duration: 1.1), value: emphasis)
            .accessibilityHidden(true)
        }
      }
      .accessibilityAddTraits(.isHeader)
      .onAppear { glowing = !reduceMotion && scenePhase == .active }
      .onChange(of: scenePhase) { phase in glowing = !reduceMotion && phase == .active }
      .onChange(of: reduceMotion) { reduced in glowing = !reduced && scenePhase == .active }
      .onDisappear { glowing = false }
  }
}

struct WelcomeView: View {
  var replayIntroduction: () -> Void = {}
  @EnvironmentObject private var session: AppSession
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @ScaledMetric(relativeTo: .body) private var buttonHeight = 56
  @ScaledMetric(relativeTo: .body) private var loginFontSize = 19
  @ScaledMetric(relativeTo: .body) private var logoSize = 20
  @ScaledMetric(relativeTo: .largeTitle) private var wordmarkSize = 52
  @State private var brandVisible = false

  var body: some View {
    NavigationStack {
      GeometryReader { geometry in
        ScrollView {
          VStack(spacing: 0) {
            Spacer(minLength: 48)
            VStack(spacing: 18) {
              EthicaWelcomeWordmark(size: wordmarkSize)
              Text("하루 한 질문, 나를 알아가는 시간")
                .font(.subheadline).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .opacity(brandVisible || reduceMotion ? 1 : 0)
            .offset(y: brandVisible || reduceMotion ? 0 : 8)
            .task {
              guard !brandVisible else { return }
              if reduceMotion {
                brandVisible = true
              } else {
                do { try await Task.sleep(nanoseconds: 120_000_000) } catch { return }
                withAnimation(.easeOut(duration: 0.65)) { brandVisible = true }
              }
            }
            Spacer(minLength: 72)
            VStack(spacing: 12) {
              socialButton(
                "Apple로 로그인", logo: "AppleSignInLogo", background: .white,
                foreground: .black, outlined: true, isApple: true
              ) { Task { await session.login(.apple) } }
              socialButton(
                "Google로 로그인", logo: "GoogleSignInLogo", background: .white,
                foreground: Color(red: 0.122, green: 0.122, blue: 0.122), outlined: true
              ) { Task { await session.login(.google) } }
              socialButton(
                "카카오 로그인", logo: "KakaoSignInLogo",
                background: Color(red: 254 / 255, green: 229 / 255, blue: 0),
                foreground: .black.opacity(0.85)
              ) { Task { await session.login(.kakao) } }
            }
            .disabled(session.busy)
            ZStack {
              if session.busy {
                ProgressView().accessibilityLabel("로그인 중")
              }
            }.frame(height: 32)
            ViewThatFits(in: .horizontal) {
              HStack(spacing: 24) { legalLinks }
              VStack(spacing: 4) { legalLinks }
            }
            .font(.footnote).foregroundStyle(.secondary)
            Button("소개 다시 보기", action: replayIntroduction)
              .font(.footnote).foregroundStyle(.secondary)
              .frame(minHeight: 44).padding(.top, 4)
          }
          .padding(.horizontal, 28).padding(.top, 24).padding(.bottom, 24)
          .frame(maxWidth: 440)
          .frame(minHeight: geometry.size.height)
          .frame(maxWidth: .infinity)
        }
      }
      .background(Color(uiColor: .systemBackground))
    }
  }

  private func socialButton(
    _ title: String, logo: String, background: Color, foreground: Color,
    outlined: Bool = false, isApple: Bool = false, action: @escaping () -> Void
  ) -> some View {
    Button(action: action) {
      HStack(spacing: isApple ? 0 : 12) {
        // Apple's artwork includes its own clear space; preserve the entire asset.
        Image(logo).renderingMode(.original).resizable().scaledToFit()
          .frame(
            width: isApple ? buttonHeight * 24 / 44 : logoSize,
            height: isApple ? buttonHeight : logoSize
          ).accessibilityHidden(true)
        Text(title).font(.system(size: loginFontSize, weight: .medium, design: .default))
          .multilineTextAlignment(.center)
      }
      .foregroundStyle(foreground)
      .padding(.horizontal, 16).padding(.vertical, isApple ? 0 : 12)
      .frame(maxWidth: .infinity, minHeight: buttonHeight)
      .background(background, in: RoundedRectangle(cornerRadius: 12))
      .overlay {
        if outlined {
          RoundedRectangle(cornerRadius: 12)
            .strokeBorder(
              isApple ? Color.black : Color(red: 116 / 255, green: 119 / 255, blue: 117 / 255),
              lineWidth: 1
            )
        }
      }
      .contentShape(RoundedRectangle(cornerRadius: 12))
    }
    .buttonStyle(LoginButtonStyle())
  }

  @ViewBuilder private var legalLinks: some View {
    NavigationLink("이용약관") { LegalView(type: "service") }.frame(minHeight: 44)
    NavigationLink("개인정보 처리방침") { LegalView(type: "privacy") }.frame(minHeight: 44)
  }
}

private struct WelcomeResponseButtonStyle: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  func makeBody(configuration: Configuration) -> some View {
    // A transition lock is not an unavailable action: keep the button's surface steady.
    configuration.label
      .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
  }
}

private struct LoginButtonStyle: ButtonStyle {
  @Environment(\.isEnabled) private var isEnabled
  func makeBody(configuration: Configuration) -> some View {
    // Flatten the artwork and button before dimming, so overlapping opaque layers
    // cannot turn into brighter rectangles during a press or authentication request.
    configuration.label.compositingGroup()
      .opacity(!isEnabled ? 0.5 : configuration.isPressed ? 0.75 : 1)
  }
}
struct LiveRootView: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.scenePhase) private var scenePhase
  @State private var settings = false
  var body: some View {
    Group {
      switch session.phase {
      case .loading:
        VStack(spacing: 16) {
          ProgressView()
          Text("계정을 확인하고 있어요").font(.subheadline).foregroundStyle(.secondary)
        }.frame(maxWidth: .infinity, maxHeight: .infinity)
          .background(Color(uiColor: .systemBackground))
      case .signedOut: SignedOutWelcomeView()
      case .unavailable:
        EmptyMessage(
          title: "연결하지 못했어요", symbol: "network", detail: "인터넷 연결을 확인하고 다시 시도해주세요"
        ) { Task { await session.restore() } }
      case .onboarding:
        NavigationStack { OnboardingFlow().toolbar { profileToolbar } }
      case .ready:
        TabView(selection: $session.selectedTab) {
          NavigationStack { LiveTodayView().toolbar { profileToolbar } }.tabItem {
            Label("오늘", systemImage: "sun.max")
          }.tag(0)
          NavigationStack { LiveAnalysisView().toolbar { profileToolbar } }.tabItem {
            Label("분석", systemImage: "chart.bar.xaxis")
          }.tag(1)
          NavigationStack { LearningCatalogView().toolbar { profileToolbar } }.tabItem {
            Label("학습", systemImage: "books.vertical")
          }.tag(2)
          NavigationStack { LiveArchiveView().toolbar { profileToolbar } }.tabItem {
            Label("보관함", systemImage: "tray")
          }.tag(3)
          if session.user?.userRole == "admin" {
            NavigationStack { AdminHomeView().toolbar { profileToolbar } }.tabItem {
              Label("관리", systemImage: "slider.horizontal.3")
            }.tag(4)
          }
        }
      }
    }
    .id(session.generation)
    .sheet(isPresented: $settings) {
      NavigationStack { LiveSettingsView() }.environmentObject(session)
    }
    .onChange(of: session.phase) { value in if value == .signedOut { settings = false } }
    .task { if session.phase == .loading { await session.restore() } }
    .onChange(of: scenePhase) { value in
      if value == .active, session.user != nil {
        Task { do { try await session.reloadProfile() } catch { await session.report(error) } }
      }
    }
    .alert(
      "요청을 완료하지 못했어요",
      isPresented: Binding(
        get: { session.errorMessage != nil }, set: { if !$0 { session.errorMessage = nil } })
    ) {
      Button("확인", role: .cancel) { session.errorMessage = nil }
    } message: {
      Text(session.errorMessage ?? "")
    }
    .onReceive(NotificationCenter.default.publisher(for: .ethicaDailyOpened)) { _ in
      session.selectedTab = 0
    }
    .onOpenURL { session.open($0) }
  }
  @ToolbarContentBuilder private var profileToolbar: some ToolbarContent {
    if session.phase == .onboarding && session.user?.userRole == "admin" {
      ToolbarItem(placement: .navigationBarLeading) { NavigationLink("관리") { AdminHomeView() } }
    }
    ToolbarItem(placement: .navigationBarTrailing) {
      Button {
        settings = true
      } label: {
        AccountAvatar(avatarID: session.user?.avatarId).frame(width: 28, height: 28)
      }.accessibilityLabel("내 계정")
    }
  }
}

/// Let the system track the keyboard safe area instead of calculating screen offsets.
struct EditorKeyboard: ViewModifier {
  func body(content: Content) -> some View {
    content.scrollDismissesKeyboard(.interactively)
      .toolbar {
        ToolbarItemGroup(placement: .keyboard) {
          Spacer()
          Button {
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder),
              to: nil, from: nil, for: nil)
          } label: { Image(systemName: "keyboard.chevron.compact.down") }
            .accessibilityLabel("키보드 내리기")
        }
      }
  }
}
extension View {
  func editorKeyboard() -> some View { modifier(EditorKeyboard()) }
}
