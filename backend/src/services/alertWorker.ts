import { Alert } from '../models/Alert';
import fs from 'fs';
import path from 'path';

import { huaweiOBSService } from './huaweiOBS';
import { huaweiSMNService } from './huaweiSMN';
import { Server } from 'socket.io';

export class AlertWorker {
  private io: Server | null = null;
  private isRunning: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;

  initialize(io: Server) {
    this.io = io;
    this.start();
    console.info('[AlertWorker] Initialized and polling for pending tasks');
  }

  start() {
    if (this.pollInterval) return;
    // Poll every 10 seconds
    this.pollInterval = setInterval(() => this.processPendingTasks(), 10000);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Can be called manually to trigger an immediate run
  async triggerNow() {
    if (!this.isRunning) {
      await this.processPendingTasks();
    }
  }

  private async processPendingTasks() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      let hasMore = true;
      let processedCount = 0;
      const MAX_BATCH_SIZE = 50;

      while (hasMore && processedCount < MAX_BATCH_SIZE) {
        // Atomically find a pending alert and lock it for processing using aggregation pipeline update
        const alert = await Alert.findOneAndUpdate(
          {
            $or: [
              { imageUploadStatus: 'pending' },
              { smnNotificationStatus: 'pending' }
            ]
          },
          [
            {
              $set: {
                imageUploadStatus: {
                  $cond: { if: { $eq: ['$imageUploadStatus', 'pending'] }, then: 'processing', else: '$imageUploadStatus' }
                },
                smnNotificationStatus: {
                  $cond: { if: { $eq: ['$smnNotificationStatus', 'pending'] }, then: 'processing', else: '$smnNotificationStatus' }
                }
              }
            }
          ],
          { new: true }
        );

        if (!alert) {
          hasMore = false;
          break;
        }

        processedCount++;
        let saveRequired = false;

        // Process Image Upload
        if (alert.imageUploadStatus === 'processing') {
          try {
            let imageBuffer: Buffer | null = null;
            let localFilePath: string | null = null;

            // Try to read from local file first
            if (alert.imageUrl && alert.imageUrl.startsWith('/uploads/')) {
              localFilePath = path.join(__dirname, '../..', alert.imageUrl);
              if (fs.existsSync(localFilePath)) {
                imageBuffer = fs.readFileSync(localFilePath);
              }
            }

            // Fallback to base64 if local file not found or if imageUrl stores base64
            if (!imageBuffer && alert.imageUrl && alert.imageUrl.startsWith('base64:')) {
              const base64Data = alert.imageUrl.replace('base64:', '');
              imageBuffer = Buffer.from(base64Data, 'base64');
            }

            if (imageBuffer) {
              const uploadedUrl = await huaweiOBSService.uploadAlertImage(alert._id.toString(), imageBuffer, localFilePath);
              
              // Clean up the local file after successful OBS upload to save disk space
              if (localFilePath && fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
              }

              alert.imageUrl = uploadedUrl;
              alert.imageUploadStatus = 'completed';
              saveRequired = true;
            } else {
              console.warn(`[AlertWorker] Image source not found for alert ${alert._id}`);
              alert.imageUploadStatus = 'failed';
              saveRequired = true;
            }
          } catch (error) {
            console.error(`[AlertWorker] Failed to upload image for alert ${alert._id}:`, error);
            alert.imageUploadStatus = 'failed';
            saveRequired = true;
          }
        }

        // Process SMN Notification
        if (alert.smnNotificationStatus === 'processing') {
          try {
            const success = await huaweiSMNService.sendAlertSMS({
              threatType: alert.threatType,
              deviceId: alert.sentinelId,
              confidence: alert.confidence,
              location: alert.location,
              timestamp: alert.timestamp
            });
            alert.smnNotificationStatus = success ? 'completed' : 'failed';
            saveRequired = true;
          } catch (error) {
            console.error(`[AlertWorker] Failed to send SMS for alert ${alert._id}:`, error);
            alert.smnNotificationStatus = 'failed';
            saveRequired = true;
          }
        }

        if (saveRequired) {
          await alert.save();
          
          // Emit socket update if the image was just uploaded so the UI can refresh the image
          if (this.io && alert.imageUploadStatus === 'completed') {
            this.io.emit('alert-updated', alert.toJSON());
          }
        }
      }
    } catch (error) {
      console.error('[AlertWorker] Error processing pending tasks:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

export const alertWorker = new AlertWorker();
