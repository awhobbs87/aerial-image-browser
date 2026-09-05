import SwiftUI

struct AppRootView: View {
  let environment: AppEnvironment

  var body: some View {
    let apiClient = APIClient(
      baseURL: environment.apiBaseURL,
      accessClientID: environment.accessClientID,
      accessClientSecret: environment.accessClientSecret
    )

    TabView {
      Tab("Map", systemImage: "map") {
        NavigationStack {
          ExplorerMapView(apiClient: apiClient)
        }
      }

      Tab("Search", systemImage: "magnifyingglass") {
        NavigationStack {
          SearchHomeView(apiClient: apiClient)
        }
      }

      Tab("Timeline", systemImage: "clock") {
        NavigationStack {
          TimelineHomeView()
        }
      }

      Tab("Saved", systemImage: "bookmark") {
        NavigationStack {
          SavedHomeView()
        }
      }
    }
  }
}

#Preview {
  AppRootView(environment: .development)
}
