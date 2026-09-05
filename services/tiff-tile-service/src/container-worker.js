import { Container, getRandom } from '@cloudflare/containers';

export class TiffTileContainer extends Container {
  defaultPort = 8788;
  sleepAfter = '10m';
  enableInternet = true;
  envVars = {
    NODE_ENV: 'production',
    PORT: '8788',
  };
  pingEndpoint = 'localhost/health';
}

export default {
  async fetch(request, env) {
    const instanceCount = Number(env.TIFF_TILE_CONTAINER_INSTANCES ?? 3);
    const container = await getRandom(env.TIFF_TILE_CONTAINER, instanceCount);
    return container.fetch(request);
  },
};
