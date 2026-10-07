import XCTest
import UIKit

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
      for _ in 0..<8 {
        // isHittable can be true for a row partially behind the floating tab bar.
        if person.isHittable && person.frame.midY < app.tabBars.firstMatch.frame.minY - 8 { break }
        app.swipeUp()
      }
      XCTAssertTrue(person.isHittable)
      XCTAssertLessThan(person.frame.midY, app.tabBars.firstMatch.frame.minY - 8)
      person.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5)).tap()
      XCTAssertTrue(app.navigationBars[name].waitForExistence(timeout: 20), name)
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
