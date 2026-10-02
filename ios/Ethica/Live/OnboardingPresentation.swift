import SwiftUI
import UIKit

struct OnboardingActionStyle: ButtonStyle {
  var secondary = false
  var dimWhenDisabled = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.isEnabled) private var enabled
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.body.weight(.semibold)).multilineTextAlignment(.center)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, minHeight: 24).padding(.horizontal, 22).padding(.vertical, 18)
      .foregroundStyle(secondary ? Color.white : Color.black)
      .background(secondary ? Color(white: 0.13) : Color(white: 0.96), in: Capsule())
      .overlay(Capsule().strokeBorder(secondary ? Color.white.opacity(0.2) : .clear, lineWidth: 1))
      .compositingGroup()
      .opacity(dimWhenDisabled && !enabled ? 0.35 : 1)
      .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
  }
}

struct OnboardingCategoryPage: View {
  let categories: [InterestCategory]
  @Binding var selection: String?
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
  @Environment(\.dynamicTypeSize) private var typeSize

  var body: some View {
    GeometryReader { geometry in
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          Text("원하는 분야를\n골라주세요").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
          Text("관심 있는 하나로 시작해요")
            .font(.body).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
          if categories.isEmpty {
            Spacer(minLength: 40)
            Text("첫 질문을 준비하고 있어요").foregroundStyle(.secondary)
          } else if reduceMotion || voiceOver || typeSize.isAccessibilitySize {
            Spacer(minLength: 30)
            ForEach(Array(categories.enumerated()), id: \.element.id) { index, category in
              Button {
                select(category.id)
              } label: {
                HStack(spacing: 12) {
                  Image(systemName: CategoryAppearance.symbol(index))
                  Text(category.name)
                  Spacer()
                  if selection == category.id { Image(systemName: "checkmark.circle.fill") }
                }.padding(20).frame(maxWidth: .infinity, minHeight: 60)
                  .foregroundStyle(Color(CategoryAppearance.color(index)))
                  .background(Color(CategoryAppearance.color(index)).opacity(0.18), in: Capsule())
              }.buttonStyle(.plain)
                .accessibilityAddTraits(selection == category.id ? .isSelected : [])
            }
          } else {
            Spacer(minLength: 0)
            FallingCategoryField(categories: categories, selection: selection, onSelect: select)
              .frame(
                height: max(CGFloat(categories.count) * 86, min(geometry.size.height * 0.62, 440)))
          }
        }.padding(.horizontal, 28).padding(.top, 24).padding(.bottom, 8)
          .frame(minHeight: geometry.size.height, alignment: .topLeading)
      }
    }
  }
  private func select(_ id: String) {
    selection = id
    UISelectionFeedbackGenerator().selectionChanged()
  }
}

private enum CategoryAppearance {
  static func color(_ index: Int) -> UIColor {
    [
      UIColor(red: 0.92, green: 0.65, blue: 0.79, alpha: 1),
      UIColor(red: 0.58, green: 0.8, blue: 0.87, alpha: 1),
      UIColor(red: 0.78, green: 0.83, blue: 0.56, alpha: 1),
      UIColor(red: 0.72, green: 0.67, blue: 0.94, alpha: 1),
      UIColor(red: 0.94, green: 0.77, blue: 0.54, alpha: 1),
    ][index % 5]
  }
  static func symbol(_ index: Int) -> String {
    ["heart", "scalemass", "leaf", "lightbulb", "sparkle.magnifyingglass"][index % 5]
  }
}

/// UIKit Dynamics gives the actual selectable controls gravity, collisions and a brief bounce.
private struct FallingCategoryField: UIViewRepresentable {
  let categories: [InterestCategory]
  let selection: String?
  let onSelect: (String) -> Void
  func makeUIView(context: Context) -> FallingCategoryView { FallingCategoryView() }
  func updateUIView(_ view: FallingCategoryView, context: Context) {
    view.configure(categories: categories, selection: selection, onSelect: onSelect)
  }
  static func dismantleUIView(_ view: FallingCategoryView, coordinator: ()) { view.stop() }
}

