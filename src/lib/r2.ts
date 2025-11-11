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
}
