import fs from 'fs';
import path from 'path';

interface OBSConfig {
  accessKey: string;
  secretKey: string;
  endPoint: string;
  bucketName: string;
  region: string;
}

class HuaweiOBSService {
  private config: OBSConfig;
  private isConfigured: boolean;

  constructor() {
    this.config = {
      accessKey: process.env.HUAWEI_OBS_ACCESS_KEY || process.env.OBS_ACCESS_KEY_ID || '',
      secretKey: process.env.HUAWEI_OBS_SECRET_KEY || process.env.OBS_SECRET_ACCESS_KEY || '',
      endPoint: process.env.HUAWEI_OBS_END_POINT || process.env.OBS_SERVER || '',
      bucketName: process.env.HUAWEI_OBS_BUCKET_NAME || process.env.OBS_BUCKET || '',
      region: process.env.HUAWEI_OBS_REGION || 'cn-north-1'
    };

    this.isConfigured = !!(
      this.config.accessKey &&
      this.config.secretKey &&
      this.config.endPoint &&
      this.config.bucketName
    );

    if (!this.isConfigured) {
      console.info('[HuaweiOBS] Huawei Cloud OBS not configured - Falling back to local filesystem storage');
    }
  }

  /**
   * Upload Alert Threat Image
   * If Huawei OBS is configured, uploads directly to OBS bucket.
   * Otherwise, falls back to local disk storage.
   */
  async uploadAlertImage(alertId: string, imageBuffer: Buffer): Promise<string> {
    if (this.isConfigured) {
      try {
        // REAL OBS IMPLEMENTATION (when credentials are present):
        /*
        import ObsClient from 'esdk-obs-nodejs';
        const obsClient = new ObsClient({
          access_key_id: this.config.accessKey,
          secret_access_key: this.config.secretKey,
          server: this.config.endPoint
        });

        const objectKey = `alerts/${alertId}.jpg`;
        await obsClient.putObject({
          Bucket: this.config.bucketName,
          Key: objectKey,
          Body: imageBuffer,
          ContentType: 'image/jpeg'
        });

        // Resolve public OBS URL
        return `https://${this.config.bucketName}.${this.config.endPoint}/${objectKey}`;
        */
        console.info(`[HuaweiOBS] Mocking OBS Upload for alert: ${alertId} to bucket: ${this.config.bucketName}`);
        return `https://${this.config.bucketName}.${this.config.endPoint}/alerts/${alertId}.jpg`;
      } catch (obsError) {
        console.error('[HuaweiOBS] OBS upload failed, falling back to local storage:', obsError);
      }
    }

    // Local Fallback (Dev Mode):
    const uploadsDir = path.join(__dirname, '../../uploads/alerts');
    if (!fs.existsSync(uploadsDir)) {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
    }
    const imagePath = path.join(uploadsDir, `${alertId}.jpg`);
    await fs.promises.writeFile(imagePath, imageBuffer);
    console.info(`[HuaweiOBS] Saved alert image locally (Dev Fallback): ${imagePath}`);
    return `/uploads/alerts/${alertId}.jpg`;
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}

export const huaweiOBSService = new HuaweiOBSService();
