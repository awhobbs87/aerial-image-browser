import SwiftUI

struct PhotoViewerView: View {
  let photo: Photo
  let apiClient: APIClient

  @State private var loadState = PhotoViewerLoadState.loading

  var body: some View {
    ZStack {
      Color.black
        .ignoresSafeArea()

      switch loadState {
      case let .loaded(manifest) where !manifest.levels.isEmpty:
        ViewerTileSurface(manifest: manifest, fallbackPhoto: photo)
      default:
        ViewerPreviewSurface(photo: photo)
      }

      VStack {
        Spacer()

        ViewerManifestPanel(photo: photo, loadState: loadState)
          .padding(.horizontal, 16)
          .padding(.bottom, 18)
      }
    }
    .navigationTitle(photo.title)
    .navigationBarTitleDisplayMode(.inline)
    .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
    .task(id: photo.id) {
      await loadManifest()
    }
  }

  private func loadManifest() async {
    loadState = .loading

    do {
      let manifest = try await apiClient.tileManifest(for: photo)
      loadState = .loaded(manifest)
    } catch {
      loadState = .failed(error.localizedDescription)
    }
  }
}

private struct ViewerPreviewSurface: View {
  let photo: Photo

  var body: some View {
    AsyncImage(url: photo.links.preview) { phase in
      switch phase {
      case .empty:
        ProgressView()
          .tint(.white)
      case let .success(image):
        image
          .resizable()
          .scaledToFit()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      case .failure:
        ContentUnavailableView(
          "Preview unavailable",
          systemImage: "photo",
          description: Text("The TIFF source can still be loaded through the manifest.")
        )
        .foregroundStyle(.white)
      @unknown default:
        EmptyView()
      }
    }
  }
}

private struct ViewerTileSurface: View {
  let manifest: TileManifest
  let fallbackPhoto: Photo

  @State private var scale = 1.0
  @State private var lastScale = 1.0
  @State private var offset = CGSize.zero
  @State private var lastOffset = CGSize.zero

  var body: some View {
    GeometryReader { proxy in
      let containerSize = proxy.size
      let level = selectedLevel(for: scale)
      let tileLayout = TileViewportLayout(
        manifest: manifest,
        level: level,
        containerSize: containerSize,
        scale: scale,
        offset: offset
      )

      ZStack {
        ViewerPreviewSurface(photo: fallbackPhoto)
          .opacity(0.42)
          .allowsHitTesting(false)

        ForEach(tileLayout.visibleTiles) { tile in
          if let url = tileURL(z: level.z, x: tile.x, y: tile.y) {
            CachedTileImage(url: url)
              .aspectRatio(contentMode: .fill)
              .frame(width: tile.displayRect.width, height: tile.displayRect.height)
              .clipped()
              .position(x: tile.displayRect.midX, y: tile.displayRect.midY)
          }
        }

        if tileLayout.visibleTiles.isEmpty {
          ProgressView()
            .tint(.white)
        }
      }
      .contentShape(Rectangle())
      .gesture(panGesture(containerSize: containerSize).simultaneously(with: zoomGesture))
      .onChange(of: containerSize) { _, _ in
        offset = clampedOffset(offset, containerSize: containerSize, level: level, scale: scale)
        lastOffset = offset
      }
    }
  }

  private func tileURL(z: Int, x: Int, y: Int) -> URL? {
    let tilePath = manifest.tileUrlTemplate
      .replacingOccurrences(of: "{z}", with: String(z))
      .replacingOccurrences(of: "{x}", with: String(x))
      .replacingOccurrences(of: "{y}", with: String(y))

    return URL(string: tilePath)
  }

  private func selectedLevel(for scale: Double) -> TileLevel {
    let sortedLevels = manifest.levels.sorted { $0.z < $1.z }
    guard !sortedLevels.isEmpty else {
      return TileLevel(z: 0, width: manifest.width, height: manifest.height, columns: 0, rows: 0)
    }

    let targetIndex = min(sortedLevels.count - 1, max(0, Int(log2(max(scale, 1.0)).rounded(.down)) + sortedLevels.count - 1))
    return sortedLevels[targetIndex]
  }

