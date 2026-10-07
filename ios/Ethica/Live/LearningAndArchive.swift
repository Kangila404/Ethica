import SwiftUI
import UIKit

private struct LearningProfileRoute: Hashable {
  let id: String
  let name: String
}
private struct LearningPostRoute: Hashable {
  let id: String
  let author: String
}

/// Give profile and reader content a viewport inside the system bars.
/// The loading view, native scroll view and UIKit reader must receive the same
/// safe-area-sized proposal; none should lay out against the full screen bounds.
/// Do not compensate with device-specific status/navigation/tab bar heights.
private struct LearningViewport: ViewModifier {
  func body(content: Content) -> some View {
    GeometryReader { geometry in
      content
        .frame(width: geometry.size.width, height: geometry.size.height)
        .clipped()
    }
  }
}

struct LearningCatalogView: View {
  @EnvironmentObject private var session: AppSession
  @State private var search = ""
  @State private var category = "all"
  @State private var catalog: PhilosopherCatalog?
  @State private var loading = false
  @State private var failure: String?
  var body: some View {
    // Keep the native scroll container mounted through loading and refresh.
    // An inline title avoids the large-title/search collapse path that hid the title.
    List {
      if let catalog {
        if search.isEmpty && category == "all" && !catalog.nearest.isEmpty {
          Section("가까운 철학자") { ForEach(catalog.nearest) { person in personRow(person) } }
        }
        Section("인물 둘러보기") {
          ForEach(catalog.all.filter { matches($0) }) { person in personRow(person) }
          if catalog.all.isEmpty {
            Text("새로운 인물의 글을 준비하고 있어요").foregroundStyle(.secondary)
          } else if !catalog.all.contains(where: matches) {
            Text("결과가 없어요. 다른 분류나 이름으로 찾아보세요").foregroundStyle(.secondary)
          }
        }
      }
    }.listStyle(.plain)
      .overlay {
        if catalog == nil {
          if let failure {
            EmptyMessage(title: "불러오지 못했어요", symbol: "wifi.exclamationmark", detail: failure) {
              Task { await reload() }
            }
          } else {
            ProgressView("인물을 불러오는 중이에요").accessibilityIdentifier("learning.catalog.loading")
          }
        }
      }
      .task { await reload() }
      .refreshable { await reload() }
      .navigationTitle("학습")
      .navigationBarTitleDisplayMode(.inline)
      .navigationDestination(for: LearningProfileRoute.self) { route in
        LivePhilosopherView(id: route.id, name: route.name)
      }
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
      .safeAreaInset(edge: .bottom) {
        if catalog != nil, let failure {
          HStack {
            Text(failure).font(.footnote)
            Spacer()
            Button("다시 시도") { Task { await reload() } }
          }.padding().background(.regularMaterial)
        }
      }
  }
  @MainActor private func reload() async {
    guard !loading else { return }
    loading = true
    defer { loading = false }
    do {
      let loaded: PhilosopherCatalog = try await session.api.get("philosophers", authenticated: session.user != nil)
      try Task.checkCancellation()
      catalog = loaded
      failure = nil
    } catch is CancellationError {} catch let error as URLError where error.code == .cancelled {
    } catch {
      failure = (error as? APIError)?.message ?? "네트워크 상태를 확인하고 다시 시도해주세요"
      if (error as? APIError)?.status == 401 { await session.report(error) }
    }
  }
  private func matches(_ person: Philosopher) -> Bool {
    (category == "all" || (person.categories ?? ["philosophy"]).contains(category))
      && (search.isEmpty || (person.name + person.school + person.era).localizedCaseInsensitiveContains(search))
  }
  private func personRow(_ person: Philosopher) -> some View {
    NavigationLink(value: LearningProfileRoute(id: person.id, name: person.name)) {
      HStack(spacing: 16) {
        ContentPortrait(imageKey: person.imageKey, name: person.name).frame(width: 58, height: 58)
          .clipShape(Circle())
        VStack(alignment: .leading, spacing: 5) {
          Text(person.name).font(.headline)
          Text("\(person.school) · \(person.era)").font(.subheadline).foregroundStyle(.secondary)
          Text("\(person.postCount)개의 글").font(.caption).foregroundStyle(.secondary)
        }
      }.padding(.vertical, 8).contentShape(Rectangle())
    }.accessibilityIdentifier("learning.person.\(person.id)")
  }
}
struct LivePhilosopherView: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.dynamicTypeSize) private var typeSize
  let id: String
  var name: String? = nil
  @State private var portrait: PortraitPresentation?
  var body: some View {
    LoadView(loadingMessage: "프로필을 불러오고 있어요", loadingIdentifier: "learning.profile.loading", load: { () -> PhilosopherProfile in
      try await session.api.get("philosophers/\(id)", authenticated: session.user != nil)
    })
    { person in
      ScrollView {
        VStack(alignment: .leading, spacing: 24) {
          HStack(spacing: 22) {
            Button {
              if let url = AppConfiguration.imageURL(person.imageKey) {
                portrait = PortraitPresentation(url: url, name: person.name)
              }
            } label: {
              ContentPortrait(imageKey: person.imageKey, name: person.name)
                .frame(width: 92, height: 92).clipShape(Circle())
            }.buttonStyle(.plain).disabled(AppConfiguration.imageURL(person.imageKey) == nil)
              .accessibilityLabel("\(person.name) 프로필 이미지 확대")
              .accessibilityIdentifier("learning.profile.portrait")
            VStack(alignment: .leading, spacing: 8) {
              Text(person.name).font(.title2.bold())
                .accessibilityIdentifier("learning.profile.name")
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
            NavigationLink(value: LearningPostRoute(id: post.id, author: person.name)) {
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
                .contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityIdentifier("learning.post.\(post.id)")
          }
        }.padding(.horizontal, 4)
        if person.posts.isEmpty {
          EmptyMessage(
            title: "첫 글을 준비하고 있어요", symbol: "text.book.closed",
            detail: "위의 소개에서 이 사람의 생각과 삶을 읽어보세요")
        }
      }.navigationTitle(person.name)
    }
    .fullScreenCover(item: $portrait) { PortraitImageViewer(portrait: $0) }
    .modifier(LearningViewport())
    .navigationTitle(name ?? "프로필").navigationBarTitleDisplayMode(.inline)
    .navigationDestination(for: LearningPostRoute.self) { route in
      LiveReaderView(id: route.id, author: route.author)
    }
  }
}
private struct PortraitPresentation: Identifiable {
  let url: URL
  let name: String
  var id: URL { url }
}

private struct PortraitImageViewer: View {
  @Environment(\.dismiss) private var dismiss
  let portrait: PortraitPresentation
  @State private var image: UIImage?
  @State private var failed = false
  @State private var retry = 0
  var body: some View {
    NavigationStack {
      Group {
        if let image {
          ZoomablePortrait(image: image, name: portrait.name)
        } else if failed {
          EmptyMessage(title: "이미지를 불러오지 못했어요", symbol: "photo",
            detail: "연결 상태를 확인하고 다시 시도해주세요", retry: { retry += 1 })
        } else {
          ProgressView("이미지를 불러오는 중이에요")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
      }.background(.black)
        .navigationTitle(portrait.name).navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button { dismiss() } label: { Label("닫기", systemImage: "xmark") }
              .accessibilityIdentifier("learning.portrait.close")
          }
        }
        .task(id: retry) {
          failed = false
          do {
            let (data, response) = try await URLSession.shared.data(from: portrait.url)
            try Task.checkCancellation()
            guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode),
              let loaded = UIImage(data: data) else { throw URLError(.cannotDecodeContentData) }
            image = loaded
          } catch is CancellationError {} catch let error as URLError where error.code == .cancelled {
          } catch { failed = true }
        }
    }.preferredColorScheme(.dark).tint(.white)
  }
}

