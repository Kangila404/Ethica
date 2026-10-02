import SwiftUI
import PhotosUI
import UIKit

enum AdminResource: String, CaseIterable, Identifiable {
  case categories, philosophers, posts, segments, questions, notices, inquiries, users, revocations
  var id: String { rawValue }
  var title: String {
    switch self {
    case .categories: return "카테고리"
    case .philosophers: return "사상가"
    case .posts: return "게시글"
    case .segments: return "학습 카드"
    case .questions: return "질문"
    case .notices: return "공지"
    case .inquiries: return "문의 답변"
    case .users: return "사용자"
    case .revocations: return "탈퇴 처리"
    }
  }
  var creatable: Bool { ![.inquiries, .users, .revocations].contains(self) }
}
struct AdminHomeView: View {
  var body: some View {
    List {
      #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-design-admin") {
          Section {
            Text("관리자 미리보기 · 변경은 앱을 닫으면 초기화돼요")
              .font(.caption).foregroundStyle(.secondary)
          }
        }
      #endif
      Section("콘텐츠") {
        ForEach([AdminResource.questions, .posts, .philosophers, .categories]) {
          resource in NavigationLink(resource.title) { AdminListView(resource: resource) }
        }
      }
      Section {
        NavigationLink { AdminUserHub() } label: { Label("사용자 관리", systemImage: "person.2") }
      }
      Section("앱 운영") {
        NavigationLink("공지") { AdminListView(resource: .notices) }
        NavigationLink("이용약관 편집") { AdminTermEditor(type: "service") }
        NavigationLink("개인정보 처리방침 편집") { AdminTermEditor(type: "privacy") }
      }
    }.navigationTitle("관리")
  }
}
struct AdminUserHub: View {
  @State private var selection = AdminResource.users
  var body: some View {
    VStack(spacing: 0) {
      Picker("사용자 관리", selection: $selection) {
        Text("회원").tag(AdminResource.users)
        Text("문의").tag(AdminResource.inquiries)
        Text("탈퇴 처리").tag(AdminResource.revocations)
      }.pickerStyle(.segmented).padding(.horizontal).padding(.bottom, 8)
      AdminListView(resource: selection).id(selection)
    }.navigationTitle("사용자 관리")
  }
}
private func contentStatusLabel(_ status: String) -> String {
  switch status { case "draft": return "검수 대기"; case "published": return "공개"; case "held": return "보류"; default: return status }
}
private func adminOperationStatus(_ status: String) -> String {
  switch status {
  case "pending": return "처리 대기"
  case "answered": return "답변 완료"
  case "processing": return "처리 중"
  case "done", "completed", "succeeded": return "처리 완료"
  case "failed": return "다시 시도 필요"
  case "active": return "이용 중"
  case "suspended": return "이용 정지"
  case "withdrawn", "deleted": return "탈퇴"
  default: return status.isEmpty ? "—" : status
  }
}
struct AdminRow: Identifiable {
  let value: [String: JSONValue]
  var id: String { value["id"]?.text ?? value["userId"]?.text ?? "" }
  var title: String {
    value["name"]?.text ?? value["title"]?.text ?? value["body"]?.text ?? "작업 \(id)"
  }
}
struct AdminListView: View {
  @EnvironmentObject private var session: AppSession
  let resource: AdminResource
  @State private var rows: [AdminRow] = []
  @State private var more = false
  @State private var loaded = false
  @State private var loading = false
  @State private var create = false
  @State private var search = ""
  @State private var status = ""
  @State private var usage = ""
  @State private var categoryId = ""
  @State private var filterCategories: [AdminRow] = []
  private var reviewed: Bool { resource == .questions || resource == .posts }
  private var queryKey: String { search + "|" + status + "|" + usage + "|" + categoryId }
  var body: some View {
    List {
      if reviewed {
        Section {
          Picker("상태", selection: $status) {
            Text("전체").tag("")
            Text("검수 대기").tag("draft")
            Text("공개").tag("published")
            Text("보류").tag("held")
          }.pickerStyle(.segmented)
          if resource == .questions {
            Picker("용도", selection: $usage) {
              Text("전체").tag(""); Text("온보딩").tag("onboarding"); Text("일일 질문").tag("daily")
            }
            Picker("카테고리", selection: $categoryId) {
              Text("전체").tag("")
              ForEach(filterCategories) { Text($0.title).tag($0.id) }
            }
          }
        }
      }
      ForEach(rows.filter { reviewed || search.isEmpty || $0.title.localizedCaseInsensitiveContains(search) }) {
        row in
        if resource.creatable {
          NavigationLink {
            AdminEditor(resource: resource, id: row.id, initial: row.value)
          } label: {
            rowLabel(row)
          }
        } else {
          NavigationLink {
            AdminOperationView(resource: resource, row: row.value)
          } label: {
            rowLabel(row)
          }
        }
      }
      if more { Button("더 불러오기") { Task { await reload(append: true) } }.disabled(loading) }
      if loaded && rows.isEmpty { Text(queryKey == "|||" ? "등록된 항목이 없어요" : "조건에 맞는 항목이 없어요").foregroundStyle(.secondary) }
      if loading { ProgressView() }
      if !loaded && !loading { Button("다시 불러오기") { Task { await reload() } } }
    }.navigationTitle(resource.title).searchable(text: $search, prompt: reviewed ? "전체 콘텐츠 검색" : "불러온 항목 검색")
      .task(id: queryKey) {
        do { if reviewed { try await Task.sleep(nanoseconds: 250_000_000) }; try Task.checkCancellation(); await reload() } catch {}
      }.task {
        guard resource == .questions else { return }
        do {
          var after = ""
          repeat {
            let page: [[String: JSONValue]] = try await session.api.get("admin/categories" + after)
            filterCategories += page.map(AdminRow.init)
            after = page.count == 50 ? "?after=\(page.last?["id"]?.text ?? "")" : ""
          } while !after.isEmpty
        } catch { await session.report(error) }
      }.refreshable { await reload() }
      .toolbar {
        if resource.creatable {
          Button {
            create = true
          } label: {
            Image(systemName: "plus")
          }.accessibilityLabel("\(resource.title) 추가")
        }
      }
      .sheet(isPresented: $create, onDismiss: { Task { await reload() } }) {
        NavigationStack { AdminEditor(resource: resource) }
      }
  }
  private func rowLabel(_ row: AdminRow) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(row.title).lineLimit(2)
      if let status = row.value["status"]?.text {
        Text(reviewed ? contentStatusLabel(status) : adminOperationStatus(status)).font(.caption).foregroundStyle(.secondary)
      }
      if resource == .questions && row.value["status"] == nil {
        Text(row.value["isActive"]?.flag == true ? "출제 중" : "비활성").font(.caption).foregroundStyle(
          .secondary)
      }
      if resource == .notices {
        Text(row.value["isPublished"]?.flag == true ? "게시됨" : "비공개").font(.caption).foregroundStyle(
          .secondary)
      }
    }
  }
  private func reload(append: Bool = false) async {
    if append && loading { return }
    let requestKey = queryKey
    loading = true
    defer { loading = false }
    do {
      let cursor = resource == .users ? rows.last?.value["cursor"]?.text : rows.last?.id
      var query = URLComponents()
      var parameters: [URLQueryItem] = []
      if append, let cursor { parameters.append(URLQueryItem(name: "after", value: cursor)) }
      if reviewed {
        for (key, value) in [("search", search), ("status", status), ("usage", usage), ("categoryId", categoryId)] where !value.isEmpty {
          parameters.append(URLQueryItem(name: key, value: value))
        }
      }
      query.queryItems = parameters.isEmpty ? nil : parameters
      let path = "admin/\(resource.rawValue)" + (query.percentEncodedQuery.map { "?" + $0 } ?? "")
      let items: [[String: JSONValue]] = try await session.api.get(path)
      guard requestKey == queryKey, !Task.isCancelled else { return }
      rows = append ? rows + items.map(AdminRow.init) : items.map(AdminRow.init)
      more = items.count == 50
      loaded = true
    } catch {
      guard !Task.isCancelled else { return }
      await session.report(error)
      if (error as? APIError)?.status == 403 { try? await session.reloadProfile() }
    }
  }
}
struct AdminEditor: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.dismiss) private var dismiss
  let resource: AdminResource
  var id: String? = nil
  var initial: [String: JSONValue] = [:]
  @State private var fields: [String: JSONValue] = [:]
  @State private var philosophers: [AdminRow] = []
  @State private var categories: [AdminRow] = []
  @State private var posts: [AdminRow] = []
  @State private var ready = false
  @State private var deleteConfirmation = false
  @State private var saveConfirmation = false
  @State private var cards: [AdminCardDraft] = []
  @State private var editingCard: AdminCardDraft?
  @State private var previewCards = false
  var body: some View {
    Form {
      if ready {
        editorFields
        if id != nil {
          Section {
            Button(resource == .questions ? "질문 비활성화" : "삭제", role: .destructive) {
              deleteConfirmation = true
            }
          }
        }
      } else {
        ProgressView()
        Button("다시 불러오기") { Task { await prepare() } }
      }
    }.editorKeyboard().disabled(session.busy).navigationTitle(
      id == nil ? "\(resource.title) 추가" : "\(resource.title) 편집"
    ).navigationBarTitleDisplayMode(.inline)
      .task { if !ready { await prepare() } }
      .toolbar {
        if id == nil {
          ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("저장") {
            if id != nil && resource == .questions {
              saveConfirmation = true
            } else {
              Task { await save() }
            }
          }.disabled(!ready || session.busy)
        }
      }
      .confirmationDialog(
        "변경한 질문은 과거 풀이에도 반영됩니다", isPresented: $saveConfirmation, titleVisibility: .visible
      ) { Button("수정 내용 저장") { Task { await save() } } }
      .confirmationDialog(
        resource == .questions ? "앞으로 출제하지 않을까요?" : "이 항목을 삭제할까요?",
        isPresented: $deleteConfirmation, titleVisibility: .visible
      ) {
        Button(resource == .questions ? "비활성화" : "삭제", role: .destructive) {
          Task {
            await session.perform {
              if let id {
                try await session.api.mutate("admin/\(resource.rawValue)/\(id)", method: "DELETE")
                dismiss()
              }
            }
          }
        }
      }.interactiveDismissDisabled(session.busy)
      .sheet(item: $editingCard) { card in
        AdminCardSheet(initial: card) { updated in
          if let index = cards.firstIndex(where: { $0.id == updated.id }) { cards[index] = updated }
          else { cards.append(updated) }
        }
      }
      .sheet(isPresented: $previewCards) { AdminPostPreview(title: fields["title"]?.text ?? "", cards: cards) }
  }
  private var reviewPicker: some View {
    Picker("상태", selection: string("status")) {
      Text("검수 대기").tag("draft"); Text("공개").tag("published"); Text("보류").tag("held")
    }
  }
  @ViewBuilder private var editorFields: some View {
    switch resource {
    case .categories:
      text("이름", "name")
      number("정렬 순서", "sortOrder")
    case .philosophers:
      text("이름", "name")
      text("시대", "era")
      text("학파", "school")
      longText("핵심 사상", "coreThought")
      longText("생애 · 사상의 뿌리", "lifeRoots")
      imageField
    case .posts:
      Section("게시글") {
        reference("사상가", key: "philosopherId", rows: philosophers)
        text("제목", "title")
        reviewPicker
      }
      imageField
      Section {
        ForEach(cards) { card in
          Button { editingCard = card } label: {
            HStack(spacing: 12) {
              Image(systemName: card.kind == "image" ? "photo" : "text.alignleft").foregroundStyle(.secondary)
              Text(card.kind == "image" ? "이미지 카드" : card.body).lineLimit(2).foregroundStyle(.primary)
              Spacer()
              Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
            }
          }
        }.onMove { cards.move(fromOffsets: $0, toOffset: $1) }
          .onDelete { cards.remove(atOffsets: $0) }
        Button { editingCard = AdminCardDraft() } label: { Label("카드 추가", systemImage: "plus") }.disabled(cards.count >= 40)
        Button { previewCards = true } label: { Label("미리보기", systemImage: "eye") }.disabled(cards.isEmpty)
      } header: {
        HStack { Text("학습 카드 · \(cards.count)"); Spacer(); EditButton() }
      } footer: { Text("게시글을 저장하면 카드와 순서도 함께 반영돼요") }
    case .segments:
      reference("게시물", key: "postId", rows: posts)
      Picker("카드 종류", selection: string("segmentType")) {
        Text("글").tag("text")
        Text("이미지").tag("image")
      }
      longText("본문", "body")
      imageField
      number("정렬 순서", "sortOrder")
    case .notices:
      text("제목", "title")
      longText("내용", "content")
      Toggle("공개", isOn: flag("isPublished"))
    case .questions:
      Section("출제 설정") {
        Picker("용도", selection: string("usage")) {
          Text("온보딩").tag("onboarding")
          Text("일일 질문").tag("daily")
        }.disabled(id != nil)
        Picker("문제 종류", selection: string("type")) {
          Text("1단").tag("single")
          Text("2단").tag("twoStage")
        }.disabled(id != nil)
        reviewPicker
        ForEach(categories) { category in
          Toggle(
            category.title,
            isOn: Binding(
              get: { fields["categoryIds"]?.array.contains(.string(category.id)) == true },
              set: { selected in
                var ids = fields["categoryIds"]?.array ?? []
                ids.removeAll { $0 == .string(category.id) }
                if selected { ids.append(.string(category.id)) }
                fields["categoryIds"] = .array(ids)
              }))
        }
      }
      text("관리용 제목", "title")
      longText("질문", "stage1Body")
      imageField
      ForEach(0..<2) { index in
        Section("선택지 \(index + 1)") {
          TextField("선택지", text: choice("answers", index, "body"), axis: .vertical)
          Picker("사상가", selection: choice("answers", index, "philosopherId")) {
            Text("선택해주세요").tag("")
            ForEach(philosophers) { p in Text(p.title).tag(p.id) }
          }
          TextField("해설", text: choice("answers", index, "explanation"), axis: .vertical).lineLimit(
            3...10)
        }
      }
      if fields["type"]?.text == "twoStage" {
        longText("후속 질문", "followupBody")
        ForEach(0..<2) { index in
          Section("후속 선택지 \(index + 1)") {
            TextField("선택지", text: choice("followupAnswers", index, "body"), axis: .vertical)
            TextField("해설", text: choice("followupAnswers", index, "explanation"), axis: .vertical)
              .lineLimit(3...10)
          }
        }
      }
    default: EmptyView()
    }
  }
  private func string(_ key: String) -> Binding<String> {
    Binding(get: { fields[key]?.text ?? "" }, set: { fields[key] = .string($0) })
  }
  private func flag(_ key: String) -> Binding<Bool> {
    Binding(get: { fields[key]?.flag ?? false }, set: { fields[key] = .bool($0) })
  }
  private func text(_ title: String, _ key: String) -> some View {
    TextField(title, text: string(key), axis: .vertical)
  }
  private func longText(_ title: String, _ key: String) -> some View {
    Section(title) { TextEditor(text: string(key)).frame(minHeight: 130).accessibilityLabel(title) }
  }
  private func number(_ title: String, _ key: String) -> some View {
    Stepper(
      "\(title): \(fields[key]?.text ?? "0")",
      value: Binding(
        get: { Int(fields[key]?.text ?? "0") ?? 0 }, set: { fields[key] = .number(Double($0)) }),
      in: 0...10000)
  }
  private var imageField: some View {
    Section("이미지") { AdminImageField(imageKey: string("imageKey")) }
  }
  private func reference(_ title: String, key: String, rows: [AdminRow]) -> some View {
    Picker(title, selection: string(key)) {
      Text("선택해주세요").tag("")
      ForEach(rows) { row in Text(row.title).tag(row.id) }
    }
  }
  private func choice(_ key: String, _ index: Int, _ field: String) -> Binding<String> {
    Binding(
      get: {
        let array = fields[key]?.array ?? []
        return array.indices.contains(index) ? array[index].object[field]?.text ?? "" : ""
      },
      set: { value in
        var array = fields[key]?.array ?? []
        while array.count <= index { array.append(.object([:])) }
        var obj = array[index].object
        obj[field] = .string(value)
        array[index] = .object(obj)
        fields[key] = .array(array)
      })
  }
  private func all(_ resource: String) async throws -> [AdminRow] {
    var result: [AdminRow] = []
    var after = ""
    while true {
      let page: [[String: JSONValue]] = try await session.api.get("admin/\(resource)\(after)")
      result += page.map(AdminRow.init)
      if page.count < 50 { return result }
      guard let last = page.last?["id"]?.text else { return result }
      after = "?after=\(last)"
    }
  }
  private func prepare() async {
    do {
      if [.posts, .questions].contains(resource) { philosophers = try await all("philosophers") }
      if resource == .questions { categories = try await all("categories") }
      if resource == .segments { posts = try await all("posts") }
      if let id {
        let loaded: [String: JSONValue] =
          resource == .notices
          ? initial : try await session.api.get("admin/\(resource.rawValue)/\(id)")
        fields = loaded
        if resource == .posts { cards = loaded["segments"]?.array.map { AdminCardDraft(value: $0.object) } ?? [] }
        if resource == .questions {
          fields["categoryIds"] = .array(
            loaded["categories"]?.array.compactMap { $0.object["categoryId"] } ?? [])
        }
      } else {
        fields = [
          "sortOrder": .number(0), "type": .string("single"), "usage": .string("daily"),
          "segmentType": .string("text"), "status": .string("draft"), "isActive": .bool(false), "isPublished": .bool(false),
          "categoryIds": .array([]),
        ]
      }
      ready = true
    } catch { await session.report(error) }
  }
  private func save() async {
    await session.perform {
      let keys: [String]
      switch resource {
      case .categories: keys = ["name", "sortOrder"]
      case .philosophers: keys = ["name", "era", "school", "coreThought", "lifeRoots", "imageKey"]
      case .posts: keys = ["philosopherId", "title", "imageKey", "status"]
      case .segments: keys = ["postId", "segmentType", "body", "imageKey", "sortOrder"]
      case .notices: keys = ["title", "content", "isPublished"]
      case .questions:
        keys = [
          "usage", "type", "title", "stage1Body", "followupBody", "imageKey", "status",
          "categoryIds", "answers", "followupAnswers",
        ]
      default: return
      }
      var body = fields.filter { keys.contains($0.key) }
      if resource == .posts { body["segments"] = .array(cards.map { .object($0.payload) }) }
      if resource == .questions {
        for key in ["answers", "followupAnswers"] {
          let allowed =
            key == "answers"
            ? ["id", "body", "explanation", "philosopherId"] : ["id", "body", "explanation"]
          body[key] = .array(
            (fields[key]?.array ?? []).map {
              .object(
                $0.object.filter { allowed.contains($0.key) && ($0.key != "id" || id != nil) })
            })
        }
        if fields["type"]?.text == "single" {
          body["followupBody"] = .null
          body["followupAnswers"] = .array([])
        }
      }
      if body["imageKey"]?.text.isEmpty == true { body["imageKey"] = .null }
      try await session.api.mutate(
        "admin/\(resource.rawValue)" + (id.map { "/\($0)" } ?? ""),
        method: id == nil ? "POST" : "PUT", body: body)
      dismiss()
    }
  }
}
struct AdminCardDraft: Identifiable {
  let id = UUID()
  var serverId: String?
  var kind = "text"
  var body = ""
  var image = ""
  init() {}
  init(value: [String: JSONValue]) {
    serverId = value["id"]?.text
    kind = value["segmentType"]?.text ?? "text"
    body = value["body"]?.text ?? ""
    image = value["imageKey"]?.text ?? ""
  }
  var payload: [String: JSONValue] {
    var result: [String: JSONValue] = ["segmentType": .string(kind), "body": kind == "text" ? .string(body) : .null, "imageKey": kind == "image" ? .string(image) : .null]
    if let serverId { result["id"] = .string(serverId) }
    return result
  }
}
struct AdminCardSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var card: AdminCardDraft
  let save: (AdminCardDraft) -> Void
  init(initial: AdminCardDraft, save: @escaping (AdminCardDraft) -> Void) {
    _card = State(initialValue: initial); self.save = save
  }
  var body: some View {
    NavigationStack {
      Form {
        Picker("카드 종류", selection: $card.kind) { Text("글").tag("text"); Text("이미지").tag("image") }.pickerStyle(.segmented)
        if card.kind == "text" {
          Section("본문") { TextEditor(text: $card.body).frame(minHeight: 200).accessibilityLabel("카드 본문") }
        } else {
          Section("이미지") {
            AdminImageField(imageKey: $card.image)

          }
        }
      }.editorKeyboard().navigationTitle("학습 카드").navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
          ToolbarItem(placement: .confirmationAction) {
            Button("완료") { save(card); dismiss() }
              .disabled((card.kind == "text" ? card.body : card.image).trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || card.body.count > 10000 || card.image.count > 255)
          }
        }
    }.presentationDetents([.medium, .large])
  }
}
struct AdminPostPreview: View {
  @Environment(\.dismiss) private var dismiss
  let title: String
  let cards: [AdminCardDraft]
  var body: some View {
    NavigationStack {
      TabView {
        ForEach(Array(cards.enumerated()), id: \.element.id) { index, card in
          ScrollView {
            VStack(alignment: .leading, spacing: 24) {
              Text("\(index + 1) / \(cards.count)").font(.caption).foregroundStyle(.secondary)
              if card.kind == "text" { Text(card.body).font(.title3).lineSpacing(7) }
              else if let url = AppConfiguration.imageURL(card.image) {
                AsyncImage(url: url) { image in image.resizable().scaledToFit() } placeholder: { Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary) }
              } else { Label("이미지 주소를 확인해주세요", systemImage: "photo") }
            }.frame(maxWidth: .infinity, alignment: .leading).padding(24).padding(.bottom, 36)
          }
        }
      }.tabViewStyle(.page).navigationTitle(title).navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
    }
  }
}
struct AdminOperationView: View {
  @EnvironmentObject private var session: AppSession
  let resource: AdminResource
  let row: [String: JSONValue]
  @State private var detail: [String: JSONValue] = [:]
  @State private var answer = ""
  @State private var retryDone = false
  var body: some View {
    Form {
      if resource == .inquiries {
        Section(detail["title"]?.text ?? row["title"]?.text ?? "문의") {
          Text(detail["content"]?.text ?? row["content"]?.text ?? "")
        }
        Section("답변") { TextEditor(text: $answer).frame(minHeight: 180) }
        Button("답변 저장") {
          Task {
            await session.perform {
              try await session.api.mutate(
                "admin/inquiries/\(row["id"]?.text ?? "")/answer", method: "PATCH",
                body: ["answerContent": .string(answer)])
              await load()
            }
          }
        }.disabled(
          answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || answer.count > 10000)
      } else if resource == .revocations {
        LabeledContent("상태", value: retryDone ? "재시도 대기" : adminOperationStatus(row["status"]?.text ?? ""))
        LabeledContent("시도 횟수", value: row["attempts"]?.text ?? "0")
        if let code = row["lastErrorCode"]?.text, !code.isEmpty {
          Text(code).font(.caption).foregroundStyle(.secondary)
        }
        if row["status"]?.text == "failed" && !retryDone {
          Button("연결 해제 재시도") {
            Task {
              await session.perform {
                try await session.api.mutate("admin/revocations/\(row["id"]?.text ?? "")/retry")
                retryDone = true
              }
            }
          }
        }
      } else {
        LabeledContent("이름", value: row["name"]?.text ?? "")
        LabeledContent("권한", value: row["userRole"]?.text == "admin" ? "관리자" : "일반 회원")
        LabeledContent("상태", value: adminOperationStatus(row["userStatus"]?.text ?? ""))
        LabeledContent("온보딩", value: row["onboardingStatus"]?.text == "complete" ? "완료" : "진행 중")
        Text("관리자 권한은 DB에서 지정합니다").font(.footnote).foregroundStyle(.secondary)
      }
    }.editorKeyboard().disabled(session.busy).navigationTitle(resource.title).navigationBarTitleDisplayMode(.inline)
      .task { await load() }
  }
  private func load() async {
    guard resource == .inquiries else { return }
    do {
      detail = try await session.api.get("admin/inquiries/\(row["id"]?.text ?? "")")
      answer = detail["answerContent"]?.text ?? ""
    } catch { await session.report(error) }
  }
}
struct AdminTermEditor: View {
  @EnvironmentObject private var session: AppSession
  let type: String
  @State private var title = ""
  @State private var version = ""
  @State private var content = ""
  @State private var saved = false
  var body: some View {
    Form {
      TextField("제목", text: $title)
      TextField("버전", text: $version)
      Section("본문") { TextEditor(text: $content).frame(minHeight: 350) }
      Button("약관 저장") {
        Task {
          await session.perform {
            try await session.api.mutate(
              "admin/terms", method: "PUT",
              body: [
                "type": .string(type), "title": .string(title), "version": .string(version),
                "content": .string(content),
              ])
            saved = true
          }
        }
      }.disabled(title.isEmpty || version.isEmpty || content.isEmpty || session.busy)
    }.editorKeyboard().navigationTitle(type == "service" ? "이용약관" : "개인정보 처리방침").navigationBarTitleDisplayMode(
      .inline
    )
    .alert("저장했어요", isPresented: $saved) { Button("확인", role: .cancel) {} }
    .task {
      do {
        let term: TermDocument = try await session.api.get(
          "terms?type=\(type)", authenticated: false)
        title = term.title
        version = term.version
        content = term.content
      } catch let e as APIError where e.status == 404 {} catch { await session.report(error) }
    }
  }
}