  private func panGesture(containerSize: CGSize) -> some Gesture {
    DragGesture()
      .onChanged { value in
        let proposedOffset = CGSize(
          width: lastOffset.width + value.translation.width,
          height: lastOffset.height + value.translation.height
        )
        offset = clampedOffset(
          proposedOffset,
          containerSize: containerSize,
          level: selectedLevel(for: scale),
          scale: scale
        )
      }
      .onEnded { _ in
        lastOffset = offset
      }
  }

  private var zoomGesture: some Gesture {
    MagnifyGesture()
      .onChanged { value in
        scale = min(max(lastScale * value.magnification, 1), 8)
      }
      .onEnded { _ in
        lastScale = scale

        if scale == 1 {
          offset = .zero
          lastOffset = .zero
        }
      }
  }

  private func clampedOffset(
    _ proposedOffset: CGSize,
    containerSize: CGSize,
    level: TileLevel,
    scale: Double
  ) -> CGSize {
    let baseScale = TileViewportLayout.baseScale(
      containerSize: containerSize,
      imageSize: CGSize(width: level.width, height: level.height)
    )
    let renderedWidth = Double(level.width) * baseScale * scale
    let renderedHeight = Double(level.height) * baseScale * scale
    let maxX = max(0, (renderedWidth - containerSize.width) / 2)
    let maxY = max(0, (renderedHeight - containerSize.height) / 2)

    return CGSize(
      width: min(max(proposedOffset.width, -maxX), maxX),
      height: min(max(proposedOffset.height, -maxY), maxY)
    )
  }
}

private struct TileViewportLayout {
  let manifest: TileManifest
  let level: TileLevel
  let containerSize: CGSize
  let scale: Double
  let offset: CGSize

  var visibleTiles: [VisibleTile] {
    guard level.columns > 0, level.rows > 0, containerSize.width > 0, containerSize.height > 0 else {
      return []
    }

    let imageSize = CGSize(width: level.width, height: level.height)
    let baseScale = Self.baseScale(containerSize: containerSize, imageSize: imageSize)
    let effectiveScale = baseScale * scale
    let renderedWidth = Double(level.width) * effectiveScale
    let renderedHeight = Double(level.height) * effectiveScale
    let originX = containerSize.width / 2 + offset.width - renderedWidth / 2
    let originY = containerSize.height / 2 + offset.height - renderedHeight / 2
    let visibleLeft = max(0, (-originX) / effectiveScale)
    let visibleTop = max(0, (-originY) / effectiveScale)
    let visibleRight = min(Double(level.width), (containerSize.width - originX) / effectiveScale)
    let visibleBottom = min(Double(level.height), (containerSize.height - originY) / effectiveScale)
    let margin = 1
    let minX = max(0, Int(floor(visibleLeft / Double(manifest.tileSize))) - margin)
    let maxX = min(level.columns - 1, Int(floor(max(visibleRight - 1, 0) / Double(manifest.tileSize))) + margin)
    let minY = max(0, Int(floor(visibleTop / Double(manifest.tileSize))) - margin)
    let maxY = min(level.rows - 1, Int(floor(max(visibleBottom - 1, 0) / Double(manifest.tileSize))) + margin)

    guard minX <= maxX, minY <= maxY else {
      return []
    }

    return (minY...maxY).flatMap { y in
      (minX...maxX).map { x in
        let tileWidth = min(manifest.tileSize, level.width - x * manifest.tileSize)
        let tileHeight = min(manifest.tileSize, level.height - y * manifest.tileSize)
        let rect = CGRect(
          x: originX + Double(x * manifest.tileSize) * effectiveScale,
          y: originY + Double(y * manifest.tileSize) * effectiveScale,
          width: Double(tileWidth) * effectiveScale,
          height: Double(tileHeight) * effectiveScale
        )

        return VisibleTile(x: x, y: y, displayRect: rect)
      }
    }
  }

