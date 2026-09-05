import Foundation

struct Layer: Identifiable, Codable, Hashable, Sendable {
  let id: Int
  let name: String
  let description: String?
}