#if DEBUG
/// Uses the actual admin views with an isolated, in-memory API. Never accesses the server/keychain.
struct AdminDesignPreview: View {
  @StateObject private var session = AppSession(api: APIClient(baseURL: URL(string: "https://admin-preview.invalid/")!))
  @State private var ready = false
  var body: some View {
    Group {
      if ready {
        RootView(initialTab: 4, showAdmin: true).environmentObject(session)
          .alert("요청을 완료하지 못했어요", isPresented: Binding(
            get: { session.errorMessage != nil }, set: { if !$0 { session.errorMessage = nil } }
          )) { Button("확인") { session.errorMessage = nil } } message: { Text(session.errorMessage ?? "") }
      } else { ProgressView() }
    }.task { guard !ready else { return }; await session.api.enableAdminPreview(); ready = true }
  }
}

actor AdminPreviewData {
  private var records: [String: [[String: JSONValue]]] = [
    "categories": [["id": .string("1"), "name": .string("윤리 · 관계"), "sortOrder": .number(0)],
                   ["id": .string("2"), "name": .string("사회 · 정의"), "sortOrder": .number(1)]],
    "philosophers": [
      ["id": .string("1"), "name": .string("이마누엘 칸트"), "era": .string("18세기"), "school": .string("의무론"), "coreThought": .string("옳은 원칙에 따라 행동하기"), "lifeRoots": .string("쾨니히스베르크에서 철학을 가르쳤습니다")],
      ["id": .string("2"), "name": .string("존 스튜어트 밀"), "era": .string("19세기"), "school": .string("공리주의")]],
    "posts": [["id": .string("1"), "philosopherId": .string("1"), "title": .string("옳은 선택은 어디에서 시작될까")]],
    "segments": [["id": .string("1"), "postId": .string("1"), "segmentType": .string("text"), "body": .string("칸트는 행동의 결과보다 그 행동의 원칙을 살폈습니다"), "sortOrder": .number(0)]],
    "questions": [["id": .string("1"), "title": .string("친구를 위한 거짓말"), "usage": .string("daily"), "type": .string("twoStage"), "isActive": .bool(true), "stage1Body": .string("친구를 지키기 위한 거짓말도 잘못일까요?"), "categories": .array([.object(["categoryId": .string("1")])]), "answers": .array([
      .object(["id": .string("1"), "body": .string("진실을 말한다"), "philosopherId": .string("1"), "explanation": .string("진실을 지키는 원칙에 무게를 두었어요")]),
      .object(["id": .string("2"), "body": .string("친구를 지킨다"), "philosopherId": .string("2"), "explanation": .string("선택이 가져올 결과를 살폈어요")])]), "followupBody": .string("거짓말로 다른 사람이 피해를 본다면요?"), "followupAnswers": .array([
        .object(["id": .string("3"), "body": .string("진실을 말한다"), "explanation": .string("다른 사람의 피해도 고려했어요")]),
        .object(["id": .string("4"), "body": .string("친구를 지킨다"), "explanation": .string("관계의 책임을 우선했어요")])])]],
    "notices": [["id": .string("1"), "title": .string("Ethica에 오신 것을 환영해요"), "content": .string("매일 하나의 질문으로 철학을 만나요"), "isPublished": .bool(true)]],
    "inquiries": [["id": .string("1"), "title": .string("알림 시간을 바꾸고 싶어요"), "content": .string("저녁에도 질문을 받을 수 있나요?"), "status": .string("pending")]],
    "users": [["id": .string("1"), "name": .string("에티카 운영자"), "userRole": .string("admin"), "userStatus": .string("active"), "onboardingStatus": .string("complete")]],
    "revocations": [["id": .string("1"), "status": .string("failed"), "attempts": .number(1), "lastErrorCode": .string("PROVIDER_UNAVAILABLE")]]
  ]
  init() {
    records["posts"]?[0]["status"] = .string("draft")
    let exampleCards = (records["segments"] ?? []).map { JSONValue.object($0) }
    records["posts"]?[0]["segments"] = .array(exampleCards)
    records["questions"]?[0]["status"] = .string("draft")
  }
  private var terms: [String: [String: JSONValue]] = [:]
  func respond(_ path: String, method: String, body: [String: JSONValue]) throws -> Data {
    let parts = path.split(separator: "?")[0].split(separator: "/").map(String.init)
    if parts.first == "terms" {
      let type = path.contains("privacy") ? "privacy" : "service"
      return try JSONEncoder().encode(terms[type] ?? ["title": .string(type == "service" ? "이용약관" : "개인정보 처리방침"), "version": .string("1.0"), "content": .string("미리보기용 약관입니다. 실제 서비스 약관을 편집하는 화면이에요")])
    }
    guard parts.count >= 2, parts[0] == "admin" else { throw APIError(status: 404, code: "PREVIEW", message: "이 경로는 관리자 미리보기에 없어요") }
    let resource = parts[1]
    if resource == "terms" { terms[body["type"]?.text ?? "service"] = body; return Data("{}".utf8) }
    guard var rows = records[resource] else { throw APIError(status: 404, code: "PREVIEW", message: "항목을 찾을 수 없어요") }
    if method == "GET" {
      if parts.count == 2 {
        let query = URLComponents(string: "https://preview.invalid/" + path)?.queryItems ?? []
        for item in query {
          guard let value = item.value, !value.isEmpty else { continue }
          switch item.name {
          case "status", "usage": rows = rows.filter { $0[item.name]?.text == value }
          case "search": rows = rows.filter { ($0["title"]?.text ?? "").localizedCaseInsensitiveContains(value) || ($0["stage1Body"]?.text ?? "").localizedCaseInsensitiveContains(value) }
          case "categoryId": rows = rows.filter { $0["categories"]?.array.contains(where: { $0.object["categoryId"]?.text == value }) == true }
          default: break
          }
        }
        return try JSONEncoder().encode(rows)
      }
      guard let row = rows.first(where: { $0["id"]?.text == parts[2] }) else { throw APIError(status: 404, code: "PREVIEW", message: "항목을 찾을 수 없어요") }
      return try JSONEncoder().encode(row)
    }
    if parts.count == 2 {
      var row = body; row["id"] = .string(UUID().uuidString)
      rows.insert(row, at: 0)
    } else if let index = rows.firstIndex(where: { $0["id"]?.text == parts[2] }) {
      if method == "DELETE" {
        if resource == "questions" { rows[index]["isActive"] = .bool(false); rows[index]["status"] = .string("held") } else { rows.remove(at: index) }
      } else {
        rows[index].merge(body) { _, new in new }
        if resource == "inquiries" { rows[index]["status"] = .string("answered") }
        if resource == "revocations" { rows[index]["status"] = .string("pending") }
      }
    }
    if resource == "questions" {
      for index in rows.indices {
        if let ids = rows[index]["categoryIds"]?.array {
          rows[index]["categories"] = .array(ids.map { .object(["categoryId": $0]) })
        }
      }
    }
    records[resource] = rows
    return Data("{}".utf8)
  }
}
#endif