private final class FallingCategoryView: UIView {
  private var categories: [InterestCategory] = []
  private var buttons: [UIButton] = []
  private var animator: UIDynamicAnimator?
  private var pending: [DispatchWorkItem] = []
  private var laidOutSize = CGSize.zero
  private var selection: String?
  private var onSelect: ((String) -> Void)?

  func configure(
    categories: [InterestCategory], selection: String?, onSelect: @escaping (String) -> Void
  ) {
    if categories.map(\.id) != self.categories.map(\.id)
      || categories.map(\.name) != self.categories.map(\.name)
    {
      laidOutSize = .zero
    }
    self.categories = categories
    self.selection = selection
    self.onSelect = onSelect
    restyle()
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    guard bounds.width > 0, bounds.height > 0, bounds.size != laidOutSize else { return }
    stop()
    buttons.forEach { $0.removeFromSuperview() }
    buttons = []
    laidOutSize = bounds.size
    clipsToBounds = true
    let animator = UIDynamicAnimator(referenceView: self)
    self.animator = animator
    let gravity = UIGravityBehavior()
    gravity.magnitude = 1.65
    let collision = UICollisionBehavior()
    collision.addBoundary(
      withIdentifier: "floor" as NSString, from: CGPoint(x: 0, y: bounds.height - 12),
      to: CGPoint(x: bounds.width, y: bounds.height - 12))
    collision.addBoundary(
      withIdentifier: "left" as NSString, from: CGPoint(x: 2, y: -1000),
      to: CGPoint(x: 2, y: bounds.height))
    collision.addBoundary(
      withIdentifier: "right" as NSString, from: CGPoint(x: bounds.width - 2, y: -1000),
      to: CGPoint(x: bounds.width - 2, y: bounds.height))
    let behavior = UIDynamicItemBehavior()
    behavior.elasticity = 0.24
    behavior.friction = 0.8
    behavior.resistance = 1.2
    behavior.angularResistance = 3
    animator.addBehavior(gravity)
    animator.addBehavior(collision)
    animator.addBehavior(behavior)
    for (index, category) in categories.enumerated() {
      let button = UIButton(type: .system)
      button.tag = index
      button.accessibilityLabel = category.name
      button.addTarget(self, action: #selector(pick(_:)), for: .touchUpInside)
      let width = min(bounds.width - 44, max(210, CGFloat(category.name.count) * 22 + 82))
      button.bounds = CGRect(x: 0, y: 0, width: width, height: 68)
      let spread = (bounds.width - width) / 2 - 10
      button.center = CGPoint(x: bounds.midX + (index.isMultiple(of: 2) ? -spread : spread), y: -80)
      button.layer.cornerRadius = 34
      button.layer.borderWidth = 1
      button.clipsToBounds = true
      addSubview(button)
      buttons.append(button)
      let item = DispatchWorkItem { [weak button] in
        guard let button else { return }
        gravity.addItem(button)
        collision.addItem(button)
        behavior.addItem(button)
        behavior.addAngularVelocity(index.isMultiple(of: 2) ? 0.7 : -0.9, for: button)
      }
      pending.append(item)
      DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.3, execute: item)
    }
    restyle()
  }

