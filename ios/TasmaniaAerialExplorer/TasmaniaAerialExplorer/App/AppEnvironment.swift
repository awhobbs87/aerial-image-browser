import Foundation

struct AppEnvironment: Sendable {
  let apiBaseURL: URL
  let accessClientID: String?
  let accessClientSecret: String?

  static let development = AppEnvironment(
    apiBaseURL: URL(string: "http://localhost:4321")!,
    accessClientID: nil,
    accessClientSecret: nil
  )

  static let staging = AppEnvironment(
    apiBaseURL: URL(string: "https://aerial-api.awhq.uk")!,
    accessClientID: nil,
    accessClientSecret: nil
  )

  static let production = AppEnvironment(
    apiBaseURL: URL(string: "https://aerial-api.awhq.uk")!,
    accessClientID: nil,
    accessClientSecret: nil
  )

  static var current: AppEnvironment {
    let info = Bundle.main.infoDictionary ?? [:]
    let configuredURL = clean(info["APIBaseURL"] as? String)
    let baseURL = configuredURL.flatMap(URL.init(string:)) ?? development.apiBaseURL

    return AppEnvironment(
      apiBaseURL: baseURL,
      accessClientID: clean(info["CFAccessClientID"] as? String),
      accessClientSecret: clean(info["CFAccessClientSecret"] as? String)
    )
  }

  private static func clean(_ value: String?) -> String? {
    guard let value else { return nil }
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty || trimmed.hasPrefix("$(") {
      return nil
    }
    return trimmed
  }
}