/// Native pinch, pan and double-tap zoom. The original aspect ratio is preserved.
private struct ZoomablePortrait: UIViewRepresentable {
  let image: UIImage
  let name: String
  func makeCoordinator() -> Coordinator { Coordinator() }
  func makeUIView(context: Context) -> PortraitScrollView {
    let view = PortraitScrollView()
    view.delegate = context.coordinator
    let doubleTap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.doubleTap(_:)))
    doubleTap.numberOfTapsRequired = 2
    view.addGestureRecognizer(doubleTap)
    return view
  }
  func updateUIView(_ view: PortraitScrollView, context: Context) {
    if view.imageView.image !== image {
      view.imageView.image = image
      view.viewportSize = .zero
      view.setNeedsLayout()
    }
    view.imageView.accessibilityLabel = "\(name) 프로필 이미지"
  }
  final class Coordinator: NSObject, UIScrollViewDelegate {
    func viewForZooming(in scrollView: UIScrollView) -> UIView? {
      (scrollView as? PortraitScrollView)?.imageView
    }
    func scrollViewDidZoom(_ scrollView: UIScrollView) {
      (scrollView as? PortraitScrollView)?.centerImage()
    }
    @objc func doubleTap(_ gesture: UITapGestureRecognizer) {
      guard let scroll = gesture.view as? PortraitScrollView else { return }
      if scroll.zoomScale > 1 {
        scroll.setZoomScale(1, animated: !UIAccessibility.isReduceMotionEnabled)
      } else {
        let point = gesture.location(in: scroll.imageView)
        let size = CGSize(width: scroll.bounds.width / 2.5, height: scroll.bounds.height / 2.5)
        scroll.zoom(to: CGRect(x: point.x - size.width / 2, y: point.y - size.height / 2,
          width: size.width, height: size.height), animated: !UIAccessibility.isReduceMotionEnabled)
      }
    }
  }
}

