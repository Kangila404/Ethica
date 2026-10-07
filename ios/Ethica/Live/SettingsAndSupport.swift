import SwiftUI
import UserNotifications

enum AccountEditor: String, Identifiable {
  case nickname, time
  var id: String { rawValue }
}

struct CompactEditorSheet: ViewModifier {
  let editor: AccountEditor
  @Environment(\.dynamicTypeSize) private var typeSize
  func body(content: Content) -> some View {
    content.presentationDetents(
      typeSize.isAccessibilitySize ? [.large]
        : (editor == .nickname ? [.height(280)] : [.height(380), .large])
    )
    .presentationDragIndicator(.visible)
  }
}

struct LiveSettingsView: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.dismiss) private var dismiss
  @Environment(\.scenePhase) private var scenePhase
  @State private var editor: AccountEditor?
  @State private var aiConsent = false
  @State private var withdrawal = false
  @State private var logout = false
  @State private var permissionDenied = false
  @State private var notificationPermission = false
  @State private var avatarEditor = false
  var body: some View {
    Form {
      if let user = session.user {
        Section {
          AccountIdentityHeader(
            name: user.name, provider: session.provider?.title ?? "소셜 로그인", avatarID: user.avatarId,
            editAvatar: { avatarEditor = true }, editNickname: { editor = .nickname })
          NavigationLink {
            AccountInformationView(
              name: user.name, provider: session.provider?.title ?? "소셜 로그인",
              userID: user.userId, role: user.userRole)
          } label: {
            Label("내 정보", systemImage: "person.text.rectangle")
          }
        }
        Section("매일의 질문") {
          if user.onboardingStatus == "complete" {
            Button {
              editor = .time
            } label: {
              AccountRow(
                title: "질문 시간",
                value: user.pendingDailyQuestionTime ?? user.dailyQuestionTime ?? "08:00",
                symbol: "clock")
            }.foregroundStyle(.primary)
            if let pending = user.pendingDailyQuestionTime {
              Text("다음 출제부터 \(pending)에 알려드려요").font(.caption).foregroundStyle(.secondary)
            }
          }
          Toggle(
            isOn: Binding(
              get: {
                user.notificationEnabled
              }, set: { enabled in Task { await setNotifications(enabled) } })
          ) {
            Label("새 질문 알림", systemImage: "bell.badge")
          }.disabled(!PushNotifications.shared.configured && !user.notificationEnabled)
          if !user.notificationEnabled {
            Label("알림을 받지 않아요", systemImage: "bell.slash").font(.caption).foregroundStyle(
              .secondary)
          } else if !notificationPermission {
            Label(
              permissionDenied ? "아이폰에서 알림이 차단됐어요" : "아이폰 알림 권한이 필요해요", systemImage: "bell.slash"
            )
            .font(.caption).foregroundStyle(.secondary)
          }
          Text("알림을 꺼도 질문과 위젯은 사용할 수 있어요").font(.caption).foregroundStyle(.secondary)
          NavigationLink {
            NotificationWidgetGallery(notificationsEnabled: user.notificationEnabled)
          } label: {
            Label("알림과 위젯 미리보기", systemImage: "rectangle.on.rectangle")
          }
          if !PushNotifications.shared.configured {
            Text("알림 연결을 준비하고 있어요").font(.caption).foregroundStyle(.secondary)
          }
          if permissionDenied {
            Button("아이폰 알림 설정 열기") {
              if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
              }
            }
          }
        }
        Section("AI 해석") {
          Toggle("OpenAI 정보 전송", isOn: Binding(
            get: { session.hasAiConsent },
            set: { enabled in
              if enabled { aiConsent = true }
              else { Task { await session.perform { try await session.setAiConsent(false) } } }
            }))
          Text("문제·답변·사상 구성을 전송해 해석을 만들어요").font(.caption).foregroundStyle(.secondary)
        }
        Section("도움말") {
          NavigationLink {
            SupportListView(kind: .notices)
          } label: {
            Label("공지사항", systemImage: "megaphone")
          }
          NavigationLink {
            SupportListView(kind: .inquiries)
          } label: {
            Label("문의하기", systemImage: "bubble.left.and.bubble.right")
          }
        }
        Section("앱 정보") {
          NavigationLink("이용약관") { LegalView(type: "service") }
          NavigationLink("개인정보 처리방침") { LegalView(type: "privacy") }
          LabeledContent(
            "버전",
            value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
        }
        Section {
          Button("로그아웃") { logout = true }
          Button("회원 탈퇴", role: .destructive) { withdrawal = true }
        }
      } else {
        ProgressView("계정을 불러오는 중이에요")
      }
      if session.busy { ProgressView() }
    }.disabled(session.busy).navigationTitle("내 계정").navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
      .sheet(isPresented: $avatarEditor) {
        NavigationStack {
          ProfileAvatarEditor(initialID: session.user?.avatarId) { id in
            let profile: UserProfile = try await session.api.send(
              "users/me/avatar", method: "PATCH", body: ["avatarId": id.map(JSONValue.string) ?? .null])
            session.user = profile
          }
        }.presentationDetents([.height(520), .large]).presentationDragIndicator(.visible)
      }
      .sheet(isPresented: $aiConsent) { AIConsentSheet { aiConsent = false } }
      .sheet(item: $editor) { selection in
        NavigationStack {
          if let user = session.user {
            switch selection {
            case .nickname:
              NicknameEditor(initialName: user.name) { name in
                try await session.api.mutate(
                  "users/me", method: "PATCH", body: ["name": .string(name)])
                try await session.reloadProfile()
              }
            case .time:
              QuestionTimeEditor(
                initialTime: user.pendingDailyQuestionTime ?? user.dailyQuestionTime ?? "08:00"
              ) { time in
                try await session.api.mutate(
                  "users/me/daily-time", method: "PATCH",
                  body: [
                    "dailyQuestionTime": .string(time.hourMinute),
                    "timezone": .string(TimeZone.current.identifier),
                  ])
                try await session.reloadProfile()
              }
            }
          }
        }.modifier(CompactEditorSheet(editor: selection))
      }
      .task { await refreshPermission() }
      .onChange(of: scenePhase) { if $0 == .active { Task { await refreshPermission() } } }
      .confirmationDialog("로그아웃할까요?", isPresented: $logout, titleVisibility: .visible) {
        Button("로그아웃", role: .destructive) { Task { await session.logout() } }
      }
      .confirmationDialog("계정을 탈퇴할까요?", isPresented: $withdrawal, titleVisibility: .visible) {
        Button("계정 확인 후 탈퇴", role: .destructive) { Task { await session.withdraw() } }
      } message: {
        Text(
          "\(session.provider?.title ?? "소셜") 계정을 다시 확인합니다. 소셜 연결 해제가 완료되면 계정과 답변·분석·문의 기록이 삭제됩니다. 다시 가입하면 처음부터 시작합니다."
        )
      }
  }
  private func refreshPermission() async {
    let settings = await UNUserNotificationCenter.current().notificationSettings()
    notificationPermission = [.authorized, .provisional].contains(settings.authorizationStatus)
    permissionDenied = settings.authorizationStatus == .denied
  }
  private func setNotifications(_ enabled: Bool) async {
    await session.perform {
      if enabled {
        let allowed = try await PushNotifications.shared.requestPermission()
        guard allowed else {
          permissionDenied = true
          return
        }
        permissionDenied = false
        notificationPermission = true
        try await PushNotifications.shared.register(api: session.api)
      }
      try await session.api.mutate(
        "users/me/notification", method: "PATCH", body: ["notificationEnabled": .bool(enabled)])
      PushNotifications.shared.setPreference(enabled)
      if !enabled { await PushNotifications.shared.clearDailyAlerts() }
      try await session.reloadProfile()
    }
  }
}

