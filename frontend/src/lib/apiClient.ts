import axios from "axios";
import type {
  ApiResponse,
  SearchLocationResponse,
  LayersResponse,
  LocationSearchParams,
  BoundsSearchParams,
} from "../types/api";

class ApiClient {
  private client: ReturnType<typeof axios.create>;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error status
          console.error("API Error:", error.response.data);
          throw new Error(
            error.response.data?.error || "An error occurred with the API"
          );
        } else if (error.request) {
          // Request made but no response
          console.error("Network Error:", error.request);
          throw new Error("Network error - please check your connection");
        } else {
          // Something else happened
          console.error("Error:", error.message);
          throw error;
        }
      }
    );
  }

  /**
   * Search for photos by location (lat/lon point)
   */
  async searchByLocation(
    params: LocationSearchParams
  ): Promise<SearchLocationResponse> {
    const { lat, lon, layers = [0, 1, 2], ...filters } = params;
    const queryParams: Record<string, string> = {
      lat: lat.toString(),
      lon: lon.toString(),
      layers: layers.join(","),
    };

    // Add filter parameters if provided
    if (filters.startDate) queryParams.startDate = filters.startDate;
    if (filters.endDate) queryParams.endDate = filters.endDate;
    if (filters.minScale) queryParams.minScale = filters.minScale.toString();
    if (filters.maxScale) queryParams.maxScale = filters.maxScale.toString();
    if (filters.imageTypes?.length) queryParams.imageTypes = filters.imageTypes.join(",");

    const response = await this.client.get<ApiResponse<SearchLocationResponse>>(
      "/api/search/location",
      { params: queryParams }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Search failed");
    }

    return response.data.data;
  }

  /**
   * Search for photos by bounding box
   */
  async searchByBounds(
    params: BoundsSearchParams
  ): Promise<SearchLocationResponse> {
    const { west, south, east, north, layers = [0, 1, 2], ...filters } = params;
    const queryParams: Record<string, string> = {
      west: west.toString(),
      south: south.toString(),
      east: east.toString(),
      north: north.toString(),
      layers: layers.join(","),
    };

    // Add filter parameters if provided
    if (filters.startDate) queryParams.startDate = filters.startDate;
    if (filters.endDate) queryParams.endDate = filters.endDate;
    if (filters.minScale) queryParams.minScale = filters.minScale.toString();
    if (filters.maxScale) queryParams.maxScale = filters.maxScale.toString();
    if (filters.imageTypes?.length) queryParams.imageTypes = filters.imageTypes.join(",");

    const response = await this.client.get<ApiResponse<SearchLocationResponse>>(
      "/api/search/bounds",
      { params: queryParams }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Search failed");
    }

    return response.data.data;
  }

  /**
   * Get available layers metadata
   */
  async getLayers(): Promise<LayersResponse> {
    const response = await this.client.get<ApiResponse<LayersResponse>>(
      "/api/layers"
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Failed to fetch layers");
    }

    return response.data.data;
  }

  /**
   * Get thumbnail URL (proxied through worker)
   */
  getThumbnailUrl(imageName: string, layerId: number): string {
    // Remove .tif extension if present
    const cleanName = imageName.replace(/\.tif$/i, "");
    return `${this.client.defaults.baseURL}/api/thumbnail/${layerId}/${cleanName}`;
  }

  /**
   * Get TIFF URL (proxied through worker)
   */
  getTiffUrl(imageName: string, layerId: number): string {
    // Remove .tif extension if present
    const cleanName = imageName.replace(/\.tif$/i, "");
    return `${this.client.defaults.baseURL}/api/tiff/${layerId}/${cleanName}`;
  }

  /**
   * Get WebP URL (TIFF converted to WebP on edge)
   * This provides significantly smaller file sizes while maintaining quality
   */
  getWebPUrl(imageName: string, layerId: number): string {
    // Remove .tif extension if present
    const cleanName = imageName.replace(/\.tif$/i, "");
    return `${this.client.defaults.baseURL}/api/webp/${layerId}/${cleanName}`;
  }

  /**
   * Get optimized image URL using Cloudflare Image Resizing
   * Converts TIFFs to web-optimized formats (WebP, JPEG) with optional resizing
   */
  getOptimizedImageUrl(
    imageName: string,
    layerId: number,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: "auto" | "webp" | "jpeg" | "png";
    }
  ): string {
    // Remove .tif extension if present
    const cleanName = imageName.replace(/\.tif$/i, "");
    const baseUrl = `${this.client.defaults.baseURL}/api/image/${layerId}/${cleanName}`;

    // Build query parameters
    const params = new URLSearchParams();
    if (options?.width) params.set("width", options.width.toString());
    if (options?.height) params.set("height", options.height.toString());
    if (options?.quality) params.set("quality", options.quality.toString());
    if (options?.format) params.set("format", options.format);

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
}

// Create a singleton instance
// Use environment variable for base URL, fallback to deployed worker
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://tas-aerial-browser.awhobbs.workers.dev";

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
