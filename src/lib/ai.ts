/**
 * AI Service for Workers AI integration
 * Handles search result enhancement and natural language search parsing
 */

// Types for geocoding results that come from Nominatim
export interface GeocodingResult {
  placeId: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

// Enhanced result with AI improvements
export interface EnhancedGeocodingResult extends GeocodingResult {
  formattedName: string;
  shortName: string;
  confidence: number;
  category: string;
}

// Parsed natural language search query
export interface ParsedSearchQuery {
  location: string;
  startYear?: number;
  endYear?: number;
  resolution?: "high" | "medium" | "low";
  imageType?: "aerial" | "ortho" | "digital";
  additionalContext?: string;
}

export class AIService {
  private ai: Ai;

  constructor(ai: Ai) {
    this.ai = ai;
  }

  /**
   * Enhance geocoding search results with AI
   * Formats results like Google Maps - clean, hierarchical location names
   */
  async enhanceSearchResults(
    query: string,
    results: GeocodingResult[],
  ): Promise<EnhancedGeocodingResult[]> {
    if (results.length === 0) {
      return [];
    }

    // Check if the user's query looks like a street address
    const queryLooksLikeAddress = /^\d+\s/.test(query.trim());

    const prompt = `You are a location formatting assistant. Format these Nominatim geocoding results like Google Maps does.

User searched for: "${query}"
${queryLooksLikeAddress ? "NOTE: User is searching for a STREET ADDRESS - preserve the street number and name!" : ""}

Raw Nominatim results:
${JSON.stringify(
  results.map((r, i) => ({ index: i, raw: r.displayName, type: r.type })),
  null,
  2,
)}

Format each result with Google Maps style:
- formattedName: Clean display name like "Battery Point, Hobart TAS" or "78 New Town Road, New Town TAS"
- shortName: Just the primary name like "Battery Point" or "78 New Town Rd"
- confidence: How well it matches the query (0.9+ exact, 0.7-0.9 partial, <0.7 weak)
- category: Type like "Suburb", "Street Address", "Town", "City", "Landmark", "Region"

Google Maps formatting rules:
1. For STREET ADDRESSES: "Number Street Name, Suburb TAS" (e.g., "78 New Town Road, New Town TAS")
   - ALWAYS include the street number if the user searched for one
   - If result is just a suburb but user searched for an address, format as "Number Street, Suburb TAS"
2. For suburbs/towns: "Name, Nearest City TAS" (e.g., "Sandy Bay, Hobart TAS")
3. For landmarks: "Landmark Name, Suburb TAS" (e.g., "MONA, Berriedale TAS")
4. NEVER include "Australia" - it's implied
5. Use "TAS" not "Tasmania"
6. Remove redundant parent regions

IMPORTANT: If user searched for "${query}" and results don't include that exact address, use the user's search query to construct the formatted name with the best matching suburb.

Respond with ONLY a JSON array:
[{"index": 0, "formattedName": "...", "shortName": "...", "confidence": 0.95, "category": "Street Address"}]`;

    try {
      const response = await this.ai.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that returns only valid JSON. Never include explanations or markdown formatting.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.1, // Low temperature for consistent output
      });

      const text = (response as { response?: string }).response || "";

      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("AI response did not contain valid JSON array:", text);
        return this.fallbackEnhancement(results);
      }

      const enhancements = JSON.parse(jsonMatch[0]) as Array<{
        index: number;
        formattedName: string;
        shortName: string;
        confidence: number;
        category: string;
      }>;