struct AccountIdentityHeader: View {
  let name: String
  let provider: String
  var avatarID: String? = nil
  let editAvatar: () -> Void
  let editNickname: () -> Void
  var body: some View {
    HStack(spacing: 16) {
      Button(action: editAvatar) {
        AccountAvatar(avatarID: avatarID).frame(width: 64, height: 64)
          .overlay(alignment: .bottomTrailing) {
            Image(systemName: "pencil.circle.fill").symbolRenderingMode(.palette)
              .foregroundStyle(.white, .blue).font(.title3)
          }
      }.buttonStyle(.borderless)
        .accessibilityLabel("프로필 이미지 변경").accessibilityIdentifier("account.editAvatar")
      VStack(alignment: .leading, spacing: 2) {
        Button(action: editNickname) {
          HStack(spacing: 8) {
            Text(name).font(.title3.bold()).foregroundStyle(.primary)
            Image(systemName: "pencil").font(.caption).foregroundStyle(.secondary)
          }.frame(minHeight: 44, alignment: .leading).contentShape(Rectangle())
        }.buttonStyle(.borderless)
          .accessibilityLabel("닉네임 변경, \(name)").accessibilityIdentifier("account.editNickname")
        Text("\(provider) 계정").font(.caption).foregroundStyle(.secondary)
      }
    }.padding(.vertical, 10)
  }
}
/// Stable IDs let the final bundled artwork change without changing saved selections.
enum ProfileAvatar: String, CaseIterable, Identifiable {
  case sprout, book, sun, moon, bird, mountain
  var id: String { rawValue }
  var name: String {
    switch self {
    case .sprout: return "새싹"
    case .book: return "책"
    case .sun: return "해"
    case .moon: return "달"
    case .bird: return "새"
    case .mountain: return "산"
    }
  }
  var symbol: String {
    switch self {
    case .sprout: return "leaf.fill"
    case .book: return "book.closed.fill"
    case .sun: return "sun.max.fill"
    case .moon: return "moon.stars.fill"
    case .bird: return "bird.fill"
    case .mountain: return "mountain.2.fill"
    }
  }
  var color: Color {
    switch self {
    case .sprout: return .green
    case .book: return .blue
    case .sun: return .orange
    case .moon: return .indigo
    case .bird: return .teal
    case .mountain: return .brown
    }
  }
}