private final class PortraitScrollView: UIScrollView {
  let imageView = UIImageView()
  var viewportSize = CGSize.zero
  init() {
    super.init(frame: .zero)
    minimumZoomScale = 1
    maximumZoomScale = 4
    contentInsetAdjustmentBehavior = .never
    showsVerticalScrollIndicator = false
    showsHorizontalScrollIndicator = false
    backgroundColor = .black
    accessibilityIdentifier = "learning.portrait.zoom"
    imageView.contentMode = .scaleAspectFit
    imageView.isAccessibilityElement = true
    imageView.accessibilityIdentifier = "learning.portrait.image"
    addSubview(imageView)
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
  override func layoutSubviews() {
    super.layoutSubviews()
    if viewportSize != bounds.size, bounds.width > 0, bounds.height > 0,
      let image = imageView.image, image.size.width > 0, image.size.height > 0 {
      viewportSize = bounds.size
      setZoomScale(1, animated: false)
      let scale = min(bounds.width / image.size.width, bounds.height / image.size.height)
      imageView.frame = CGRect(origin: .zero,
        size: CGSize(width: image.size.width * scale, height: image.size.height * scale))
      contentSize = imageView.frame.size
    }
    centerImage()
  }
  func centerImage() {
    let inset = UIEdgeInsets(top: max(0, (bounds.height - contentSize.height) / 2),
      left: max(0, (bounds.width - contentSize.width) / 2),
      bottom: max(0, (bounds.height - contentSize.height) / 2),
      right: max(0, (bounds.width - contentSize.width) / 2))
    if contentInset != inset { contentInset = inset }
    accessibilityValue = String(format: "%.1f배", zoomScale)
  }
}

struct LiveReaderView: View {
  @EnvironmentObject private var session: AppSession
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  let id: String
  let author: String
  @State private var page = 0
  @State private var pageRequestRevision = 0
  var body: some View {
    LoadView(loadingMessage: "글을 불러오고 있어요", load: { () -> PostDetail in
      try await session.api.get("philosophers/post/\(id)", authenticated: session.user != nil)
    }) {
      post in
      VStack(spacing: 0) {
        HStack {
          Text(author)
          Spacer()
          Text(post.segments.isEmpty ? "0 / 0" : "\(page + 1) / \(post.segments.count)")
            .monospacedDigit()
            .accessibilityIdentifier("learning.reader.pageCount")
        }.font(.caption).foregroundStyle(.secondary).padding(.horizontal, 24).padding(.vertical, 12)
        if post.segments.isEmpty {
          EmptyMessage(title: "글을 준비하고 있어요", symbol: "book.closed", detail: "새 글이 등록되면 여기서 읽을 수 있어요")
        } else {
          BookPageReader(count: post.segments.count, selection: $page, reduceMotion: reduceMotion,
            requestRevision: $pageRequestRevision) { index in
            let card = post.segments[index]
            ScrollView {
              VStack(alignment: .leading, spacing: 26) {
                if index == 0 {
                  Text(post.title).font(.system(.largeTitle, design: .serif, weight: .medium))
                    .accessibilityIdentifier("learning.reader.title")
                }
                if let url = AppConfiguration.imageURL(card.imageKey) {
                  LearningSlideImage(url: url, label: post.title + " 관련 자료")
                }
                if let body = card.body {
                  CitedText(text: body).font(.title3).lineSpacing(8)
                }
                if index == post.segments.count - 1 {
                  Label("마지막 페이지", systemImage: "checkmark").font(.footnote)
                    .foregroundStyle(.secondary).padding(.top, 32)
                }
              }.readingPage()
            }.background(Color(uiColor: .systemBackground))
          }.id(post.segments.map(\.id))
          HStack {
            Button {
              page = max(0, page - 1)
              pageRequestRevision += 1
            } label: {
              Label("이전", systemImage: "chevron.left")
            }.disabled(page == 0)
            Spacer()
            Button {
              page = min(post.segments.count - 1, page + 1)
              pageRequestRevision += 1
            } label: {
              Label("다음", systemImage: "chevron.right")
            }.disabled(page >= post.segments.count - 1)
          }.padding(24)
        }
      }.toolbar { ToolbarItem(placement: .navigationBarTrailing) { PostLikeButton(postID: id) } }
    }.modifier(LearningViewport())
      .navigationTitle("읽기").navigationBarTitleDisplayMode(.inline)
  }
}
/// UIKit's public book-turn transition, not a simulated blur or a private Apple API.
/// Only nearby hosting controllers are retained, even for very long articles.
struct BookPageReader<Content: View>: UIViewControllerRepresentable {
  let count: Int
  @Binding var selection: Int
  let reduceMotion: Bool
  var requestRevision: Binding<Int> = .constant(0)
  @ViewBuilder let content: (Int) -> Content