      // Merge AI enhancements with original results
      return enhancements
        .filter((e) => e.index < results.length)
        .map((enhancement) => ({
          ...results[enhancement.index],
          formattedName:
            enhancement.formattedName || results[enhancement.index].displayName,
          shortName:
            enhancement.shortName ||
            results[enhancement.index].displayName.split(",")[0],
          confidence: enhancement.confidence || 0.5,
          category: enhancement.category || results[enhancement.index].type,
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
    } catch (error) {
      console.error("AI enhancement failed:", error);
      return this.fallbackEnhancement(results);
    }
  }

  /**
   * Fallback enhancement when AI fails - formats like Google Maps
   */
  private fallbackEnhancement(
    results: GeocodingResult[],
  ): EnhancedGeocodingResult[] {
    return results.slice(0, 5).map((result) => {
      const parts = result.displayName.split(", ");

      // Extract key components
      const shortName = parts[0];

      // Build Google Maps style formatted name
      // Filter out redundant parts
      const cleanParts = parts.filter((p) => {
        const lower = p.toLowerCase();
        return (
          !lower.includes("australia") &&
          lower !== "tasmania" &&
          lower !== "tas" &&
          !lower.includes("local government area") &&
          !lower.includes("council")
        );
      });

      // Find suburb/city (usually 2nd or 3rd part)
      let formattedName = shortName;

      if (cleanParts.length >= 2) {
        // Check if first part looks like a street address
        const isAddress =
          /^\d+/.test(shortName) ||
          result.type === "house" ||
          result.type === "building";

        if (isAddress && cleanParts.length >= 3) {
          // Address format: "123 Street, Suburb TAS Postcode"
          const postcode = parts.find((p) => /^\d{4}$/.test(p.trim()));
          formattedName = `${cleanParts[0]}, ${cleanParts[1]} TAS${postcode ? ` ${postcode}` : ""}`;
        } else {
          // Place format: "Place, City TAS"
          formattedName = `${cleanParts[0]}, ${cleanParts[1]} TAS`;
        }
      } else {
        formattedName = `${shortName} TAS`;
      }

      // Determine category from type
      const categoryMap: Record<string, string> = {
        suburb: "Suburb",
        city: "City",
        town: "Town",
        village: "Town",
        house: "Street Address",
        building: "Building",
        residential: "Street Address",
        street: "Street",
        road: "Road",
        peak: "Landmark",
        water: "Landmark",
        park: "Park",
        administrative: "Region",
      };
      const category = categoryMap[result.type] || "Location";

      return {
        ...result,
        formattedName,
        shortName,
        confidence: result.importance,
        category,
      };
    });
  }

  /**
   * Parse a natural language search query into structured parameters
   * E.g., "Find images of 78 New Town Rd New Town Tas between 1920-1950 in high resolution"
   */
  async parseNaturalLanguageSearch(query: string): Promise<ParsedSearchQuery> {
    const prompt = `You are a search query parser for a Tasmania aerial photo browser. Parse the user's natural language query into structured search parameters.

User Query: "${query}"

Extract:
1. location: The address or place name to search (required)
2. startYear: Start year for date filter (optional, 1900-2024)
3. endYear: End year for date filter (optional, 1900-2024)
4. resolution: Image quality preference (optional: "high", "medium", or "low")
5. imageType: Type of imagery (optional: "aerial" for historical aerial photos, "ortho" for orthophotos, "digital" for digital imagery)
6. additionalContext: Any other relevant context from the query

Respond with ONLY valid JSON in this exact format:
{
  "location": "extracted location",
  "startYear": 1920,
  "endYear": 1950,
  "resolution": "high",
  "imageType": "aerial",
  "additionalContext": "any other context"
}

Notes:
- If no year range specified, omit startYear and endYear
- "high resolution", "detailed", "clear" = "high"
- "historical", "old", "vintage" photos typically mean aerial type and older years
- Default to Tasmania, Australia context
- For addresses, include street number and name`;

    try {
      const response = await this.ai.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that returns only valid JSON. Never include explanations or markdown formatting.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.1,
      });

      const text = (response as { response?: string }).response || "";

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("AI response did not contain valid JSON:", text);
        return { location: query };
      }

      const parsed = JSON.parse(jsonMatch[0]) as ParsedSearchQuery;

      // Validate and clean up the response
      return {
        location: parsed.location || query,
        startYear:
          parsed.startYear &&
          parsed.startYear >= 1900 &&
          parsed.startYear <= 2024
            ? parsed.startYear
            : undefined,
        endYear:
          parsed.endYear && parsed.endYear >= 1900 && parsed.endYear <= 2024
            ? parsed.endYear
            : undefined,
        resolution: ["high", "medium", "low"].includes(parsed.resolution || "")
          ? parsed.resolution
          : undefined,
        imageType: ["aerial", "ortho", "digital"].includes(
          parsed.imageType || "",
        )
          ? parsed.imageType
          : undefined,
        additionalContext: parsed.additionalContext,
      };
    } catch (error) {
      console.error("AI parsing failed:", error);
      // Fallback: just use the query as location
      return { location: query };
    }
  }

  /**
   * Generate a helpful response about search results
   */
  async generateSearchSummary(
    query: string,
    resultCount: number,
    dateRange?: { earliest?: string; latest?: string },
  ): Promise<string> {
    if (resultCount === 0) {
      return `No aerial photos found for "${query}". Try searching for a nearby landmark or broader area.`;
    }

    const prompt = `Generate a brief, helpful one-sentence summary for aerial photo search results.

Query: "${query}"
Results found: ${resultCount}
${dateRange?.earliest ? `Earliest photo: ${dateRange.earliest}` : ""}
${dateRange?.latest ? `Latest photo: ${dateRange.latest}` : ""}

Keep it under 100 characters. Be informative but concise.`;

    try {
      const response = await this.ai.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Provide brief, informative responses.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.3,
      });

      return (
        (response as { response?: string }).response?.trim() ||
        `Found ${resultCount} aerial photos for ${query}`
      );
    } catch (error) {
      console.error("AI summary failed:", error);
      return `Found ${resultCount} aerial photos for ${query}`;
    }
  }
}