struct AccountAvatar: View {
  var avatarID: String? = nil
  var body: some View {
    GeometryReader { geometry in
      if let id = avatarID, let avatar = ProfileAvatar(rawValue: id) {
        ZStack {
          Circle().fill(avatar.color.opacity(0.16))
          Image(systemName: avatar.symbol).resizable().scaledToFit()
            .foregroundStyle(avatar.color)
            .padding(geometry.size.width * 0.25)
        }
      } else {
        Image(systemName: "person.crop.circle.fill").resizable().scaledToFit()
          .foregroundStyle(Color(uiColor: .systemGray2), Color(uiColor: .tertiarySystemFill))
      }
    }.clipShape(Circle())
  }
}

struct ProfileAvatarEditor: View {
  let initialID: String?
  let save: (String?) async throws -> Void
  @Environment(\.dismiss) private var dismiss
  @Environment(\.dynamicTypeSize) private var typeSize
  @State private var selectedID: String?
  @State private var saving = false
  @State private var failure: String?

  init(initialID: String?, save: @escaping (String?) async throws -> Void) {
    self.initialID = initialID
    self.save = save
    _selectedID = State(initialValue: initialID)
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 24) {
        AccountAvatar(avatarID: selectedID).frame(width: 88, height: 88)
          .accessibilityLabel("선택한 프로필 이미지")
        LazyVGrid(
          columns: Array(
            repeating: GridItem(.flexible()), count: typeSize.isAccessibilitySize ? 2 : 3),
          spacing: 20
        ) {
          ForEach(ProfileAvatar.allCases) { avatar in
            Button {
              selectedID = avatar.id
            } label: {
              VStack(spacing: 8) {
                AccountAvatar(avatarID: avatar.id).frame(width: 64, height: 64)
                  .padding(5)
                  .overlay(
                    Circle().stroke(
                      selectedID == avatar.id ? Color.accentColor : .clear, lineWidth: 2)
                  )
                  .overlay(alignment: .bottomTrailing) {
                    if selectedID == avatar.id {
                      Image(systemName: "checkmark.circle.fill").foregroundStyle(.white, .blue)
                        .background(Circle().fill(.blue))
                    }
                  }
                Text(avatar.name).font(.subheadline).foregroundStyle(.primary)
              }.frame(maxWidth: .infinity).contentShape(Rectangle())
            }.buttonStyle(.plain)
              .accessibilityLabel(avatar.name)
              .accessibilityAddTraits(selectedID == avatar.id ? .isSelected : [])
          }
        }
        Button("기본 이미지로 변경") { selectedID = nil }.disabled(selectedID == nil)
          .font(.subheadline)
        if saving { ProgressView("저장 중") }
        if let failure { Text(interfaceCopy(failure)).font(.footnote).foregroundStyle(.red) }
      }.padding(24)
    }.disabled(saving).navigationTitle("프로필 이미지").navigationBarTitleDisplayMode(.inline)
      .interactiveDismissDisabled(saving)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() }.disabled(saving) }
        ToolbarItem(placement: .confirmationAction) {
          Button("저장") {
            saving = true
            failure = nil
            Task {
              defer { saving = false }
              do {
                try await save(selectedID)
                dismiss()
              } catch {
                failure = (error as? APIError)?.message ?? "저장하지 못했어요. 다시 시도해주세요"
              }
            }
          }
          .fontWeight(.semibold).disabled(saving || selectedID == initialID)
        }
      }
  }
}