// System photo picker grants access only to the selected asset. Upload is admin-only.
struct AdminImageField: View {
  @EnvironmentObject private var session: AppSession
  @Binding var imageKey: String
  @State private var selection: PhotosPickerItem?
  @State private var uploading = false
  var body: some View {
    TextField("이미지 주소 또는 저장 경로", text: $imageKey)
      .textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL)
    PhotosPicker(selection: $selection, matching: .images) {
      Label(uploading ? "올리는 중" : "이미지 선택", systemImage: "photo.badge.plus")
    }.disabled(uploading || AppConfiguration.onboardingPreview)
      .task(id: selection) {
        guard let selection else { return }
        uploading = true
        defer { uploading = false; self.selection = nil }
        await session.perform {
          guard let data = try await selection.loadTransferable(type: Data.self),
            let source = UIImage(data: data) else {
            throw APIError(status: 0, code: "IMAGE", message: "이미지를 읽지 못했어요")
          }
          let scale = min(1, 1600 / max(source.size.width, source.size.height))
          let size = CGSize(width: source.size.width * scale, height: source.size.height * scale)
          let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
          let image = UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor.white.setFill(); context.fill(CGRect(origin: .zero, size: size))
            source.draw(in: CGRect(origin: .zero, size: size))
          }
          guard let jpeg = image.jpegData(compressionQuality: 0.85) else {
            throw APIError(status: 0, code: "IMAGE", message: "이미지를 준비하지 못했어요")
          }
          imageKey = try await session.api.uploadImage(jpeg)
        }
      }
    if uploading { ProgressView() }
    if let url = AppConfiguration.imageURL(imageKey) {
      AsyncImage(url: url) { image in image.resizable().scaledToFit() }
        placeholder: { ProgressView() }.frame(maxHeight: 180)
    }
  }
}
