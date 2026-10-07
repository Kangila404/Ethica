import SwiftUI

struct LearningCatalogView: View {
  @EnvironmentObject private var session: AppSession
  @State private var search = ""
  @State private var category = "all"
  var body: some View {
    LoadView(load: { () -> PhilosopherCatalog in
      try await session.api.get("philosophers", authenticated: session.user != nil)
    }) {
      catalog in
      List {
        if search.isEmpty && category == "all" && !catalog.nearest.isEmpty {
          Section("가까운 철학자") { ForEach(catalog.nearest) { person in personRow(person) } }
        }
        Section("인물 둘러보기") {
          ForEach(
            catalog.all.filter {
              matches($0)
            }
          ) { person in personRow(person) }
          if catalog.all.isEmpty {
            Text("새로운 인물의 글을 준비하고 있어요").foregroundStyle(.secondary)
          } else if !catalog.all.contains(where: matches) {
            Text("결과가 없어요. 다른 분류나 이름으로 찾아보세요").foregroundStyle(.secondary)
          }
        }
      }.listStyle(.plain)
    }.navigationTitle("학습")
      .searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always), prompt: "이름, 시대, 학파")
      .safeAreaInset(edge: .top, spacing: 0) {
        Picker("학습 분류", selection: $category) {
          Text("전체").tag("all")
          Text("철학").tag("philosophy")
          Text("문학").tag("literature")
          Text("신화").tag("mythology")
        }.pickerStyle(.segmented).padding(.horizontal, 16).padding(.vertical, 10)
          .background(.bar)
      }
  }
  private func matches(_ person: Philosopher) -> Bool {
    (category == "all" || (person.categories ?? ["philosophy"]).contains(category))
      && (search.isEmpty || (person.name + person.school + person.era).localizedCaseInsensitiveContains(search))
  }
  private func personRow(_ person: Philosopher) -> some View {
    NavigationLink {
      LivePhilosopherView(id: person.id)
    } label: {
      HStack(spacing: 16) {
        ContentPortrait(imageKey: person.imageKey, name: person.name).frame(width: 58, height: 58)
          .clipShape(Circle())
        VStack(alignment: .leading, spacing: 5) {
          Text(person.name).font(.headline)
          Text("\(person.school) · \(person.era)").font(.subheadline).foregroundStyle(.secondary)
          Text("\(person.postCount)개의 글").font(.caption).foregroundStyle(.secondary)
        }
      }.padding(.vertical, 8)
    }
  }
}
struct LivePhilosopherView: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.dynamicTypeSize) private var typeSize
  let id: String
  var body: some View {
    LoadView(load: { () -> PhilosopherProfile in
      try await session.api.get("philosophers/\(id)", authenticated: session.user != nil)
    })
    { person in
      ScrollView {
        VStack(alignment: .leading, spacing: 24) {
          HStack(spacing: 22) {
            ContentPortrait(imageKey: person.imageKey, name: person.name).frame(
              width: 92, height: 92
            ).clipShape(Circle())
            VStack(alignment: .leading, spacing: 8) {
              Text(person.name).font(.title2.bold())
              Text(person.era).font(.subheadline).foregroundStyle(.secondary)
              Text(person.school).font(.subheadline).foregroundStyle(.secondary)
            }
          }
          CitedText(text: person.coreThought).lineSpacing(5)
          DisclosureGroup("사상의 뿌리") {
            CitedText(text: person.lifeRoots).lineSpacing(5).padding(.vertical, 12).frame(
              maxWidth: .infinity, alignment: .leading
            ).textSelection(.enabled)
          }
          HStack {
            Label("게시글", systemImage: "square.grid.2x2")
            Spacer()
            Text("\(person.posts.count)개의 글").foregroundStyle(.secondary)
          }.font(.subheadline)
        }.readingPage()
        LazyVGrid(
          columns: Array(
            repeating: GridItem(.flexible(), spacing: 3),
            count: typeSize.isAccessibilitySize ? 1 : 2), spacing: 3
        ) {
          ForEach(person.posts) { post in
            NavigationLink {
              LiveReaderView(id: post.id, author: person.name)
            } label: {
              VStack(alignment: .leading, spacing: 14) {
                if AppConfiguration.imageURL(post.imageKey) != nil {
                  ContentPortrait(imageKey: post.imageKey, name: post.title).frame(height: 145)
                    .clipped()
                }
                Text(post.title).font(.system(.title3, design: .serif, weight: .medium))
                  .multilineTextAlignment(.leading).padding(18)
                Spacer(minLength: 0)
              }.frame(maxWidth: .infinity, minHeight: 190, alignment: .topLeading).background(
                Color(uiColor: .secondarySystemBackground))
            }.buttonStyle(.plain)
          }
        }.padding(.horizontal, 4)
        if person.posts.isEmpty {
          EmptyMessage(
            title: "첫 글을 준비하고 있어요", symbol: "text.book.closed",
            detail: "위의 소개에서 이 사람의 생각과 삶을 읽어보세요")
        }
      }.navigationTitle(person.name).navigationBarTitleDisplayMode(.inline)
    }
  }
}
struct LiveReaderView: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  let id: String
  let author: String
  @State private var page = 0
  var body: some View {
    LoadView(load: { () -> PostDetail in
      try await session.api.get("philosophers/post/\(id)", authenticated: session.user != nil)
    }) {
      post in
      VStack(spacing: 0) {
        HStack {
          Text(author)
          Spacer()
          Text(post.segments.isEmpty ? "0 / 0" : "\(page + 1) / \(post.segments.count)")
            .monospacedDigit()
        }.font(.caption).foregroundStyle(.secondary).padding(.horizontal, 24).padding(.vertical, 12)
        if post.segments.isEmpty {
          EmptyMessage(title: "글을 준비하고 있어요", symbol: "book.closed", detail: "새 글이 등록되면 여기서 읽을 수 있어요")
        } else {
          TabView(selection: $page) {
            ForEach(Array(post.segments.enumerated()), id: \.element.id) { index, card in
              GeometryReader { geometry in
              let distance = min(1, abs(geometry.frame(in: .named("readerPages")).minX) / max(1, geometry.size.width))
              ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                  if index == 0 {
                    Text(post.title).font(.system(.largeTitle, design: .serif, weight: .medium))
                  }
                  if let url = AppConfiguration.imageURL(card.imageKey) {
                    LearningSlideImage(url: url, label: post.title + " 관련 자료")
                  }
                  if let body = card.body {
                    CitedText(text: body).font(.title3).lineSpacing(8)
                  }
                  if index == post.segments.count - 1 {
                    Label("마지막 페이지", systemImage: "checkmark").font(.footnote).foregroundStyle(
                      .secondary
                    ).padding(.top, 32)
                  }
                }.readingPage()
              }
              .blur(radius: reduceMotion ? 0 : distance * 7)
              .overlay {
                if !reduceMotion {
                  Color.black.opacity(distance * 0.12).allowsHitTesting(false).accessibilityHidden(true)
                }
              }
              .scaleEffect(reduceMotion ? 1 : 1 - distance * 0.025)
              }.tag(index)
            }
          }.tabViewStyle(.page(indexDisplayMode: .never)).coordinateSpace(name: "readerPages")
          HStack {
            Button {
              withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.3)) { page = max(0, page - 1) }
            } label: {
              Label("이전", systemImage: "chevron.left")
            }.disabled(page == 0)
            Spacer()
            Button {
              withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.3)) { page = min(post.segments.count - 1, page + 1) }
            } label: {
              Label("다음", systemImage: "chevron.right")
            }.disabled(page >= post.segments.count - 1)
          }.padding(24)
        }
      }.navigationTitle("읽기").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .navigationBarTrailing) { PostLikeButton(postID: id) } }
    }
  }
}
private struct PostLikeState: Decodable { let count: Int; let liked: Bool }