  private func restyle() {
    for button in buttons where button.tag < categories.count {
      let category = categories[button.tag]
      let selected = selection == category.id
      let color = CategoryAppearance.color(button.tag)
      var configuration = UIButton.Configuration.plain()
      configuration.title = category.name
      configuration.image = UIImage(
        systemName: selected ? "checkmark.circle.fill" : CategoryAppearance.symbol(button.tag))
      configuration.imagePadding = 12
      configuration.baseForegroundColor = color
      configuration.preferredSymbolConfigurationForImage = .init(pointSize: 23, weight: .medium)
      configuration.titleTextAttributesTransformer = .init { attributes in
        var attributes = attributes
        attributes.font = UIFont.systemFont(ofSize: 21, weight: .medium)
        return attributes
      }
      button.configuration = configuration
      button.backgroundColor = color.withAlphaComponent(selected ? 0.3 : 0.17)
      button.layer.borderColor = color.withAlphaComponent(selected ? 1 : 0.42).cgColor
      button.layer.borderWidth = selected ? 2 : 1
      button.accessibilityTraits = selected ? [.button, .selected] : .button
    }
  }
  @objc private func pick(_ button: UIButton) { onSelect?(categories[button.tag].id) }
  func stop() {
    pending.forEach { $0.cancel() }
    pending.removeAll()
    animator?.removeAllBehaviors()
    animator = nil
  }
}

struct OnboardingTextEntry: Identifiable {
  let id: String
  let text: String
}

struct OnboardingQuestionStage: View {
  let entries: [OnboardingTextEntry]
  let answeredCount: Int
  let totalCount: Int
  let isFollowup: Bool
  @Binding var isTransitioning: Bool
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var typeSize
  @State private var displayedEntries: [OnboardingTextEntry]
  @State private var enteringID: String?
  @State private var incomingOpacity = 1.0
  @State private var incomingOffset = 0.0
  @State private var incomingBlur = 0.0
  @State private var incomingScale = 1.0

