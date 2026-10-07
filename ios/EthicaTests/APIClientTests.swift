import XCTest

#if canImport(Ethica)
  import SwiftUI
  import UserNotifications
  @testable import Ethica
#else
  @testable import EthicaCore
#endif

#if canImport(Ethica)
final class PushNotificationCallbackTests: XCTestCase {
  @MainActor
  func testResponsesFromBackgroundCompleteOnMainExactlyOnce() async {
    let push = PushNotifications()
    let cases: [(Bool, String, Bool)] = [
      (false, UNNotificationDefaultActionIdentifier, false), // Diagnostic, no data payload.
      (true, UNNotificationDefaultActionIdentifier, true),
      (true, "OPEN_DAILY", true),
      (true, UNNotificationDismissActionIdentifier, false),
      (true, "UNKNOWN_ACTION", false),
    ]
    for (isDaily, action, shouldOpen) in cases {
      let completed = expectation(description: "Completion for \(isDaily)/\(action)")
      completed.assertForOverFulfill = true
      var opened = 0
      let observer = NotificationCenter.default.addObserver(
        forName: .ethicaDailyOpened, object: nil, queue: nil
      ) { _ in
        XCTAssertTrue(Thread.isMainThread)
        opened += 1
      }
      DispatchQueue.global(qos: .userInitiated).async {
        XCTAssertFalse(Thread.isMainThread)
        push.finishResponse(isDailyQuestion: isDaily, actionIdentifier: action) {
          XCTAssertTrue(Thread.isMainThread)
          XCTAssertEqual(opened, shouldOpen ? 1 : 0)
          completed.fulfill()
        }
      }
      await fulfillment(of: [completed], timeout: 5)
      NotificationCenter.default.removeObserver(observer)
    }
  }

  @MainActor
  func testForegroundCompletionOnMainRespectsPreference() async {
    let key = "ethica.dailyAlertsEnabled"
    let previous = UserDefaults.standard.object(forKey: key)
    defer {
      if let previous { UserDefaults.standard.set(previous, forKey: key) }
      else { UserDefaults.standard.removeObject(forKey: key) }
    }
    let push = PushNotifications()
    for enabled in [false, true] {
      push.setPreference(enabled)
      let completed = expectation(description: "Presentation enabled=\(enabled)")
      completed.assertForOverFulfill = true
      DispatchQueue.global(qos: .userInitiated).async {
        push.finishPresentation { options in
          XCTAssertTrue(Thread.isMainThread)
          XCTAssertEqual(options, enabled ? [.banner, .sound] : [])
          completed.fulfill()
        }
      }
      await fulfillment(of: [completed], timeout: 5)
    }
  }
}

final class AdminMixedCardTests: XCTestCase {
  func testTextAndImageCardsPreserveBothFieldsOnSave() {
    for kind in ["text", "image"] {
      let draft = AdminCardDraft(value: [
        "id": .string("42"), "segmentType": .string(kind),
        "body": .string("본문과 출처"), "imageKey": .string("learning-v3-harvard.jpg"),
      ])
      XCTAssertEqual(draft.payload["id"]?.text, "42")
      XCTAssertEqual(draft.payload["segmentType"]?.text, kind)
      XCTAssertEqual(draft.payload["body"]?.text, "본문과 출처")
      XCTAssertEqual(draft.payload["imageKey"]?.text, "learning-v3-harvard.jpg")
    }
  }

  func testBlankOptionalFieldsEncodeAsNull() {
    var draft = AdminCardDraft()
    draft.body = " \n"
    draft.image = " "
    guard case .null? = draft.payload["body"], case .null? = draft.payload["imageKey"] else {
      return XCTFail("Blank optional card fields must be null")
    }
  }
}
#endif

final class ContentAttributionTests: XCTestCase {
  func testProfileImageCreditsAreSeparatedWithoutTruncation() {
    let credit = "[프로필 이미지]\n제작자 · CC BY-SA 4.0\n출처: https://example.org/image\n이용 조건: https://creativecommons.org/licenses/by-sa/4.0/"
    let value = ContentAttribution("생애 본문\n\n" + credit)
    XCTAssertEqual(value.body, "생애 본문")
    XCTAssertEqual(value.sources, credit)
  }