  func makeCoordinator() -> Coordinator { Coordinator(self) }
  func makeUIViewController(context: Context) -> UIPageViewController {
    let controller = UIPageViewController(
      transitionStyle: .pageCurl, navigationOrientation: .horizontal,
      options: [.spineLocation: UIPageViewController.SpineLocation.min.rawValue])
    controller.isDoubleSided = false
    controller.view.backgroundColor = .systemBackground
    controller.view.accessibilityIdentifier = "book.reader"
    controller.delegate = context.coordinator
    controller.dataSource = reduceMotion ? nil : context.coordinator
    if let first = context.coordinator.page(at: selection) {
      controller.setViewControllers([first], direction: .forward, animated: false)
    }
    return controller
  }
  func updateUIViewController(_ controller: UIPageViewController, context: Context) {
    context.coordinator.parent = self
    // Reduce Motion retains explicit Previous/Next controls without a curl gesture.
    controller.dataSource = reduceMotion ? nil : context.coordinator
    context.coordinator.displaySelection(in: controller)
  }
  static func dismantleUIViewController(_ controller: UIPageViewController, coordinator: Coordinator) {
    coordinator.active = false
    coordinator.interactiveStartSelection = nil
    coordinator.pages.removeAll()
    controller.dataSource = nil
    controller.delegate = nil
    controller.view.isUserInteractionEnabled = true
  }