  init(
    entries: [OnboardingTextEntry], answeredCount: Int, totalCount: Int,
    isFollowup: Bool, isTransitioning: Binding<Bool>
  ) {
    self.entries = entries
    self.answeredCount = answeredCount
    self.totalCount = totalCount
    self.isFollowup = isFollowup
    self._isTransitioning = isTransitioning
    self._displayedEntries = State(initialValue: entries)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      HStack(spacing: 7) {
        ForEach(0..<max(totalCount, 1), id: \.self) { index in
          ZStack {
            Circle().fill(index < answeredCount ? Color.mint : Color.white.opacity(0.09))
            if index < answeredCount {
              Image(systemName: "checkmark").font(.system(size: 13, weight: .bold)).foregroundStyle(.black)
            } else {
              Text("\(index + 1)").font(.system(.caption, weight: .semibold))
                .foregroundStyle(index == answeredCount ? .white : .gray)
            }
            Circle().strokeBorder(index == answeredCount ? Color.white : .clear, lineWidth: 1.5)
          }
          .frame(width: 30, height: 30)
          .scaleEffect(index == answeredCount && !reduceMotion ? 1.1 : 1)
          if index < max(totalCount, 1) - 1 {
            Capsule().fill(index < answeredCount ? Color.mint.opacity(0.6) : Color.white.opacity(0.16))
              .frame(maxWidth: .infinity).frame(height: 2)
          }
        }
      }
      .animation(reduceMotion ? nil : .spring(response: 0.45, dampingFraction: 0.7), value: answeredCount)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel("\(totalCount)개 중 \(answeredCount)개 답변 완료")
      GeometryReader { geometry in
        let depthEnabled = !reduceMotion && !typeSize.isAccessibilitySize
        let foregroundTop: CGFloat = depthEnabled ? min(240, geometry.size.height * 0.52) : 0
        let readingHeight = max(1, geometry.size.height - foregroundTop)
        // Keep each question in the same view identity as it moves from foreground to history.
        ZStack(alignment: .topLeading) {
          ForEach(Array(displayedEntries.enumerated()), id: \.element.id) { index, entry in
            let depth = displayedEntries.count - index - 1
            let current = depth == 0
            let entering = current && entry.id == enteringID
            ScrollView {
              VStack(alignment: .leading, spacing: 14) {
                Text(isFollowup ? "한 번 더" : "질문 \(answeredCount + 1)")
                  .font(.subheadline).foregroundStyle(.secondary).opacity(current ? 1 : 0)
                Text(interfaceCopy(entry.text)).font(.system(.title2, weight: .medium)).lineSpacing(5)
                  .fixedSize(horizontal: false, vertical: true)
              }.frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 8).padding(.bottom, 16)
            }
            .scrollDisabled(!current)
            .frame(width: geometry.size.width, height: readingHeight, alignment: .topLeading)
            .scaleEffect(current ? (entering ? incomingScale : 1) : depth == 1 ? 0.38 : 0.30, anchor: .top)
            .blur(radius: depthEnabled ? (current ? (entering ? incomingBlur : 0) : depth == 1 ? 2.4 : 3.2) : 0)
            .opacity(current ? (entering ? incomingOpacity : 1) : (depthEnabled ? (depth == 1 ? 0.30 : depth == 2 ? 0.18 : 0) : 0))
            .offset(y: current ? foregroundTop + (entering ? incomingOffset : 0) : foregroundTop * (depth == 1 ? 0.48 : 0.06))
            .zIndex(current ? 10 : Double(5 - depth))
            .allowsHitTesting(current && !isTransitioning)
            .accessibilityHidden(!current || isTransitioning)
            .transition(.identity)
          }
        }
        // Fix the container to the full viewport BEFORE clipping. Offsets cannot crop the question.
        .frame(width: geometry.size.width, height: geometry.size.height, alignment: .topLeading)
        .clipped()
      }

    }.padding(.horizontal, 28).padding(.top, 12)
      .task(id: entries.last?.id) { await advanceQuestion() }
      .onDisappear { isTransitioning = false }
  }

  @MainActor private func advanceQuestion() async {
    guard displayedEntries.last?.id != entries.last?.id else { return }
    let depthEnabled = !reduceMotion && !typeSize.isAccessibilitySize
    isTransitioning = true
    var immediate = Transaction(animation: nil)
    immediate.disablesAnimations = true
    // Prepare the new passage offscreen without replacing the outgoing question's ID.
    withTransaction(immediate) {
      enteringID = entries.last?.id
      incomingOpacity = 0
      incomingOffset = depthEnabled ? 28 : 0
      incomingScale = depthEnabled ? 0.94 : 1
      incomingBlur = depthEnabled ? 5 : 0
    }
    withAnimation(depthEnabled ? .timingCurve(0.22, 0.7, 0.25, 1, duration: 0.85) : nil) {
      displayedEntries = entries
    }
    do {
      try await Task.sleep(nanoseconds: depthEnabled ? 300_000_000 : 30_000_000)
      withAnimation(.easeOut(duration: depthEnabled ? 0.55 : 0.12)) {
        incomingOpacity = 1
        incomingOffset = 0
        incomingBlur = 0
        incomingScale = 1
      }
      try await Task.sleep(nanoseconds: depthEnabled ? 580_000_000 : 150_000_000)
      isTransitioning = false
    } catch {
      withTransaction(immediate) {
        displayedEntries = entries
        incomingOpacity = 1
        incomingOffset = 0
        incomingBlur = 0
        incomingScale = 1
        isTransitioning = false
      }
    }
  }
}

