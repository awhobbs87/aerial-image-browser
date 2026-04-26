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
  resolution?: 'high' | 'medium' | 'low';
  imageType?: 'aerial' | 'ortho' | 'digital';
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
${queryLooksLikeAddress ? 'NOTE: User is searching for a STREET ADDRESS - preserve the street number and name!' : ''}

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
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that returns only valid JSON. Never include explanations or markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.1, // Low temperature for consistent output
      });

      const text = (response as { response?: string }).response || '';

      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('AI response did not contain valid JSON array:', text);
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
          formattedName: enhancement.formattedName || results[enhancement.index].displayName,
          shortName: enhancement.shortName || results[enhancement.index].displayName.split(',')[0],
          confidence: enhancement.confidence || 0.5,
          category: enhancement.category || results[enhancement.index].type,
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
    } catch (error) {
      console.error('AI enhancement failed:', error);
      return this.fallbackEnhancement(results);
    }
  }

  /**
   * Fallback enhancement when AI fails - formats like Google Maps
   */
  private fallbackEnhancement(results: GeocodingResult[]): EnhancedGeocodingResult[] {
    return results.slice(0, 5).map((result) => {
      const parts = result.displayName.split(', ');

      // Extract key components
      const shortName = parts[0];

      // Build Google Maps style formatted name
      // Filter out redundant parts
      const cleanParts = parts.filter((p) => {
        const lower = p.toLowerCase();
        return (
          !lower.includes('australia') &&
          lower !== 'tasmania' &&
          lower !== 'tas' &&
          !lower.includes('local government area') &&
          !lower.includes('council')
        );
      });

      // Find suburb/city (usually 2nd or 3rd part)
      let formattedName = shortName;

      if (cleanParts.length >= 2) {
        // Check if first part looks like a street address
        const isAddress =
          /^\d+/.test(shortName) || result.type === 'house' || result.type === 'building';

        if (isAddress && cleanParts.length >= 3) {
          // Address format: "123 Street, Suburb TAS Postcode"
          const postcode = parts.find((p) => /^\d{4}$/.test(p.trim()));
          formattedName = `${cleanParts[0]}, ${cleanParts[1]} TAS${postcode ? ` ${postcode}` : ''}`;
        } else {
          // Place format: "Place, City TAS"
          formattedName = `${cleanParts[0]}, ${cleanParts[1]} TAS`;
        }
      } else {
        formattedName = `${shortName} TAS`;
      }

      // Determine category from type
      const categoryMap: Record<string, string> = {
        suburb: 'Suburb',
        city: 'City',
        town: 'Town',
        village: 'Town',
        house: 'Street Address',
        building: 'Building',
        residential: 'Street Address',
        street: 'Street',
        road: 'Road',
        peak: 'Landmark',
        water: 'Landmark',
        park: 'Park',
        administrative: 'Region',
      };
      const category = categoryMap[result.type] || 'Location';

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
1. location: The CLEAN address or place name ONLY - no extra words like "aerial", "photos", "images", "of", "find", "show me", etc. Just the geocodable place name or street address.
2. startYear: Start year for date filter (optional, 1900-2024)
3. endYear: End year for date filter (optional, 1900-2024)
4. resolution: Image quality preference (optional: "high", "medium", or "low")
5. imageType: Type of imagery (optional: "aerial" for historical aerial photos, "ortho" for orthophotos, "digital" for digital imagery)
6. additionalContext: Any other relevant context from the query

EXAMPLES:
- "Find aerial photos of Sandy Bay between 1940-1960" -> {"location": "Sandy Bay", "startYear": 1940, "endYear": 1960, "imageType": "aerial"}
- "High resolution images of Hobart CBD from the 1930s" -> {"location": "Hobart CBD", "startYear": 1930, "endYear": 1939, "resolution": "high"}
- "Show me old photos of 78 New Town Rd, New Town" -> {"location": "78 New Town Rd, New Town", "imageType": "aerial"}
- "Aerial views of Launceston around 1950" -> {"location": "Launceston", "startYear": 1945, "endYear": 1955, "imageType": "aerial"}
- "Battery Point historical photos" -> {"location": "Battery Point", "imageType": "aerial"}
- "photos near 42 Davey St Hobart" -> {"location": "42 Davey St, Hobart"}
- "what did Sandy Bay look like in the 1960s" -> {"location": "Sandy Bay", "startYear": 1960, "endYear": 1969}

Respond with ONLY valid JSON in this exact format:
{
  "location": "extracted location",
  "startYear": 1920,
  "endYear": 1950,
  "resolution": "high",
  "imageType": "aerial",
  "additionalContext": "any other context"
}

CRITICAL RULES:
- The "location" field must contain ONLY the place name or street address. Never include words like "aerial", "photos", "images", "views", "old", "find", "show", "between", year numbers, or any non-location text.
- For street addresses, include the street number, street name, and suburb (e.g., "78 New Town Rd, New Town")
- For suburbs/towns, just use the name (e.g., "Sandy Bay", "Hobart CBD", "Launceston")
- If no year range specified, omit startYear and endYear
- "high resolution", "detailed", "clear" = "high"
- "historical", "old", "vintage" photos typically mean aerial type and older years
- "around YEAR" means startYear = YEAR-5, endYear = YEAR+5
- "the 1930s" means startYear = 1930, endYear = 1939
- Default to Tasmania, Australia context`;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that returns only valid JSON. Never include explanations or markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.1,
      });

      const text = (response as { response?: string }).response || '';

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('AI response did not contain valid JSON:', text);
        return this.fallbackParseQuery(query);
      }

      const parsed = JSON.parse(jsonMatch[0]) as ParsedSearchQuery;

      // Validate and clean up the response
      return {
        location: parsed.location || query,
        startYear:
          parsed.startYear && parsed.startYear >= 1900 && parsed.startYear <= 2024
            ? parsed.startYear
            : undefined,
        endYear:
          parsed.endYear && parsed.endYear >= 1900 && parsed.endYear <= 2024
            ? parsed.endYear
            : undefined,
        resolution: ['high', 'medium', 'low'].includes(parsed.resolution || '')
          ? parsed.resolution
          : undefined,
        imageType: ['aerial', 'ortho', 'digital'].includes(parsed.imageType || '')
          ? parsed.imageType
          : undefined,
        additionalContext: parsed.additionalContext,
      };
    } catch (error) {
      console.error('AI parsing failed:', error);
      // Fallback: extract location using regex heuristics
      return this.fallbackParseQuery(query);
    }
  }

  /**
   * Fallback parser when AI is unavailable - uses regex heuristics
   * to strip non-location words from a natural language query
   */
  private fallbackParseQuery(query: string): ParsedSearchQuery {
    let cleanedLocation = query;

    // Extract year ranges first
    let startYear: number | undefined;
    let endYear: number | undefined;

    // Match patterns like "1940-1960", "between 1940 and 1960", "from 1940 to 1960"
    const yearRangeMatch = cleanedLocation.match(/(?:between\s+)?(\d{4})\s*[-–—to]+\s*(\d{4})/i);
    if (yearRangeMatch) {
      startYear = parseInt(yearRangeMatch[1]);
      endYear = parseInt(yearRangeMatch[2]);
      cleanedLocation = cleanedLocation
        .replace(yearRangeMatch[0], '')
        .replace(/\b(between|from|and)\b/gi, '');
    }

    // Match "the 1930s", "in the 1950s"
    const decadeMatch = cleanedLocation.match(/(?:the\s+)?(\d{4})s/i);
    if (decadeMatch && !startYear) {
      const decade = parseInt(decadeMatch[1]);
      startYear = decade;
      endYear = decade + 9;
      cleanedLocation = cleanedLocation.replace(decadeMatch[0], '');
    }

    // Match "around 1950", "circa 1950"
    const aroundYearMatch = cleanedLocation.match(/(?:around|circa|about|near)\s+(\d{4})/i);
    if (aroundYearMatch && !startYear) {
      const year = parseInt(aroundYearMatch[1]);
      startYear = year - 5;
      endYear = year + 5;
      cleanedLocation = cleanedLocation.replace(aroundYearMatch[0], '');
    }

    // Detect resolution
    let resolution: 'high' | 'medium' | 'low' | undefined;
    if (/\b(high\s+res|high\s+resolution|detailed|clear)\b/i.test(cleanedLocation)) {
      resolution = 'high';
    } else if (/\b(low\s+res|low\s+resolution|overview)\b/i.test(cleanedLocation)) {
      resolution = 'low';
    }

    // Strip common non-location words
    cleanedLocation = cleanedLocation
      .replace(
        /\b(find|show|show\s+me|get|search|search\s+for|look\s+for|looking\s+for|display|view|views|aerial|photos?|images?|pictures?|photography|historical|old|vintage|recent|modern|new|high\s+resolution|high\s+res|low\s+res|detailed|clear|overview|of|the|in|at|near|from|around|circa|about|between|and|to|with|for|me|my|some|any|what\s+did|look\s+like)\b/gi,
        ' ',
      )
      .replace(/\d{4}/g, '') // Remove standalone years
      .replace(/\s+/g, ' ')
      .replace(/^[\s,]+|[\s,]+$/g, '') // Trim leading/trailing commas and spaces
      .replace(/,\s*,/g, ',') // Clean double commas
      .trim();

    // If we stripped everything, fall back to the original query
    if (!cleanedLocation || cleanedLocation.length < 2) {
      cleanedLocation = query
        .replace(
          /\b(find|show|show\s+me|get|search|aerial|photos?|images?|historical|old|of|the)\b/gi,
          ' ',
        )
        .replace(/\s+/g, ' ')
        .trim();
    }

    return {
      location: cleanedLocation || query,
      startYear: startYear && startYear >= 1900 && startYear <= 2024 ? startYear : undefined,
      endYear: endYear && endYear >= 1900 && endYear <= 2024 ? endYear : undefined,
      resolution,
    };
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
${dateRange?.earliest ? `Earliest photo: ${dateRange.earliest}` : ''}
${dateRange?.latest ? `Latest photo: ${dateRange.latest}` : ''}

Keep it under 100 characters. Be informative but concise.`;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Provide brief, informative responses.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.3,
      });

      return (
        (response as { response?: string }).response?.trim() ||
        `Found ${resultCount} aerial photos for ${query}`
      );
    } catch (error) {
      console.error('AI summary failed:', error);
      return `Found ${resultCount} aerial photos for ${query}`;
    }
  }
}
