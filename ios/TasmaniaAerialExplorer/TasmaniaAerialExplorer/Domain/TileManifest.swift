import Foundation

struct TileManifest: Codable, Hashable, Sendable {
  let photoId: String
  let format: String
  let width: Int
  let height: Int
  let tileSize: Int
  let overlap: Int
  let levels: [TileLevel]
  let tileUrlTemplate: String
  let source: TileSource
}

struct TileLevel: Codable, Hashable, Sendable {
  let z: Int
  let width: Int
  let height: Int
  let columns: Int
  let rows: Int
}

struct TileSource: Codable, Hashable, Sendable {
  let type: String
  let rangeUrl: URL?
  let supportsRange: Bool
}