struct AccountRow: View {
  let title: String
  let value: String
  let symbol: String
  var body: some View {
    HStack {
      Label(title, systemImage: symbol)
      Spacer()
      Text(value).foregroundStyle(.secondary).lineLimit(1)
    }
  }
}
struct AccountInformationView: View {
  let name: String
  let provider: String
  let userID: String
  let role: String
  var body: some View {
    Form {
      Section("프로필") {
        LabeledContent("닉네임", value: name)
        LabeledContent("로그인 방법", value: provider)
        LabeledContent("계정 유형", value: role == "admin" ? "관리자" : "일반 회원")
      }
      Section("회원 번호") {
        Text(userID).font(.footnote.monospaced()).textSelection(.enabled)
      }
    }.navigationTitle("내 정보").navigationBarTitleDisplayMode(.inline)
  }
}
struct NicknameEditor: View {
  @Environment(\.dismiss) private var dismiss
  @FocusState private var nameFocused: Bool
  @State private var name: String
  @State private var saving = false
  @State private var failure: String?
  let initialName: String
  let save: (String) async throws -> Void
  init(initialName: String, save: @escaping (String) async throws -> Void) {
    self.initialName = initialName
    self.save = save
    _name = State(initialValue: initialName)
  }
  private var trimmed: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
  var body: some View {
    Form {
      Section {
        TextField("닉네임", text: $name).textContentType(.nickname).submitLabel(.done).focused(
          $nameFocused
        )
        .onSubmit { if valid { submit() } }
      } footer: {
        Text("앱에서 사용할 이름 · 1~50자")
      }
      if let failure { Text(interfaceCopy(failure)).font(.footnote).foregroundStyle(.red) }
      if saving { ProgressView() }
    }.editorKeyboard().disabled(saving).navigationTitle("닉네임 변경").navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() }.disabled(saving) }
        ToolbarItem(placement: .confirmationAction) {
          Button("저장", action: submit).disabled(!valid)
        }
      }
      .task {
        // Let the native sheet settle before requesting the software keyboard.
        do { try await Task.sleep(nanoseconds: 320_000_000) } catch { return }
        nameFocused = true
      }
      .interactiveDismissDisabled(saving)
  }
  private var valid: Bool {
    !saving && !trimmed.isEmpty && trimmed.count <= 50 && trimmed != initialName
  }
  private func submit() {
    guard valid else { return }
    saving = true
    failure = nil
    Task {
      defer { saving = false }
      do {
        try await save(trimmed)
        dismiss()
      } catch { failure = (error as? APIError)?.message ?? "저장하지 못했어요. 다시 시도해주세요" }
    }
  }
}
struct QuestionTimeEditor: View {
  @Environment(\.dismiss) private var dismiss
  @State private var time: Date
  @State private var saving = false
  @State private var failure: String?
  let save: (Date) async throws -> Void
  init(initialTime: String, save: @escaping (Date) async throws -> Void) {
    self.save = save
    let parts = initialTime.split(separator: ":").compactMap { Int($0) }
    _time = State(
      initialValue: Calendar.current.date(
        from: DateComponents(hour: parts.first ?? 8, minute: parts.dropFirst().first ?? 0)) ?? .now)
  }
  var body: some View {
    Form {
      Section {
        DatePicker("질문 시간", selection: $time, displayedComponents: .hourAndMinute)
          .datePickerStyle(.wheel).labelsHidden().frame(maxWidth: .infinity)
      } footer: {
        Text("새 시간은 내일부터 적용돼요")
      }
      if let failure { Text(interfaceCopy(failure)).font(.footnote).foregroundStyle(.red) }
      if saving { ProgressView() }
    }.disabled(saving).navigationTitle("질문 시간").navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() }.disabled(saving) }
        ToolbarItem(placement: .confirmationAction) {
          Button("저장") {
            saving = true
            failure = nil
            Task {
              defer { saving = false }
              do {
                try await save(time)
                dismiss()
              } catch { failure = (error as? APIError)?.message ?? "저장하지 못했어요. 다시 시도해주세요" }
            }
          }.disabled(saving)
        }
      }.interactiveDismissDisabled(saving)
  }
}

