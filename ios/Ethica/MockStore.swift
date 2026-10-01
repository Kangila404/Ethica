import SwiftUI

struct Essay: Identifiable {
    let id: Int
    let title: String
    let subtitle: String
    let color: Color
    let symbol: String
    let pages: [String]
}

enum Library {
    // Original editorial sample copy, not attributed historical quotations.
    static let essays: [Essay] = [
        Essay(id: 301, title: "선의에도\n기준이 있을까", subtitle: "선의지", color: Color(red: 0.73, green: 0.66, blue: 0.52), symbol: "sun.max", pages: ["누군가를 돕는 같은 행동에도 서로 다른 이유가 있을 수 있습니다. 칭찬을 받기 위해서일 수도, 그것이 옳다고 생각해서일 수도 있죠.", "칸트의 윤리에서 중요한 것은 결과만이 아닙니다. 무엇을 했는지와 함께, 어떤 이유로 그것을 선택했는지 묻습니다.", "아무도 알아주지 않아도 같은 선택을 할까요? 오늘의 행동 하나를 떠올려 보세요."]),
        Essay(id: 302, title: "모두가 그렇게\n행동한다면", subtitle: "정언명령", color: Color(red: 0.43, green: 0.52, blue: 0.51), symbol: "arrow.triangle.branch", pages: ["나에게만 허용하고 싶은 예외가 있나요? 칸트의 질문은 그 예외를 모두의 규칙으로 바꿔 보는 데서 시작합니다.", "약속을 지키기 싫을 때마다 누구나 약속을 깨도 된다면, 약속이라는 행위는 여전히 의미가 있을까요?", "어떤 원칙을 선택할 때, 다른 모든 사람도 그 원칙에 따라 행동할 수 있을지 생각해 보세요."]),
        Essay(id: 303, title: "사람은\n수단이 아니다", subtitle: "인간의 존엄", color: Color(red: 0.59, green: 0.43, blue: 0.35), symbol: "person.2", pages: ["도움을 주고받는 관계에서도 상대를 오직 내 목적을 위한 도구로만 대하지 않을 수 있습니다.", "상대에게 충분히 설명하고, 스스로 선택할 여지를 남기는 일. 존중은 이런 작은 행동에서 드러납니다.", "오늘 누군가에게 부탁한다면, 그 사람의 선택도 존중하고 있는지 돌아보세요."]),
        Essay(id: 304, title: "스스로\n생각하는 용기", subtitle: "계몽", color: Color(red: 0.40, green: 0.45, blue: 0.57), symbol: "spark", pages: ["익숙한 답을 따르는 일은 편안합니다. 하지만 익숙하다는 이유만으로 옳은 답이 되지는 않습니다.", "다른 사람의 판단을 듣되 내 판단을 포기하지 않는 것. 사유는 질문을 멈추지 않는 데서 시작됩니다."]),
        Essay(id: 305, title: "자유와\n책임 사이", subtitle: "자율", color: Color(red: 0.50, green: 0.48, blue: 0.39), symbol: "bird", pages: ["하고 싶은 대로 하는 것과 스스로 원칙을 세우는 것은 어떻게 다를까요?", "내가 선택한 원칙에 책임을 지는 일도 자유를 이해하는 한 가지 방법입니다."]),
        Essay(id: 306, title: "한 번의\n산책처럼", subtitle: "생각의 연습", color: Color(red: 0.40, green: 0.51, blue: 0.43), symbol: "leaf", pages: ["잠시 걸음을 늦추고 오늘의 선택을 떠올려 보세요. 철학은 일상과 멀리 떨어져 있지 않습니다.", "정답을 급하게 찾기보다, 왜 그렇게 생각하는지 자신에게 설명해 보세요."])
    ]
    static let question = "친구를 지키기 위한\n거짓말도 잘못일까요?"
    static let answers = ["진실을 말한다", "친구를 보호한다"]
    static let followups = ["그래도 보호한다", "이번에는 진실을 말한다"]
}

