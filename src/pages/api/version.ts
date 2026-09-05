import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { VersionResponse } from '../../types/api';

const APP_VERSION = '4.0.0';

function shortenVersion(id: string | null | undefined): string {
  if (!id) return 'local';
  return id.slice(0, 8);
}

export const GET: APIRoute = async () => {
  const version = env.CF_VERSION_METADATA;
  const id = version?.id ?? null;
  const tag = version?.tag ?? null;
  const versionTimestamp = version?.timestamp ?? null;

  const response: VersionResponse = {
    appVersion: APP_VERSION,
    workerVersion: {
      id,
      tag,
      timestamp: versionTimestamp,
    },
    displayVersion: tag || shortenVersion(id),
    timestamp: Date.now(),
  };

  return new Response(JSON.stringify(response), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
  });
};
