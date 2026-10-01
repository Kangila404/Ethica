import Foundation

enum SocialProvider: String, Codable, CaseIterable, Identifiable {
  case apple, google, kakao
  var id: String { rawValue }
  var title: String {
    switch self {
    case .apple: return "Apple"
    case .google: return "Google"
    case .kakao: return "카카오"
    }
  }
}
struct TokenResponse: Codable {
  let accessToken: String
  let refreshToken: String
  let user: AuthUser
}
struct AuthUser: Codable {
  let userId: String
  let name: String
  let onboardingStatus: String
  let role: String
}
struct StoredSession: Codable {
  let tokens: TokenResponse
  let provider: SocialProvider
}
struct Challenge: Decodable {
  let challengeId: String
  let nonce: String
  let expiresAt: String
}
struct UserProfile: Decodable {
  let userId: String
  let name: String
  let avatarId: String?
  let userRole: String
  let onboardingStatus: String
  // New accounts have no schedule until onboarding sets it.
  let dailyQuestionTime: String?
  let timezone: String?
  let notificationEnabled: Bool
  let nextDailyAt: String?
  let dailyScheduleEffectiveAt: String?
  let pendingDailyQuestionTime: String?
  let pendingTimezone: String?
}
struct CategoryList: Decodable { let items: [InterestCategory] }
struct InterestCategory: Decodable, Identifiable {
  let categoryId: String
  let name: String
  var id: String { categoryId }
}
struct OnboardingProgress: Decodable {
  let interestCategoryId: String?
  let answeredCount: Int
  let totalCount: Int
  let nextQuestionIndex: Int
  let onboardingStatus: String
  let nextQuestionId: String?
  let canViewResult: Bool
  let resultRequested: Bool
  let draftAnswerId: String?
  let nextStage: Int
}
struct OnboardingQuestions: Decodable { let items: [OnboardingQuestion] }
struct OnboardingQuestion: Decodable, Identifiable {
  let questionId: String
  let type: String
  let stage1Body: String
  let answers: [OnboardingChoice]
  let followup: OnboardingFollowup?
  var id: String { questionId }
}
struct OnboardingChoice: Decodable, Identifiable {
  let answerId: String
  let body: String
  var id: String { answerId }
}
struct OnboardingFollowup: Decodable {
  let followupBody: String
  let answers: [FollowupChoice]
}
struct FollowupChoice: Decodable, Identifiable {
  let followupAnswerId: String
  let body: String
  var id: String { followupAnswerId }
}
struct OnboardingResult: Decodable {
  let analysis: AnalysisSnapshot
  let summary: ThoughtSummary
}
struct DailyQuestion: Codable {
  var needsFollowup: Bool {
    type == "twoStage" && userDailyQuestion == "pending" && selectedAnswerId != nil
      && selectedFollowupAnswerId == nil
  }
  let userDailyQuestion: String
  let nextDailyAt: String?
  let message: String?
  let questionId: String?
  let type: String?
  let cycleId: String?
  let serviceDate: String?
  let stage1Body: String?
  let followupBody: String?
  let imageKey: String?
  let answers: [DailyChoice]?
  let followupAnswers: [DailyChoice]?
  let selectedAnswer: SelectedAnswer?
  let selectedFollowupAnswer: SelectedAnswer?
  let selectedAnswerId: String?
  let selectedFollowupAnswerId: String?
}
struct DailyChoice: Codable, Identifiable {
  let id: String
  let body: String
}
struct SelectedAnswer: Codable {
  let id: String
  let explanation: String?
  let philosopherId: String?
}
struct AnalysisSnapshot: Decodable {
  let nearestPhilosopher: String?
  let nearestPhilosopherId: String?
  let composition: [Composition]
  let accuracy: Int
  let accuracyDescription: String
  let answeredCount: Int
}
struct Composition: Decodable, Identifiable {
  let philosopherId: String
  let name: String
  let percent: Double
  var id: String { philosopherId }
}
struct AnalysisPhilosopher: Decodable {
  let id: String
  let name: String
  let school: String
  let imageKey: String?
}
struct CompositionState: Decodable {
  let answerCount: Int
  let nearestPhilosopher: AnalysisPhilosopher?
  let composition: [Composition]
}
struct CompositionChange: Decodable, Identifiable {
  let philosopherId: String
  let name: String
  let beforePercent: Double
  let afterPercent: Double
  let deltaPercentagePoints: Double
  var id: String { philosopherId }
}
struct TodayAnalysis: Decodable {
  let status: String
  let serviceDate: String?
  let nextDailyAt: String?
  let selectedPhilosopher: AnalysisPhilosopher?
  let before: CompositionState?
  let after: CompositionState?
  let changes: [CompositionChange]
  let nearestChanged: Bool
}
struct AnalysisQuota: Decodable {
  let limit: Int
  let remaining: Int
  let resetsAt: String
}
struct ThoughtSummary: Decodable {
  var quota: AnalysisQuota? = nil
  let overallSummaries: [Insight]
  let contradictions: [Insight]
  let status: String
  let canRetry: Bool
  let message: String?
}
struct Insight: Decodable {
  let userAnswerIds: [String]
  let title: String
  let summary: String
}
struct PhilosopherCatalog: Decodable {
  let nearest: [Philosopher]
  let all: [Philosopher]
}
struct Philosopher: Decodable, Identifiable {
  let id: String
  let name: String
  let school: String
  let era: String
  let postCount: Int
  let imageKey: String?
}
struct PhilosopherProfile: Decodable {
  let id: String
  let name: String
  let era: String
  let school: String
  let coreThought: String
  let lifeRoots: String
  let imageKey: String?
  let posts: [LearningPost]
}
struct LearningPost: Decodable, Identifiable {
  let id: String
  let title: String
  let imageKey: String?
}
struct PostDetail: Decodable {
  let id: String
  let title: String
  let philosopherId: String
  let imageKey: String?
  let segments: [LearningSegment]
}
struct LearningSegment: Decodable, Identifiable {
  let id: String
  let segmentType: String
  let body: String?
  let imageKey: String?
  let sortOrder: Int
}
struct ArchivePage: Decodable {
  let items: [ArchiveEntry]
  let nextCursor: String?
}
struct ArchiveEntry: Decodable, Identifiable {
  let userAnswerId: String
  let serviceDate: String
  let questionPreview: String
  let imageKey: String?
  var id: String { userAnswerId }
}
struct ArchiveDetail: Decodable {
  let imageKey: String?
  let userAnswerId: String
  let serviceDate: String
  let questionBody: String
  let myAnswer: String
  let explanation: String
  let followup: ArchiveFollowup?
}
struct ArchiveFollowup: Decodable {
  let questionBody: String
  let myAnswer: String
  let explanation: String
}
struct SupportEntry: Decodable, Identifiable {
  let id: String
  let title: String
  let content: String
  let status: String?
  let answerContent: String?
  let isPublished: Bool?
}
struct TermDocument: Decodable {
  let title: String
  let content: String
  let version: String
}

