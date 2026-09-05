import XCTest

final class TasmaniaAerialExplorerUITests: XCTestCase {
  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testAppLaunchesToTabShell() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.tabBars.buttons["Map"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.tabBars.buttons["Search"].exists)
    XCTAssertTrue(app.tabBars.buttons["Timeline"].exists)
    XCTAssertTrue(app.tabBars.buttons["Saved"].exists)
  }
}