private struct PostLikeButton: View {
  @EnvironmentObject private var session: AppSession
  let postID: String
  @State private var state: PostLikeState?
  @State private var busy = false
  @State private var failed = false
  var body: some View {
    Button {
      guard session.user != nil else { session.showLogin = true; return }
      Task { await update() }
    } label: {
      Label(state.map { "\($0.count)" } ?? "좋아요", systemImage: state?.liked == true ? "heart.fill" : "heart")
    }.disabled(busy)
      .accessibilityLabel(state?.liked == true ? "좋아요 취소" : "좋아요")
      .accessibilityValue(state.map { "\($0.count)개" } ?? "")
      .task { await load() }
      .alert("좋아요를 변경하지 못했어요", isPresented: $failed) {
        Button("확인", role: .cancel) {}
      } message: { Text("네트워크 상태를 확인하고 다시 눌러주세요.") }
  }
  private func load() async {
    do {
      state = try await session.api.get("philosophers/post/\(postID)/like", authenticated: session.user != nil)
    } catch { /* Reading remains available even if like counts cannot be loaded. */ }
  }
  private func update() async {
    guard !busy else { return }
    busy = true
    defer { busy = false }
    do {
      // Fetch before a retry when the previous response was lost; never infer success.
      let current: PostLikeState = try await session.api.get("philosophers/post/\(postID)/like")
      state = try await session.api.send("philosophers/post/\(postID)/like", method: current.liked ? "DELETE" : "PUT")
    } catch { failed = true }
  }
}
// Preserve complete book pages and diagrams. A light backing keeps transparent
// archival illustrations legible even when the surrounding reader is dark.
struct LearningSlideImage: View {
  let url: URL
  let label: String
  var body: some View {
    AsyncImage(url: url) { phase in
      switch phase {
      case .success(let image):
        image.resizable().scaledToFit().accessibilityLabel(label)
      case .failure:
        Label("이미지를 불러오지 못했어요", systemImage: "photo").foregroundStyle(.black)
      case .empty:
        ProgressView().tint(.black).accessibilityLabel("이미지 불러오는 중")
      @unknown default:
        EmptyView()
      }
    }.frame(maxWidth: .infinity).frame(height: 280).background(Color.white)
  }
}