struct PreviewAccountView: View {
  @EnvironmentObject private var store: MockStore
  @Environment(\.dismiss) private var dismiss
  @State private var editor: AccountEditor?
  @State private var avatarEditor = false
  @State private var withdrawal = false
  @State private var logout = false
  @State private var notice = false
  var body: some View {
    Form {
      Section {
        AccountIdentityHeader(
          name: store.name, provider: "Apple", avatarID: store.profileAvatarID,
          editAvatar: { avatarEditor = true }, editNickname: { editor = .nickname })
        NavigationLink {
          AccountInformationView(
            name: store.name, provider: "Apple · 예시", userID: "미리보기 계정", role: "user")
        } label: {
          Label("내 정보", systemImage: "person.text.rectangle")
        }
      }
      Section("매일의 질문") {
        Button {
          editor = .time
        } label: {
          AccountRow(
            title: "질문 시간", value: store.dailyTime.formatted(date: .omitted, time: .shortened),
            symbol: "clock")
        }.foregroundStyle(.primary)
        Toggle(isOn: $store.notificationsEnabled) { Label("새 질문 알림", systemImage: "bell.badge") }
        if !store.notificationsEnabled {
          Label("알림을 받지 않아요", systemImage: "bell.slash").font(.caption).foregroundStyle(.secondary)
        }
        Text("알림을 꺼도 질문과 위젯은 사용할 수 있어요").font(.caption).foregroundStyle(.secondary)
        NavigationLink {
          NotificationWidgetGallery(notificationsEnabled: store.notificationsEnabled)
        } label: {
          Label("알림과 위젯 미리보기", systemImage: "rectangle.on.rectangle")
        }

      }
      Section("도움말") {
        NavigationLink {
          PreviewAccountDetail(title: "공지사항", message: "등록된 공지가 없어요")
        } label: {
          Label("공지사항", systemImage: "megaphone")
        }
        NavigationLink {
          PreviewAccountDetail(title: "문의하기", message: "연동 후 문의를 작성하고 답변을 확인할 수 있어요")
        } label: {
          Label("문의하기", systemImage: "bubble.left.and.bubble.right")
        }
      }
      Section("앱 정보") {
        NavigationLink("이용약관") {
          LegalView(type: "service", preview: true)
        }
        NavigationLink("개인정보 처리방침") {
          LegalView(type: "privacy", preview: true)
        }
        LabeledContent(
          "버전", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        )
      }
      Section {
        Button("로그아웃") { logout = true }
        Button("회원 탈퇴", role: .destructive) { withdrawal = true }
      }
      Section("디자인 미리보기") {
        Text("예시 계정이에요. 프로필 이미지는 이 기기에 저장되고, 나머지 변경은 앱을 종료하면 초기화됩니다").font(.caption)
          .foregroundStyle(.secondary)
        Button("오늘 답변 초기화") { store.reset() }
      }
    }.navigationTitle("내 계정").navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
      .sheet(isPresented: $avatarEditor) {
        NavigationStack {
          ProfileAvatarEditor(initialID: store.profileAvatarID) { store.profileAvatarID = $0 }
        }.presentationDetents([.height(520), .large]).presentationDragIndicator(.visible)
      }
      .sheet(item: $editor) { selection in
        NavigationStack {
          switch selection {
          case .nickname: NicknameEditor(initialName: store.name) { store.name = $0 }
          case .time:
            QuestionTimeEditor(initialTime: store.dailyTime.hourMinute) { store.dailyTime = $0 }
          }
        }.modifier(CompactEditorSheet(editor: selection))
      }
      .confirmationDialog("로그아웃할까요?", isPresented: $logout, titleVisibility: .visible) {
        Button("로그아웃", role: .destructive) { notice = true }
      }
      .confirmationDialog("계정을 탈퇴할까요?", isPresented: $withdrawal, titleVisibility: .visible) {
        Button("계정 확인 후 탈퇴", role: .destructive) { notice = true }
      } message: {
        Text("Apple 계정을 다시 확인합니다. 소셜 연결 해제가 완료되면 계정과 답변·분석·문의 기록이 삭제됩니다. 다시 가입하면 처음부터 시작합니다.")
      }
      .alert("디자인 미리보기", isPresented: $notice) {
        Button("확인", role: .cancel) {}
      } message: {
        Text("실제 계정에는 영향을 주지 않아요. 재인증과 계정 처리는 연동 후 확인합니다")
      }
  }
}
struct PreviewAccountDetail: View {
  let title: String
  let message: String
  var body: some View {
    List {
      Section {
        Text(message).foregroundStyle(.secondary)
      } footer: {
        Text("디자인 미리보기")
      }
    }
    .navigationTitle(title).navigationBarTitleDisplayMode(.inline)
  }
}

