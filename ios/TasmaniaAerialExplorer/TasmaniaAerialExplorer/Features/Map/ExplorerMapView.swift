import MapKit
import SwiftUI

struct ExplorerMapView: View {
  let apiClient: APIClient

  @StateObject private var locationProvider = UserLocationProvider()
  @State private var cameraPosition: MapCameraPosition = .region(.tasmania)
  @State private var selectedCoordinate = Coordinate(lat: -42.8821, lng: 147.3272)
  @State private var searchState = MapSearchState.idle
  @State private var selectedPhoto: Photo?
  @State private var didAutoFocusUserLocation = false

  var body: some View {
    MapReader { proxy in
      Map(position: $cameraPosition) {
        UserAnnotation()

        Marker(
          "Search center",
          systemImage: "mappin.and.ellipse",
          coordinate: CLLocationCoordinate2D(latitude: selectedCoordinate.lat, longitude: selectedCoordinate.lng)
        )
        .tint(.orange)

        ForEach(mapPhotos) { photo in
          Annotation(photo.title, coordinate: photo.coordinate) {
            Button {
              selectedPhoto = photo
            } label: {
              Image(systemName: "photo.circle.fill")
                .font(.title2)
                .symbolRenderingMode(.palette)
                .foregroundStyle(.white, .blue)
                .shadow(radius: 4)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(photo.accessibilityTitle)
          }
        }
      }
      .mapStyle(.hybrid(elevation: .realistic))
      .onTapGesture { screenPoint in
        guard let coordinate = proxy.convert(screenPoint, from: .local) else {
          return
        }

        selectedCoordinate = Coordinate(lat: coordinate.latitude, lng: coordinate.longitude)
      }
      .ignoresSafeArea(edges: .top)
      .navigationTitle("Tasmania")
      .navigationBarTitleDisplayMode(.inline)
      .overlay(alignment: .topTrailing) {
        MapTopControls(
          locationAction: {
            focusUserLocation(animated: true)
          },
          focusAction: {
            cameraPosition = .region(
              MKCoordinateRegion(
                center: CLLocationCoordinate2D(
                  latitude: selectedCoordinate.lat,
                  longitude: selectedCoordinate.lng
                ),
                span: MKCoordinateSpan(latitudeDelta: 0.65, longitudeDelta: 0.65)
              )
            )
          }
        )
        .padding(.top, 96)
        .padding(.trailing, 18)
      }
      .safeAreaInset(edge: .bottom) {
        MapSearchSheetPreview(
          searchState: searchState,
          selectedCoordinate: selectedCoordinate,
          searchAction: {
            Task {
              await searchSelectedCoordinate()
            }
          },
          selectPhoto: { photo in
            selectedPhoto = photo
          }
        )
      }
      .sheet(item: $selectedPhoto) { photo in
        PhotoMapDetailView(photo: photo, apiClient: apiClient)
          .presentationDetents([.medium])
      }
      .task {
        locationProvider.requestLocation()
      }
      .onChange(of: locationProvider.coordinate) { _, coordinate in
        guard !didAutoFocusUserLocation, let coordinate else {
          return
        }

        didAutoFocusUserLocation = true
        selectedCoordinate = coordinate
        focusUserLocation(animated: false)
      }
    }
  }

  private var mapPhotos: [Photo] {
    if case let .loaded(response) = searchState {
      return Array(response.photos.prefix(80))
    }

    return []
  }

  private func searchSelectedCoordinate() async {
    searchState = .loading

    do {
      let response = try await apiClient.searchLocation(
        lat: selectedCoordinate.lat,
        lng: selectedCoordinate.lng
      )
      searchState = .loaded(response)
      withAnimation(.snappy(duration: 0.55)) {
        cameraPosition = .region(.searchedArea(center: selectedCoordinate))
      }
    } catch {
      searchState = .failed(error.localizedDescription)
    }
  }

  private func focusUserLocation(animated: Bool) {
    guard let coordinate = locationProvider.coordinate else {
      locationProvider.requestLocation()
      return
    }

    selectedCoordinate = coordinate
    let region = MKCoordinateRegion.currentLocation(
      center: CLLocationCoordinate2D(latitude: coordinate.lat, longitude: coordinate.lng)
    )

    if animated {
      withAnimation(.snappy(duration: 0.45)) {
        cameraPosition = .region(region)
      }
    } else {
      cameraPosition = .region(region)
    }
  }
}

private struct LiquidGlassCircleButton: View {
  let systemName: String
  let accessibilityLabel: String
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Image(systemName: systemName)
        .font(.title3.weight(.semibold))
        .frame(width: 44, height: 44)
        .foregroundStyle(.primary)
        .background(.ultraThinMaterial, in: Circle())
        .overlay {
          Circle()
            .stroke(.white.opacity(0.35), lineWidth: 0.7)
        }
        .shadow(color: .black.opacity(0.18), radius: 12, y: 6)
    }
    .buttonStyle(.plain)
    .accessibilityLabel(accessibilityLabel)
  }
}

