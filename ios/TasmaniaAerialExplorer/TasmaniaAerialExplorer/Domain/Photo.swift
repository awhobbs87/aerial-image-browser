import Foundation

struct Photo: Identifiable, Codable, Hashable, Sendable {
  let id: String
  let layerId: Int
  let imageName: String
  let title: String
  let year: Int?
  let captureDate: String?
  let photoType: String?
  let project: String?
  let scale: Int?
  let centroid: Coordinate
  let bounds: PhotoBounds?
  let links: PhotoLinks
}

struct Coordinate: Codable, Hashable, Sendable {
  let lat: Double
  let lng: Double
}

struct PhotoBounds: Codable, Hashable, Sendable {
  let north: Double
  let south: Double
  let east: Double
  let west: Double
}

struct PhotoLinks: Codable, Hashable, Sendable {
  let thumbnail: URL?
  let preview: URL?
  let tileManifest: URL?
  let tiff: URL?
}