  func testFullSourceCardCollapsesAndRetainsEveryCredit() {
    let original = "더 읽기 · 자료 출처\n\n원전과 참고 문헌\nhttps://example.org/book\n\n1·3번 슬라이드\n제작자와 이용 조건"
    let value = ContentAttribution(original)
    XCTAssertEqual(value.body, "")
    XCTAssertEqual(value.sources, original)
  }

  func testOrdinaryProseURLsAndIncompleteHeadingsRemainVisible() {
    for text in ["출처를 살펴보는 것은 중요해요", "본문 속 https://example.org 는 그대로", "본문\n\n[프로필 이미지]", "", "자료 출처"] {
      let value = ContentAttribution(text)
      XCTAssertEqual(value.body, text)
      XCTAssertNil(value.sources)
    }
  }

  func testWindowsLineEndingsAndSingleLineCitation() {
    let value = ContentAttribution("첫 문단\r\n\r\n둘째 문단\r\n\r\n[출처]\r\n자료")
    XCTAssertEqual(value.body, "첫 문단\n\n둘째 문단")
    XCTAssertEqual(value.sources, "[출처]\n자료")
    XCTAssertEqual(ContentAttribution("본문\n출처: https://example.org").sources, "출처: https://example.org")
  }
}

final class MemorySessionStore: SessionPersistence {
  private let lock = NSLock()
  private var data: Data?
  func read() throws -> StoredSession? {
    lock.lock()
    defer { lock.unlock() }
    guard let data else { return nil }
    return try JSONDecoder().decode(StoredSession.self, from: data)
  }
  func write(_ session: StoredSession) throws {
    lock.lock()
    defer { lock.unlock() }
    data = try JSONEncoder().encode(session)
  }
  func clear() {
    lock.lock()
    defer { lock.unlock() }
    data = nil
  }
}