@MainActor final class MockStore: ObservableObject {
    @Published private(set) var answer: Int?
    @Published private(set) var followup: Int?
    @Published var name = "나"
    @Published var profileAvatarID: String? = UserDefaults.standard.string(forKey: "ethica.design.profileAvatarID") {
        didSet {
            if let profileAvatarID { UserDefaults.standard.set(profileAvatarID, forKey: "ethica.design.profileAvatarID") }
            else { UserDefaults.standard.removeObject(forKey: "ethica.design.profileAvatarID") }
        }
    }
    @Published var notificationsEnabled = true
    @Published var analysisPreviewReady = false
    @Published var analysisSection = 0
    @Published var analysisPeriod = 1
    @Published var dailyTime = Calendar.current.date(from: DateComponents(hour: 8)) ?? Date()
    var completedAnswer: Int? { followup == nil ? nil : answer }
    func submit(_ index: Int) { guard answer == nil else { return }; answer = index }
    func submitFollowup(_ index: Int) { guard answer != nil, followup == nil else { return }; followup = index; analysisPreviewReady = false }
    func reset() { answer = nil; followup = nil; analysisPreviewReady = false }
    var explanation: String {
        answer == 0 ? "진실을 지키는 원칙에 무게를 두었어요. 칸트의 의무론과 이어지는 선택입니다." : "친구에게 미칠 영향을 먼저 생각했어요. 원칙과 관계 사이에서 무엇을 지킬지 고민한 선택입니다."
    }
}