struct WidgetGuideView: View {
  var body: some View {
    List {
      Section("홈 화면") {
        Text("홈 화면을 길게 누르고 편집 → 위젯 추가에서 Ethica를 선택하세요")
        Text("질문을 누르면 앱에서 답변을 이어갈 수 있어요")
      }
      Section("잠금화면") { Text("잠금화면을 길게 누르고 사용자화 → 위젯 추가에서 Ethica를 선택하세요") }
      Section { Text("위젯에는 마지막으로 앱에서 불러온 질문이 표시됩니다. 새 질문 시각이 지나면 앱에서 최신 질문을 확인해주세요") }
    }.navigationTitle("위젯 추가").navigationBarTitleDisplayMode(.inline)
  }
}
struct LegalView: View {
  @EnvironmentObject private var session: AppSession
  let type: String
  var preview = false
  var body: some View {
    LoadView(load: { () -> TermDocument in
      if preview { return try bundledDraft() }
      do { return try await session.api.get("terms?type=\(type)", authenticated: false) }
      catch let error as APIError where error.status == 404 { return try bundledDraft() }
    }) { term in
      ScrollView {
        VStack(alignment: .leading, spacing: 28) {
          if term.version.hasPrefix("draft-") {
            Label("검토 중인 초안", systemImage: "doc.text")
              .font(.subheadline).foregroundStyle(.secondary)
          }
          let sections = term.content.components(separatedBy: "\n\n")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
          ForEach(Array(sections.enumerated()), id: \.offset) { _, section in
            let lines = section.split(separator: "\n", maxSplits: 1).map(String.init)
            VStack(alignment: .leading, spacing: 12) {
              if lines.count > 1 {
                Text(lines[0]).font(.headline).accessibilityAddTraits(.isHeader)
                Text(lines[1]).font(.body).foregroundStyle(.secondary)
                  .lineSpacing(7).fixedSize(horizontal: false, vertical: true)
              } else {
                Text(section).font(.body).foregroundStyle(.secondary)
                  .lineSpacing(7).fixedSize(horizontal: false, vertical: true)
              }
            }.frame(maxWidth: .infinity, alignment: .leading)
          }
          Text(term.version).font(.caption).foregroundStyle(.tertiary)
        }.multilineTextAlignment(.leading).textSelection(.enabled).readingPage()
      }
    }.navigationTitle(type == "privacy" ? "개인정보 처리방침" : "이용약관")
      .navigationBarTitleDisplayMode(.inline)
  }
  private func bundledDraft() throws -> TermDocument {
    struct Draft: Decodable {
      let type: String
      let title: String
      let content: String
      let version: String
    }
    guard let url = Bundle.main.url(forResource: "legal-drafts", withExtension: "json"),
      let draft = try JSONDecoder().decode([Draft].self, from: Data(contentsOf: url))
        .first(where: { $0.type == type }) else {
      throw APIError(status: 404, code: "LEGAL_DOCUMENT_MISSING", message: "문서를 준비하고 있어요")
    }
    return TermDocument(title: draft.title, content: draft.content, version: draft.version)
  }
}
enum SupportKind: String {
  case notices, inquiries
  var title: String { self == .notices ? "공지사항" : "내 문의" }
}
struct SupportListView: View {
  @EnvironmentObject private var session: AppSession
  let kind: SupportKind
  @State private var rows: [SupportEntry] = []
  @State private var loaded = false
  @State private var more = false
  @State private var composing = false
  @State private var loading = false
  var body: some View {
    List {
      ForEach(rows) { row in
        NavigationLink {
          SupportDetailView(kind: kind, id: row.id)
        } label: {
          VStack(alignment: .leading, spacing: 6) {
            Text(row.title)
            if let status = row.status {
              Text(status == "answered" ? "답변 완료" : "답변 대기").font(.caption).foregroundStyle(
                .secondary)
            }
          }
        }
      }
      if more { Button("더 보기") { Task { await reload(append: true) } }.disabled(loading) }
      if loaded && rows.isEmpty {
        Text(kind == .notices ? "등록된 공지가 없어요" : "아직 문의한 내용이 없어요").foregroundStyle(.secondary)
      }
      if loading { ProgressView() }
      if !loaded && !loading { Button("다시 불러오기") { Task { await reload() } } }
    }.navigationTitle(kind.title).task { await reload() }.refreshable { await reload() }
      .toolbar {
        if kind == .inquiries {
          Button {
            composing = true
          } label: {
            Image(systemName: "square.and.pencil")
          }.accessibilityLabel("문의 작성")
        }
      }
      .sheet(isPresented: $composing, onDismiss: { Task { await reload() } }) {
        NavigationStack { InquiryComposer() }
      }
  }
  private func reload(append: Bool = false) async {
    guard !loading else { return }
    loading = true
    defer { loading = false }
    do {
      let suffix = append ? rows.last.map { "?after=\($0.id)" } ?? "" : ""
      let page: [SupportEntry] = try await session.api.get(
        kind.rawValue + suffix, authenticated: kind == .inquiries)
      rows = append ? rows + page : page
      more = page.count == 50
      loaded = true
    } catch { await session.report(error) }
  }
}
struct SupportDetailView: View {
  @EnvironmentObject private var session: AppSession
  let kind: SupportKind
  let id: String
  var body: some View {
    LoadView(load: { () -> SupportEntry in
      try await session.api.get("\(kind.rawValue)/\(id)", authenticated: kind == .inquiries)
    }) { entry in
      ScrollView {
        VStack(alignment: .leading, spacing: 26) {
          ReadingText(title: entry.title, bodyText: entry.content)
          if let answer = entry.answerContent {
            Divider()
            ReadingText(title: "Ethica의 답변", bodyText: answer)
          }
        }.readingPage()
      }
    }.navigationTitle(kind == .notices ? "공지" : "문의 내용").navigationBarTitleDisplayMode(.inline)
  }
}
struct InquiryComposer: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.dismiss) private var dismiss
  @State private var title = ""
  @State private var content = ""
  private enum Field: Hashable { case title, content }
  @FocusState private var focused: Field?
  var body: some View {
    Form {
      TextField("제목", text: $title).focused($focused, equals: .title)
        .submitLabel(.next).onSubmit { focused = .content }
      Section("문의 내용") {
        TextEditor(text: $content).frame(minHeight: 160).accessibilityLabel("문의 내용")
          .focused($focused, equals: .content)
      }
    }.editorKeyboard().disabled(session.busy).navigationTitle("문의하기").navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() }.disabled(session.busy) }
        ToolbarItem(placement: .confirmationAction) {
          Button("보내기") {
            Task {
              await session.perform {
                try await session.api.mutate(
                  "inquiries", body: ["title": .string(title), "content": .string(content)])
                dismiss()
              }
            }
          }.disabled(
            title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
              || content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
              || title.count > 200 || content.count > 10000 || session.busy)
        }
      }.interactiveDismissDisabled(session.busy)
  }
}

