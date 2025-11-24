import axios from "axios";
import type {
  ApiResponse,
  SearchLocationResponse,
  LayersResponse,
  LocationSearchParams,
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

  /**
   * Check if TIFF conversion service is available
   */
  async checkConversionServiceHealth(): Promise<{ available: boolean; status?: string }> {
    try {
      const response = await fetch(`${this.client.defaults.baseURL}/api/convert-tiff-health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json() as { success: boolean; available: boolean; status?: string };
      return { available: data.available || false, status: data.status };
    } catch {
      return { available: false };
    }
  }

  /**
   * Convert TIFF from URL using the conversion service
   * Returns the converted image URL and metadata
   */
  async convertTiffFromUrl(
    tiffUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<{
    url: string;
    format: string;
    originalSize: number;
    convertedSize: number;
    duration?: number;
  }> {
    const baseUrl = this.client.defaults.baseURL;
    
    // Simulate progress for URL conversion (we can't track server-side progress)
    if (onProgress) {
      onProgress(10);
      setTimeout(() => onProgress(30), 500);
      setTimeout(() => onProgress(60), 2000);
      setTimeout(() => onProgress(80), 4000);
    }

    const response = await fetch(`${baseUrl}/api/convert-tiff-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: tiffUrl }),
      signal: AbortSignal.timeout(600000), // 10 minutes
    });

    if (!response.ok) {
      let errorText = "";
      try {
        const errorJson = await response.json() as { error?: string };
        errorText = errorJson.error || `HTTP ${response.status}`;
      } catch {
        errorText = await response.text() || `HTTP ${response.status}`;
      }
      throw new Error(errorText);
    }

    const data = await response.json() as {
      success: boolean;
      url?: string;
      format?: string;
      originalSize?: number;
      convertedSize?: number;
      duration?: number;
      error?: string;
    };

    if (!data.success || !data.url) {
      throw new Error(data.error || "Conversion failed");
    }

    if (onProgress) {
      onProgress(100);
    }

    return {
      url: data.url,
      format: data.format || "webp",
      originalSize: data.originalSize || 0,
      convertedSize: data.convertedSize || 0,
      duration: data.duration,
    };
  }

  /**
   * Convert TIFF from file upload using the conversion service
   * Returns the converted image URL and metadata
   */
  async convertTiffFromFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{
    url: string;
    format: string;
    originalSize: number;
    convertedSize: number;
    duration?: number;
  }> {
    const baseUrl = this.client.defaults.baseURL;
    
    // Validate file type
    if (!file.name.toLowerCase().match(/\.(tif|tiff)$/)) {
      throw new Error("Only TIFF files are allowed");
    }

    // Validate file size (1GB limit)
    if (file.size > 1024 * 1024 * 1024) {
      throw new Error("File size exceeds 1GB limit");
    }

    const formData = new FormData();
    formData.append("file", file);

    // Use XMLHttpRequest for upload progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          // Upload is ~30% of total process
          const uploadPercent = (e.loaded / e.total) * 30;
          onProgress(uploadPercent);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText) as {
              success: boolean;
              url?: string;
              format?: string;
              originalSize?: number;
              convertedSize?: number;
              duration?: number;
              error?: string;
            };

            if (data.success && data.url) {
              if (onProgress) {
                onProgress(100);
              }
              resolve({
                url: data.url,
                format: data.format || "webp",
                originalSize: data.originalSize || 0,
                convertedSize: data.convertedSize || 0,
                duration: data.duration,
              });
            } else {
              reject(new Error(data.error || "Conversion failed"));
            }
          } catch (parseError) {
            reject(new Error("Failed to parse response"));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText) as { error?: string };
            reject(new Error(errorData.error || `HTTP ${xhr.status}`));
          } catch {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error occurred"));
      });

      xhr.addEventListener("timeout", () => {
        reject(new Error("Request timed out"));
      });

      xhr.timeout = 600000; // 10 minutes
      xhr.open("POST", `${baseUrl}/api/convert-tiff-upload`);
      xhr.send(formData);
    });
  }
}

// Create a singleton instance
// Use environment variable for base URL, or detect from current domain
const getApiBaseUrl = () => {
  // If environment variable is set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Always use the worker URL (it has CORS configured to allow requests)
  return "https://tas-aerial-browser.awhobbs.workers.dev";
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