// Local editorial previews; production profiles are supplied by the catalog API.
struct PreviewThinker: Identifiable {
  let id: String
  let name: String
  let school: String
  let era: String
  let tagline: String
  let coreThought: String
  let lifeRoots: String
  let essays: [Essay]
}
extension Library {
  static let thinkers: [PreviewThinker] = [
PreviewThinker(id: "kant", name: "이마누엘 칸트", school: "의무론", era: "1724–1804", tagline: "선택의 원칙을 묻습니다.", coreThought: "내 선택의 원칙을 다른 사람에게도 적용할 수 있을까. 사람을 목적을 위한 도구로만 대하지 않고, 스스로 판단하는 존재로 존중하는 윤리를 탐구했습니다.", lifeRoots: "프로이센의 쾨니히스베르크에서 활동한 철학자입니다. 이성과 자율성을 바탕으로 도덕적 의무를 설명하려 했습니다. 《도덕형이상학 정초》는 그 문제의식을 담은 저작입니다.", essays: Library.essays),
PreviewThinker(id: "mill", name: "존 스튜어트 밀", school: "공리주의", era: "1806–1873", tagline: "행복과 자유를 함께 생각합니다.", coreThought: "선택이 사람들의 행복과 고통에 어떤 차이를 만드는지 살폈습니다. 개인의 자유와 다양한 삶의 방식도 중요하게 다루며, 행복을 단순한 즐거움의 양으로만 보지 않았습니다.", lifeRoots: "영국의 철학자이자 사회 개혁가입니다. 《공리주의》와 《자유론》에서 공동의 행복과 개인의 자유가 어떻게 함께 성립할 수 있는지 탐구했습니다.", essays: [
Essay(id: 501, title: "행복을\n선택할 때", subtitle: "공리주의", color: Color(red: 0.56, green: 0.63, blue: 0.625), symbol: "sun.max", pages: ["같은 선택도 사람마다 다른 영향을 줍니다. 누구의 즐거움과 어려움을 함께 살펴야 할까요?", "밀은 행복을 단순한 즐거움의 양으로만 보지 않았습니다. 어떤 삶의 경험이 더 가치 있는지도 생각해보세요."]),
Essay(id: 502, title: "내 자유의\n경계", subtitle: "자유", color: Color(red: 0.56, green: 0.63, blue: 0.625), symbol: "bird", pages: ["각자의 삶을 선택할 자유는 어디까지일까요?", "다른 사람에게 해를 끼치는 일과, 그저 다른 방식으로 사는 일을 구별해보세요."])
]),
PreviewThinker(id: "aristotle", name: "아리스토텔레스", school: "덕 윤리", era: "기원전 384–322년", tagline: "좋은 삶은 작은 습관에서 시작됩니다.", coreThought: "좋은 삶은 어떤 사람이 되어 가는가와 연결됩니다. 상황을 분별하는 실천적 지혜와 반복된 행동으로 길러지는 성품을 중시했습니다.", lifeRoots: "고대 그리스의 철학자로 플라톤의 아카데미아에서 공부하고 리케이온에서 가르쳤습니다. 《니코마코스 윤리학》에서 덕, 우정, 공동체 속의 좋은 삶을 다뤘습니다.", essays: [
Essay(id: 601, title: "좋은 삶을\n연습하기", subtitle: "덕 윤리", color: Color(red: 0.6, green: 0.63, blue: 0.6), symbol: "leaf", pages: ["어떤 사람이 되고 싶은가요? 좋은 삶은 한 번의 선택보다 반복되는 행동과 연결됩니다.", "오늘 반복하고 싶은 작은 행동 하나를 골라보세요."]),
Essay(id: 602, title: "상황을 읽는\n지혜", subtitle: "실천적 지혜", color: Color(red: 0.6, green: 0.63, blue: 0.6), symbol: "eye", pages: ["같은 말도 언제, 누구에게 하는지에 따라 달라집니다.", "규칙뿐 아니라 지금의 상황과 상대를 함께 살피는 판단을 연습해보세요."])
]),
PreviewThinker(id: "rawls", name: "존 롤스", school: "정의론", era: "1921–2002", tagline: "누구에게나 공정한 규칙을 찾습니다.", coreThought: "내가 어떤 처지에 놓일지 모른다면 어떤 사회 규칙에 동의할까. 평등한 기본적 자유와 공정한 기회를 토대로, 가장 불리한 처지의 사람도 고려하는 제도를 탐구했습니다.", lifeRoots: "미국의 정치철학자로 하버드대학교에서 오랫동안 가르쳤습니다. 《정의론》에서 사회의 기본 제도를 공정하게 구성하는 원칙을 제시했습니다.", essays: [
Essay(id: 701, title: "내 처지를\n모른다면", subtitle: "정의론", color: Color(red: 0.64, green: 0.63, blue: 0.575), symbol: "scalemass", pages: ["어떤 가정에서 태어날지, 어떤 능력을 갖게 될지 모른다면 어떤 규칙을 고를까요?", "나에게 유리한지보다 누구라도 받아들일 수 있는지 물어보세요."]),
Essay(id: 702, title: "기회의\n출발선", subtitle: "공정한 기회", color: Color(red: 0.64, green: 0.63, blue: 0.575), symbol: "person.2", pages: ["같은 문이 열려 있어도 그 문까지 가는 길은 다를 수 있습니다.", "누가 어떤 장벽을 만나는지 살펴보는 것부터 시작해보세요."])
]),
PreviewThinker(id: "epictetus", name: "에픽테토스", school: "스토아 철학", era: "약 50–135년", tagline: "내가 바꿀 수 있는 일에 집중합니다.", coreThought: "내 판단과 선택, 내 뜻대로 되지 않는 결과를 구별합니다. 외부의 평가에 삶 전체를 맡기기보다 자신이 책임질 수 있는 태도와 행동에 힘을 기울입니다.", lifeRoots: "로마 시대의 스토아 철학자입니다. 노예 신분을 겪은 뒤 철학을 가르쳤으며, 가르침은 제자 아리아노스가 기록한 《담화록》과 《엥케이리디온》을 통해 전해집니다.", essays: [
Essay(id: 801, title: "내가 바꿀 수\n있는 것", subtitle: "스토아 철학", color: Color(red: 0.68, green: 0.63, blue: 0.55), symbol: "scope", pages: ["결과나 타인의 평가는 내 뜻대로 되지 않을 때가 많습니다.", "그 안에서도 내 판단과 행동은 어떻게 선택할 수 있을까요?"]),
Essay(id: 802, title: "평가와 나를\n구별하기", subtitle: "판단", color: Color(red: 0.68, green: 0.63, blue: 0.55), symbol: "wind", pages: ["좋은 평가를 받지 못했다고 내 삶 전체가 실패한 것은 아닙니다.", "이미 일어난 결과와 지금 할 수 있는 행동을 나누어 생각해보세요."])
]),
  ]
}
