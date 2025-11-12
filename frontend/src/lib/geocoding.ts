/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * Free geocoding API with no API key required
 */

export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  address: {
    city?: string;
    town?: string;
    suburb?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
}

export interface SearchSuggestion {
  placeId: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

class GeocodingService {
  private baseUrl = "https://nominatim.openstreetmap.org";
  private userAgent = "TasmaniaAerialPhotoBrowser/1.0";

  /**
   * Search for locations by query string (address, place name, etc.)
   */
  async searchLocations(query: string, limit: number = 5): Promise<SearchSuggestion[]> {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: limit.toString(),
        countrycodes: "au", // Limit to Australia
        // Bias results towards Tasmania
        viewbox: "143.8,-43.7,148.5,-39.5",
        bounded: "0",
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }

      const data = await response.json();

      return data.map((item: any) => ({
        placeId: item.place_id,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type,
        importance: item.importance,
      }));
    } catch (error) {
      console.error("Geocoding error:", error);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to get location name
   */
  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: "json",
        addressdetails: "1",
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params}`, {
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error("Reverse geocoding request failed");
      }

      const data = await response.json();

      return {
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon),
        displayName: data.display_name,
        address: {
          city: data.address.city,
          town: data.address.town,
          suburb: data.address.suburb,
          state: data.address.state,
          country: data.address.country,
          postcode: data.address.postcode,
        },
        boundingBox: data.boundingbox
          ? [
              parseFloat(data.boundingbox[0]),
              parseFloat(data.boundingbox[1]),
              parseFloat(data.boundingbox[2]),
              parseFloat(data.boundingbox[3]),
            ]
          : undefined,
      };
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  }

  /**
   * Get user's current location using browser geolocation
   */
  async getCurrentLocation(): Promise<{ lat: number; lon: number } | null> {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by your browser");
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Format a location name from geocoding result
   */
  formatLocationName(result: GeocodingResult | SearchSuggestion): string {
    if ("displayName" in result) {
      // For SearchSuggestion or GeocodingResult
      const parts = result.displayName.split(", ");
      // Return first 3 parts for brevity (e.g., "Hobart, Tasmania, Australia")
      return parts.slice(0, 3).join(", ");
    }
    return "Unknown location";
  }
}

export const geocodingService = new GeocodingService();
export default geocodingService;
