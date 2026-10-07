import AuthenticationServices
import GoogleSignIn
import KakaoSDKAuth
import KakaoSDKCommon
import KakaoSDKUser
import UIKit

struct SocialCredential {
  let idToken: String
  let credential: String
}
@MainActor
final class SocialAuthentication: NSObject, ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding
{
  private var appleContinuation: CheckedContinuation<SocialCredential, Error>?
  private var appleController: ASAuthorizationController?
  static func configure() {
    let googleID = AppConfiguration.value("GIDClientID")
    if !googleID.isEmpty {
      let serverID = AppConfiguration.value("GIDServerClientID")
      GIDSignIn.sharedInstance.configuration = GIDConfiguration(
        clientID: googleID, serverClientID: serverID.isEmpty ? nil : serverID)
    }
    let kakaoKey = AppConfiguration.value("KakaoNativeAppKey")
    if !kakaoKey.isEmpty { KakaoSDK.initSDK(appKey: kakaoKey) }
  }
  static func handle(_ url: URL) -> Bool {
    if GIDSignIn.sharedInstance.handle(url) { return true }
    if !AppConfiguration.value("KakaoNativeAppKey").isEmpty, AuthApi.isKakaoTalkLoginUrl(url) {
      return AuthController.handleOpenUrl(url: url)
    }
    return false
  }
  static func signOut() {
    GIDSignIn.sharedInstance.signOut()
    TokenManager.manager.deleteToken()
  }
  func authenticate(_ provider: SocialProvider, nonce: String) async throws -> SocialCredential {
    switch provider {
    case .apple:
      guard appleContinuation == nil else { throw error("이미 로그인을 진행 중이에요") }
      return try await withCheckedThrowingContinuation { continuation in
        appleContinuation = continuation
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = nonce
        let controller = ASAuthorizationController(authorizationRequests: [request])
        appleController = controller
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
      }
    case .google:
      guard !AppConfiguration.value("GIDClientID").isEmpty else {
        throw error("Google 로그인 설정이 준비되지 않았어요")
      }
      guard let presenter = Self.presenter else { throw error("로그인 화면을 열 수 없어요") }
      GIDSignIn.sharedInstance.signOut()
      return try await withCheckedThrowingContinuation { continuation in
        GIDSignIn.sharedInstance.signIn(
          withPresenting: presenter, hint: nil, additionalScopes: nil, nonce: nonce
        ) { result, failure in
          if let failure {
            if (failure as NSError).code == GIDSignInError.canceled.rawValue {
              continuation.resume(throwing: CancellationError())
            } else {
              continuation.resume(throwing: self.error("Google 로그인을 완료하지 못했어요. 다시 시도해주세요"))
            }
          } else if let user = result?.user, let idToken = user.idToken?.tokenString {
            continuation.resume(
              returning: SocialCredential(
                idToken: idToken, credential: user.accessToken.tokenString))
          } else {
            continuation.resume(throwing: self.error("Google 인증 정보를 받지 못했어요"))
          }
        }
      }
    case .kakao:
      guard !AppConfiguration.value("KakaoNativeAppKey").isEmpty else {
        throw error("카카오 로그인 설정이 준비되지 않았어요")
      }
      return try await withCheckedThrowingContinuation { continuation in
        let completion: (OAuthToken?, Error?) -> Void = { token, failure in
          if let failure {
            if let sdkError = failure as? SdkError, sdkError.isClientFailed,
              sdkError.getClientError().reason == .Cancelled
            {
              continuation.resume(throwing: CancellationError())
            } else {
              continuation.resume(throwing: self.error("카카오 로그인을 완료하지 못했어요. 다시 시도해주세요"))
            }
          } else if let token, let idToken = token.idToken {
            continuation.resume(
              returning: SocialCredential(idToken: idToken, credential: token.accessToken))
          } else {
            continuation.resume(throwing: self.error("카카오 ID 토큰이 없어요. OpenID Connect 설정을 확인해주세요"))
          }
        }
        if UserApi.isKakaoTalkLoginAvailable() {
          UserApi.shared.loginWithKakaoTalk(nonce: nonce, completion: completion)
        } else {
          UserApi.shared.loginWithKakaoAccount(nonce: nonce, completion: completion)
        }
      }
    }
  }
  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    defer {
      appleContinuation = nil
      appleController = nil
    }
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
      let tokenData = credential.identityToken,
      let token = String(data: tokenData, encoding: .utf8),
      let codeData = credential.authorizationCode,
      let code = String(data: codeData, encoding: .utf8)
    else {
      appleContinuation?.resume(throwing: error("Apple 인증 정보를 받지 못했어요"))
      return
    }
    appleContinuation?.resume(returning: SocialCredential(idToken: token, credential: code))
  }
  func authorizationController(
    controller: ASAuthorizationController, didCompleteWithError failure: Error
  ) {
    let cancelled = (failure as? ASAuthorizationError)?.code == .canceled
    appleContinuation?.resume(
      throwing: cancelled ? CancellationError() : error("Apple 로그인을 완료하지 못했어요. 다시 시도해주세요"))
    appleContinuation = nil
    appleController = nil
  }
  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    Self.window ?? ASPresentationAnchor()
  }
  private static var window: UIWindow? {
    UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.filter {
      $0.activationState == .foregroundActive
    }.flatMap(\.windows).first(where: \.isKeyWindow)
  }
  private static var presenter: UIViewController? {
    var root = window?.rootViewController
    while let presented = root?.presentedViewController { root = presented }
    return root
  }
  nonisolated private func error(_ text: String) -> APIError {
    APIError(status: 0, code: "SOCIAL_LOGIN", message: text)
  }
}