  @MainActor final class Coordinator: NSObject, UIPageViewControllerDataSource, UIPageViewControllerDelegate {
    var parent: BookPageReader
    var pages: [Int: UIHostingController<Content>] = [:]
    var transitioning = false
    var interactiveStartSelection: Int?
    var interactiveStartRequestRevision = 0
    var active = true
    init(_ parent: BookPageReader) { self.parent = parent }
    func page(at index: Int) -> UIHostingController<Content>? {
      guard index >= 0, index < parent.count else { return nil }
      if let cached = pages[index] { return cached }
      let page = UIHostingController(rootView: parent.content(index))
      page.view.backgroundColor = .systemBackground
      pages[index] = page
      return page
    }
    func index(of controller: UIViewController) -> Int? {
      pages.first { $0.value === controller }?.key
    }
    func prune(around index: Int) {
      pages = pages.filter { abs($0.key - index) <= 1 }
    }
    func displaySelection(in controller: UIPageViewController) {
      guard active, !transitioning, parent.count > 0,
        let current = controller.viewControllers?.first.flatMap({ index(of: $0) }) else { return }
      let target = min(max(0, parent.selection), parent.count - 1)
      guard target != current, let next = page(at: target) else { return }
      transitioning = true
      controller.view.isUserInteractionEnabled = false
      controller.setViewControllers([next], direction: target > current ? .forward : .reverse,
        animated: !parent.reduceMotion) { [weak self, weak controller] _ in
          guard let self, self.active, let controller else { return }
          self.transitioning = false
          controller.view.isUserInteractionEnabled = true
          self.prune(around: target)
          // Coalesce rapid button presses after the current UIKit transition completes.
          self.displaySelection(in: controller)
        }
    }
    func pageViewController(_ controller: UIPageViewController,
      viewControllerBefore current: UIViewController) -> UIViewController? {
      guard let index = index(of: current) else { return nil }
      return page(at: index - 1)
    }
    func pageViewController(_ controller: UIPageViewController,
      viewControllerAfter current: UIViewController) -> UIViewController? {
      guard let index = index(of: current) else { return nil }
      return page(at: index + 1)
    }
    func pageViewController(_ controller: UIPageViewController,
      willTransitionTo pendingViewControllers: [UIViewController]) {
      guard active else { return }
      interactiveStartSelection = parent.selection
      interactiveStartRequestRevision = parent.requestRevision.wrappedValue
      transitioning = true
    }
    func pageViewController(_ controller: UIPageViewController, didFinishAnimating finished: Bool,
      previousViewControllers: [UIViewController], transitionCompleted completed: Bool) {
      guard active else { return }
      transitioning = false
      guard let visible = controller.viewControllers?.first, let current = index(of: visible) else { return }
      // A button request made during a gesture wins even when that gesture is cancelled.
      let requested = parent.selection
      let buttonWasPressed = parent.requestRevision.wrappedValue != interactiveStartRequestRevision
        || (interactiveStartSelection.map { requested != $0 } ?? false)
      interactiveStartSelection = nil
      parent.selection = buttonWasPressed ? requested : current
      prune(around: current)
      displaySelection(in: controller)
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
      guard session.user != nil else { session.requireLogin(for: .like); return }
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
  @State private var section = 0
  @State private var search = ""
  var body: some View {
    VStack(spacing: 0) {
      Picker("보관함 분류", selection: $section) {
        Text("답변한 질문").tag(0)
        Text("좋아요한 글").tag(1)
      }.pickerStyle(.segmented).padding(.horizontal, 16).padding(.vertical, 10)
      if section == 0 { AnswerArchiveList(search: search) }
      else { LikedPostArchiveList(search: search) }
    }.navigationTitle("보관함").searchable(text: $search, prompt: "질문, 글 제목, 작가 검색")
  }
}

struct LikedPostArchiveList: View {
  @EnvironmentObject private var session: AppSession
  let search: String
  var body: some View {
    LoadView(load: { () -> LikedPostPage in try await session.api.get("archive/liked-posts") }) { page in
      if page.items.isEmpty {
        EmptyMessage(title: "좋아하는 글을 모아보세요", symbol: "heart",
          detail: "학습에서 글에 좋아요를 누르면 여기에서 다시 읽을 수 있어요")
      } else {
        let filtered = page.items.filter {
          search.isEmpty || ($0.title + " " + $0.philosopherName).localizedCaseInsensitiveContains(search)
        }
        List {
          ForEach(filtered) { post in
            NavigationLink {
              LiveReaderView(id: post.id, author: post.philosopherName)
            } label: {
              HStack(spacing: 14) {
                QuestionArtwork(imageKey: post.imageKey).frame(width: 68, height: 76)
                  .clipShape(RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 6) {
                  Text(post.philosopherName).font(.caption).foregroundStyle(.secondary)
                  Text(post.title).font(.headline).lineLimit(3)
                }.padding(.vertical, 5)
              }.padding(.vertical, 6).contentShape(Rectangle())
            }.accessibilityIdentifier("archive.post.\(post.id)")
          }
          if filtered.isEmpty { Text("검색 결과가 없어요").foregroundStyle(.secondary) }
        }.listStyle(.plain)
      }
    }
  }
}

private struct AnswerArchiveList: View {
  @EnvironmentObject private var session: AppSession
  let search: String
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
    }
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
