import SwiftUI

struct EthicaPreviewApp: App { 
    @StateObject private var store = MockStore()
    var body: some Scene {
        WindowGroup { RootView().environmentObject(store).tint(.blue) }
    }
}

struct RootView: View {
    @EnvironmentObject private var store: MockStore
    @State private var selected = 0
    @State private var settings = false
    @State private var widgetPreview = ProcessInfo.processInfo.arguments.contains("-design-widgets")
    var showAdmin = false
    init(initialTab: Int = 0, showAdmin: Bool = false) { _selected = State(initialValue: initialTab); self.showAdmin = showAdmin }
    var body: some View {
        TabView(selection: $selected) {
            NavigationStack { TodayView(openAnalysis: { store.analysisSection = 1; store.analysisPeriod = 0; selected = 1 }).toolbar { profileButton } }
                .tabItem { Label("오늘", systemImage: "sun.max") }.tag(0)
            NavigationStack { AnalysisView(openToday: { selected = 0 }).toolbar { profileButton } }
                .tabItem { Label("분석", systemImage: "chart.bar.xaxis") }.tag(1)
            NavigationStack { PreviewLearningCatalogView().toolbar { profileButton } }
                .tabItem { Label("학습", systemImage: "books.vertical") }.tag(2)
            NavigationStack { ArchiveView().toolbar { profileButton } }
                .tabItem { Label("보관함", systemImage: "tray") }.tag(3)
            if showAdmin {
                NavigationStack { AdminHomeView() }
                    .tabItem { Label("관리", systemImage: "slider.horizontal.3") }.tag(4)
            }
        }
        .sheet(isPresented: $settings) { SettingsView() }
        .sheet(isPresented: $widgetPreview) {
            NavigationStack {
                NotificationWidgetGallery(notificationsEnabled: store.notificationsEnabled)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { widgetPreview = false } } }
            }
        }
        .onAppear {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("-profile") { selected = 2 }
            #endif
        }
    }
    @ToolbarContentBuilder private var profileButton: some ToolbarContent {
        ToolbarItem(placement: .navigationBarTrailing) {
            Button { settings = true } label: { AccountAvatar(avatarID: store.profileAvatarID).frame(width: 28, height: 28) }
                .accessibilityLabel("내 계정")
        }
    }
}

struct TodayView: View {
    var openAnalysis: (() -> Void)? = nil
    @EnvironmentObject private var store: MockStore
    @State private var showFollowup = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text(Date.now.formatted(.dateTime.month().day().weekday()))
                    .font(.subheadline).foregroundStyle(.secondary)
                QuestionArtwork(assetName: "archive-truth")
                    .aspectRatio(1.65, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 22))
                HStack {
                    Text("윤리 · 관계")
                    Spacer()
                    if store.completedAnswer != nil { Label("답변 완료", systemImage: "checkmark.circle.fill") }
                }.font(.caption).foregroundStyle(.secondary)
                Text(Library.question).font(.title2.bold())
                    .fixedSize(horizontal: false, vertical: true)
                if let answer = store.completedAnswer {
                    Label(Library.answers[answer], systemImage: "checkmark.circle.fill")
                        .font(.headline)
                    DisclosureGroup("해설 보기") {
                        Text(store.explanation).font(.body).foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading).padding(.top, 10)
                    }.font(.subheadline)
                    HStack {
                        Spacer()
                        if let openAnalysis { Button("성향 변화 보기", action: openAnalysis).buttonStyle(.bordered) }
                    }
                } else if store.answer != nil {
                    Text("질문 2 / 2").font(.caption).foregroundStyle(.secondary)
                    Text("그 친구가 당신에게 거짓말했어도 보호할 건가요?").font(.headline)
                    ForEach(0..<2) { index in
                        ChoiceButton(text: Library.followups[index]) { store.submitFollowup(index) }
                    }
                } else {
                    VStack(spacing: 12) {
                        ForEach(0..<2) { index in
                            ChoiceButton(text: Library.answers[index]) { store.submit(index) }
                        }
                    }
                }
                Divider()
                let person = Library.thinkers[store.answer == 1 ? 1 : 0]
                NavigationLink { PhilosopherView(person: person) } label: {
                    HStack(spacing: 14) {
                        ContentPortrait(imageKey: nil, name: person.name)
                            .frame(width: 54, height: 54).clipShape(Circle())
                        VStack(alignment: .leading, spacing: 4) {
                            Text(store.answer == nil ? "오늘의 철학자" : "이 선택과 닿은 철학자")
                                .font(.caption).foregroundStyle(.secondary)
                            Text(person.name).font(.headline)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").font(.caption).foregroundStyle(.secondary)
                    }.foregroundStyle(.primary)
                }.buttonStyle(.plain)
                Label("다음 질문 · 내일 \(store.dailyTime.formatted(date: .omitted, time: .shortened))", systemImage: "clock")
                    .font(.caption).foregroundStyle(.secondary)
            }.padding(.horizontal, 24).padding(.bottom, 28)
        }.navigationTitle("오늘").sheet(isPresented: $showFollowup) { FollowupView() }
          .onChange(of: store.answer) { if $0 != nil && store.followup == nil { showFollowup = true } }
          .onAppear { if store.answer != nil && store.followup == nil { showFollowup = true } }
    }
}

