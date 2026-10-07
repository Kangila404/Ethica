#if DEBUG
  import SwiftUI

  /// A design-only session. Its transport handles every request locally and never opens a socket.
  struct OnboardingDesignPreview: View {
    @StateObject private var session: AppSession
    @StateObject private var mockStore = MockStore()
    @State private var ready = false
    @State private var revision = UUID()
    @State private var showTime = false
    @State private var showLearning = false
    @State private var showInsights = false
    @State private var showArchive = false
    @State private var showCelebration = false
    @State private var previewTime = Calendar.current.date(from: DateComponents(hour: 8)) ?? .now

    init() {
      let config = URLSessionConfiguration.ephemeral
      config.protocolClasses = [OnboardingPreviewTransport.self]
      let api = APIClient(
        baseURL: URL(string: "https://onboarding-preview.invalid/api/")!,
        transport: URLSession(configuration: config), keychain: PreviewSessionStore())
      _session = StateObject(wrappedValue: AppSession(api: api))
    }
    var body: some View {
      Group {
        if !ready {
          ProgressView()
        } else if session.phase == .ready {
          RootView().environmentObject(mockStore)
        } else {
          NavigationStack {
            OnboardingFlow().id(revision)
              .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                  Menu {
                    Button("처음부터 다시 보기") { restart() }
                    Button("결과 화면 보기") {
                      OnboardingPreviewTransport.jumpToResult()
                      revision = UUID()
                    }
                    Button("알림 시간 화면 보기") { showTime = true }
                    Button("완료 화면 보기") { showCelebration = true }
                    Button("학습 화면 보기") { showLearning = true }
                    Button("분석 화면 보기") { showInsights = true }
                    Button("보관함 화면 보기") { showArchive = true }
                  } label: {
                    Label("미리보기", systemImage: "slider.horizontal.3")
                  }
                }
              }
          }
          .sheet(isPresented: $showInsights) {
            NavigationStack {
              PreviewInsightsView().environmentObject(mockStore)
                .toolbar {
                  ToolbarItem(placement: .confirmationAction) {
                    Button("닫기") { showInsights = false }
                  }
                }
            }
          }
          .sheet(isPresented: $showArchive) {
            NavigationStack {
              PreviewArchiveGrid().environmentObject(mockStore)
                .toolbar {
                  ToolbarItem(placement: .confirmationAction) {
                    Button("닫기") { showArchive = false }
                  }
                }
            }
          }
          .sheet(isPresented: $showLearning) {
            NavigationStack {
              PreviewLearningCatalogView()
                .toolbar {
                  ToolbarItem(placement: .confirmationAction) {
                    Button("닫기") { showLearning = false }
                  }
                }
            }
          }
          .sheet(isPresented: $showCelebration) {
            NavigationStack {
              OnboardingCelebration().background(.black).preferredColorScheme(.dark)
                .toolbar {
                  ToolbarItem(placement: .confirmationAction) {
                    Button("닫기") { showCelebration = false }
                  }
                }
            }
          }
          .sheet(isPresented: $showTime) {
            NavigationStack {
              OnboardingTimePage(time: $previewTime).background(.black).preferredColorScheme(.dark)
                .toolbar {
                  ToolbarItem(placement: .confirmationAction) { Button("닫기") { showTime = false } }
                }
            }
          }
        }
      }.environmentObject(session)
        .task {
          guard !ready else { return }
          OnboardingPreviewTransport.reset()
          try? await session.api.install(
            TokenResponse(
              accessToken: "local-preview", refreshToken: "local-preview",
              user: AuthUser(
                userId: "preview", name: "미리보기", onboardingStatus: "incomplete", role: "user")),
            provider: .apple)
          ready = true
        }
        .alert(
          "미리보기",
          isPresented: Binding(
            get: { session.errorMessage != nil }, set: { if !$0 { session.errorMessage = nil } })
        ) {
          Button("확인") { session.errorMessage = nil }
        } message: {
          Text(session.errorMessage ?? "")
        }
    }
    private func restart() {
      OnboardingPreviewTransport.reset()
      session.phase = .onboarding
      revision = UUID()
    }
  }

  private struct PreviewSessionStore: SessionPersistence {
    func read() throws -> StoredSession? { nil }
    func write(_ session: StoredSession) throws {}
    func clear() {}
  }

  private final class OnboardingPreviewTransport: URLProtocol {
    private static let lock = NSLock()
    private static var category = 0
    private static var chosen = false
    private static var answered = 0
    private static var draft: String?
    private static var resultRequested = false
    private static var complete = false
    private static var time = "08:00"
    private static var timezone = TimeZone.current.identifier
    static func reset() {
      lock.lock()
      defer { lock.unlock() }
      category = 0
      chosen = false
      answered = 0
      draft = nil
      resultRequested = false
      complete = false
      time = "08:00"
    }
    static func jumpToResult() {
      lock.lock()
      defer { lock.unlock() }
      chosen = true
      answered = 5
      draft = nil
      resultRequested = true
    }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {}
    override func startLoading() {
      do {
        let (status, payload) = Self.response(request)
        let data = try JSONSerialization.data(withJSONObject: payload)
        let response = HTTPURLResponse(
          url: request.url!, statusCode: status, httpVersion: nil,
          headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
      } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    private static func response(_ request: URLRequest) -> (Int, [String: Any]) {
      lock.lock()
      defer { lock.unlock() }
      var data = request.httpBody ?? Data()
      if let stream = request.httpBodyStream {
        stream.open()
        defer { stream.close() }
        var buffer = [UInt8](repeating: 0, count: 1024)
        while stream.hasBytesAvailable {
          let count = stream.read(&buffer, maxLength: buffer.count)
          guard count > 0 else { break }
          data.append(buffer, count: count)
        }
      }
      let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
      let questions = (content[category]["questions"] as? [[String: Any]]) ?? []
      switch request.url?.path {
      case "/api/categories":
        return (
          200,
          [
            "items": content.enumerated().map {
              ["categoryId": String($0.offset + 1), "name": $0.element["name"]!]
            }
          ]
        )
      case "/api/onboarding/question":
        category = min(2, max(0, (Int(body["categoryId"] as? String ?? "1") ?? 1) - 1))
        chosen = true
        return (200, [:])
      case "/api/onboarding/questions": return (200, ["items": questions])
      case "/api/onboarding/answers/draft":
        draft = body["answerId"] as? String
        return (200, [:])
      case "/api/onboarding/answers":
        answered = min(5, answered + 1)
        draft = nil
        return (200, [:])
      case "/api/onboarding/status":
        return (
          200,
          [
            "interestCategoryId": chosen ? String(category + 1) as Any : NSNull(),
            "answeredCount": answered, "totalCount": 5, "nextQuestionIndex": answered,
            "onboardingStatus": complete ? "complete" : "incomplete",
            "nextQuestionId": answered < 5 ? questions[answered]["questionId"]! : NSNull(),
            "canViewResult": answered == 5, "resultRequested": resultRequested,
            "draftAnswerId": draft as Any? ?? NSNull(), "nextStage": draft == nil ? 1 : 2,
          ]
        )
      case "/api/onboarding/result":
        resultRequested = true
        return (
          200,
          [
            "analysis": [
              "nearestPhilosopher": "이마누엘 칸트", "nearestPhilosopherId": "1",
              "composition": [
                ["philosopherId": "1", "name": "이마누엘 칸트", "percent": 40],
                ["philosopherId": "2", "name": "존 스튜어트 밀", "percent": 40],
                ["philosopherId": "3", "name": "아리스토텔레스", "percent": 20],
              ],
              "accuracy": 16, "accuracyDescription": "미리보기 예시 · 실제 분석 아님",
              "answeredCount": 5,
            ],
            "summary": [
              "status": "ready", "canRetry": false, "contradictions": [],
              "overallSummaries": [
                [
                  "title": "원칙과 배려 사이",
                  "summary": "원칙을 지키며 상대의 입장도 살펴요", "userAnswerIds": [],
                ]
              ],
            ],
          ]
        )
      case "/api/onboarding/daily-time":
        time = body["dailyQuestionTime"] as? String ?? "08:00"
        timezone = body["timezone"] as? String ?? TimeZone.current.identifier
        complete = true
        return (200, [:])
      case "/api/users/me/ai-consent", "/api/users/me":
        return (
          200,
          [
            "userId": "preview", "name": "미리보기", "userRole": "user",
            "aiConsentVersion": "2026-10-02",
            "onboardingStatus": complete ? "complete" : "incomplete",
            "dailyQuestionTime": time, "timezone": timezone, "notificationEnabled": false,
          ]
        )
      default: return (404, ["message": "미리보기에 준비되지 않은 화면이에요"])
      }
    }
    // Editorial UI draft based on onboarding-v1. Apply approved copy to DB in a later migration.
    private static let content =
      (try! JSONSerialization.jsonObject(with: Data(contentJSON.utf8))) as! [[String: Any]]
    private static let contentJSON = #"""
      [
        {
          "name": "관계와 배려",
          "questions": [
            {
              "questionId": "1-1",
              "type": "double",
              "stage1Body": "발표 직전, 친구가 의견을 물어요. 단점을 말하면 자신감을 잃을 수도 있어요",
              "answers": [
                {
                  "answerId": "1-1-1",
                  "body": "솔직하게 모두 말해요"
                },
                {
                  "answerId": "1-1-2",
                  "body": "지금 필요한 조언만 해요"
                }
              ],
              "followup": {
                "followupBody": "친구가 “결과와 상관없이 다 말해줘”라고 부탁한다면?",
                "answers": [
                  {
                    "followupAnswerId": "followup-1",
                    "body": "걱정되는 점을 모두 말해요"
                  },
                  {
                    "followupAnswerId": "followup-2",
                    "body": "부담을 설명하고 범위를 의논해요"
                  }
                ]
              }
            },
            {
              "questionId": "1-2",
              "type": "single",
              "stage1Body": "약속을 잊은 친구가 사과했어요. 아직 서운하다면?",
              "answers": [
                {
                  "answerId": "1-2-1",
                  "body": "마음을 전하고 다시 약속해요"
                },
                {
                  "answerId": "1-2-2",
                  "body": "내 감정과 반응부터 돌아봐요"
                }
              ]
            },
            {
              "questionId": "1-3",
              "type": "single",
              "stage1Body": "같은 회비가 부담돼 모임을 떠나는 사람이 있어요",
              "answers": [
                {
                  "answerId": "1-3-1",
                  "body": "형편에 맞춰 회비를 조정해요"
                },
                {
                  "answerId": "1-3-2",
                  "body": "모두 동의할 원칙부터 세워요"
                }
              ]
            },
            {
              "questionId": "1-4",
              "type": "single",
              "stage1Body": "새 이웃을 도울 시간이 생겼어요. 어떻게 쓸까요?",
              "answers": [
                {
                  "answerId": "1-4-1",
                  "body": "여러 집에 필요한 정보를 전해요"
                },
                {
                  "answerId": "1-4-2",
                  "body": "한 집을 꾸준히 도와요"
                }
              ]
            },
            {
              "questionId": "1-5",
              "type": "single",
              "stage1Body": "몇 사람만 말하는 모임. 내 의견을 꺼내기 어렵다면?",
              "answers": [
                {
                  "answerId": "1-5-1",
                  "body": "차분하게 말할 준비를 해요"
                },
                {
                  "answerId": "1-5-2",
                  "body": "모두 말할 수 있는 규칙을 만들어요"
                }
              ]
            }
          ]
        },
        {
          "name": "공정과 공동체",
          "questions": [
            {
              "questionId": "2-1",
              "type": "single",
              "stage1Body": "무료 수리 행사를 알려야 해요. 미확정 혜택도 알리면 참여자가 늘 수 있어요",
              "answers": [
                {
                  "answerId": "2-1-1",
                  "body": "확정된 정보만 알려요"
                },
                {
                  "answerId": "2-1-2",
                  "body": "미정임을 밝히고 효과를 따져요"
                }
              ]
            },
            {
              "questionId": "2-2",
              "type": "single",
              "stage1Body": "번번이 언쟁으로 끝나는 주민 회의. 무엇을 준비할까요?",
              "answers": [
                {
                  "answerId": "2-2-1",
                  "body": "양쪽을 듣고 중재하는 연습"
                },
                {
                  "answerId": "2-2-2",
                  "body": "내 태도와 발언을 차분히 준비"
                }
              ]
            },
            {
              "questionId": "2-3",
              "type": "double",
              "stage1Body": "장학금을 줄 사람이 한정돼 있어요. 무엇을 먼저 볼까요?",
              "answers": [
                {
                  "answerId": "2-3-1",
                  "body": "배울 기회가 적었던 형편"
                },
                {
                  "answerId": "2-3-2",
                  "body": "누구에게나 적용할 공통 원칙"
                }
              ],
              "followup": {
                "followupBody": "심사 중, 돌봄을 맡은 지원자에게 규칙이 불리함을 알았다면?",
                "answers": [
                  {
                    "followupAnswerId": "followup-1",
                    "body": "기준을 보완해 모두 다시 심사해요"
                  },
                  {
                    "followupAnswerId": "followup-2",
                    "body": "이번 기준은 지키고 다음에 바꿔요"
                  }
                ]
              }
            },
            {
              "questionId": "2-4",
              "type": "single",
              "stage1Body": "도서관 예산으로 프로그램 하나만 열 수 있어요",
              "answers": [
                {
                  "answerId": "2-4-1",
                  "body": "많은 사람에게 유용한 강좌"
                },
                {
                  "answerId": "2-4-2",
                  "body": "함께 배우는 소규모 독서 모임"
                }
              ]
            },
            {
              "questionId": "2-5",
              "type": "single",
              "stage1Body": "봉사단의 좋은 역할을 오래된 회원만 맡고 있어요",
              "answers": [
                {
                  "answerId": "2-5-1",
                  "body": "내 역할과 의견을 낼 태도에 집중해요"
                },
                {
                  "answerId": "2-5-2",
                  "body": "신입에게도 열린 절차를 요구해요"
                }
              ]
            }
          ]
        },
        {
          "name": "일과 삶의 선택",
          "questions": [
            {
              "questionId": "3-1",
              "type": "single",
              "stage1Body": "공유한 자료에 오류가 있어요. 알리면 동료들이 재작업해야 해요",
              "answers": [
                {
                  "answerId": "3-1-1",
                  "body": "오류와 수정 방법을 바로 알려요"
                },
                {
                  "answerId": "3-1-2",
                  "body": "피해와 부담을 따져 알릴 때를 정해요"
                }
              ]
            },
            {
              "questionId": "3-2",
              "type": "single",
              "stage1Body": "준비한 프로젝트에서 탈락했어요. 다시 시작한다면?",
              "answers": [
                {
                  "answerId": "3-2-1",
                  "body": "피드백으로 협업 능력을 키워요"
                },
                {
                  "answerId": "3-2-2",
                  "body": "결과와 나를 구별하고 준비해요"
                }
              ]
            },
            {
              "questionId": "3-3",
              "type": "single",
              "stage1Body": "팀 교육에 모두 갈 수는 없어요. 누구에게 기회를 줄까요?",
              "answers": [
                {
                  "answerId": "3-3-1",
                  "body": "교육 기회가 적었던 사람"
                },
                {
                  "answerId": "3-3-2",
                  "body": "모두 동의한 원칙으로 정해요"
                }
              ]
            },
            {
              "questionId": "3-4",
              "type": "double",
              "stage1Body": "여유 시간에 한 가지 활동만 한다면?",
              "answers": [
                {
                  "answerId": "3-4-1",
                  "body": "나와 주변의 행복을 높일 활동"
                },
                {
                  "answerId": "3-4-2",
                  "body": "좋은 습관을 기를 활동"
                }
              ],
              "followup": {
                "followupBody": "한 달이 지나도 즐거움이나 성장이 느껴지지 않는다면?",
                "answers": [
                  {
                    "followupAnswerId": "followup-1",
                    "body": "가치를 되짚고 조금 더 해봐요"
                  },
                  {
                    "followupAnswerId": "followup-2",
                    "body": "경험을 바탕으로 다른 걸 해봐요"
                  }
                ]
              }
            },
            {
              "questionId": "3-5",
              "type": "single",
              "stage1Body": "평가에서 지원 업무가 잘 드러나지 않아요",
              "answers": [
                {
                  "answerId": "3-5-1",
                  "body": "내 기준을 세우고 기여를 설명해요"
                },
                {
                  "answerId": "3-5-2",
                  "body": "숨은 기여도 반영하도록 제안해요"
                }
              ]
            }
          ]
        }
      ]
      """#
  }
#endif
