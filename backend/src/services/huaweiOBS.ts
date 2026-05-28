import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

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
  async uploadAlertImage(alertId: string, imageBuffer: Buffer, localFilePath?: string | null): Promise<string> {
    if (this.isConfigured) {
      try {
        // REAL OBS IMPLEMENTATION (when credentials are present):
        const ObsClient = require('esdk-obs-nodejs');
        const serverUrl = this.config.endPoint.startsWith('http') 
          ? this.config.endPoint 
          : `https://${this.config.endPoint}`;

        const obsClient = new ObsClient({
          access_key_id: this.config.accessKey,
          secret_access_key: this.config.secretKey,
          server: serverUrl
        });

        const objectKey = `alerts/${alertId}.jpg`;
        console.info(`[HuaweiOBS] Starting real OBS Upload for alert: ${alertId} to bucket: ${this.config.bucketName}`);
        
        let uploadParams: any = {
          Bucket: this.config.bucketName,
          Key: objectKey,
          ContentType: 'image/jpeg'
        };

        // Bypass the esdk-obs-nodejs string conversion bug by avoiding raw Buffers in Body.
        // We either stream directly from the file path using SourceFile,
        // or wrap the buffer in a node Readable Stream with explicit ContentLength.
        if (localFilePath && fs.existsSync(localFilePath)) {
          console.info(`[HuaweiOBS] Bypassing buffer-to-string bug by uploading directly from filesystem path: ${localFilePath}`);
          uploadParams.SourceFile = localFilePath;
        } else {
          console.info(`[HuaweiOBS] Bypassing buffer-to-string bug by wrapping memory buffer in a Readable Stream of size ${imageBuffer.length}`);
          uploadParams.Body = Readable.from(imageBuffer);
          uploadParams.ContentLength = imageBuffer.length;
        }

        const result = await obsClient.putObject(uploadParams);

        if (result.CommonMsg && result.CommonMsg.Status < 300) {
          console.info(`[HuaweiOBS] Upload successful for alert: ${alertId}`);
          // Resolve public OBS URL
          return `https://${this.config.bucketName}.${this.config.endPoint}/${objectKey}`;
        } else {
          throw new Error(`OBS upload rejected with status: ${result.CommonMsg?.Status || 'unknown'}`);
        }
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
