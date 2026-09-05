import Foundation

enum APIError: LocalizedError, Sendable {
  case invalidURL
  case invalidResponse
  case requestFailed(statusCode: Int)
  case server(APIErrorPayload)
  case emptyData
  case transport(String)

  var errorDescription: String? {
    switch self {
    case .invalidURL:
      "The API URL could not be built."
    case .invalidResponse:
      "The server returned an invalid response."
    case let .requestFailed(statusCode):
      "The request failed with status \(statusCode)."
    case let .server(payload):
      payload.message
    case .emptyData:
      "The response did not include data."
    case let .transport(message):
      message
    }
  }
}
