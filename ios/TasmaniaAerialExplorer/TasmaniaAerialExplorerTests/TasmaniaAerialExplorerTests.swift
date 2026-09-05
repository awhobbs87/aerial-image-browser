import Testing
@testable import TasmaniaAerialExplorer

struct TasmaniaAerialExplorerTests {
  @Test func searchQueryDefaultsToTwoKilometreRadius() async throws {
    #expect(SearchQuery.empty.radiusMeters == 2_000)
  }

  @Test func developmentEnvironmentUsesLocalAstroServer() async throws {
    #expect(AppEnvironment.development.apiBaseURL.absoluteString == "http://localhost:4321")
  }

  @Test func productionEnvironmentUsesDedicatedApiHost() async throws {
    #expect(AppEnvironment.production.apiBaseURL.absoluteString == "https://aerial-api.awhq.uk")
  }
}