struct OnboardingQuestionsCompleted: View {
  let totalCount: Int
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @State private var appeared = false
  @State private var pulse = false
  private let colors: [Color] = [.mint, .cyan, .blue, .purple, .pink, .mint]

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        ZStack {
          if !reduceMotion && !reduceTransparency {
            Circle().stroke(.mint.opacity(0.4), lineWidth: 2)
              .scaleEffect(pulse ? 1.5 : 0.9).opacity(pulse ? 0 : 1)
          }
          Circle().stroke(.white.opacity(0.08), lineWidth: 5)
          Circle().trim(from: 0, to: appeared ? 1 : 0)
            .stroke(AngularGradient(colors: colors, center: .center), style: StrokeStyle(lineWidth: 5, lineCap: .round))
            .rotationEffect(.degrees(-90))
          Image(systemName: "checkmark")
            .font(.system(size: 48, weight: .medium)).foregroundStyle(.mint)
            .scaleEffect(appeared || reduceMotion ? 1 : 0.5)
            .opacity(appeared ? 1 : 0)
        }
        .frame(width: 116, height: 116)
        .padding(.vertical, 24)
        .accessibilityHidden(true)
        Text("\(totalCount)개의 선택, 완료")
          .font(.subheadline.weight(.medium)).foregroundStyle(.mint)
        Text("모든 준비가\n끝났어요!").font(.largeTitle.bold())
          .accessibilityAddTraits(.isHeader)
        Text("당신의 생각을 함께 살펴봐요")
          .font(.title3).foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(28)
    }
    .task {
      withAnimation(reduceMotion ? nil : .spring(response: 0.75, dampingFraction: 0.75)) {
        appeared = true
      }
      withAnimation(reduceMotion ? nil : .easeOut(duration: 1.1)) { pulse = true }
    }
  }
}

struct OnboardingTimePage: View {
  @Binding var time: Date
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        Image(systemName: "bell.badge").font(.system(size: 32, weight: .light)).foregroundStyle(
          .secondary
        )
        .accessibilityHidden(true)
        Text("언제 알려드릴까요?").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
        Text("하루 한 번, 짧은 질문 하나")
          .foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
        DatePicker("알림 받을 시간", selection: $time, displayedComponents: .hourAndMinute)
          .datePickerStyle(.wheel).labelsHidden()
          .frame(maxWidth: .infinity).padding(.vertical, 16)
          .accessibilityLabel("매일 질문 알림 시간")
        HStack {
          Text("매일")
          Spacer()
          Text(time, style: .time).monospacedDigit()
        }.font(.headline).padding(.vertical, 16)
          .overlay(alignment: .top) { Divider() }
          .overlay(alignment: .bottom) { Divider() }
        Text("나중에 바꿀 수 있어요")
          .font(.footnote).foregroundStyle(.secondary)
      }.padding(.horizontal, 28).padding(.top, 24).padding(.bottom, 12)
    }
  }
}

struct OnboardingCelebration: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @State private var appeared = false
  @State private var glowing = false
  @Environment(\.scenePhase) private var scenePhase
  private let rainbow: [Color] = [.pink, .orange, .yellow, .green, .cyan, .purple, .pink]
  var body: some View {
    GeometryReader { geometry in
      ScrollView {
        VStack(alignment: .leading, spacing: 22) {
          Spacer(minLength: 40)
          Text("철학을 쉽게 공부해봐요.\n에티카와 함께!")
            .font(.system(.title, weight: .medium)).lineSpacing(5).accessibilityAddTraits(.isHeader)
          Text("Ethica")
            .font(.system(size: 76, weight: .bold, design: .rounded)).minimumScaleFactor(0.5)
            .lineLimit(1)
            .foregroundStyle(.white)
            .background {
              if !reduceTransparency {
                Text("Ethica").font(.system(size: 76, weight: .bold, design: .rounded))
                  .foregroundStyle(
                    LinearGradient(colors: rainbow, startPoint: .leading, endPoint: .trailing)
                  )
                  .blur(radius: glowing ? 23 : 13)
                  .scaleEffect(x: glowing ? 1.10 : 1.02, y: glowing ? 1.25 : 1.05)
                  .opacity(reduceMotion ? 0.7 : (glowing ? 1 : 0.12))
                  .animation(
                    reduceMotion || scenePhase != .active
                      ? nil : .easeInOut(duration: 2.4).repeatForever(autoreverses: true),
                    value: glowing
                  )
                  .accessibilityHidden(true)
              }
            }
            .overlay(alignment: .bottom) {
              if reduceTransparency {
                Capsule().fill(
                  LinearGradient(colors: rainbow, startPoint: .leading, endPoint: .trailing)
                ).frame(height: 3)
              }
            }
            .padding(.vertical, 6)
            .scaleEffect(appeared || reduceMotion ? 1 : 0.94)
            .offset(y: appeared || reduceMotion ? 0 : 8)
            .accessibilityLabel("Ethica")
          Spacer(minLength: 40)
          Text("하루 한 질문부터 시작해요")
            .font(.footnote).foregroundStyle(.secondary).lineSpacing(3)
        }.frame(maxWidth: .infinity, minHeight: geometry.size.height, alignment: .leading)
          .padding(.horizontal, 28)
          .opacity(appeared ? 1 : 0)
      }
    }.onAppear {
      withAnimation(reduceMotion ? nil : .easeOut(duration: 0.9)) { appeared = true }
      glowing = !reduceMotion && scenePhase == .active
    }
    .onChange(of: scenePhase) { phase in glowing = !reduceMotion && phase == .active }
    .onChange(of: reduceMotion) { reduced in glowing = !reduced && scenePhase == .active }
    .onDisappear { glowing = false }
  }
}

