import SwiftUI

struct SearchHomeView: View {
  let apiClient: APIClient

  @State private var query = ""
  @State private var healthState = HealthState.idle
  @State private var layersState = LoadState<[Layer]>.idle
  @State private var searchState = LoadState<PhotoSearchResponse>.idle

  var body: some View {
    List {
      Section("Backend") {
        HealthStatusRow(state: healthState) {
          await checkHealth()
        }
      }

      Section("Layers") {
        switch layersState {
        case .idle, .loading:
          Label("Loading layers", systemImage: "arrow.triangle.2.circlepath")
            .foregroundStyle(.secondary)
        case let .loaded(layers):
          ForEach(layers) { layer in
            VStack(alignment: .leading, spacing: 2) {
              Text(layer.name)
              if let description = layer.description {
                Text(description)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }
        case let .failed(message):
          Label(message, systemImage: "exclamationmark.triangle.fill")
            .foregroundStyle(.orange)
        }
      }

      Section("Search") {
        Button {
          Task {
            await searchHuonville()
          }
        } label: {
          Label("Search Huonville", systemImage: "mappin.and.ellipse")
        }

        switch searchState {
        case .idle:
          Text("Run a location search to verify the native `/api/v1` bridge.")
            .foregroundStyle(.secondary)
        case .loading:
          Label("Searching", systemImage: "arrow.triangle.2.circlepath")
            .foregroundStyle(.secondary)
        case let .loaded(response):
          ForEach(response.photos.prefix(20)) { photo in
            PhotoResultRow(photo: photo)
          }
        case let .failed(message):
          Label(message, systemImage: "exclamationmark.triangle.fill")
            .foregroundStyle(.orange)
        }
      }

      Section("Recent") {
        ForEach(["Hobart", "Huonville", "Launceston", "Devonport"], id: \.self) { place in
          Label(place, systemImage: "clock")
        }
      }

      Section("Next") {
        Label("Wire search suggestions to Cloudflare `/api/v1/search/location`", systemImage: "point.3.connected.trianglepath.dotted")
        Label("Show native result rows and map handoff", systemImage: "rectangle.stack")
      }
      .foregroundStyle(.secondary)
    }
    .navigationTitle("Search")
    .searchable(text: $query, prompt: "Search Tasmania")
    .task {
      if case .idle = healthState {
        await checkHealth()
      }
      if case .idle = layersState {
        await loadLayers()
      }
    }
  }

  private func checkHealth() async {
    healthState = .loading

    do {
      let health = try await apiClient.health()
      healthState = .loaded(health.status)
    } catch {
      healthState = .failed(error.localizedDescription)
    }
  }

  private func loadLayers() async {
    layersState = .loading

    do {
      layersState = .loaded(try await apiClient.layers())
    } catch {
      layersState = .failed(error.localizedDescription)
    }
  }

  private func searchHuonville() async {
    searchState = .loading

    do {
      searchState = .loaded(try await apiClient.searchLocation(lat: -43.0292365, lng: 147.0502785))
    } catch {
      searchState = .failed(error.localizedDescription)
    }
  }
}

private enum HealthState: Equatable {
  case idle
  case loading
  case loaded(String)
  case failed(String)
}

private enum LoadState<Value> {
  case idle
  case loading
  case loaded(Value)
  case failed(String)
}

private struct HealthStatusRow: View {
  let state: HealthState
  let action: () async -> Void

  var body: some View {
    HStack {
      switch state {
      case .idle:
        Label("Not checked", systemImage: "circle")
      case .loading:
        Label("Checking API", systemImage: "arrow.triangle.2.circlepath")
      case let .loaded(status):
        Label("API \(status)", systemImage: "checkmark.circle.fill")
          .foregroundStyle(.green)
      case let .failed(message):
        Label(message, systemImage: "exclamationmark.triangle.fill")
          .foregroundStyle(.orange)
      }

      Spacer()

      Button("Retry") {
        Task {
          await action()
        }
      }
    }
  }
}

private struct PhotoResultRow: View {
  let photo: Photo

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(photo.title)
        .font(.headline)

      HStack {
        if let year = photo.year {
          Label(String(year), systemImage: "calendar")
        }

        if let scale = photo.scale {
          Label("1:\(scale)", systemImage: "ruler")
        }
      }
      .font(.caption)
      .foregroundStyle(.secondary)

      if let project = photo.project {
        Text(project)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(2)
      }
    }
    .padding(.vertical, 4)
  }
}

#Preview {
  NavigationStack {
    SearchHomeView(apiClient: APIClient(baseURL: URL(string: "http://localhost:4321")!))
  }
}
