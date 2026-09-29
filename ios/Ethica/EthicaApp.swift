import SwiftUI

@main struct EthicaApp: App {
    @StateObject private var store = MockStore()
    var body: some Scene {
        WindowGroup { RootView().environmentObject(store).tint(.primary) }
    }
}

struct RootView: View {
    @State private var selected = 0
    @State private var settings = false
    var body: some View {
        TabView(selection: $selected) {
            NavigationStack { TodayView().toolbar { profileButton } }
                .tabItem { Label("오늘", systemImage: "sun.max") }.tag(0)
            NavigationStack { AnalysisView().toolbar { profileButton } }
                .tabItem { Label("분석", systemImage: "chart.bar.xaxis") }.tag(1)
            NavigationStack { PhilosopherView().toolbar { profileButton } }
                .tabItem { Label("학습", systemImage: "books.vertical") }.tag(2)
            NavigationStack { ArchiveView().toolbar { profileButton } }
                .tabItem { Label("보관함", systemImage: "tray") }.tag(3)
        }
        .sheet(isPresented: $settings) { SettingsView() }
        .onAppear {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("-profile") { selected = 2 }
            #endif
        }
    }
    @ToolbarContentBuilder private var profileButton: some ToolbarContent {
        ToolbarItem(placement: .navigationBarTrailing) {
            Button { settings = true } label: { Image(systemName: "person.crop.circle").font(.title3) }
                .accessibilityLabel("내 계정")
        }
    }
}