// The admin API contains heterogeneous resources. Editors submit only declared input fields.
indirect enum JSONValue: Codable, Equatable {
  case string(String)
  case number(Double)
  case bool(Bool)
  case object([String: JSONValue])
  case array([JSONValue])
  case null
  init(from decoder: Decoder) throws {
    let c = try decoder.singleValueContainer()
    if c.decodeNil() {
      self = .null
    } else if let v = try? c.decode(Bool.self) {
      self = .bool(v)
    } else if let v = try? c.decode(String.self) {
      self = .string(v)
    } else if let v = try? c.decode(Double.self) {
      self = .number(v)
    } else if let v = try? c.decode([String: JSONValue].self) {
      self = .object(v)
    } else {
      self = .array(try c.decode([JSONValue].self))
    }
  }
  func encode(to encoder: Encoder) throws {
    var c = encoder.singleValueContainer()
    switch self {
    case .string(let v): try c.encode(v)
    case .number(let v): try c.encode(v)
    case .bool(let v): try c.encode(v)
    case .object(let v): try c.encode(v)
    case .array(let v): try c.encode(v)
    case .null: try c.encodeNil()
    }
  }
  var text: String {
    switch self {
    case .string(let v): return v
    case .number(let v): return String(format: "%.0f", v)
    default: return ""
    }
  }
  var flag: Bool {
    if case .bool(let v) = self { return v }
    return false
  }
  var object: [String: JSONValue] {
    if case .object(let v) = self { return v }
    return [:]
  }
  var array: [JSONValue] {
    if case .array(let v) = self { return v }
    return []
  }
}
