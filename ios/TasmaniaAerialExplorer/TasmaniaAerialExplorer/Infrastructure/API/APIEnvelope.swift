import Foundation

struct APIEnvelope<Value: Decodable & Sendable>: Decodable, Sendable {
  let success: Bool
  let data: Value?
  let error: APIErrorPayload?
  let meta: APIMetadata?
}

struct APIErrorPayload: Decodable, Error, Sendable {
  let code: String
  let message: String
}

struct APIMetadata: Decodable, Sendable {
  let requestId: String?
  let cache: String?
}

