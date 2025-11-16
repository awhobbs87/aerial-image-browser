import { fromArrayBuffer } from 'geotiff';
import type { Env, TIFFMetadata, CloudflareImagesResponse } from './types';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			if (request.method !== 'POST') {
				return new Response('Method not allowed', { status: 405 });
			}

			const url = new URL(request.url);
			const contentType = request.headers.get('content-type');

			let tiffUrl: string;

			if (contentType?.includes('application/json')) {
				const body = await request.json() as { url: string };
				tiffUrl = body.url;
			} else if (url.searchParams.has('url')) {
				tiffUrl = url.searchParams.get('url')!;
			} else {
				return new Response('Missing TIFF URL. Provide it as JSON body or query parameter.', {
					status: 400,
				});
			}

			if (!tiffUrl) {
				return new Response('TIFF URL is required', { status: 400 });
			}

			console.log(`Processing TIFF from: ${tiffUrl}`);

			const tiffResponse = await fetch(tiffUrl);
			if (!tiffResponse.ok) {
				return new Response(`Failed to fetch TIFF: ${tiffResponse.statusText}`, {
					status: tiffResponse.status,
				});
			}

			const arrayBuffer = await tiffResponse.arrayBuffer();
			console.log(`Fetched TIFF, size: ${arrayBuffer.byteLength} bytes`);

			const tiff = await fromArrayBuffer(arrayBuffer);
			const image = await tiff.getImage();

			const metadata: TIFFMetadata = {
				width: image.getWidth(),
				height: image.getHeight(),
				samplesPerPixel: image.getSamplesPerPixel(),
				bitsPerSample: image.fileDirectory.BitsPerSample || [],
				origin: image.getOrigin(),
				resolution: image.getResolution(),
				photometricInterpretation: image.fileDirectory.PhotometricInterpretation,
				planarConfiguration: image.fileDirectory.PlanarConfiguration || 1,
			};

			try {
				metadata.geoKeys = image.getGeoKeys();
			} catch (e) {
				console.log('No GeoKeys found in TIFF');
			}

			console.log('Extracted metadata:', metadata);

			const rasters = await image.readRasters();
			console.log('Read rasters, bands:', rasters.length);

			const { width, height } = metadata;
			const rgbaData = convertToRGBA(rasters, width, height, metadata.samplesPerPixel);

			const webpBlob = await convertToWebP(rgbaData, width, height);
			console.log(`Converted to WebP, size: ${webpBlob.size} bytes`);

			const imageId = await uploadToCloudflareImages(webpBlob, env, 'image');
			console.log(`Uploaded image to Cloudflare Images: ${imageId}`);

			const metadataJson = JSON.stringify(metadata, null, 2);
			const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
			const metadataId = await uploadToCloudflareImages(metadataBlob, env, 'metadata');
			console.log(`Uploaded metadata to Cloudflare Images: ${metadataId}`);

			return new Response(
				JSON.stringify({
					success: true,
					imageId,
					metadataId,
					metadata,
					imageUrl: `https://imagedelivery.net/${env.CLOUDFLARE_IMAGES_ACCOUNT_HASH}/${imageId}/public`,
					metadataUrl: `https://imagedelivery.net/${env.CLOUDFLARE_IMAGES_ACCOUNT_HASH}/${metadataId}/public`,
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		} catch (error) {
			console.error('Error processing TIFF:', error);
			return new Response(
				JSON.stringify({
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}
	},
};

function convertToRGBA(
	rasters: any,
	width: number,
	height: number,
	samplesPerPixel: number
): Uint8ClampedArray {
	const pixelCount = width * height;
	const rgbaData = new Uint8ClampedArray(pixelCount * 4);

	if (samplesPerPixel >= 3) {
		const r = rasters[0];
		const g = rasters[1];
		const b = rasters[2];
		const a = samplesPerPixel === 4 ? rasters[3] : null;

		for (let i = 0; i < pixelCount; i++) {
			rgbaData[i * 4] = r[i];
			rgbaData[i * 4 + 1] = g[i];
			rgbaData[i * 4 + 2] = b[i];
			rgbaData[i * 4 + 3] = a ? a[i] : 255;
		}
	} else if (samplesPerPixel === 1) {
		const gray = rasters[0];
		for (let i = 0; i < pixelCount; i++) {
			const val = gray[i];
			rgbaData[i * 4] = val;
			rgbaData[i * 4 + 1] = val;
			rgbaData[i * 4 + 2] = val;
			rgbaData[i * 4 + 3] = 255;
		}
	}

	return rgbaData;
}

async function convertToWebP(
	rgbaData: Uint8ClampedArray,
	width: number,
	height: number
): Promise<Blob> {
	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		throw new Error('Failed to get canvas context');
	}

	const imageData = new ImageData(rgbaData, width, height);
	ctx.putImageData(imageData, 0, 0);

	const blob = await canvas.convertToBlob({
		type: 'image/webp',
		quality: 1.0,
	});

	return blob;
}

async function uploadToCloudflareImages(
	blob: Blob,
	env: Env,
	type: 'image' | 'metadata'
): Promise<string> {
	const formData = new FormData();
	const filename = type === 'image' ? 'image.webp' : 'metadata.json';
	formData.append('file', blob, filename);

	const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;

	const response = await fetch(uploadUrl, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
		},
		body: formData,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to upload to Cloudflare Images: ${errorText}`);
	}

	const result = await response.json() as CloudflareImagesResponse;

	if (!result.success) {
		throw new Error('Cloudflare Images upload failed');
	}

	return result.result.id;
}