/// Keep the capsule surfaces in place while replacing only their text between questions.
struct OnboardingChoiceButtons: View {
  let stepID: String
  let choices: [DailyChoice]
  let locked: Bool
  let saving: Bool
  let completedText: String?
  let select: (String) -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @ScaledMetric(relativeTo: .body) private var choiceLabelHeight = 44.0
  @State private var displayed: [DailyChoice]
  @State private var displayedStep: String
  @State private var changing = false
  @State private var textOpacity = 1.0

  init(stepID: String, choices: [DailyChoice], locked: Bool, saving: Bool,
       completedText: String?, select: @escaping (String) -> Void) {
    self.stepID = stepID
    self.choices = choices
    self.locked = locked
    self.saving = saving
    self.completedText = completedText
    self.select = select
    _displayed = State(initialValue: choices)
    _displayedStep = State(initialValue: stepID)
  }
  var body: some View {
    VStack(spacing: 12) {
      // Stable positional identities prevent removal/insertion animations of the capsules.
      ForEach(displayed.indices, id: \.self) { index in
        Button {
          guard !locked, !changing, displayedStep == stepID else { return }
          select(displayed[index].id)
        } label: {
          Text(interfaceCopy(displayed[index].body))
            .frame(minHeight: choiceLabelHeight).opacity(textOpacity)
        }.buttonStyle(OnboardingActionStyle())
          .disabled(locked || changing || displayedStep != stepID)
      }
      ZStack {
        if saving {
          ProgressView().tint(.white).accessibilityLabel("저장 중")
        } else if let completedText {
          Label(completedText, systemImage: "checkmark.circle.fill").foregroundStyle(.mint)
        } else {
          Text("정답은 없어요").foregroundStyle(.secondary)
        }
      }.font(.caption).frame(height: 22)
    }
    .task(id: stepID) {
      guard displayedStep != stepID else { return }
      changing = true
      do {
        withAnimation(.easeOut(duration: reduceMotion ? 0.08 : 0.16)) { textOpacity = 0 }
        try await Task.sleep(nanoseconds: reduceMotion ? 90_000_000 : 180_000_000)
        var transaction = Transaction(animation: nil)
        transaction.disablesAnimations = true
        withTransaction(transaction) { displayed = choices; displayedStep = stepID }
        try await Task.sleep(nanoseconds: reduceMotion ? 20_000_000 : 180_000_000)
        withAnimation(.easeIn(duration: reduceMotion ? 0.1 : 0.24)) { textOpacity = 1 }
        try await Task.sleep(nanoseconds: reduceMotion ? 100_000_000 : 240_000_000)
        changing = false
      } catch {
        // A replacement task owns the next transition; never submit a stale choice.
        changing = false
      }
    }
  }
}
