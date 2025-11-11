export class ArcGISClient {
  constructor(private baseUrl: string) {}

  async queryByPoint(layerId: number, lon: number, lat: number) {
    const params = new URLSearchParams({
      f: "json",
      geometry: `${lon},${lat}`,
      geometryType: "esriGeometryPoint",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
    });

    const response = await fetch(`${this.baseUrl}/${layerId}/query?${params}`);
    if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);

    const data = (await response.json()) as { features?: any[] };
    return data.features || [];
  }

  async queryByBounds(
    layerId: number,
    west: number,
    south: number,
    east: number,
    north: number
  ) {
    const geometry = JSON.stringify({
      xmin: west,
      ymin: south,
      xmax: east,
      ymax: north,
      spatialReference: { wkid: 4326 },
    });

    const params = new URLSearchParams({
      f: "json",
      geometry,
      geometryType: "esriGeometryEnvelope",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
    });

    const response = await fetch(`${this.baseUrl}/${layerId}/query?${params}`);
    if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);

    const data = (await response.json()) as { features?: any[] };
    return data.features || [];
  }

  async getLayers() {
    const response = await fetch(`${this.baseUrl}/layers?f=json`);
    if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);
    return await response.json();
  }
}