struct PrimaryAction: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.headline).frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(Color(uiColor: .systemBackground))
            .background(Color.primary.opacity(configuration.isPressed ? 0.7 : 1), in: Capsule())
    }
}

struct Portrait: View {
    private static let portrait = Bundle.main.url(forResource: "kant", withExtension: "jpg")
        .flatMap { UIImage(contentsOfFile: $0.path) }
    var body: some View {
        if let portrait = Self.portrait {
            Image(uiImage: portrait).resizable().scaledToFill().accessibilityLabel("이마누엘 칸트의 초상")
        } else {
            Image(systemName: "person.crop.circle").resizable().scaledToFit().accessibilityLabel("이마누엘 칸트")
        }
    }
}

struct PhilosopherView: View {
    var person: PreviewThinker = Library.thinkers[0]
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var biography = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(alignment: .center, spacing: 24) {
                    ContentPortrait(imageKey: nil, name: person.name).frame(width: 100, height: 100).clipShape(Circle())
                    VStack(alignment: .leading, spacing: 7) {
                        Text(person.name).font(.title2.bold())
                        Text(person.school).font(.subheadline).foregroundStyle(.secondary)
                        Text(person.era).font(.caption).foregroundStyle(.secondary)
                    }
                }
                VStack(alignment: .leading, spacing: 10) {
                    Text(person.tagline).font(.title3.weight(.medium))

                }
                Button { biography = true } label: {
                    HStack { Text("생각과 삶"); Spacer(); Image(systemName: "arrow.up.right") }
                        .font(.subheadline.weight(.semibold)).padding(15)
                        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                }.buttonStyle(.plain)
                HStack {
                    Label("게시물", systemImage: "square.grid.2x2").font(.subheadline.weight(.semibold))
                    Spacer()
                    Text("\(person.essays.count)개의 글").font(.caption).foregroundStyle(.secondary)
                }.padding(.top, 8)
            }.padding(.horizontal, 22).padding(.top, 16).padding(.bottom, 18)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 3), count: typeSize.isAccessibilitySize ? 1 : 2), spacing: 3) {
                ForEach(person.essays) { essay in
                    NavigationLink { ReaderView(essay: essay, author: person.name) } label: { EssayCover(essay: essay) }
                        .buttonStyle(.plain).accessibilityLabel(essay.title.replacingOccurrences(of: "\n", with: " ") + ", " + essay.subtitle)
                }
            }.padding(.horizontal, 4).padding(.bottom, 24)
        }
        .navigationTitle(person.name).navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $biography) {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        ContentPortrait(imageKey: nil, name: person.name).frame(height: 270).clipped()
                        Text(person.tagline).font(.title.bold())
                        Text(person.coreThought).lineSpacing(6)
                        Text("사상의 뿌리").font(.title2.bold())
                        Text(person.lifeRoots).lineSpacing(6)
                        Text("Ethica 편집 · 학습용 소개").font(.caption).foregroundStyle(.secondary)
                    }.padding(24)
                }.navigationTitle("생각과 삶").navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { biography = false } } }
            }
        }
    }
}

struct EssayCover: View {
    let essay: Essay
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack { Text(String(format: "%02d", essay.id % 100)).font(.caption.monospaced()); Spacer(); Image(systemName: "square.on.square").font(.caption) }.opacity(0.7)
            Spacer(minLength: 12)
            Image(systemName: essay.symbol).font(.system(size: 32, weight: .ultraLight)).accessibilityHidden(true)
            Text(essay.title).font(.system(.title2, design: .serif, weight: .medium)).fixedSize(horizontal: false, vertical: true)
            Text(essay.subtitle).font(.caption)
        }.padding(20).frame(maxWidth: .infinity, minHeight: 240, alignment: .leading)
            .foregroundStyle(Color(white: 0.08)).background(essay.color)
    }
}