private struct LiquidGlassProminentButton: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.headline.weight(.semibold))
      .foregroundStyle(.white)
      .padding(.horizontal, 20)
      .frame(height: 48)
      .background(
        LinearGradient(
          colors: [
            Color.blue,
            Color.cyan.opacity(0.85),
          ],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        ),
        in: Capsule()
      )
      .overlay {
        Capsule()
          .stroke(.white.opacity(0.32), lineWidth: 0.8)
      }
      .shadow(color: .blue.opacity(configuration.isPressed ? 0.14 : 0.28), radius: configuration.isPressed ? 6 : 12, y: configuration.isPressed ? 3 : 7)
      .scaleEffect(configuration.isPressed ? 0.97 : 1)
  }
}

private struct SearchPanelHeader: View {
  let selectedCoordinate: Coordinate
  let searchAction: () -> Void

  var body: some View {
    HStack(alignment: .center, spacing: 12) {
      Image(systemName: "magnifyingglass")
        .font(.title3.weight(.semibold))
        .frame(width: 42, height: 42)
        .background(.thinMaterial, in: Circle())
        .overlay {
          Circle()
            .stroke(.white.opacity(0.25), lineWidth: 0.7)
        }

      VStack(alignment: .leading, spacing: 4) {
        Text("Search this area")
          .font(.title3.weight(.bold))
          .lineLimit(1)

        Text("\(selectedCoordinate.lat, format: .number.precision(.fractionLength(4))), \(selectedCoordinate.lng, format: .number.precision(.fractionLength(4)))")
          .font(.caption)
          .foregroundStyle(.secondary)
          .monospacedDigit()
      }

      Spacer(minLength: 8)

      Button("Search", action: searchAction)
        .buttonStyle(LiquidGlassProminentButton())
    }
  }
}

private struct MapSearchSheetPreview: View {
  let searchState: MapSearchState
  let selectedCoordinate: Coordinate
  let searchAction: () -> Void
  let selectPhoto: (Photo) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      SearchPanelHeader(
        selectedCoordinate: selectedCoordinate,
        searchAction: searchAction
      )

      switch searchState {
      case .idle:
        HStack(spacing: 8) {
          Image(systemName: "mappin.and.ellipse")
          Text("Tap the map to move the search center.")
        }
        .font(.subheadline)
        .foregroundStyle(.secondary)
      case .loading:
        HStack(spacing: 10) {
          ProgressView()
          Text("Searching nearby photos")
        }
        .font(.subheadline)
        .foregroundStyle(.secondary)
      case let .loaded(response):
        VStack(alignment: .leading, spacing: 12) {
          HStack {
            Text("\(response.count) photos found")
              .font(.headline.weight(.semibold))

            Spacer()

            Text("Nearest first")
              .font(.caption)
              .foregroundStyle(.secondary)
          }

          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
              ForEach(response.photos.prefix(12)) { photo in
                Button {
                  selectPhoto(photo)
                } label: {
                  MapResultChip(photo: photo)
                }
                .buttonStyle(.plain)
              }
            }
            .padding(.vertical, 2)
          }
        }
      case let .failed(message):
        Label(message, systemImage: "exclamationmark.triangle.fill")
          .font(.subheadline)
          .foregroundStyle(.orange)
      }
    }
    .padding(.horizontal, 18)
    .padding(.top, 16)
    .padding(.bottom, 14)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 30, style: .continuous)
        .stroke(.white.opacity(0.28), lineWidth: 0.8)
    }
    .shadow(color: .black.opacity(0.22), radius: 24, y: 12)
    .padding(.horizontal, 12)
    .padding(.bottom, 8)
  }
}