struct TodayView: View {
    @EnvironmentObject private var store: MockStore
    @State private var showFollowup = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 30) {
                Text(Date.now.formatted(.dateTime.month(.wide).day().weekday(.wide)))
                    .font(.subheadline).foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 24) {
                    HStack {
                        Label(store.answer == nil ? "오늘의 질문" : "오늘의 생각", systemImage: store.answer == nil ? "quote.opening" : "checkmark.circle.fill")
                        Spacer()
                        Text("윤리 · 관계")
                    }.font(.caption.weight(.medium)).foregroundStyle(.secondary)
                    Text(Library.question).font(.system(.largeTitle, design: .serif, weight: .medium))
                        .fixedSize(horizontal: false, vertical: true).lineSpacing(5)
                    Text("친구의 거짓말을 알게 됐어요.\n사실을 말하면 친구가 크게 상처받습니다.")
                        .font(.body).foregroundStyle(.secondary).lineSpacing(5)
                    if let answer = store.answer {
                        Label(Library.answers[answer], systemImage: "checkmark").font(.headline)
                        Text(store.explanation).font(.body).lineSpacing(5)
                        if store.followup == nil {
                            Button("한 걸음 더 생각하기", systemImage: "arrow.right") { showFollowup = true }
                                .buttonStyle(PrimaryAction())
                            Text("오늘의 답변은 기록됐어요. 추가 질문은 선택이에요.")
                                .font(.caption).foregroundStyle(.secondary)
                        } else {
                            Label("추가 질문까지 생각했어요", systemImage: "checkmark.circle")
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                    } else {
                        VStack(spacing: 10) {
                            ForEach(0..<2) { index in
                                Button { store.submit(index) } label: {
                                    HStack(spacing: 14) {
                                        Text(index == 0 ? "A" : "B").font(.caption.monospaced()).foregroundStyle(.secondary)
                                        Text(Library.answers[index]).font(.body.weight(.medium))
                                        Spacer()
                                        Image(systemName: "arrow.up.right").font(.caption)
                                    }.padding(18).frame(maxWidth: .infinity, minHeight: 56)
                                        .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
                                }.buttonStyle(.plain)
                            }
                        }
                        Text("정답보다, 당신의 이유가 궁금해요.").font(.caption).foregroundStyle(.secondary)
                    }
                }
                .padding(24).background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 26))
                VStack(alignment: .leading, spacing: 16) {
                    HStack { Text("질문 너머의 사람").font(.title3.bold()); Spacer(); Text("읽어보기").font(.caption).foregroundStyle(.secondary) }
                    NavigationLink { PhilosopherView() } label: {
                        HStack(spacing: 18) {
                            Portrait().frame(width: 76, height: 88).clipShape(RoundedRectangle(cornerRadius: 12))
                            VStack(alignment: .leading, spacing: 7) {
                                Text("이마누엘 칸트").font(.headline)
                                Text("옳은 선택은 어디에서 시작될까").font(.subheadline).foregroundStyle(.secondary)
                                Text("의무론 · 18세기").font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                        }.foregroundStyle(.primary)
                    }.buttonStyle(.plain)
                }
                Divider()
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "sunrise").font(.title3)
                    VStack(alignment: .leading, spacing: 5) {
                        Text("매일, 생각할 틈 하나").font(.subheadline.weight(.medium))
                        Text("내일도 \(store.dailyTime.formatted(date: .omitted, time: .shortened))에 새로운 질문이 찾아와요.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
            }.padding(.horizontal, 22).padding(.top, 4).padding(.bottom, 32)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("오늘").sheet(isPresented: $showFollowup) { FollowupView() }
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
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var biography = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(alignment: .center, spacing: 24) {
                    Portrait().frame(width: 100, height: 100).clipShape(Circle())
                    VStack(alignment: .leading, spacing: 7) {
                        Text("이마누엘 칸트").font(.title2.bold())
                        Text("Immanuel Kant").font(.subheadline).foregroundStyle(.secondary)
                        Text("1724–1804 · 쾨니히스베르크").font(.caption).foregroundStyle(.secondary)
                    }
                }
                VStack(alignment: .leading, spacing: 10) {
                    Text("무엇을 해야 하는가.").font(.title3.weight(.medium))
                    Text("결과를 넘어, 선택의 이유를 묻습니다.\n스스로 생각하고 원칙을 세우는 삶에 관하여.")
                        .font(.subheadline).foregroundStyle(.secondary).lineSpacing(4)
                    HStack(spacing: 6) {
                        Text("의무론"); Text("·"); Text("계몽주의")
                    }.font(.caption.weight(.medium)).foregroundStyle(.secondary)
                }
                Button { biography = true } label: {
                    HStack { Text("이 사람의 생각과 삶"); Spacer(); Image(systemName: "arrow.up.right") }
                        .font(.subheadline.weight(.semibold)).padding(15)
                        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                }.buttonStyle(.plain)
                HStack {
                    Label("게시물", systemImage: "square.grid.2x2").font(.subheadline.weight(.semibold))
                    Spacer()
                    Text("\(Library.essays.count)개의 글").font(.caption).foregroundStyle(.secondary)
                }.padding(.top, 8)
            }.padding(.horizontal, 22).padding(.top, 16).padding(.bottom, 18)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 3), count: typeSize.isAccessibilitySize ? 1 : 2), spacing: 3) {
                ForEach(Library.essays) { essay in
                    NavigationLink { ReaderView(essay: essay) } label: { EssayCover(essay: essay) }
                        .buttonStyle(.plain).accessibilityLabel(essay.title.replacingOccurrences(of: "\n", with: " ") + ", " + essay.subtitle)
                }
            }.padding(.horizontal, 4).padding(.bottom, 24)
        }
        .navigationTitle("칸트").navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $biography) {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        Portrait().frame(height: 270).clipped()
                        Text("생각의 기준을 세우는 일").font(.title.bold())
                        Text("칸트는 행동의 결과뿐 아니라 그 행동을 선택하는 원칙을 중요하게 봅니다. 내가 세운 원칙을 다른 사람에게도 적용할 수 있는지, 상대를 단순한 수단으로만 대하지 않는지 묻습니다.").lineSpacing(6)
                        Text("사상의 뿌리").font(.title2.bold())
                        Text("칸트는 쾨니히스베르크를 중심으로 연구하고 가르쳤습니다. 이성으로 무엇을 알 수 있는지, 어떻게 행동해야 하는지 탐구했습니다.").lineSpacing(6)
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
            HStack { Text(String(format: "%02d", essay.id - 300)).font(.caption.monospaced()); Spacer(); Image(systemName: "square.on.square").font(.caption) }.opacity(0.7)
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
    @State private var page = 0
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Portrait().frame(width: 32, height: 32).clipShape(Circle())
                VStack(alignment: .leading, spacing: 2) { Text("이마누엘 칸트").font(.subheadline.bold()); Text("Ethica 편집 · \(essay.subtitle)").font(.caption).foregroundStyle(.secondary) }
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
                            Text("사상을 풀어 쓴 학습용 글입니다.").font(.caption).foregroundStyle(.secondary)
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
                    Text("관계가 바뀌어도\n선택은 같을까요?").font(.largeTitle.bold())
                    Text("그 친구가 당신에게 똑같이 거짓말을 했어도 보호할 건가요?").font(.title3).lineSpacing(6)
                    if let followup = store.followup {
                        Label(Library.followups[followup], systemImage: "checkmark.circle").font(.headline)
                        Text("관계에 따라 달라지는 판단도 나를 이해하는 단서가 됩니다. 이 답변은 사상 구성 비율에는 반영되지 않아요.").foregroundStyle(.secondary)
                    } else {
                        ForEach(0..<2) { index in
                            Button(Library.followups[index]) { store.submitFollowup(index) }.buttonStyle(PrimaryAction())
                        }
                        Text("추가 질문은 선택이에요. 오늘의 첫 답은 이미 기록됐어요.").font(.footnote).foregroundStyle(.secondary)
                    }
                }.padding(24)
            }.navigationTitle("한 걸음 더").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
        }
    }
}

