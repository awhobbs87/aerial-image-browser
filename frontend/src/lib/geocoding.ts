/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * Free geocoding API with no API key required
 * Enhanced with AI for better result formatting and ranking
 */

import { apiClient } from "./apiClient";

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
  // AI-enhanced fields (optional, present when AI enhancement succeeds)
  formattedName?: string;
  shortName?: string;
  confidence?: number;
  category?: string;
}

interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

class GeocodingService {
  private baseUrl = "https://nominatim.openstreetmap.org";
  private userAgent = "TasmaniaAerialPhotoBrowser/1.0";
  private cache = new Map<
    string,
    { results: SearchSuggestion[]; timestamp: number }
  >();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Search for locations by query string (address, place name, etc.)
   */
  async searchLocations(
    query: string,
    limit: number = 5,
  ): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) {
      return [];
    }

    // Check cache first
    const cacheKey = `${query.toLowerCase()}_${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`Cache hit for "${query}"`);
      return cached.results;
    }

    try {
      // Check if query looks like a street address (starts with number, or contains Rd/St/Ave/etc.)
      const trimmedQuery = query.trim();
      const looksLikeNumberedAddress = /^\d+\s/.test(trimmedQuery);
      const looksLikeStreetAddress =
        looksLikeNumberedAddress ||
        /\b(Rd|Road|St|Street|Ave|Avenue|Dr|Drive|Hwy|Highway|Ln|Lane|Ct|Court|Pl|Place|Cres|Crescent|Tce|Terrace)\b/i.test(
          trimmedQuery,
        );

      // If query doesn't mention Tasmania or TAS, append it for better results
      const enhancedQuery =
        trimmedQuery.toLowerCase().includes("tasmania") ||
        trimmedQuery.toLowerCase().includes("tas") ||
        trimmedQuery.toLowerCase().includes("hobart") ||
        trimmedQuery.toLowerCase().includes("launceston")
          ? trimmedQuery
          : `${trimmedQuery}, Tasmania, Australia`;

      const params = new URLSearchParams({
        q: enhancedQuery,
        format: "json",
        addressdetails: "1",
        limit: (limit * 3).toString(), // Request more to filter
        countrycodes: "au", // Limit to Australia
        // Strongly bias results towards Tasmania
        viewbox: "143.8,-43.7,148.5,-39.5",
        bounded: "0", // Don't strictly bound - filter in code instead for better results
      });

      // For street addresses with a number, use structured query for better results
      if (looksLikeNumberedAddress) {
        params.set("street", trimmedQuery);
        params.set("state", "Tasmania");
        params.set("country", "Australia");
        params.delete("q"); // Use structured params instead
      } else if (looksLikeStreetAddress) {
        // For street names without a number, also try structured search
        // but keep the free-text query as a fallback
        params.set(
          "street",
          trimmedQuery
            .replace(/,\s*Tasmania.*$/i, "")
            .replace(/,\s*TAS.*$/i, "")
            .trim(),
        );
        params.set("state", "Tasmania");
        params.set("country", "Australia");
        params.delete("q");
      }

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }

      let data: NominatimResult[] = await response.json();

      console.log(
        `Geocoding search for "${query}": found ${data.length} results`,
      );

      // If structured search returned no results, retry with free-text search
      if (
        data.length === 0 &&
        (looksLikeStreetAddress || looksLikeNumberedAddress)
      ) {
        console.log(
          "Structured search returned no results, retrying with free-text",
        );
        const retryParams = new URLSearchParams({
          q: enhancedQuery,
          format: "json",
          addressdetails: "1",
          limit: (limit * 3).toString(),
          countrycodes: "au",
          viewbox: "143.8,-43.7,148.5,-39.5",
          bounded: "0",
        });

        const retryResponse = await fetch(
          `${this.baseUrl}/search?${retryParams}`,
          { headers: { "User-Agent": this.userAgent } },
        );

        if (retryResponse.ok) {
          data = await retryResponse.json();
          console.log(`Free-text retry found ${data.length} results`);
        }
      }

      // Filter and prioritize Tasmania results
      // Use slightly wider bounds to catch edge cases
      const filtered = data
        .filter((item) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          // Wider bounds to catch more results (Tasmania + buffer)
          const inBounds =
            lat >= -44.0 && lat <= -39.2 && lon >= 143.5 && lon <= 148.8;
          if (!inBounds) {
            console.log(`Filtered out: ${item.display_name} (${lat}, ${lon})`);
          }
          return inBounds;
        })
        .slice(0, limit);

      console.log(`After filtering: ${filtered.length} results in Tasmania`);

      const rawResults = filtered.map((item) => ({
        placeId: item.place_id,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type,
        importance: item.importance,
      }));

      // Silently enhance results with AI (non-blocking)
      let results: SearchSuggestion[];
      try {
        const enhanced = await apiClient.enhanceSearchResults(
          query,
          rawResults,
        );
        results = enhanced.map((e) => ({
          placeId: e.placeId,
          displayName: e.displayName,
          lat: e.lat,
          lon: e.lon,
          type: e.type,
          importance: e.importance,
          formattedName: e.formattedName,
          shortName: e.shortName,
          confidence: e.confidence,
          category: e.category,
        }));
        console.log(`AI enhanced ${results.length} results`);
      } catch (aiError) {
        console.warn("AI enhancement failed, using raw results:", aiError);
        results = rawResults;
      }

      // Cache the results
      this.cache.set(cacheKey, { results, timestamp: Date.now() });

      return results;
    } catch (error) {
      console.error("Geocoding error:", error);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to get location name
   */
  async reverseGeocode(
    lat: number,
    lon: number,
  ): Promise<GeocodingResult | null> {
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
        },
      );
    });
  }

  /**
   * Format a location name from geocoding result
   * Uses AI-enhanced formatting when available, falls back to manual formatting
   */
  formatLocationName(result: GeocodingResult | SearchSuggestion): string {
    // If AI-enhanced formatted name is available, use it
    if ("formattedName" in result && result.formattedName) {
      return result.formattedName;
    }

    if ("displayName" in result) {
      const parts = result.displayName.split(", ");

      // Remove redundant "Tasmania" if it appears multiple times
      const filtered = parts.filter((part, index, arr) => {
        const lowerPart = part.toLowerCase();
        if (lowerPart.includes("tasmania") || lowerPart === "tas") {
          // Keep only the first occurrence
          return (
            arr.findIndex(
              (p) =>
                p.toLowerCase().includes("tasmania") ||
                p.toLowerCase() === "tas",
            ) === index
          );
        }
        return true;
      });

      // Return cleaned up name (first 2-3 parts max)
      // e.g., "Battery Point, Hobart TAS" or "Hobart, Tasmania"
      return filtered.slice(0, Math.min(3, filtered.length)).join(", ");
    }
    return "Unknown location";
  }
}

export const geocodingService = new GeocodingService();
export default geocodingService;
