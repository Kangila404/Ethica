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
    @Published var dailyTime = Calendar.current.date(from: DateComponents(hour: 8)) ?? Date()
    func submit(_ index: Int) { guard answer == nil else { return }; answer = index }
    func submitFollowup(_ index: Int) { guard answer != nil, followup == nil else { return }; followup = index }
    func reset() { answer = nil; followup = nil }
    var explanation: String {
        answer == 0 ? "진실을 지키는 원칙에 무게를 두었어요. 칸트의 의무론과 이어지는 선택입니다." : "친구에게 미칠 영향을 먼저 생각했어요. 원칙과 관계 사이에서 무엇을 지킬지 고민한 선택입니다."
    }
}