struct LiveArchiveView: View {
  @EnvironmentObject private var session: AppSession
  @State private var search = ""
  var body: some View {
    LoadView(load: { () -> ArchivePage in try await session.api.get("archive") }) { page in
      if page.items.isEmpty {
        EmptyMessage(title: "생각이 쌓이는 곳", symbol: "tray", detail: "답변한 질문과 해설을 여기에서 다시 읽을 수 있어요")
      } else {
        let filtered = page.items.filter {
          search.isEmpty || $0.questionPreview.localizedCaseInsensitiveContains(search)
        }
        let months = Set(filtered.map { String($0.serviceDate.prefix(7)) }).sorted(by: >)
        List {
          ForEach(months, id: \.self) { month in
            Section {
              ForEach(filtered.filter { $0.serviceDate.hasPrefix(month) }) { item in
                NavigationLink {
                  LiveArchiveDetailView(id: item.id)
                } label: {
                  HStack(spacing: 14) {
                    QuestionArtwork(imageKey: item.imageKey).frame(width: 68, height: 76)
                      .clipShape(RoundedRectangle(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 6) {
                      Text(item.serviceDate).font(.caption).foregroundStyle(.secondary)
                      Text(item.questionPreview).font(.headline).lineLimit(2)
                    }.padding(.vertical, 5)
                  }.padding(.vertical, 6)
                }
              }
            } header: {
              Text(month.replacingOccurrences(of: "-", with: "년 ") + "월").textCase(nil)
            }
          }
          if filtered.isEmpty { Text("검색 결과가 없어요").foregroundStyle(.secondary) }
        }.listStyle(.plain)
      }
    }.navigationTitle("보관함").searchable(text: $search, prompt: "지난 질문 검색")
  }
}
struct LiveArchiveDetailView: View {
  @EnvironmentObject private var session: AppSession
  let id: String
  var body: some View {
    LoadView(load: { () -> ArchiveDetail in try await session.api.get("archive/\(id)") }) { entry in
      ScrollView {
        VStack(alignment: .leading, spacing: 26) {
          QuestionArtwork(imageKey: entry.imageKey).aspectRatio(1.25, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 20))
          Text(entry.serviceDate).font(.subheadline).foregroundStyle(.secondary)
          Text(entry.questionBody).font(.system(.title, design: .serif)).lineSpacing(5)
          Label(entry.myAnswer, systemImage: "checkmark").font(.headline)
          ReadingText(title: "선택을 돌아보면", bodyText: entry.explanation)
          if let followup = entry.followup {
            Divider()
            ReadingText(title: "한 걸음 더", bodyText: followup.questionBody)
            Label(followup.myAnswer, systemImage: "checkmark").font(.headline)
            CitedText(text: interfaceCopy(followup.explanation)).lineSpacing(7).multilineTextAlignment(.leading)
          }
          Text("기록한 답변은 바꿀 수 없어요").font(.footnote).foregroundStyle(.secondary)
        }.readingPage()
      }
    }.navigationTitle("그날의 생각").navigationBarTitleDisplayMode(.inline)
  }
}
