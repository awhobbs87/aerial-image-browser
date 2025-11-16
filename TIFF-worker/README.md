# TIFF Processor Worker

A Cloudflare Worker that processes TIFF images by extracting metadata, converting to WebP format, and storing both in Cloudflare Images.

## Features

- Accepts TIFF file URLs via POST request
- Extracts comprehensive metadata including GeoTIFF information
- Converts TIFF images to full-resolution WebP format
- Stores both image and metadata in Cloudflare Images
- Returns URLs for accessing stored content

## Setup

### Prerequisites

- Node.js 18+ installed
- Cloudflare account with Images enabled
- Wrangler CLI installed

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your Cloudflare credentials:

You need to set up the following secrets:

```bash
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put CLOUDFLARE_IMAGES_ACCOUNT_HASH
```

To find these values:
- `CLOUDFLARE_ACCOUNT_ID`: Found in your Cloudflare dashboard URL or account settings
- `CLOUDFLARE_API_TOKEN`: Create a token with Images Write permissions in the API Tokens section
- `CLOUDFLARE_IMAGES_ACCOUNT_HASH`: Found in the Cloudflare Images dashboard

### Development

Run the worker locally:
```bash
npm run dev
```

### Deployment

Deploy to Cloudflare:
```bash
npm run deploy
```

## Usage

Send a POST request with the TIFF URL:

### Option 1: JSON Body
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/image.tif"}'
```

### Option 2: Query Parameter
```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev?url=https://example.com/image.tif"
```

### Response

```json
{
  "success": true,
  "imageId": "abc123",
  "metadataId": "def456",
  "metadata": {
    "width": 1024,
    "height": 768,
    "samplesPerPixel": 3,
    "bitsPerSample": [8, 8, 8],
    "origin": [0, 0],
    "resolution": [72, 72],
    "photometricInterpretation": 2,
    "planarConfiguration": 1,
    "geoKeys": {}
  },
  "imageUrl": "https://imagedelivery.net/your-hash/abc123/public",
  "metadataUrl": "https://imagedelivery.net/your-hash/def456/public"
}
```

## Technical Details

### TIFF Processing

The worker uses the `geotiff` library to:
- Parse TIFF/GeoTIFF files
- Extract raster data (pixel values)
- Read comprehensive metadata including geospatial information

### Image Conversion

Images are converted to WebP using:
- OffscreenCanvas API (available in Cloudflare Workers)
- Full quality setting (quality: 1.0) to preserve image fidelity
- Support for RGB, RGBA, and grayscale images

### Cloudflare Images Integration

Both the WebP image and metadata JSON are stored in Cloudflare Images:
- Images are uploaded via the Cloudflare API
- Each upload returns a unique ID
- Access via Cloudflare's CDN with the returned URLs

## Error Handling

The worker includes comprehensive error handling for:
- Invalid or missing URLs
- Failed TIFF fetches
- TIFF parsing errors
- Image conversion failures
- Cloudflare Images upload errors

All errors return a JSON response with `success: false` and an error message.

## Limitations

- Maximum file size is limited by Cloudflare Workers limits (typically 100MB for inbound requests)
- Processing time for very large TIFFs may approach Worker execution time limits
- Memory constraints may affect extremely large images

## License

ISC