struct ReaderView: View {
    let essay: Essay
    var author = "이마누엘 칸트"
    @State private var page = 0
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                ContentPortrait(imageKey: nil, name: author).frame(width: 32, height: 32).clipShape(Circle())
                VStack(alignment: .leading, spacing: 2) { Text(author).font(.subheadline.bold()); Text("Ethica 편집 · \(essay.subtitle)").font(.caption).foregroundStyle(.secondary) }
                Spacer()
                Text("\(page + 1) / \(essay.pages.count)").font(.caption.monospacedDigit()).foregroundStyle(.secondary)
            }.padding(22)
            TabView(selection: $page) {
                ForEach(essay.pages.indices, id: \.self) { index in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 32) {
                            Text(essay.subtitle.uppercased()).font(.caption.weight(.semibold)).tracking(2).foregroundStyle(.secondary)
                            Text(index == 0 ? essay.title : index == essay.pages.count - 1 ? "당신의 생각은\n어떤가요?" : "조금 더\n생각해 보면").font(.system(.largeTitle, design: .serif, weight: .medium))
                            Text(essay.pages[index]).font(.title3).lineSpacing(10)
                            Divider()
                            Text("사상을 풀어 쓴 학습용 글입니다").font(.caption).foregroundStyle(.secondary)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(28)
                    }.tag(index)
                }
            }.tabViewStyle(.page(indexDisplayMode: .never))
            HStack {
                Button("이전") { page -= 1 }.disabled(page == 0)
                Spacer()
                HStack(spacing: 6) { ForEach(essay.pages.indices, id: \.self) { index in Circle().fill(index == page ? Color.primary : Color.secondary.opacity(0.25)).frame(width: 5, height: 5) } }.accessibilityHidden(true)
                Spacer()
                Button("다음") { page += 1 }.disabled(page == essay.pages.count - 1)
            }.font(.subheadline).padding(24)
        }.navigationTitle(essay.subtitle).navigationBarTitleDisplayMode(.inline)
    }
}

struct FollowupView: View {
    @EnvironmentObject private var store: MockStore
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    Text("상대가 바뀐다면?").font(.largeTitle.bold())
                    Text("그 친구가 당신에게 똑같이 거짓말을 했어도 보호할 건가요?").font(.title3).lineSpacing(6)
                    if let followup = store.followup {
                        Label(Library.followups[followup], systemImage: "checkmark.circle").font(.headline)
                        Text("관계에 따라 달라지는 판단도 나를 이해하는 단서가 됩니다. 이 답변은 사상 구성 비율에는 반영되지 않아요").foregroundStyle(.secondary)
                    } else {
                        ForEach(0..<2) { index in
                            Button(Library.followups[index]) { store.submitFollowup(index); dismiss() }.buttonStyle(PrimaryAction())
                        }
                        Text("마지막 답변까지 고르면 완료돼요").font(.footnote).foregroundStyle(.secondary)
                    }
                }.padding(24)
            }.navigationTitle("질문 2 / 2").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("나중에") { dismiss() } } }
        }
    }
}

struct AnalysisView: View {
    var openToday: (() -> Void)? = nil
    var body: some View { PreviewInsightsView(openToday: openToday) }
}

struct ArchiveView: View {
    var body: some View { PreviewArchiveGrid() }
}

struct SettingsView: View {
    var body: some View { NavigationStack { PreviewAccountView() } }
}

struct PreviewLearningCatalogView: View {
    @State private var search = ""
    private var people: [PreviewThinker] {
        Library.thinkers.filter { search.isEmpty || ($0.name + $0.school).localizedCaseInsensitiveContains(search) }
    }
    var body: some View {
        List {
            Section("철학자 둘러보기") {
                ForEach(people) { person in
                    NavigationLink { PhilosopherView(person: person) } label: {
                        HStack(spacing: 16) {
                            ContentPortrait(imageKey: nil, name: person.name)
                                .frame(width: 58, height: 58).clipShape(Circle())
                            VStack(alignment: .leading, spacing: 5) {
                                Text(person.name).font(.headline)
                                Text(person.school).font(.subheadline).foregroundStyle(.secondary)
                                Text(person.tagline).font(.caption).foregroundStyle(.secondary)
                            }
                        }.padding(.vertical, 8)
                    }
                }
                if people.isEmpty { Text("검색 결과가 없어요").foregroundStyle(.secondary) }
            }
        }.listStyle(.plain).navigationTitle("학습")
            .searchable(text: $search, prompt: "철학자, 학파")
    }
}
