import CoreLocation
import Foundation

@MainActor
final class UserLocationProvider: NSObject, ObservableObject {
  @Published private(set) var authorizationStatus: CLAuthorizationStatus
  @Published private(set) var coordinate: Coordinate?

  private let manager = CLLocationManager()

  override init() {
    authorizationStatus = manager.authorizationStatus
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    manager.distanceFilter = 25
  }

  func requestLocation() {
    switch manager.authorizationStatus {
    case .notDetermined:
      manager.requestWhenInUseAuthorization()
    case .authorizedAlways, .authorizedWhenInUse:
      manager.startUpdatingLocation()
      manager.requestLocation()
    case .denied, .restricted:
      break
    @unknown default:
      break
    }
  }
}

extension UserLocationProvider: CLLocationManagerDelegate {
  nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    let status = manager.authorizationStatus

    Task { @MainActor in
      authorizationStatus = status

      if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
        self.manager.startUpdatingLocation()
        self.manager.requestLocation()
      }
    }
  }

  nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else {
      return
    }

    Task { @MainActor in
      coordinate = Coordinate(lat: location.coordinate.latitude, lng: location.coordinate.longitude)
    }
  }

  nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    #if DEBUG
    print("Location update failed: \(error.localizedDescription)")
    #endif
  }
}
