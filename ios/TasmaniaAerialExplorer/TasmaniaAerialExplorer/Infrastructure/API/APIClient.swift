import Foundation

actor APIClient {
  private let baseURL: URL
  private let session: URLSession
  private let decoder: JSONDecoder
  private let accessClientID: String?
  private let accessClientSecret: String?

  init(
    baseURL: URL,
    accessClientID: String? = nil,
    accessClientSecret: String? = nil,
    session: URLSession = .shared
  ) {
    self.baseURL = baseURL
    self.accessClientID = accessClientID
    self.accessClientSecret = accessClientSecret
    self.session = session
    self.decoder = JSONDecoder()
    self.decoder.dateDecodingStrategy = .iso8601
  }

  func health() async throws -> HealthStatus {
    try await get(path: "/v1/health")
  }

  func layers() async throws -> [Layer] {
    try await get(path: "/v1/layers")
  }

  func searchLocation(lat: Double, lng: Double, layers: [Int] = [0, 1, 2]) async throws -> PhotoSearchResponse {
    var components = URLComponents()
    components.path = "/v1/search/location"
    components.queryItems = [
      URLQueryItem(name: "lat", value: String(lat)),
      URLQueryItem(name: "lng", value: String(lng)),
      URLQueryItem(name: "layers", value: layers.map(String.init).joined(separator: ",")),
    ]

    return try await get(path: components.string ?? "")
  }

  func tileManifest(for photo: Photo) async throws -> TileManifest {
    guard let manifestURL = photo.links.tileManifest else {
      throw APIError.invalidURL
    }

    return try await get(url: manifestURL)
  }

  private func get<Value: Decodable & Sendable>(path: String) async throws -> Value {
    guard let url = URL(string: path, relativeTo: baseURL) else {
      throw APIError.invalidURL
    }

    return try await get(url: url)
  }

  private func get<Value: Decodable & Sendable>(url: URL) async throws -> Value {
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let accessClientID, let accessClientSecret {
      request.setValue(accessClientID, forHTTPHeaderField: "CF-Access-Client-Id")
      request.setValue(accessClientSecret, forHTTPHeaderField: "CF-Access-Client-Secret")
    }

    let data: Data
    let response: URLResponse

    do {
      (data, response) = try await session.data(for: request)
    } catch let urlError as URLError {
      if url.host == "localhost" || url.host == "127.0.0.1" {
        throw APIError.transport("Local API unavailable. Start `npm run dev` from the repo root, then try again.")
      }

      throw APIError.transport(urlError.localizedDescription)
    } catch {
      throw APIError.transport(error.localizedDescription)
    }

    guard let httpResponse = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }

    guard 200..<300 ~= httpResponse.statusCode else {
      throw APIError.requestFailed(statusCode: httpResponse.statusCode)
    }

    let envelope = try decoder.decode(APIEnvelope<Value>.self, from: data)

    if let error = envelope.error {
      throw APIError.server(error)
    }

    guard let value = envelope.data else {
      throw APIError.emptyData
    }

    return value
  }
}

struct HealthStatus: Codable, Hashable, Sendable {
  let status: String
  let timestamp: String?
}

struct PhotoSearchResponse: Codable, Hashable, Sendable {
  let count: Int
  let photos: [Photo]
}
