/**
 * Search history management using localStorage
 */

export interface SearchHistoryItem {
  id: string;
  query: string; // Display name of the location
  lat: number;
  lon: number;
  timestamp: number;
}

const STORAGE_KEY = "tas-aerial-search-history";
const MAX_HISTORY_ITEMS = 10;

class SearchHistoryManager {
  /**
   * Get all search history items
   */
  getHistory(): SearchHistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const history = JSON.parse(data) as SearchHistoryItem[];
      // Sort by timestamp, most recent first
      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error reading search history:", error);
      return [];
    }
  }

  /**
   * Add a search to history
   */
  addSearch(query: string, lat: number, lon: number): void {
    try {
      const history = this.getHistory();

      // Check if this location already exists (within 0.001 degrees ~100m)
      const existingIndex = history.findIndex(
        (item) =>
          Math.abs(item.lat - lat) < 0.001 && Math.abs(item.lon - lon) < 0.001,
      );

      if (existingIndex !== -1) {
        // Remove the existing entry (we'll add it again with new timestamp)
        history.splice(existingIndex, 1);
      }

      // Add new entry at the beginning
      const newItem: SearchHistoryItem = {
        id: `${Date.now()}-${Math.random()}`,
        query,
        lat,
        lon,
        timestamp: Date.now(),
      };

      history.unshift(newItem);

      // Limit to MAX_HISTORY_ITEMS
      const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  }

  /**
   * Remove a specific search from history
   */
  removeSearch(id: string): void {
    try {
      const history = this.getHistory();
      const filtered = history.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error removing search from history:", error);
    }
  }

  /**
   * Clear all search history
   */
  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  }

  /**
   * Fetch search history from server (Workers KV)
   * Falls back to localStorage if server request fails or user is not authenticated
   * Uses relative URL - Pages Function proxies to Worker preserving auth cookie
   */
  async getHistoryFromServer(): Promise<SearchHistoryItem[]> {
    try {
      const response = await fetch("/api/search-history", {
        credentials: "same-origin",
      });
      // 401 is expected when not authenticated - silently fall back
      if (response.status === 401) {
        return this.getHistory();
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = (await response.json()) as {
        success: boolean;
        data?: SearchHistoryItem[];
      };
      if (result.success && Array.isArray(result.data)) {
        // Update localStorage cache with server data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
        return result.data;
      }
    } catch (error) {
      // Only log non-auth errors
      console.debug("Using local search history:", error);
    }
    // Fallback to localStorage
    return this.getHistory();
  }

  /**
   * Add search to history - saves to both localStorage (immediate) and server (background)
   */
  async addSearchToServer(
    query: string,
    lat: number,
    lon: number,
  ): Promise<void> {
    // Immediate local update for fast UI
    this.addSearch(query, lat, lon);

    // Background sync to server
    try {
      await fetch("/api/search-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, lat, lon }),
        credentials: "same-origin",
      });
    } catch (error) {
      console.warn("Failed to save search to server:", error);
      // Local storage already has it, so user won't lose data
    }
  }

  /**
   * Remove search from history - removes from both localStorage and server
   */
  async removeSearchFromServer(id: string): Promise<void> {
    // Immediate local removal
    this.removeSearch(id);

    // Background sync to server
    try {
      await fetch(`/api/search-history/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
    } catch (error) {
      console.warn("Failed to remove search from server:", error);
    }
  }
}

export const searchHistory = new SearchHistoryManager();
export default searchHistory;
