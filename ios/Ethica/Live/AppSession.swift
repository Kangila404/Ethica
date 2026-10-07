import SwiftUI
import WidgetKit

@MainActor final class AppSession: ObservableObject {
  enum Phase: Equatable { case loading, signedOut, onboarding, ready, unavailable }
  @Published var phase: Phase = .loading
  @Published var user: UserProfile?
  @Published var provider: SocialProvider?
  @Published var errorMessage: String?
  @Published var busy = false
  @Published var showLogin = false
  @Published var selectedTab = 0
  @Published var analysisSection = 0
  @Published var analysisPeriod = 1
  @Published var generation = UUID()
  let api: APIClient
  private let social = SocialAuthentication()
  #if DEBUG
    private var appliedLaunchReset = false
  #endif
  init(api: APIClient = .shared) { self.api = api }
  func restore() async {
    #if DEBUG
      // Explicit, one-launch reset for checking the real first-run flow on a device.
      // Account answers and onboarding state remain on the server.
      if !appliedLaunchReset && ProcessInfo.processInfo.arguments.contains("-reset-local-session") {
        appliedLaunchReset = true
        UserDefaults.standard.set(false, forKey: "ethica.hasSeenWelcomeIntro")
        await reset()
        return
      }
    #endif
    do {
      guard let saved = try await api.restore() else {
        WidgetSnapshot.clear()
        phase = .signedOut
        return
      }
      provider = saved.provider
      try await reloadProfile()
    } catch {
      await report(error)
      if phase != .signedOut { phase = .unavailable }
    }
  }
  func reloadProfile() async throws {
    let profile: UserProfile = try await api.get("users/me")
    user = profile
    showLogin = false
    PushNotifications.shared.setPreference(profile.notificationEnabled)
    phase = profile.onboardingStatus == "complete" ? .ready : .onboarding
    if profile.userRole != "admin" && selectedTab == 4 { selectedTab = 0 }
    if profile.notificationEnabled { await PushNotifications.shared.sync(api: api) }
  }
  static let aiConsentVersion = "2026-10-02"
  var hasAiConsent: Bool { user?.aiConsentVersion == Self.aiConsentVersion }
  func setAiConsent(_ enabled: Bool) async throws {
    let profile: UserProfile = try await api.send("users/me/ai-consent", method: "PATCH",
      body: ["enabled": .bool(enabled), "version": .string(Self.aiConsentVersion)])
    user = profile
  }
  func login(_ provider: SocialProvider) async {
    guard !busy else { return }
    busy = true
    defer { busy = false }
    do {
      let challenge: Challenge = try await api.send(
        "auth/social/challenge", body: ["provider": .string(provider.rawValue)],
        authenticated: false)
      let credential = try await social.authenticate(provider, nonce: challenge.nonce)
      let tokens: TokenResponse = try await api.send(
        "auth/login/social",
        body: [
          "provider": .string(provider.rawValue), "challengeId": .string(challenge.challengeId),
          "idToken": .string(credential.idToken),
        ], authenticated: false)
      try await api.install(tokens, provider: provider)
      self.provider = provider
      generation = UUID()
      do { try await reloadProfile() } catch {
        phase = .unavailable
        throw error
      }
    } catch is CancellationError {} catch { await report(error) }
  }
  func logout() async {
    guard !busy else { return }
    busy = true
    defer { busy = false }
    do {
      // Disable delivery before ending the session; failed requests leave a retryable screen.
      if user?.notificationEnabled == true {
        try await api.mutate(
          "users/me/notification", method: "PATCH", body: ["notificationEnabled": .bool(false)])
      }
      if let saved = await api.currentSession() {
        try await api.mutate(
          "auth/logout", body: ["refreshToken": .string(saved.tokens.refreshToken)],
          authenticated: false)
      }
      await reset()
    } catch { await report(error) }
  }
  func withdraw() async {
    guard !busy, let provider else { return }
    busy = true
    defer { busy = false }
    do {
      let challenge: Challenge = try await api.send(
        "auth/social/challenge", body: ["provider": .string(provider.rawValue)],
        authenticated: false)
      let credential = try await social.authenticate(provider, nonce: challenge.nonce)
      try await api.mutate(
        "users/me", method: "DELETE",
        body: [
          "provider": .string(provider.rawValue), "challengeId": .string(challenge.challengeId),
          "idToken": .string(credential.idToken), "credential": .string(credential.credential),
        ])
      await reset()
    } catch is CancellationError {} catch { await report(error) }
  }
  func reset() async {
    await api.clear()
    PushNotifications.shared.setPreference(false)
    await PushNotifications.shared.clearDailyAlerts()
    SocialAuthentication.signOut()
    WidgetSnapshot.clear()
    user = nil
    showLogin = false
    provider = nil
    selectedTab = 0
    generation = UUID()
    phase = .signedOut
  }
  func report(_ error: Error) async {
    if error is CancellationError { return }
    if let apiError = error as? APIError, apiError.status == 401, await api.currentSession() == nil
    {
      await reset()
    }
    errorMessage = (error as? APIError)?.message ?? "연결하지 못했어요. 네트워크 상태를 확인하고 다시 시도해주세요"
  }
  func perform(_ action: () async throws -> Void) async {
    guard !busy else { return }
    busy = true
    defer { busy = false }
    do { try await action() } catch { await report(error) }
  }
  func open(_ url: URL) {
    if SocialAuthentication.handle(url) { return }
    guard url.scheme == "ethica", url.host == "daily" else { return }
    selectedTab = 0
    NotificationCenter.default.post(name: .ethicaDailyOpened, object: nil)
  }
}
extension Notification.Name {
  static let ethicaDailyOpened = Notification.Name("EthicaDailyOpened")
}