  static func baseScale(containerSize: CGSize, imageSize: CGSize) -> Double {
    guard imageSize.width > 0, imageSize.height > 0 else {
      return 1
    }

    return min(containerSize.width / imageSize.width, containerSize.height / imageSize.height)
  }
}

private struct VisibleTile: Identifiable {
  let x: Int
  let y: Int
  let displayRect: CGRect

  var id: String {
    "\(x):\(y)"
  }
}

private struct ViewerManifestPanel: View {
  let photo: Photo
  let loadState: PhotoViewerLoadState

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .top, spacing: 12) {
        Image(systemName: "photo.on.rectangle.angled")
          .font(.title3.weight(.semibold))
          .frame(width: 42, height: 42)
          .background(.thinMaterial, in: Circle())

        VStack(alignment: .leading, spacing: 4) {
          Text(photo.title)
            .font(.headline.weight(.semibold))
            .lineLimit(2)

          if let year = photo.year {
            Text(String(year))
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }

        Spacer(minLength: 8)
      }

      Divider()
        .opacity(0.35)

      switch loadState {
      case .loading:
        HStack(spacing: 10) {
          ProgressView()
          Text("Loading tile manifest")
        }
        .font(.subheadline)
        .foregroundStyle(.secondary)
      case let .loaded(manifest):
        ViewerManifestSummary(manifest: manifest)
      case let .failed(message):
        Label(message, systemImage: "exclamationmark.triangle.fill")
          .font(.subheadline)
          .foregroundStyle(.orange)
      }
    }
    .padding(16)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 28, style: .continuous)
        .stroke(.white.opacity(0.26), lineWidth: 0.8)
    }
    .shadow(color: .black.opacity(0.28), radius: 24, y: 12)
  }
}

private struct ViewerManifestSummary: View {
  let manifest: TileManifest

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Label(statusText, systemImage: statusIcon)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(statusColor)

      if manifest.width > 0 && manifest.height > 0 {
        LabeledContent("Image size", value: "\(manifest.width) x \(manifest.height)")
          .font(.footnote)
      }

      if manifest.levels.isEmpty {
        Text("Tile pyramid generation is not enabled yet. The native viewer is using the preview while the range-backed TIFF source is prepared.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      } else {
        LabeledContent("Tile levels", value: String(manifest.levels.count))
          .font(.footnote)
      }
    }
  }

  private var statusText: String {
    if manifest.source.supportsRange {
      return "Range-backed TIFF source ready"
    }

    return "Manifest loaded"
  }

  private var statusIcon: String {
    manifest.source.supportsRange ? "checkmark.circle.fill" : "info.circle.fill"
  }

  private var statusColor: Color {
    manifest.source.supportsRange ? .green : .blue
  }
}

private enum PhotoViewerLoadState {
  case loading
  case loaded(TileManifest)
  case failed(String)
}

#Preview {
  NavigationStack {
    PhotoViewerView(
      photo: Photo(
        id: "1:Hobart_25cm_2019_5275252",
        layerId: 1,
        imageName: "Hobart_25cm_2019_5275252",
        title: "Hobart_25cm_2019_5275252",
        year: 2019,
        captureDate: nil,
        photoType: "Orthophoto",
        project: "Hobart",
        scale: nil,
        centroid: Coordinate(lat: -42.8821, lng: 147.3272),
        bounds: nil,
        links: PhotoLinks(
          thumbnail: nil,
          preview: nil,
          tileManifest: URL(string: "http://localhost:4321/api/v1/photos/1:Hobart_25cm_2019_5275252/tile-manifest"),
          tiff: nil
        )
      ),
      apiClient: APIClient(baseURL: URL(string: "http://localhost:4321")!)
    )
  }
}