final class StubURLProtocol: URLProtocol {
  static var handler: ((URLRequest) throws -> (Int, Data, TimeInterval))?
  override class func canInit(with request: URLRequest) -> Bool {
    request.url?.host == "fixture.ethica.invalid"
  }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    do {
      guard let handler = Self.handler else { throw URLError(.badURL) }
      let (status, data, delay) = try handler(request)
      DispatchQueue.global().asyncAfter(deadline: .now() + delay) {
        self.client?.urlProtocol(
          self,
          didReceive: HTTPURLResponse(
            url: self.request.url!, statusCode: status, httpVersion: nil,
            headerFields: ["Content-Type": "application/json"])!, cacheStoragePolicy: .notAllowed)
        self.client?.urlProtocol(self, didLoad: data)
        self.client?.urlProtocolDidFinishLoading(self)
      }
    } catch { client?.urlProtocol(self, didFailWithError: error) }
  }
  override func stopLoading() {}
}
final class LockedCounter {
  private let lock = NSLock()
  private var values: [String: Int] = [:]
  func increment(_ key: String) {
    lock.lock()
    defer { lock.unlock() }
    values[key, default: 0] += 1
  }
  func count(_ key: String) -> Int {
    lock.lock()
    defer { lock.unlock() }
    return values[key, default: 0]
  }
}
final class APIClientTests: XCTestCase {
  private var api: APIClient!
  private var keychain: MemorySessionStore!
  private let user = AuthUser(
    userId: "test-user", name: "테스트", onboardingStatus: "complete", role: "user")
  private func tokens(_ access: String) -> TokenResponse {
    TokenResponse(accessToken: access, refreshToken: "test-refresh", user: user)
  }
  override func setUp() async throws {
    keychain = MemorySessionStore()
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [StubURLProtocol.self]
    api = APIClient(
      baseURL: URL(string: "https://fixture.ethica.invalid/api/")!,
      transport: URLSession(configuration: configuration), keychain: keychain)
    try await api.install(tokens("old-access"), provider: .apple)
  }
  override func tearDown() async throws {
    await api.clear()
    StubURLProtocol.handler = nil
    #if canImport(Ethica)
      WidgetSnapshot.clear()
    #endif
  }
  func testProfileTimeoutPreservesSessionAndAllowsRetry() async throws {
    StubURLProtocol.handler = { _ in throw URLError(.timedOut) }
    do {
      let _: [String: String] = try await api.get("users/me")
      XCTFail("Expected a timeout")
    } catch let error as URLError {
      XCTAssertEqual(error.code, .timedOut)
    }
    let preserved = await api.currentSession()
    XCTAssertNotNil(preserved)
    StubURLProtocol.handler = { _ in (200, Data(#"{"state":"ready"}"#.utf8), 0) }
    let retried: [String: String] = try await api.get("users/me")
    XCTAssertEqual(retried["state"], "ready")
  }
  func testGuestLearningDoesNotSendCredentialsOrCreateSession() async throws {
    await api.clear()
    StubURLProtocol.handler = { request in
      XCTAssertEqual(request.url?.path, "/api/philosophers")
      XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
      return (200, Data(#"{"nearest":[],"all":[{"id":"1","name":"카뮈","era":"20세기","school":"부조리","postCount":5,"categories":["philosophy","literature"]}]}"#.utf8), 0)
    }
    let catalog: PhilosopherCatalog = try await api.get("philosophers", authenticated: false)
    XCTAssertEqual(catalog.all.first?.categories, ["philosophy", "literature"])
    let stored = await api.currentSession()
    XCTAssertNil(stored)
  }

  #if canImport(Ethica)
  @MainActor func testSignedOutRootLoadsPublicLearningWithoutAccount() async throws {
    await api.clear()
    let counts = LockedCounter()
    StubURLProtocol.handler = { request in
      let path = request.url!.path
      counts.increment(path)
      XCTAssertEqual(path, "/api/philosophers")
      XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
      return (200, Data(#"{"nearest":[],"all":[]}"#.utf8), 0)
    }
    let session = AppSession(api: api)
    session.phase = .signedOut
    guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first else {
      XCTFail("No window scene")
      return
    }
    let window = UIWindow(windowScene: scene)
    window.rootViewController = UIHostingController(rootView: LiveRootView().environmentObject(session))
    window.makeKeyAndVisible()
    defer { window.isHidden = true }
    for _ in 0..<100 {
      if counts.count("/api/philosophers") > 0 { break }
      try await Task.sleep(nanoseconds: 50_000_000)
    }
    XCTAssertGreaterThan(counts.count("/api/philosophers"), 0)
    XCTAssertEqual(session.phase, .signedOut)
    XCTAssertNil(session.user)
  }
  #endif
  func testImageUploadRetainsMultipartWhenRefreshingSession() async throws {
    let refreshed = try JSONEncoder().encode(tokens("new-access"))
    let counts = LockedCounter()
    StubURLProtocol.handler = { request in
      if request.url!.path.hasSuffix("token/refresh") { return (200, refreshed, 0) }
      XCTAssertEqual(request.url?.path, "/api/admin/media")
      XCTAssertEqual(request.httpMethod, "POST")
      XCTAssertTrue(request.value(forHTTPHeaderField: "Content-Type")?.hasPrefix("multipart/form-data; boundary=Ethica-") == true)
      counts.increment("upload")
      if request.value(forHTTPHeaderField: "Authorization") == "Bearer old-access" {
        return (401, Data(), 0)
      }
      return (201, Data(#"{"imageKey":"fixture.jpg"}"#.utf8), 0)
    }
    let key = try await api.uploadImage(Data([255, 216, 255, 217]))
    XCTAssertEqual(key, "fixture.jpg")
    XCTAssertEqual(counts.count("upload"), 2)
  }
  func testRelativeMediaUsesAPIOriginAndRejectsTraversal() {
    XCTAssertEqual(AppConfiguration.imageURL("editorial-v1-waiting.png"), AppConfiguration.baseURL.appendingPathComponent("media/editorial-v1-waiting.png"))
    XCTAssertNil(AppConfiguration.imageURL("../.env"))
    XCTAssertNil(AppConfiguration.imageURL("file:///etc/passwd"))
    XCTAssertEqual(AppConfiguration.imageURL("https://cdn.example.com/image.jpg")?.host, "cdn.example.com")
  }
  func testAvatarWriteDecodesProfileAndDefaultImage() async throws {
    StubURLProtocol.handler = { request in
      XCTAssertEqual(request.url?.path, "/api/users/me/avatar")
      XCTAssertEqual(request.httpMethod, "PATCH")
      let avatar = "moon"
      let response: [String: Any] = ["userId": "test-user", "name": "테스트", "userRole": "user",
        "onboardingStatus": "complete", "notificationEnabled": false, "avatarId": avatar]
      return (200, try JSONSerialization.data(withJSONObject: response), 0)
    }
    let selected: UserProfile = try await api.send("users/me/avatar", method: "PATCH", body: ["avatarId": .string("moon")])
    XCTAssertEqual(selected.avatarId, "moon")
    let reset = try JSONDecoder().decode(UserProfile.self, from: Data(#"{"userId":"test-user","name":"테스트","userRole":"user","onboardingStatus":"complete","notificationEnabled":false,"avatarId":null}"#.utf8))
    XCTAssertNil(reset.avatarId)
  }
  func testConcurrentUnauthorizedRequestsShareOneRefresh() async throws {
    let counts = LockedCounter()
    let response = try JSONEncoder().encode(tokens("new-access"))
    StubURLProtocol.handler = { request in
      if request.url!.path.hasSuffix("token/refresh") {
        counts.increment("refresh")
        return (201, response, 0.1)
      }
      if request.value(forHTTPHeaderField: "Authorization") == "Bearer new-access" {
        return (200, Data("{\"message\":\"ok\"}".utf8), 0)
      }
      return (401, Data("{}".utf8), 0.01)
    }
    async let first: [String: String] = api.get("one")
    async let second: [String: String] = api.get("two")
    let values = try await (first, second)
    XCTAssertEqual(values.0["message"], "ok")
    XCTAssertEqual(values.1["message"], "ok")
    XCTAssertEqual(counts.count("refresh"), 1)
    XCTAssertEqual(try keychain.read()?.tokens.accessToken, "new-access")
  }
  func testRefreshCannotRestoreSessionAfterSignOut() async throws {
    let refreshStarted = expectation(description: "refresh started")
    let response = try JSONEncoder().encode(tokens("new-access"))
    StubURLProtocol.handler = { request in
      if request.url!.path.hasSuffix("token/refresh") {
        refreshStarted.fulfill()
        return (201, response, 0.2)
      }
      return (401, Data("{}".utf8), 0)
    }
    let task = Task { () -> [String: String] in try await api.get("one") }
    await fulfillment(of: [refreshStarted], timeout: 2)
    await api.clear()
    _ = try? await task.value
    let current = await api.currentSession()
    XCTAssertNil(current)
    XCTAssertNil(try keychain.read())
  }
  func testOfflineRefreshKeepsSessionForRetry() async throws {
    StubURLProtocol.handler = { request in
      if request.url!.path.hasSuffix("token/refresh") { throw URLError(.notConnectedToInternet) }
      return (401, Data("{}".utf8), 0)
    }
    do {
      let _: [String: String] = try await api.get("one")
      XCTFail("Expected offline error")
    } catch {}
    let saved = await api.currentSession()
    XCTAssertEqual(saved?.tokens.accessToken, "old-access")
  }
  func testRetriedResponseCannotReturnAfterSignOut() async throws {
    try await verifyLateRetry(status: 200)
  }
  func testRetriedUnauthorizedResponseCannotClearNewSession() async throws {
    try await verifyLateRetry(status: 401)
  }
  private func verifyLateRetry(status: Int) async throws {
    let retryStarted = expectation(description: "retried request started")
    let refreshed = try JSONEncoder().encode(tokens("new-access"))
    StubURLProtocol.handler = { request in
      if request.url!.path.hasSuffix("token/refresh") { return (201, refreshed, 0) }
      if request.value(forHTTPHeaderField: "Authorization") == "Bearer new-access" {
        retryStarted.fulfill()
        return (status, Data("{\"message\":\"old account\"}".utf8), 0.2)
      }
      return (401, Data("{}".utf8), 0)
    }
    let pending = Task { () -> [String: String] in try await api.get("one") }
    await fulfillment(of: [retryStarted], timeout: 2)
    await api.clear()
    if status == 401 { try await api.install(tokens("another-account"), provider: .google) }
    do {
      _ = try await pending.value
      XCTFail("A stale account response must not reach the UI")
    } catch is CancellationError {} catch { XCTFail("Expected cancellation: \(error)") }
    let current = await api.currentSession()
    if status == 401 {
      XCTAssertEqual(current?.tokens.accessToken, "another-account")
    } else {
      XCTAssertNil(current)
    }
  }
  func testRejectedRefreshClearsSession() async throws {
    StubURLProtocol.handler = { _ in (401, Data("{}".utf8), 0) }
    do {
      let _: [String: String] = try await api.get("one")
      XCTFail("Expected rejection")
    } catch {}
    let saved = await api.currentSession()
    XCTAssertNil(saved)
    XCTAssertNil(try keychain.read())
  }
  func testWithdrawalReauthenticationFailureIsNotReplayedOrSignedOut() async throws {
    let calls = LockedCounter()
    StubURLProtocol.handler = { request in
      calls.increment(request.url!.path)
      return (
        401, Data("{\"code\":\"AUTH_INVALID_SOCIAL_TOKEN\",\"message\":\"다시 인증해주세요\"}".utf8), 0
      )
    }
    do {
      try await api.mutate(
        "users/me", method: "DELETE", body: ["credential": .string("one-use-code")])
      XCTFail("Expected rejection")
    } catch {}
    XCTAssertEqual(calls.count("/api/users/me"), 1)
    XCTAssertEqual(calls.count("/api/auth/token/refresh"), 0)
    let saved = await api.currentSession()
    XCTAssertNotNil(saved)
  }
  func testPublicRequestsDoNotSendAppToken() async throws {
    StubURLProtocol.handler = { request in
      XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
      return (200, Data("{\"message\":[\"필수 입력\",\"다시 확인\"]}".utf8), 0)
    }
    let _: [String: JSONValue] = try await api.get("terms?type=service", authenticated: false)
  }
  func testDailyWaitingAndCompletedResponsesDecode() throws {
    let waiting = try JSONDecoder().decode(
      DailyQuestion.self,
      from: Data(
        "{\"userDailyQuestion\":\"waiting\",\"nextDailyAt\":\"2026-10-01T00:00:00.000Z\"}".utf8))
    XCTAssertNil(waiting.questionId)
    XCTAssertEqual(waiting.userDailyQuestion, "waiting")
    let completed = try JSONDecoder().decode(
      DailyQuestion.self,
      from: Data(
        "{\"userDailyQuestion\":\"completed\",\"questionId\":\"91\",\"selectedAnswer\":{\"id\":\"2\",\"explanation\":\"해설\",\"philosopherId\":\"1\"},\"selectedFollowupAnswer\":{\"id\":\"7\",\"explanation\":null}}"
          .utf8))
    XCTAssertEqual(completed.selectedAnswer?.philosopherId, "1")
    XCTAssertNil(completed.selectedFollowupAnswer?.philosopherId)
  }
  func testNewAccountProfileAcceptsUnsetDailySchedule() async throws {
    let json =
      #"{"userId":"new-user","name":"생각하는 사람","userRole":"user","onboardingStatus":"incomplete","dailyQuestionTime":null,"timezone":null,"notificationEnabled":true,"nextDailyAt":null,"dailyScheduleEffectiveAt":null,"pendingDailyQuestionTime":null,"pendingTimezone":null}"#
    StubURLProtocol.handler = { _ in (200, Data(json.utf8), 0) }
    let profile: UserProfile = try await api.get("users/me")
    XCTAssertEqual(profile.onboardingStatus, "incomplete")
    XCTAssertNil(profile.dailyQuestionTime)
    XCTAssertNil(profile.timezone)
    XCTAssertEqual(try keychain.read()?.tokens.accessToken, "old-access")
  }
  #if canImport(Ethica)
    func testKeychainRoundTrip() throws {
      let store = KeychainStore(service: "com.ethica.tests.\(UUID().uuidString)")
      defer { store.clear() }
      try store.write(StoredSession(tokens: tokens("first"), provider: .google))
      try store.write(StoredSession(tokens: tokens("rotated"), provider: .google))
      XCTAssertEqual(try store.read()?.tokens.accessToken, "rotated")
      store.clear()
      XCTAssertNil(try store.read())
    }
    @MainActor func testServerProfileDeterminesOnboardingAndAdminRole() async throws {
      let counter = LockedCounter()
      StubURLProtocol.handler = { _ in
        counter.increment("profile")
        let onboarding = counter.count("profile") == 1 ? "incomplete" : "complete"
        let json =
          "{\"userId\":\"test-user\",\"name\":\"관리자\",\"userRole\":\"admin\",\"onboardingStatus\":\"\(onboarding)\",\"dailyQuestionTime\":\"08:00\",\"timezone\":\"Asia/Seoul\",\"notificationEnabled\":false}"
        return (200, Data(json.utf8), 0)
      }
      let session = AppSession(api: api)
      try await session.reloadProfile()
      XCTAssertEqual(session.phase, .onboarding)
      XCTAssertEqual(session.user?.userRole, "admin")
      try await session.reloadProfile()
      XCTAssertEqual(session.phase, .ready)
    }

    @MainActor func testNativeScreensLoadTheirAPIAndCaptureLayouts() async throws {
      let counts = LockedCounter()
      let profile =
        #"{"userId":"test-user","name":"생각하는 사람","userRole":"admin","onboardingStatus":"complete","dailyQuestionTime":"08:00","timezone":"Asia/Seoul","notificationEnabled":false}"#
      let fixtures: [String: String] = [
        "/api/users/me": profile,
        "/api/daily/today":
          #"{"userDailyQuestion":"pending","questionId":"91","type":"single","cycleId":"22","stage1Body":"친구를 위한 거짓말도 옳지 않을까요?","answers":[{"id":"1","body":"사실을 말하는 것이 옳아요"},{"id":"2","body":"친구의 마음을 먼저 지킬래요"}],"nextDailyAt":"2099-10-01T00:00:00.000Z"}"#,
        "/api/analysis/summary":
          #"{"nearestPhilosopher":"이마누엘 칸트","nearestPhilosopherId":"1","composition":[{"philosopherId":"1","name":"이마누엘 칸트","percent":60},{"philosopherId":"2","name":"존 스튜어트 밀","percent":40}],"accuracy":16,"accuracyDescription":"답변 수에 따른 분석 참고도예요. 통계적 정확도를 뜻하지 않습니다.","answeredCount":5}"#,
        "/api/analysis/contradictions":
          #"{"overallSummaries":[{"title":"원칙에서 시작하는 선택","summary":"관계의 맥락을 살피면서도 스스로 세운 원칙을 중요하게 생각했어요.","userAnswerIds":["1"]}],"contradictions":[],"status":"ready","canRetry":false}"#,
        "/api/philosophers":
          #"{"nearest":[],"all":[{"id":"1","name":"이마누엘 칸트","school":"의무론","era":"18세기","postCount":2}]}"#,
        "/api/philosophers/1":
          #"{"id":"1","name":"이마누엘 칸트","school":"의무론","era":"1724–1804","coreThought":"무엇을 해야 하는가. 결과를 넘어, 선택의 이유를 묻습니다.","lifeRoots":"스스로 생각하고 원칙을 세우는 삶에 관하여.","posts":[{"id":"1","title":"좋은 의도만으로 충분할까"},{"id":"2","title":"다른 사람을 대하는 방식"}]}"#,
        "/api/archive":
          #"{"items":[{"userAnswerId":"1","serviceDate":"2026-09-30","questionPreview":"친구를 위한 거짓말도 옳지 않을까요?"}],"nextCursor":null}"#,
        "/api/onboarding/status":
          #"{"interestCategoryId":"1","answeredCount":0,"totalCount":5,"nextQuestionIndex":0,"onboardingStatus":"incomplete","nextQuestionId":"91","canViewResult":false,"resultRequested":false,"nextStage":1}"#,
        "/api/onboarding/questions":
          #"{"items":[{"questionId":"91","type":"single","stage1Body":"친구를 위한 거짓말도 옳지 않을까요?","answers":[{"answerId":"1","body":"사실을 말하는 것이 옳아요"},{"answerId":"2","body":"친구의 마음을 먼저 지킬래요"}]}]}"#,
      ]
      StubURLProtocol.handler = { request in
        let path = request.url!.path
        counts.increment(path)
        return (fixtures[path] == nil ? 404 : 200, Data((fixtures[path] ?? "{}").utf8), 0)
      }
      let session = AppSession(api: api)
      try await session.reloadProfile()
      guard
        let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first
      else {
        XCTFail("No test window scene")
        return
      }
      let window = UIWindow(windowScene: scene)
      window.frame = UIScreen.main.bounds
      defer { window.isHidden = true }
      func capture<V: View>(
        _ name: String, view: V, requiredPath: String? = nil
      ) async throws {
        let controller = UIHostingController(rootView: view.environmentObject(session))
        window.rootViewController = controller
        window.makeKeyAndVisible()
        if let requiredPath {
          for _ in 0..<100 {
            if counts.count(requiredPath) > 0 { break }
            try await Task.sleep(nanoseconds: 50_000_000)
          }
          XCTAssertGreaterThan(
            counts.count(requiredPath), 0, "Screen did not request \(requiredPath)")
        }
        try await Task.sleep(nanoseconds: 400_000_000)
        controller.view.layoutIfNeeded()
        let image = UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
          window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
        }
        let attachment = XCTAttachment(image: image)
        attachment.name = "fixture-\(name)"
        attachment.lifetime = .keepAlways
        add(attachment)
      }
      try await capture(
        "today", view: NavigationStack { LiveTodayView() }, requiredPath: "/api/daily/today")
      try await capture(
        "analysis", view: NavigationStack { LiveAnalysisView() },
        requiredPath: "/api/analysis/summary")
      try await capture(
        "philosopher", view: NavigationStack { LivePhilosopherView(id: "1") },
        requiredPath: "/api/philosophers/1")
      try await capture(
        "archive", view: NavigationStack { LiveArchiveView() }, requiredPath: "/api/archive")
      try await capture(
        "onboarding", view: NavigationStack { OnboardingFlow() },
        requiredPath: "/api/onboarding/questions")
      try await capture("settings", view: NavigationStack { LiveSettingsView() })
      try await capture("admin", view: NavigationStack { AdminHomeView() })
      try await capture("tabs-light", view: LiveRootView().preferredColorScheme(.light))
      try await capture("tabs-dark", view: LiveRootView().preferredColorScheme(.dark))
    }
  #endif

}

final class InterfaceCopyTests: XCTestCase {
  func testRemovesKoreanSentencePeriodsButPreservesDecimalsAndLinks() {
    XCTAssertEqual(interfaceCopy("선택했어요. 함께 살펴봐요."), "선택했어요\n함께 살펴봐요")
    XCTAssertEqual(interfaceCopy("46.2% · https://ethica.example.com"), "46.2% · https://ethica.example.com")
  }
  func testPreservesParagraphsAndQuestionMarks() {
    XCTAssertEqual(interfaceCopy("왜 그럴까요?\n\n함께 살펴봐요."), "왜 그럴까요?\n\n함께 살펴봐요")
    XCTAssertEqual(interfaceCopy("선택했어요.\n다음 문장이에요."), "선택했어요\n다음 문장이에요")
  }
}