private struct MapTopControls: View {
  let locationAction: () -> Void
  let focusAction: () -> Void

  var body: some View {
    VStack(spacing: 10) {
      LiquidGlassCircleButton(
        systemName: "location.north.fill",
        accessibilityLabel: "Show my location",
        action: locationAction
      )

      LiquidGlassCircleButton(
        systemName: "scope",
        accessibilityLabel: "Focus search center",
        action: focusAction
      )
    }
  }
}

private enum MapSearchState {
  case idle
  case loading
  case loaded(PhotoSearchResponse)
  case failed(String)
}

private struct MapResultChip: View {
  let photo: Photo

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(photo.title)
        .font(.caption.weight(.semibold))
        .lineLimit(1)

      HStack(spacing: 8) {
        if let year = photo.year {
          Label(String(year), systemImage: "calendar")
        }

        if let scale = photo.scale {
          Label("1:\(scale)", systemImage: "ruler")
        }
      }
      .font(.caption2)
      .foregroundStyle(.secondary)
    }
    .frame(width: 180, alignment: .leading)
    .padding(10)
    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(.white.opacity(0.22), lineWidth: 0.7)
    }
  }
}

private struct PhotoMapDetailView: View {
  let photo: Photo
  let apiClient: APIClient

  var body: some View {
    NavigationStack {
      List {
        if let preview = photo.links.preview {
          Section {
            AsyncImage(url: preview) { phase in
              switch phase {
              case .empty:
                ProgressView()
                  .frame(maxWidth: .infinity, minHeight: 180)
              case let .success(image):
                image
                  .resizable()
                  .scaledToFill()
                  .frame(maxWidth: .infinity, minHeight: 180, maxHeight: 220)
                  .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
              case .failure:
                Label("Preview unavailable", systemImage: "photo")
                  .font(.footnote)
                  .foregroundStyle(.secondary)
                  .frame(maxWidth: .infinity, minHeight: 64)
              @unknown default:
                EmptyView()
              }
            }
            .listRowInsets(EdgeInsets(top: 12, leading: 12, bottom: 12, trailing: 12))
          }
        }

        Section("Photo") {
          NavigationLink {
            PhotoViewerView(photo: photo, apiClient: apiClient)
          } label: {
            Label("Open viewer", systemImage: "photo.on.rectangle.angled")
          }

          LabeledContent("Image", value: photo.imageName)

          if let year = photo.year {
            LabeledContent("Year", value: String(year))
          }

          if let scale = photo.scale {
            LabeledContent("Scale", value: "1:\(scale)")
          }

          if let project = photo.project {
            LabeledContent("Project", value: project)
          }
        }

        Section("Location") {
          LabeledContent(
            "Center",
            value: "\(photo.centroid.lat.formatted(.number.precision(.fractionLength(5)))), \(photo.centroid.lng.formatted(.number.precision(.fractionLength(5))))"
          )
        }
      }
      .navigationTitle(photo.title)
      .navigationBarTitleDisplayMode(.inline)
    }
  }
}

private extension Photo {
  var coordinate: CLLocationCoordinate2D {
    CLLocationCoordinate2D(latitude: centroid.lat, longitude: centroid.lng)
  }

  var accessibilityTitle: String {
    if let year {
      return "\(title), \(year)"
    }

    return title
  }
}

private extension MKCoordinateRegion {
  static let tasmania = MKCoordinateRegion(
    center: CLLocationCoordinate2D(latitude: -42.0409, longitude: 146.8087),
    span: MKCoordinateSpan(latitudeDelta: 5.4, longitudeDelta: 5.4)
  )

  static func searchedArea(center: Coordinate) -> MKCoordinateRegion {
    MKCoordinateRegion(
      center: CLLocationCoordinate2D(latitude: center.lat, longitude: center.lng),
      span: MKCoordinateSpan(latitudeDelta: 0.72, longitudeDelta: 0.72)
    )
  }

  static func currentLocation(center: CLLocationCoordinate2D) -> MKCoordinateRegion {
    MKCoordinateRegion(
      center: center,
      span: MKCoordinateSpan(latitudeDelta: 0.018, longitudeDelta: 0.018)
    )
  }
}

#Preview {
  NavigationStack {
    ExplorerMapView(apiClient: APIClient(baseURL: URL(string: "http://localhost:4321")!))
  }
}
