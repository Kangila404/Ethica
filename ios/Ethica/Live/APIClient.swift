import Foundation
import Security

struct APIError: LocalizedError {
  let status: Int
  let code: String
  let message: String
  var errorDescription: String? { message }
  static let signedOut = APIError(
    status: 401, code: "SESSION_EXPIRED", message: "로그인이 만료됐어요. 다시 로그인해주세요.")
}
enum AppConfiguration {
  static var onboardingPreview: Bool {
    #if DEBUG && targetEnvironment(simulator)
      let arguments = ProcessInfo.processInfo.arguments
      return !arguments.contains("-live-api") && arguments.contains(where: { $0.hasPrefix("-design-") })
    #else
      return false
    #endif
  }

  static func value(_ key: String) -> String {
    let value = Bundle.main.object(forInfoDictionaryKey: key) as? String ?? ""
    return value.hasPrefix("$(") ? "" : value
  }
  static var baseURL: URL {
    #if DEBUG
      if let address = ProcessInfo.processInfo.environment["ETHICA_API_URL"],
        let url = URL(string: address)
      {
        return url
      }
      #if targetEnvironment(simulator)
        // The simulator can reach this Mac directly; do not inherit an old iPhone hotspot address.
        return URL(string: "http://localhost:3000/api/")!
      #endif
    #endif
    return URL(string: value("EthicaAPIBaseURL")) ?? URL(
      string: "https://unconfigured.invalid/api/")!
  }
  static let appGroup = "group.com.ethica.preview"
  static func imageURL(_ key: String?) -> URL? {
    guard let key, !key.isEmpty else { return nil }
    if let url = URL(string: key), url.scheme == "https" { return url }
    guard !key.contains(":"), !key.hasPrefix("/"), !key.split(separator: "/").contains("..") else { return nil }
    let configured = value("EthicaMediaBaseURL")
    let base = configured.isEmpty ? baseURL.appendingPathComponent("media", isDirectory: true) : URL(string: configured)
    guard let base else { return nil }
    #if DEBUG
      guard base.scheme == "https" || (base.scheme == "http" && base.host == baseURL.host) else { return nil }
    #else
      guard base.scheme == "https" else { return nil }
    #endif
    return base.appendingPathComponent(key)
  }
}
protocol SessionPersistence {
  func read() throws -> StoredSession?
  func write(_ session: StoredSession) throws
  func clear()
}
struct KeychainStore: SessionPersistence {
  let service: String
  init(service: String = "com.ethica.session") { self.service = service }
  private var query: [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
      kSecAttrAccount as String: "session",
    ]
  }
  func read() throws -> StoredSession? {
    var q = query
    q[kSecReturnData as String] = true
    q[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(q as CFDictionary, &result)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = result as? Data else {
      throw APIError(
        status: 0, code: "KEYCHAIN", message: "저장된 로그인 정보를 읽을 수 없어요. 기기 잠금을 해제하고 다시 시도해주세요.")
    }
    return try JSONDecoder().decode(StoredSession.self, from: data)
  }
  func write(_ session: StoredSession) throws {
    let data = try JSONEncoder().encode(session)
    let update = SecItemUpdate(
      query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
    if update == errSecSuccess { return }
    guard update == errSecItemNotFound else { throw storageError }
    var q = query
    q[kSecValueData as String] = data
    q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess else { throw storageError }
  }
  func clear() { SecItemDelete(query as CFDictionary) }
  private var storageError: APIError {
    APIError(status: 0, code: "KEYCHAIN", message: "로그인 정보를 안전하게 저장하지 못했어요.")
  }
}

actor APIClient {
  static let shared = APIClient()
  let baseURL: URL
  private let transport: URLSession
  private let keychain: any SessionPersistence
  private var session: StoredSession?
  #if DEBUG && !SWIFT_PACKAGE
    private var adminPreview: AdminPreviewData?
    func enableAdminPreview() { adminPreview = AdminPreviewData() }
  #endif
  private var revision = 0
  private var refreshTask: Task<StoredSession, Error>?
  init(
    baseURL: URL = AppConfiguration.baseURL, transport: URLSession = .shared,
    keychain: any SessionPersistence = KeychainStore()
  ) {
    self.baseURL = baseURL
    self.transport = transport
    self.keychain = keychain
  }
  func restore() throws -> StoredSession? {
    session = try keychain.read()
    return session
  }
  func currentSession() -> StoredSession? { session }
  func install(_ tokens: TokenResponse, provider: SocialProvider) throws {
    let value = StoredSession(tokens: tokens, provider: provider)
    try keychain.write(value)
    revision += 1
    refreshTask?.cancel()
    refreshTask = nil
    session = value
  }
  func clear() {
    revision += 1
    refreshTask?.cancel()
    refreshTask = nil
    session = nil
    keychain.clear()
  }
  func get<T: Decodable>(_ path: String, authenticated: Bool = true) async throws -> T {
    try await request(path, authenticated: authenticated)
  }
  func send<T: Decodable>(
    _ path: String, method: String = "POST", body: [String: JSONValue] = [:],
    authenticated: Bool = true
  ) async throws -> T {
    try await request(path, method: method, body: body, authenticated: authenticated)
  }
  func mutate(
    _ path: String, method: String = "POST", body: [String: JSONValue] = [:],
    authenticated: Bool = true
  ) async throws {
    let _ = try await data(path, method: method, body: body, authenticated: authenticated)
  }
  func uploadImage(_ jpeg: Data) async throws -> String {
    guard !jpeg.isEmpty, jpeg.count <= 8 * 1024 * 1024 else {
      throw APIError(status: 0, code: "IMAGE_SIZE", message: "이미지는 8MB 이하로 올려주세요")
    }
    let boundary = "Ethica-" + UUID().uuidString
    var payload = Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"image.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".utf8)
    payload.append(jpeg)
    payload.append(Data("\r\n--\(boundary)--\r\n".utf8))
    let response = try await data("admin/media", method: "POST", body: nil, authenticated: true,
      rawBody: payload, contentType: "multipart/form-data; boundary=\(boundary)")
    struct Upload: Decodable { let imageKey: String }
    return try JSONDecoder().decode(Upload.self, from: response).imageKey
  }
  private func request<T: Decodable>(
    _ path: String, method: String = "GET", body: [String: JSONValue]? = nil, authenticated: Bool
  ) async throws -> T {
    let payload = try await data(path, method: method, body: body, authenticated: authenticated)
    do { return try JSONDecoder().decode(T.self, from: payload) } catch {
      throw APIError(status: 0, code: "RESPONSE_FORMAT", message: "내용을 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
    }
  }
  private func data(_ path: String, method: String, body: [String: JSONValue]?, authenticated: Bool, rawBody: Data? = nil, contentType: String? = nil)
    async throws -> Data
  {
    #if DEBUG && !SWIFT_PACKAGE
      if let adminPreview {
        return try await adminPreview.respond(path, method: method, body: body ?? [:])
      }
    #endif
    let initialRevision = revision
    if authenticated, let token = session?.tokens.accessToken, Self.expiresSoon(token) {
      try await refresh()
    }
    let access = session?.tokens.accessToken
    if authenticated && access == nil { throw APIError.signedOut }
    do {
      let result = try await perform(
        path, method: method, body: body, access: authenticated ? access : nil, rawBody: rawBody, contentType: contentType)
      if authenticated && revision != initialRevision { throw CancellationError() }
      return result
    } catch let error as APIError where error.status == 401 && authenticated {
      guard revision == initialRevision, session != nil else { throw APIError.signedOut }
      // Withdrawal 401 may mean a different social account, not an expired app JWT.
      if method == "DELETE" && path == "users/me" { throw error }
      // Another request may have already rotated the token.
      if session?.tokens.accessToken == access { try await refresh() }
      guard revision == initialRevision, let token = session?.tokens.accessToken else {
        throw APIError.signedOut
      }
      do {
        let result = try await perform(path, method: method, body: body, access: token, rawBody: rawBody, contentType: contentType)
        guard revision == initialRevision else { throw CancellationError() }
        return result
      } catch let retry as APIError where retry.status == 401 {
        guard revision == initialRevision else { throw CancellationError() }
        clear()
        throw APIError.signedOut
      }
    }
  }
  static func expiresSoon(_ token: String) -> Bool {
    let parts = token.split(separator: ".")
    guard parts.count == 3 else { return false }
    var payload = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(
      of: "_", with: "/")
    payload += String(repeating: "=", count: (4 - payload.count % 4) % 4)
    guard let data = Data(base64Encoded: payload),
      let json = try? JSONDecoder().decode([String: JSONValue].self, from: data),
      case .number(let expiry) = json["exp"]
    else { return false }
    // Expiry is only a scheduling hint. Server signature validation remains authoritative.
    return expiry < Date().timeIntervalSince1970 + 30
  }
  private func refresh() async throws {
    guard let existing = session else { throw APIError.signedOut }
    let generation = revision
    let task: Task<StoredSession, Error>
    if let inFlight = refreshTask {
      task = inFlight
    } else {
      task = Task<StoredSession, Error> {
        let data = try await self.perform(
          "auth/token/refresh", method: "POST",
          body: ["refreshToken": .string(existing.tokens.refreshToken)], access: nil)
        return StoredSession(
          tokens: try JSONDecoder().decode(TokenResponse.self, from: data),
          provider: existing.provider)
      }
      refreshTask = task
    }
    do {
      let updated = try await task.value
      guard generation == revision, !Task.isCancelled else { throw APIError.signedOut }
      try keychain.write(updated)
      session = updated
      refreshTask = nil
    } catch {
      if generation == revision {
        refreshTask = nil
        if let error = error as? APIError, [400, 401, 403].contains(error.status) { clear() }
      }
      throw error
    }
  }
  private func perform(_ path: String, method: String, body: [String: JSONValue]?, access: String?, rawBody: Data? = nil, contentType: String? = nil)
    async throws -> Data
  {
    guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL, url.host == baseURL.host,
      url.scheme == baseURL.scheme
    else { throw APIError(status: 0, code: "URL", message: "서비스에 연결할 수 없어요. 잠시 후 다시 시도해주세요.") }
    #if !DEBUG
      guard url.scheme == "https" else {
        throw APIError(status: 0, code: "HTTPS", message: "보안 연결을 사용할 수 없어요.")
      }
    #endif
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.timeoutInterval = 75
    request.cachePolicy = .reloadIgnoringLocalCacheData
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let access { request.setValue("Bearer \(access)", forHTTPHeaderField: "Authorization") }
    if let rawBody {
      request.httpBody = rawBody
      request.setValue(contentType, forHTTPHeaderField: "Content-Type")
    } else if let body {
      request.httpBody = try JSONEncoder().encode(body)
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }
    let (data, response) = try await transport.data(for: request)
    guard let response = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
    guard (200..<300).contains(response.statusCode) else {
      let payload = (try? JSONDecoder().decode([String: JSONValue].self, from: data)) ?? [:]
      let message =
        payload["message"]?.text.isEmpty == false
        ? payload["message"]!.text : payload["message"]?.array.map(\.text).joined(separator: "\n")
      throw APIError(
        status: response.statusCode, code: payload["code"]?.text ?? "HTTP_ERROR",
        message: message?.isEmpty == false ? message! : "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.")
    }
    return data
  }
}
