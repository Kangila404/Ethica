import XCTest
import UIKit
import Vision

final class NavigationFlowTests: XCTestCase {
  private let postTitle = "칸트의 생애: 쾨니히스베르크에서 시작된 비판"

  private func enterGuest(apiURL: String = "http://localhost:3819/api/") -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-reset-local-session"]
    app.launchEnvironment["ETHICA_API_URL"] = apiURL
    app.launch()
    for title in ["안녕하세요!", "네, 그럴 때가 있어요", "맞아요", "어디서 시작하나요?", "그다음은요?", "함께 해볼게요", "에티카 시작하기"] {
      let button = app.buttons[title]
      XCTAssertTrue(button.waitForExistence(timeout: 15), title)
      reveal(app, button)
      button.tap()
    }
    let guest = app.buttons["browseWithoutLogin"]
    XCTAssertTrue(guest.waitForExistence(timeout: 15))
    reveal(app, guest)
    guest.tap()
    XCTAssertTrue(app.buttons["learning.person.1"].waitForExistence(timeout: 15))
    return app
  }

  private func openProfile(_ app: XCUIApplication, id: String, name: String) {
    let person = app.buttons["learning.person.\(id)"]
    XCTAssertTrue(person.waitForExistence(timeout: 10))
    person.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: 0.5)).tap()
    // The profile route and its title must appear while its API is still loading.
    XCTAssertTrue(app.navigationBars[name].waitForExistence(timeout: 1))
    XCTAssertTrue(app.descendants(matching: .any)["learning.profile.loading"].exists)
    capture(app, "profile-loading-\(id)")
    XCTAssertTrue(app.buttons["사상의 뿌리"].waitForExistence(timeout: 15))
  }

  private func openPost(_ app: XCUIApplication, id: String) {
    let post = app.buttons["learning.post.\(id)"]
    for _ in 0..<8 {
      if post.isHittable { break }
      app.swipeUp()
    }
    XCTAssertTrue(post.isHittable)
    post.tap()
    XCTAssertTrue(app.navigationBars["읽기"].waitForExistence(timeout: 10))
    assertPage(app, 1)
  }

  private func assertPage(_ app: XCUIApplication, _ page: Int) {
    XCTAssertTrue(app.staticTexts["\(page) / 4"].waitForExistence(timeout: 10))
    let body = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "PAGE \(page)\n")).firstMatch
    XCTAssertTrue(body.waitForExistence(timeout: 10), "Visible content must match counter \(page)")
  }

  func testGuestSingleTapNavigationAndReaderLifecycle() {
    let app = enterGuest()
    openProfile(app, id: "1", name: "임마누엘 칸트")
    openPost(app, id: "6")
    capture(app, "reader-first-page")
    app.buttons["다음"].tap()
    assertPage(app, 2)
    app.buttons["이전"].tap()
    assertPage(app, 1)
    app.buttons["다음"].tap(withNumberOfTaps: 3, numberOfTouches: 1)
    assertPage(app, 4)
    XCTAssertFalse(app.buttons["다음"].isEnabled)
    app.buttons["이전"].tap(withNumberOfTaps: 3, numberOfTouches: 1)
    assertPage(app, 1)
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.48))
      .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.88, dy: 0.48)))
    assertPage(app, 1)
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.48))
      .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.48)))
    assertPage(app, 2)
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.48))
      .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.48)))
    assertPage(app, 1)
    let sources = app.buttons["출처 보기"].firstMatch
    for _ in 0..<4 {
      if sources.isHittable { break }
      app.swipeUp()
    }
    sources.tap()
    XCTAssertTrue(app.navigationBars["출처 및 이용 조건"].waitForExistence(timeout: 5))
    capture(app, "sources")
    app.buttons["닫기"].tap()
    app.navigationBars.buttons.element(boundBy: 0).tap()
    XCTAssertTrue(app.navigationBars["임마누엘 칸트"].waitForExistence(timeout: 10))
    openPost(app, id: "7")
    app.navigationBars.buttons.element(boundBy: 0).tap()
    app.navigationBars.buttons.element(boundBy: 0).tap()
    openProfile(app, id: "2", name: "존 스튜어트 밀")
    openPost(app, id: "8")
    capture(app, "other-author-reader")
  }

  func testLearningRefreshKeepsHeaderAndNavigation() throws {
    let app = enterGuest()
    let title = app.navigationBars["학습"].staticTexts["학습"]
    let search = app.searchFields.firstMatch
    let categories = app.segmentedControls.firstMatch
    capture(app, "refresh-before")
    try assertLearningTitleIsDrawn(app)
    let initialCategoriesY = categories.frame.minY
    for turn in 0..<4 {
      app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.38))
        .press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.83)))
      XCTAssertTrue(title.waitForExistence(timeout: 5))
      print("Refresh \(turn): title=\(title.frame), search=\(search.frame), categories=\(categories.frame)")
      XCTAssertTrue(title.isHittable, "Learning title must remain visible after refresh")
      XCTAssertLessThanOrEqual(title.frame.maxY, search.frame.minY + 1)
      XCTAssertEqual(categories.frame.minY, initialCategoriesY, accuracy: 1)
      capture(app, "refresh-after-\(turn)")
      try assertLearningTitleIsDrawn(app)
    }
    // A short pull that does not trigger refresh must preserve the same header too.
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.4))
      .press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.42)))
    try assertLearningTitleIsDrawn(app)
    XCTAssertEqual(categories.frame.minY, initialCategoriesY, accuracy: 1)
    openProfile(app, id: "1", name: "임마누엘 칸트")
  }

  func testLearningContentStartsBelowNavigationAndEndsAboveTabs() {
    let app = enterGuest()
    let catalogBar = app.navigationBars["학습"]
    XCTAssertTrue(catalogBar.exists)
    let search = app.searchFields.firstMatch
    XCTAssertTrue(search.waitForExistence(timeout: 5))
    let categories = app.segmentedControls.firstMatch
    XCTAssertTrue(categories.exists)
    XCTAssertGreaterThanOrEqual(categories.frame.minY, search.frame.maxY)
    let person = app.buttons["learning.person.1"]
    XCTAssertGreaterThanOrEqual(person.frame.minY, categories.frame.maxY)
    capture(app, "safe-area-catalog-top")

    openProfile(app, id: "1", name: "임마누엘 칸트")
    let name = app.staticTexts["learning.profile.name"]
    XCTAssertTrue(name.waitForExistence(timeout: 5))
    XCTAssertGreaterThanOrEqual(name.frame.minY, app.navigationBars.firstMatch.frame.maxY)
    capture(app, "safe-area-profile-top")

    openPost(app, id: "6")
    let counter = app.staticTexts["learning.reader.pageCount"]
    let title = app.staticTexts["learning.reader.title"]
    XCTAssertTrue(counter.exists)
    XCTAssertTrue(title.waitForExistence(timeout: 5))
    XCTAssertGreaterThanOrEqual(counter.frame.minY, app.navigationBars.firstMatch.frame.maxY)
    XCTAssertGreaterThanOrEqual(title.frame.minY, counter.frame.maxY)
    for label in ["이전", "다음"] {
      XCTAssertLessThanOrEqual(app.buttons[label].frame.maxY, app.tabBars.firstMatch.frame.minY)
    }
    capture(app, "safe-area-reader-top")
    app.buttons["다음"].tap()
    assertPage(app, 2)
    app.buttons["이전"].tap()
    assertPage(app, 1)
    XCTAssertGreaterThanOrEqual(title.frame.minY, counter.frame.maxY)
    app.navigationBars.buttons.element(boundBy: 0).tap()
    XCTAssertTrue(name.waitForExistence(timeout: 5))
    XCTAssertGreaterThanOrEqual(name.frame.minY, app.navigationBars.firstMatch.frame.maxY)
  }

  func testGuestConfirmationPreservesReaderAndLoginDismissal() {
    let app = enterGuest()
    openProfile(app, id: "1", name: "임마누엘 칸트")
    openPost(app, id: "6")
    app.buttons["다음"].tap()
    assertPage(app, 2)
    for tab in ["오늘", "분석", "보관함"] {
      app.tabBars.buttons[tab].tap()
      let alert = app.alerts["로그인이 필요한 기능이에요"]
      XCTAssertTrue(alert.waitForExistence(timeout: 5))
      XCTAssertFalse(app.buttons["Apple로 로그인"].exists)
      capture(app, "confirm-\(tab)")
      alert.buttons["취소"].tap()
      assertPage(app, 2)
      XCTAssertTrue(app.tabBars.buttons["학습"].isSelected)
    }
    app.buttons["좋아요"].tap()
    let alert = app.alerts["로그인이 필요한 기능이에요"]
    XCTAssertTrue(alert.waitForExistence(timeout: 5))
    XCTAssertTrue(alert.staticTexts["로그인하면 마음에 드는 글에 좋아요를 남길 수 있어요."].exists)
    alert.buttons["취소"].tap()
    assertPage(app, 2)
    app.buttons["좋아요"].tap()
    alert.buttons["로그인"].tap()
    XCTAssertTrue(app.buttons["Apple로 로그인"].waitForExistence(timeout: 10))
    XCTAssertFalse(alert.exists)
    capture(app, "login-after-confirmation")
    app.buttons["닫기"].tap()
    assertPage(app, 2)
    capture(app, "reader-after-login-dismissal")
  }


  // Read-only live investigation; CI selects the two deterministic fixture tests below.
  func testLiveCatalogRowsAndSearchSingleTap() {
    let app = enterGuest(apiURL: "https://ethica.kro.kr/api/")
    for (id, name) in [("1", "임마누엘 칸트"), ("2", "존 스튜어트 밀"), ("3", "아리스토텔레스"), ("4", "존 롤스"), ("5", "에픽테토스"), ("6", "소크라테스")] {
      let person = app.buttons["learning.person.\(id)"]
      for _ in 0..<16 {
        // Keep the full hit point between the sticky header and floating tab bar.
        if person.exists && person.isHittable && person.frame.midY > app.navigationBars.firstMatch.frame.maxY + 8 && person.frame.midY < app.tabBars.firstMatch.frame.minY - 8 { break }
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.7))
          .press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55)))
      }
      XCTAssertTrue(person.isHittable)
      XCTAssertLessThan(person.frame.midY, app.tabBars.firstMatch.frame.minY - 8)
      print("Live row \(id): \(person.frame), navigation: \(app.navigationBars.firstMatch.frame), tabs: \(app.tabBars.firstMatch.frame)")
      capture(app, "live-row-before-\(id)")
      person.tap() // Use the visible hit point rather than a potentially clipped row center.
      guard app.navigationBars[name].waitForExistence(timeout: 20) else {
        capture(app, "live-row-failed-\(id)")
        XCTFail("Single tap did not open \(name)")
        return
      }
      capture(app, "live-profile-\(id)")
      app.navigationBars.buttons.element(boundBy: 0).tap()
      XCTAssertTrue(app.navigationBars["학습"].waitForExistence(timeout: 10))
    }
    for _ in 0..<5 { app.swipeDown() }
    let search = app.searchFields.firstMatch
    XCTAssertTrue(search.waitForExistence(timeout: 5))
    search.tap(); search.typeText("칸트")
    let person = app.buttons["learning.person.1"]
    XCTAssertTrue(person.waitForExistence(timeout: 10))
    capture(app, "live-search-before-tap")
    person.tap()
    XCTAssertTrue(app.navigationBars["임마누엘 칸트"].waitForExistence(timeout: 20))
    capture(app, "live-search-profile")
  }

  func testAccessibleReaderAndConfirmation() {
    print("System Reduce Motion: \(UIAccessibility.isReduceMotionEnabled)")
    let app = enterGuest()
    openProfile(app, id: "1", name: "임마누엘 칸트")
    openPost(app, id: "6")
    capture(app, "accessible-reader-image-and-text")
    app.buttons["다음"].tap()
    assertPage(app, 2)
    if UIAccessibility.isReduceMotionEnabled {
      app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.48))
        .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.48)))
      assertPage(app, 2) // Reduce Motion disables curling gestures; buttons still work.
    }
    app.tabBars.buttons["분석"].tap()
    let alert = app.alerts["로그인이 필요한 기능이에요"]
    XCTAssertTrue(alert.waitForExistence(timeout: 5))
    capture(app, "accessible-confirmation")
    alert.buttons["취소"].tap()
    assertPage(app, 2)
    app.buttons["좋아요"].tap()
    alert.buttons["로그인"].tap()
    let apple = app.buttons["Apple로 로그인"]
    XCTAssertTrue(apple.waitForExistence(timeout: 10))
    capture(app, "accessible-login")
    app.buttons["닫기"].tap()
    assertPage(app, 2)
  }

  // Native editor gestures in the explicit design fixture; no social account or network writes.
  func testAccountHeaderEditingAndEmptyAnalysisExplanation() {
    let app = XCUIApplication()
    app.launchArguments = ["-design-analysis"]
    app.launch()
    XCTAssertTrue(app.descendants(matching: .any)["analysis.introduction"].waitForExistence(timeout: 15))
    capture(app, "analysis-empty-explanation")
    app.buttons["내 계정"].tap()
    let avatar = app.buttons["account.editAvatar"]
    let nickname = app.buttons["account.editNickname"]
    XCTAssertTrue(avatar.waitForExistence(timeout: 5))
    XCTAssertTrue(nickname.exists)
    XCTAssertFalse(app.buttons["프로필 이미지"].exists)
    capture(app, "account-direct-edit-header")
    avatar.tap()
    XCTAssertTrue(app.navigationBars["프로필 이미지"].waitForExistence(timeout: 5))
    XCTAssertFalse(app.navigationBars["닉네임 변경"].exists)
    app.buttons["책"].tap()
    capture(app, "account-avatar-editor")
    app.buttons["저장"].tap()
    XCTAssertTrue(nickname.waitForExistence(timeout: 5))
    let originalName = nickname.label
    nickname.tap()
    XCTAssertTrue(app.navigationBars["닉네임 변경"].waitForExistence(timeout: 5))
    app.buttons["취소"].tap()
    XCTAssertEqual(nickname.label, originalName)
    nickname.tap()
    let field = app.textFields["닉네임"]
    XCTAssertTrue(field.waitForExistence(timeout: 5))
    field.tap()
    field.typeText(" 테스트")
    app.buttons["저장"].tap()
    XCTAssertTrue(nickname.waitForExistence(timeout: 5))
    XCTAssertTrue(nickname.label.contains("테스트"))
    capture(app, "account-edited-header")
    app.buttons["완료"].tap()
    XCTAssertTrue(app.descendants(matching: .any)["analysis.introduction"].waitForExistence(timeout: 5))
    app.buttons["AI 분석하기"].tap()
    XCTAssertTrue(app.staticTexts["해석 완료"].waitForExistence(timeout: 10))
    XCTAssertFalse(app.descendants(matching: .any)["analysis.introduction"].exists)
  }

  private func assertLearningTitleIsDrawn(_ app: XCUIApplication) throws {
    let frame = app.navigationBars["학습"].staticTexts["학습"].frame
    let screen = app.frame
    let request = VNRecognizeTextRequest()
    request.recognitionLanguages = ["ko-KR"]
    request.usesLanguageCorrection = false
    request.minimumTextHeight = 0
    let region = frame.insetBy(dx: -4, dy: -4).intersection(screen)
    request.regionOfInterest = CGRect(x: region.minX / screen.width,
      y: 1 - region.maxY / screen.height, width: region.width / screen.width, height: region.height / screen.height)
    let image = try XCTUnwrap(app.screenshot().image.cgImage)
    try VNImageRequestHandler(cgImage: image).perform([request])
    let drawn = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined()
    XCTAssertTrue(drawn.contains("학습"), "The accessibility title existed while its pixels were clipped: \(drawn)")
  }

  func testProfilePortraitOpensZoomsAndReturnsToSameProfile() {
    let app = enterGuest()
    openProfile(app, id: "1", name: "임마누엘 칸트")
    let portrait = app.buttons["learning.profile.portrait"]
    XCTAssertTrue(portrait.waitForExistence(timeout: 5))
    let originalFrame = portrait.frame
    portrait.tap()
    let zoom = app.scrollViews["learning.portrait.zoom"]
    XCTAssertTrue(zoom.waitForExistence(timeout: 10))
    XCTAssertEqual(zoom.value as? String, "1.0배")
    capture(app, "portrait-fullscreen")
    zoom.doubleTap()
    XCTAssertEqual(zoom.value as? String, "2.5배")
    capture(app, "portrait-zoomed")
    zoom.doubleTap()
    XCTAssertEqual(zoom.value as? String, "1.0배")
    zoom.pinch(withScale: 2, velocity: 1)
    XCTAssertNotEqual(zoom.value as? String, "1.0배")
    zoom.swipeLeft()
    app.buttons["learning.portrait.close"].tap()
    XCTAssertTrue(portrait.waitForExistence(timeout: 5))
    XCTAssertEqual(portrait.frame.minY, originalFrame.minY, accuracy: 1)
    openPost(app, id: "6")
    assertPage(app, 1)
  }

  private func reveal(_ app: XCUIApplication, _ element: XCUIElement) {
    for _ in 0..<8 {
      if element.isHittable { break }
      app.swipeUp()
    }
    XCTAssertTrue(element.isHittable)
  }

  private func capture(_ app: XCUIApplication, _ name: String) {
    let shot = XCTAttachment(screenshot: app.screenshot())
    shot.name = name; shot.lifetime = .keepAlways; add(shot)
  }
}
