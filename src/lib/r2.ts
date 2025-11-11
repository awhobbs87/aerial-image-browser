export class R2Manager {
  constructor(
    private tiffBucket: R2Bucket,
    private thumbnailBucket: R2Bucket
  ) {}

  async hasTiff(imageName: string, layerId: number): Promise<boolean> {
    const key = `tiff/${layerId}/${imageName}.tif`;
    const obj = await this.tiffBucket.head(key);
    return obj !== null;
  }

  async hasThumbnail(imageName: string, layerId: number): Promise<boolean> {
    const key = `thumbnail/${layerId}/${imageName}.jpg`;
    const obj = await this.thumbnailBucket.head(key);
    return obj !== null;
  }

  async getTiff(imageName: string, layerId: number): Promise<R2ObjectBody | null> {
    const key = `tiff/${layerId}/${imageName}.tif`;
    return await this.tiffBucket.get(key);
  }

  async putTiff(imageName: string, layerId: number, data: ArrayBuffer | ReadableStream): Promise<void> {
    const key = `tiff/${layerId}/${imageName}.tif`;
    await this.tiffBucket.put(key, data, {
      httpMetadata: {
        contentType: "image/tiff",
      },
    });
  }

  async getThumbnail(imageName: string, layerId: number): Promise<R2ObjectBody | null> {
    const key = `thumbnail/${layerId}/${imageName}.jpg`;
    return await this.thumbnailBucket.get(key);
  }

  async putThumbnail(imageName: string, layerId: number, data: ArrayBuffer | ReadableStream): Promise<void> {
    const key = `thumbnail/${layerId}/${imageName}.jpg`;
    await this.thumbnailBucket.put(key, data, {
      httpMetadata: {
        contentType: "image/jpeg",
      },
    });
  }
}
