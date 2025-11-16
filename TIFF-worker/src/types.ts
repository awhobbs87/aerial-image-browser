export interface Env {
	CLOUDFLARE_ACCOUNT_ID: string;
	CLOUDFLARE_API_TOKEN: string;
	CLOUDFLARE_IMAGES_ACCOUNT_HASH: string;
}

export interface TIFFMetadata {
	width: number;
	height: number;
	samplesPerPixel: number;
	bitsPerSample: number[];
	origin: number[];
	resolution: number[];
	photometricInterpretation: number;
	planarConfiguration: number;
	geoKeys?: Record<string, any>;
	[key: string]: any;
}

export interface ProcessingResponse {
	success: boolean;
	imageId?: string;
	metadataId?: string;
	metadata?: TIFFMetadata;
	imageUrl?: string;
	metadataUrl?: string;
	error?: string;
}

export interface CloudflareImagesResponse {
	success: boolean;
	result: {
		id: string;
		filename: string;
		uploaded: string;
		requireSignedURLs: boolean;
		variants: string[];
	};
	errors: any[];
	messages: any[];
}
