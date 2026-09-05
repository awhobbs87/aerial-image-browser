import SwiftUI
import UIKit

@MainActor
final class TileImageMemoryCache {
  static let shared = TileImageMemoryCache()

  private let cache = NSCache<NSURL, UIImage>()

  private init() {
    cache.countLimit = 160
    cache.totalCostLimit = 96 * 1024 * 1024
  }

  func image(for url: URL) -> UIImage? {
    cache.object(forKey: url as NSURL)
  }

  func insert(_ image: UIImage, for url: URL, cost: Int) {
    cache.setObject(image, forKey: url as NSURL, cost: cost)
  }
}

@MainActor
final class TileImageLoader: ObservableObject {
  enum State {
    case idle
    case loading
    case loaded(UIImage)
    case failed
  }

  @Published private(set) var state = State.idle

  func load(url: URL) async {
    if let image = TileImageMemoryCache.shared.image(for: url) {
      state = .loaded(image)
      return
    }

    state = .loading

    do {
      let (data, response) = try await URLSession.shared.data(from: url)
      guard
        let httpResponse = response as? HTTPURLResponse,
        200..<300 ~= httpResponse.statusCode,
        let image = UIImage(data: data)
      else {
        state = .failed
        return
      }

      TileImageMemoryCache.shared.insert(image, for: url, cost: data.count)
      state = .loaded(image)
    } catch {
      state = .failed
    }
  }
}

struct CachedTileImage: View {
  let url: URL

  @StateObject private var loader = TileImageLoader()

  var body: some View {
    Group {
      switch loader.state {
      case .idle, .loading:
        Rectangle()
          .fill(.white.opacity(0.04))
      case let .loaded(image):
        Image(uiImage: image)
          .resizable()
      case .failed:
        Rectangle()
          .fill(.clear)
      }
    }
    .task(id: url) {
      await loader.load(url: url)
    }
  }
}
