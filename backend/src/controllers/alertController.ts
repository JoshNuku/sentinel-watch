import { Request, Response } from 'express';
import { Alert, Sentinel } from '../models';
import { SentinelStatus } from '../types';
import fs from 'fs';
import path from 'path';

import { Server as SocketServer } from 'socket.io';

/**
 * Alert Controller
 * Handles all alert creation and retrieval operations
 */

// Socket.io instance (will be injected from server.ts)
let io: SocketServer;

export const setSocketIO = (socketServer: SocketServer): void => {
  io = socketServer;
};

// Track active auto-reset timeouts to prevent memory leaks from overlapping alerts
const resetTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * POST /api/alerts
 * Create new alert from Raspberry Pi threat detection
 */
export const createAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sentinelId,
      threatType,
      confidence,
      location,
      timestamp,
      imageData, // Base64 encoded JPEG from Raspberry Pi
      triggerType,
      triggeredSensors
    } = req.body;

    // Validation
    if (!sentinelId || !threatType || !confidence || !location) {
      console.warn('[AlertController] Validation failed: missing sentinelId, threatType, confidence, or location');
      res.status(400).json({
        success: false,
        message: 'Missing required fields: sentinelId, threatType, confidence, location'
      });
      return;
    }

    const sentinel = await Sentinel.findOne({ deviceId: sentinelId.toUpperCase() });
    if (!sentinel) {
      res.status(404).json({
        success: false,
        message: `Sentinel ${sentinelId} not found. Please register the device first.`
      });
      return;
    }

    // Step 1: Create and save alert to MongoDB
    const alert = new Alert({
      sentinelId: sentinelId.toUpperCase(),
      threatType,
      confidence,
      location,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      isVerified: false,
      imageUrl: null,
      triggerType: triggerType ?? null,
      triggeredSensors: Array.isArray(triggeredSensors) ? triggeredSensors : [],
      imageUploadStatus: imageData ? 'pending' : 'none',
      smnNotificationStatus: 'pending'
    });

    if (imageData) {
      try {
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '').replace(/^base64:/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const uploadsDir = path.join(__dirname, '../../uploads/alerts');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filename = `${alert.sentinelId}_${alert._id}.jpg`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, buffer);
        
        alert.imageUrl = `/uploads/alerts/${filename}`;
      } catch (err) {
        console.error('[AlertController] Failed to save alert image locally:', err);
        // Fallback to storing raw base64 in database if file system fails
        alert.imageUrl = `base64:${imageData}`;
      }
    }

    await alert.save();
    console.info(`[AlertController] Created alert ${alert._id} for threat: ${threatType} from sentinel: ${sentinelId}`);

    // Step 2: Update Sentinel status to 'alert'
    sentinel.status = SentinelStatus.ALERT;
    sentinel.lastSeen = new Date();
    await sentinel.save();

    // Emit start-stream event if stream URL is present
    if (sentinel.streamUrl) {
      if (io) {
        io.emit('start-stream', { deviceId: sentinel.deviceId, streamUrl: sentinel.streamUrl });
      }
    }

    // Step 2.5: Auto-reset sentinel status after 2 minutes
    if (resetTimeouts.has(sentinelId)) {
      clearTimeout(resetTimeouts.get(sentinelId)!);
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        const updatedSentinel = await Sentinel.findOne({ deviceId: sentinelId.toUpperCase() });
        if (updatedSentinel && updatedSentinel.status === SentinelStatus.ALERT) {
          updatedSentinel.status = SentinelStatus.ACTIVE;
          await updatedSentinel.save();
          console.info(`[AlertController] Auto-reset sentinel ${sentinelId} status to active`);
          
          if (io) {
            io.emit('sentinel-status-update', {
              deviceId: updatedSentinel.deviceId,
              status: updatedSentinel.status
            });
          }
        }
      } catch (error) {
        console.error('[AlertController] Error auto-resetting sentinel status:', error);
      } finally {
        resetTimeouts.delete(sentinelId);
      }
    }, 2 * 60 * 1000); // 2 minutes
    
    resetTimeouts.set(sentinelId, timeoutId);

    // Step 3: Emit real-time Socket.io event to connected dashboards
    if (io) {
      const alertData = {
        alert: alert.toJSON(),
        sentinel: sentinel.toJSON()
      };
      io.emit('new-alert', alertData);
    }

    // Fast Response to Edge Sentinel (Prevents timeout on slow connections)
    res.status(201).json({
      success: true,
      message: 'Alert created and queued for processing',
      data: {
        alert: alert.toJSON(),
        sentinel: {
          deviceId: sentinel.deviceId,
          status: SentinelStatus.ALERT,
          location: sentinel.location
        }
      }
    });
    
    // Trigger the worker to start immediately (non-blocking)
    import('../services/alertWorker').then(({ alertWorker }) => alertWorker.triggerNow());
  } catch (error) {
    console.error('[AlertController] Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * GET /api/alerts
 * Get alert history with filtering and pagination
 */
export const getAllAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sentinelId,
      threatType,
      isVerified,
      limit = '50',
      page = '1',
      sortBy = 'timestamp',
      order = 'desc'
    } = req.query;

    const query: any = {};
    if (sentinelId) {
      query.sentinelId = (sentinelId as string).toUpperCase();
    }
    if (threatType) {
      query.threatType = threatType;
    }
    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions: any = { [sortBy as string]: sortOrder };

    const alerts = await Alert.find(query)
      .sort(sortOptions)
      .limit(limitNum)
      .skip(skip)
      .lean();

    const total = await Alert.countDocuments(query);

    res.status(200).json({
      success: true,
      data: alerts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('[AlertController] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * GET /api/alerts/:id
 * Get specific alert by ID
 */
export const getAlertById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const alert = await Alert.findById(id);

    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('[AlertController] Error fetching alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * PATCH /api/alerts/:id/verify
 * Mark alert as verified (by ranger/operator)
 */
export const verifyAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const alert = await Alert.findByIdAndUpdate(
      id,
      { isVerified: isVerified !== false },
      { new: true }
    );

    if (!alert) {
      res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
      return;
    }

    console.info(`[AlertController] Verified alert ${id}: status=${alert.isVerified}`);

    if (io) {
      io.emit('alert-verified', {
        alertId: id,
        isVerified: alert.isVerified
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert verification status updated',
      data: alert
    });
  } catch (error) {
    console.error('[AlertController] Error verifying alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify alert',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * GET /api/alerts/stats
 * Get alert statistics for dashboard
 */
export const getAlertStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const total = await Alert.countDocuments();
    const verified = await Alert.countDocuments({ isVerified: true });
    const unverified = await Alert.countDocuments({ isVerified: false });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const recent = await Alert.countDocuments({ timestamp: { $gte: startOfToday } });

    const byThreatType = await Alert.aggregate([
      {
        $group: {
          _id: '$threatType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        verified,
        unverified,
        last24Hours: recent,
        byThreatType: byThreatType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    console.error('[AlertController] Error fetching alert stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
