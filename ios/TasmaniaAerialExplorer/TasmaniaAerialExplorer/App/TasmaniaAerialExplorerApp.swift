import SwiftUI

@main
struct TasmaniaAerialExplorerApp: App {
  @State private var environment = AppEnvironment.current

  var body: some Scene {
    WindowGroup {
      AppRootView(environment: environment)
    }
  }
}