/// Visual examples only: changing these controls never requests notification permission.
struct NotificationWidgetGallery: View {
  let notificationsEnabled: Bool
  @State private var placement = 0
  @State private var state = 0
  @State private var blocked = false
  private let question = "친구를 위한 거짓말도 잘못일까요?"
  private var snapshot: WidgetSnapshot? {
    guard state != 2 else { return nil }
    return WidgetSnapshot(
      title: question, completed: state == 1, expiresAt: nil,
      status: state == 1 ? "completed" : "pending", choices: ["진실을 말한다", "친구를 지킨다"])
  }
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        Picker("표시 위치", selection: $placement) {
          Text("잠금화면").tag(0)
          Text("홈 위젯").tag(1)
        }.pickerStyle(.segmented)
        Picker("질문 상태", selection: $state) {
          Text("새 질문").tag(0)
          Text("답변 완료").tag(1)
          Text("대기").tag(2)
        }.pickerStyle(.segmented)
        if placement == 0 {
          lockScreen
          Toggle("아이폰 알림 차단 상태 보기", isOn: $blocked).font(.subheadline)
          Text("알림은 설정한 시간에 도착해요. 길게 누르면 ‘문제 풀기’로 앱을 열 수 있어요")
            .font(.subheadline).foregroundStyle(.secondary)
        } else {
          Text("작은 위젯").font(.headline)
          DailyWidgetContent(snapshot: snapshot, layout: .small)
            .padding(16).frame(width: 170, height: 170)
            .background(
              Color(uiColor: .secondarySystemGroupedBackground),
              in: RoundedRectangle(cornerRadius: 24))
          Text("중간 위젯").font(.headline)
          DailyWidgetContent(snapshot: snapshot, layout: .medium)
            .padding(18).frame(height: 180)
            .background(
              Color(uiColor: .secondarySystemGroupedBackground),
              in: RoundedRectangle(cornerRadius: 24))
          Text("위젯을 누르면 앱에서 답할 수 있어요. 알림을 꺼도 위젯은 사용할 수 있어요")
            .font(.subheadline).foregroundStyle(.secondary)
        }
        Text("화면 예시 · 실제 알림의 크기와 표시 여부는 아이폰 설정에 따라 달라집니다")
          .font(.caption).foregroundStyle(.secondary)
      }.padding(24)
    }.background(Color(uiColor: .systemGroupedBackground))
      .navigationTitle("알림과 위젯").navigationBarTitleDisplayMode(.inline)
  }
  private var lockScreen: some View {
    VStack(spacing: 22) {
      Image(systemName: "lock.fill").font(.caption).accessibilityHidden(true)
      VStack(spacing: 4) {
        Text("9월 30일 수요일").font(.subheadline)
        Text("8:00").font(.system(size: 64, weight: .semibold, design: .rounded)).monospacedDigit()
      }.accessibilityElement(children: .combine)
      HStack(spacing: 20) {
        DailyWidgetContent(snapshot: snapshot, layout: .circle).frame(width: 54, height: 54)
        DailyWidgetContent(snapshot: snapshot, layout: .lock).frame(
          maxWidth: .infinity, minHeight: 58)
      }.padding(.horizontal, 12)
      Divider().overlay(.white.opacity(0.15))
      if notificationsEnabled && !blocked && state == 0 {
        VStack(alignment: .leading, spacing: 12) {
          HStack(spacing: 10) {
            Image(systemName: "quote.bubble.fill").font(.title3)
              .frame(width: 36, height: 36).background(
                .white.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 2) {
              Text("Ethica").font(.caption).foregroundStyle(.secondary)
              Text("오늘의 질문").font(.subheadline.bold())
            }
            Spacer()
            Text("지금").font(.caption2).foregroundStyle(.secondary)
          }
          QuestionArtwork(assetName: "archive-truth")
            .aspectRatio(1.65, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 12))
          Text(question).font(.system(.title3, design: .serif).weight(.semibold))
            .fixedSize(horizontal: false, vertical: true)
          Text("잠깐, 나의 생각을 만나볼 시간")
            .font(.caption).foregroundStyle(.secondary)
          Divider()
          Label("문제 풀기", systemImage: "arrow.up.right").font(.subheadline.weight(.medium))
            .frame(maxWidth: .infinity).padding(.vertical, 3)
        }.padding(16).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 22))
        Text("이미지를 첨부한 알림 시안").font(.caption2).foregroundStyle(.secondary)
      } else {
        VStack(spacing: 10) {
          Image(systemName: notificationsEnabled && !blocked ? "checkmark.circle" : "bell.slash")
            .font(.title2)
          Text(
            !notificationsEnabled
              ? "앱 알림이 꺼져 있어요"
              : blocked ? "아이폰에서 알림을 차단했어요" : state == 1 ? "오늘의 생각을 기록했어요" : "새 질문 준비 중"
          )
          .font(.subheadline)
          Text(!notificationsEnabled || blocked ? "위젯은 계속 사용할 수 있어요" : "새 질문이 열리면 알려드려요")
            .font(.caption).foregroundStyle(.secondary)
        }.frame(maxWidth: .infinity).padding(.vertical, 24)
      }
      Spacer(minLength: 12)
    }.padding(20).frame(maxWidth: .infinity)
      .foregroundStyle(.white).background(
        Color(white: 0.08), in: RoundedRectangle(cornerRadius: 32)
      )
      .environment(\.colorScheme, .dark)
  }
}
