import http from 'node:http';
import { fromUrl } from 'geotiff';
import sharp from 'sharp';

const DEFAULT_PORT = 8788;
const DEFAULT_TILE_SIZE = 512;
const DEFAULT_WEBP_QUALITY = 86;
const MAX_JSON_BYTES = 1024 * 128;

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      return sendNoContent(response);
    }

    if (request.method === 'GET' && request.url === '/health') {
      return sendJson(response, 200, {
        success: true,
        data: {
          status: 'ok',
          service: 'tiff-tile-service',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (request.method === 'POST' && request.url === '/tiles/manifest') {
      const payload = await readJson(request);
      const normalized = normalizePayload(payload);
      const metadata = await readTiffMetadata(normalized.tiffUrl);

      return sendJson(response, 200, {
        success: true,
        manifest: buildManifest(normalized, metadata),
      });
    }

    if (request.method === 'POST' && request.url === '/tiles/generate') {
      const payload = await readJson(request);
      const normalized = normalizePayload(payload);
      const tile = normalizeTile(payload);
      const generated = await generateTile(normalized, tile);

      if (!generated) {
        return sendJson(response, 404, {
          success: false,
          error: {
            code: 'TILE_OUT_OF_RANGE',
            message: 'Tile coordinates are outside the generated pyramid.',
          },
        });
      }

      return sendBinary(response, 200, generated.buffer, {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Tile-Width': String(generated.width),
        'X-Tile-Height': String(generated.height),
      });
    }

    return sendJson(response, 404, {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint not found.' },
    });
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, {
      success: false,
      error: {
        code: 'TIFF_TILE_SERVICE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown tile service error.',
      },
    });
  }
});

const port = Number(process.env.PORT ?? DEFAULT_PORT);
server.listen(port, '0.0.0.0', () => {
  console.log(`TIFF tile service listening on http://127.0.0.1:${port}`);
});

async function generateTile(payload, tile) {
  const tiff = await fromUrl(payload.tiffUrl, { cache: true });
  const image = await tiff.getImage(0);
  const fullWidth = image.getWidth();
  const fullHeight = image.getHeight();
  const levels = buildTileLevels(fullWidth, fullHeight, payload.tileSize);
  const level = levels.find((item) => item.z === tile.z);

  if (!level || tile.x >= level.columns || tile.y >= level.rows) {
    return null;
  }

  const outputWidth = Math.min(payload.tileSize, level.width - tile.x * payload.tileSize);
  const outputHeight = Math.min(payload.tileSize, level.height - tile.y * payload.tileSize);
  if (outputWidth <= 0 || outputHeight <= 0) {
    return null;
  }

  const scaleX = fullWidth / level.width;
  const scaleY = fullHeight / level.height;
  const window = [
    Math.floor(tile.x * payload.tileSize * scaleX),
    Math.floor(tile.y * payload.tileSize * scaleY),
    Math.min(fullWidth, Math.ceil((tile.x * payload.tileSize + outputWidth) * scaleX)),
    Math.min(fullHeight, Math.ceil((tile.y * payload.tileSize + outputHeight) * scaleY)),
  ];

  const rgb = await image.readRGB({
    window,
    width: outputWidth,
    height: outputHeight,
    interleave: true,
    resampleMethod: 'bilinear',
  });

  const webp = await sharp(Buffer.from(rgb), {
    raw: {
      width: outputWidth,
      height: outputHeight,
      channels: 3,
    },
  })
    .webp({ quality: payload.quality })
    .toBuffer();

  return {
    buffer: webp,
    width: outputWidth,
    height: outputHeight,
  };
}

async function readTiffMetadata(tiffUrl) {
  const tiff = await fromUrl(tiffUrl, { cache: true });
  const image = await tiff.getImage(0);
  return {
    width: image.getWidth(),
    height: image.getHeight(),
  };
}

function buildManifest(payload, metadata) {
  return {
    photoId: payload.photoId,
    format: 'webp',
    width: metadata.width,
    height: metadata.height,
    tileSize: payload.tileSize,
    overlap: 0,
    levels: buildTileLevels(metadata.width, metadata.height, payload.tileSize),
    tileUrlTemplate: payload.tileUrlTemplate,
    source: {
      type: 'tiff',
      rangeUrl: payload.rangeUrl,
      supportsRange: true,
    },
  };
}

function buildTileLevels(width, height, tileSize) {
  let maxZ = 0;
  while (
    Math.ceil(width / 2 ** (maxZ + 1)) > tileSize ||
    Math.ceil(height / 2 ** (maxZ + 1)) > tileSize
  ) {
    maxZ += 1;
  }

  return Array.from({ length: maxZ + 1 }, (_, z) => {
    const divisor = 2 ** (maxZ - z);
    const levelWidth = Math.ceil(width / divisor);
    const levelHeight = Math.ceil(height / divisor);

    return {
      z,
      width: levelWidth,
      height: levelHeight,
      columns: Math.ceil(levelWidth / tileSize),
      rows: Math.ceil(levelHeight / tileSize),
    };
  });
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.byteLength;
    if (size > MAX_JSON_BYTES) {
      throw new Error('Request body is too large.');
    }

    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function normalizePayload(payload) {
  const tiffUrl = requiredString(payload.tiffUrl, 'tiffUrl');
  const photoId = requiredString(payload.photoId, 'photoId');
  const tileUrlTemplate = requiredString(payload.tileUrlTemplate, 'tileUrlTemplate');
  const rangeUrl = requiredString(payload.rangeUrl, 'rangeUrl');
  const tileSize = normalizePositiveInteger(payload.tileSize ?? DEFAULT_TILE_SIZE, 'tileSize');
  const quality = normalizePositiveInteger(payload.quality ?? DEFAULT_WEBP_QUALITY, 'quality');

  if (payload.format && payload.format !== 'webp') {
    throw new Error('Only WebP tile generation is supported.');
  }

  return {
    photoId,
    tiffUrl,
    tileUrlTemplate,
    rangeUrl,
    tileSize,
    quality: Math.min(Math.max(quality, 1), 100),
  };
}

function normalizeTile(payload) {
  return {
    z: normalizeNonNegativeInteger(payload.z, 'z'),
    x: normalizeNonNegativeInteger(payload.x, 'x'),
    y: normalizeNonNegativeInteger(payload.y, 'y'),
  };
}

function requiredString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function normalizePositiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return number;
}

function normalizeNonNegativeInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return number;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    ...corsHeaders(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function sendBinary(response, status, payload, headers) {
  response.writeHead(status, {
    ...corsHeaders(),
    ...headers,
    'Content-Length': String(payload.byteLength),
  });
  response.end(payload);
}

function sendNoContent(response) {
  response.writeHead(204, corsHeaders());
  response.end();
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
