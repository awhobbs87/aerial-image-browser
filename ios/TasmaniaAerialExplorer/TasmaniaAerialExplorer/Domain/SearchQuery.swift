import Foundation

struct SearchQuery: Codable, Hashable, Sendable {
  var text: String
  var coordinate: Coordinate?
  var radiusMeters: Double
  var fromYear: Int?
  var toYear: Int?
  var layerIds: [Int]

  static let empty = SearchQuery(
    text: "",
    coordinate: nil,
    radiusMeters: 2_000,
    fromYear: nil,
    toYear: nil,
    layerIds: []
  )
}

