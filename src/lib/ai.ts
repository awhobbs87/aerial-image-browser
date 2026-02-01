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
   * Improves formatting, removes duplicates, and ranks by relevance
   */
  async enhanceSearchResults(
    query: string,
    results: GeocodingResult[],
  ): Promise<EnhancedGeocodingResult[]> {
    if (results.length === 0) {
      return [];
    }

    const prompt = `You are a location search assistant for Tasmania, Australia. Given the user's search query and a list of geocoding results, improve each result by:
1. Creating a clean, human-readable formatted name (remove redundant "Tasmania, Australia" suffixes, clean up formatting)
2. Creating a short name (just the main place name, 1-3 words)
3. Assigning a confidence score (0-1) based on how well it matches the query
4. Categorizing the location (suburb, town, city, street, landmark, region, etc.)

User Query: "${query}"

Raw Results (JSON):
${JSON.stringify(
  results.map((r) => ({ displayName: r.displayName, type: r.type })),
  null,
  2,
)}

Respond with ONLY valid JSON array in this exact format:
[
  {
    "index": 0,
    "formattedName": "Clean formatted name",
    "shortName": "Short name",
    "confidence": 0.95,
    "category": "suburb"
  }
]

Rules:
- Keep results in Tasmania-relevant order (prioritize exact matches)
- Confidence should be 0.9+ for exact matches, 0.7-0.9 for partial, below 0.7 for weak
- Remove results that are clearly not in Tasmania
- Maximum 5 results`;

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
   * Fallback enhancement when AI fails
   */
  private fallbackEnhancement(
    results: GeocodingResult[],
  ): EnhancedGeocodingResult[] {
    return results.slice(0, 5).map((result) => {
      // Simple formatting: remove trailing "Tasmania, Australia"
      const parts = result.displayName.split(", ");
      const filteredParts = parts.filter(
        (p) =>
          !p.toLowerCase().includes("tasmania") &&
          !p.toLowerCase().includes("australia"),
      );
      const formattedName =
        filteredParts.slice(0, 3).join(", ") || result.displayName;

      return {
        ...result,
        formattedName,
        shortName: parts[0],
        confidence: result.importance,
        category: result.type,
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