struct AnalysisView: View {
    @EnvironmentObject private var store: MockStore
    var body: some View {
        List {
            Section {
                Text("답할수록\n또렷해지는 나").font(.largeTitle.bold()).padding(.vertical, 16)
                Text("서로 다른 상황에서 어떤 가치를 선택하는지 돌아보세요.").foregroundStyle(.secondary)
            }
            Section("오늘의 선택") {
                if store.answer != nil {
                    Text(store.explanation)
                    NavigationLink("칸트의 생각 읽기") { PhilosopherView() }
                } else { Text("오늘의 질문에 답하면 선택을 돌아볼 수 있어요.").foregroundStyle(.secondary) }
            }
            Section { Text("누적 비율과 모순 분석은 다음 구현에서 연결합니다.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle("분석")
    }
}

struct ArchiveView: View {
    @EnvironmentObject private var store: MockStore
    var body: some View {
        List {
            if let answer = store.answer {
                Section("오늘") {
                    NavigationLink {
                        List {
                            Section("질문") { Text(Library.question.replacingOccurrences(of: "\n", with: " ")) }
                            Section("나의 답") { Text(Library.answers[answer]); Text(store.explanation).foregroundStyle(.secondary) }
                            if let followup = store.followup { Section("추가 답변") { Text(Library.followups[followup]) } }
                        }.navigationTitle("그날의 생각").navigationBarTitleDisplayMode(.inline)
                    } label: {
                        VStack(alignment: .leading, spacing: 8) { Text("친구를 위한 거짓말").font(.headline); Text(Library.answers[answer]).font(.subheadline).foregroundStyle(.secondary) }.padding(.vertical, 8)
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 14) { Image(systemName: "tray").font(.largeTitle); Text("생각이 머무는 곳").font(.title2.bold()); Text("오늘의 질문에 답하면 이곳에 남아요.").foregroundStyle(.secondary) }.padding(.vertical, 30).listRowBackground(Color.clear)
            }
        }.navigationTitle("보관함")
    }
}

struct SettingsView: View {
    @EnvironmentObject private var store: MockStore
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            Form {
                Section("프로필") { TextField("닉네임", text: $store.name) }
                Section("일일 질문") { DatePicker("질문 시각", selection: $store.dailyTime, displayedComponents: .hourAndMinute) }
                Section { Text("현재 화면은 목업 데이터로 동작합니다. 계정·알림은 실제 서버에 연결되지 않습니다.").font(.footnote).foregroundStyle(.secondary) }
                #if DEBUG
                Section("미리보기") { Button("오늘의 답변 초기화", role: .destructive) { store.reset() } }
                #endif
            }.navigationTitle("내 계정").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } } }
        }
    }
}
