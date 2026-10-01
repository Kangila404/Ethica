import FirebaseCore
import FirebaseMessaging
import UIKit
import UserNotifications
import WidgetKit

@MainActor
final class PushNotifications: NSObject, MessagingDelegate, UNUserNotificationCenterDelegate {
  static let shared = PushNotifications()
  private(set) var configured = false
  private var token: String?
  func configure() {
    UNUserNotificationCenter.current().delegate = self
    let open = UNNotificationAction(
      identifier: "OPEN_DAILY", title: "문제 풀기", options: [.foreground])
    UNUserNotificationCenter.current().setNotificationCategories([
      UNNotificationCategory(
        identifier: "DAILY_QUESTION", actions: [open], intentIdentifiers: [], options: [])
    ])
    guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
      let options = FirebaseOptions(contentsOfFile: path)
    else { return }
    FirebaseApp.configure(options: options)
    configured = true
    Messaging.messaging().delegate = self
  }
  func setPreference(_ enabled: Bool) {
    UserDefaults.standard.set(enabled, forKey: "ethica.dailyAlertsEnabled")
  }
  func clearDailyAlerts() async {
    let center = UNUserNotificationCenter.current()
    let delivered = await center.deliveredNotifications()
    center.removeDeliveredNotifications(
      withIdentifiers: delivered.filter {
        $0.request.content.userInfo["type"] as? String == "daily_question"
      }.map { $0.request.identifier })
    let pending = await center.pendingNotificationRequests()
    center.removePendingNotificationRequests(
      withIdentifiers: pending.filter {
        $0.content.userInfo["type"] as? String == "daily_question"
      }.map(\.identifier))
  }
  func requestPermission() async throws -> Bool {
    try await UNUserNotificationCenter.current().requestAuthorization(options: [
      .alert, .badge, .sound,
    ])
  }
  func register(api: APIClient) async throws {
    guard configured else {
      throw APIError(
        status: 0, code: "PUSH_NOT_CONFIGURED", message: "알림 연결을 준비하고 있어요. 질문은 앱에서 확인할 수 있습니다.")
    }
    UIApplication.shared.registerForRemoteNotifications()
    if let token {
      try await api.mutate(
        "users/me/fcm-token", method: "PATCH", body: ["fcmToken": .string(token)])
    }
  }
  func sync(api: APIClient) async {
    guard configured else { return }
    let permission = await UNUserNotificationCenter.current().notificationSettings()
    guard [.authorized, .provisional].contains(permission.authorizationStatus) else { return }
    try? await register(api: api)
  }
  nonisolated func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?)
  {
    Task { @MainActor in
      self.token = fcmToken
      guard let fcmToken, await APIClient.shared.currentSession() != nil else { return }
      // Do not re-enable notifications or associate a token before authentication.
      if let profile: UserProfile = try? await APIClient.shared.get("users/me"),
        profile.notificationEnabled
      {
        try? await APIClient.shared.mutate(
          "users/me/fcm-token", method: "PATCH", body: ["fcmToken": .string(fcmToken)])
      }
    }
  }
  nonisolated func userNotificationCenter(
    _ center: UNUserNotificationCenter, willPresent notification: UNNotification
  ) async -> UNNotificationPresentationOptions {
    let enabled = await MainActor.run {
      UserDefaults.standard.bool(forKey: "ethica.dailyAlertsEnabled")
    }
    return enabled ? [.banner, .sound] : []
  }
  nonisolated func userNotificationCenter(
    _ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse
  ) async {
    guard response.notification.request.content.userInfo["type"] as? String == "daily_question"
    else { return }
    await MainActor.run { NotificationCenter.default.post(name: .ethicaDailyOpened, object: nil) }
    WidgetCenter.shared.reloadAllTimelines()
  }
}
final class EthicaAppDelegate: NSObject, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    guard !AppConfiguration.onboardingPreview else { return true }
    SocialAuthentication.configure()
    PushNotifications.shared.configure()
    return true
  }
  func application(
    _ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    guard PushNotifications.shared.configured else { return }
    Messaging.messaging().apnsToken = deviceToken
  }
}
