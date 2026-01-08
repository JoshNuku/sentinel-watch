import { Request, Response } from 'express';
import { Alert, Sentinel } from '../models';
import { SentinelStatus } from '../types';
import { huaweiSMNService } from '../services';
import { Server as SocketServer } from 'socket.io';

/**
 * Alert Controller
 * Handles all alert creation and retrieval operations
 * Critical: Coordinates between DB, WebSocket, and SMS notifications
 */

// Socket.io instance (will be injected from server.ts)
let io: SocketServer;

export const setSocketIO = (socketServer: SocketServer): void => {
  io = socketServer;
};

/**
 * POST /api/alerts
 * Create new alert from Raspberry Pi threat detection
 * 
 * CRITICAL WORKFLOW:
 * 1. Save alert to MongoDB
 * 2. Update Sentinel status to 'alert'
 * 3. Emit Socket.io event to dashboard (real-time)
 * 4. Send SMS via Huawei SMN
 */
export const createAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n=== ALERT CREATION REQUEST ===');
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📥 Headers:', req.headers['content-type']);
    
    const {
      sentinelId,
      threatType,
      confidence,
      location,
      timestamp
    } = req.body;

    // Validation
    if (!sentinelId || !threatType || !confidence || !location) {
      console.log('❌ Validation failed - missing fields');
      console.log('   sentinelId:', sentinelId);
      console.log('   threatType:', threatType);
      console.log('   confidence:', confidence);
      console.log('   location:', location);
      res.status(400).json({
        success: false,
        message: 'Missing required fields: sentinelId, threatType, confidence, location'
      });
      return;
    }

    if (confidence < 0 || confidence > 1) {
      res.status(400).json({
        success: false,
        message: 'Confidence must be between 0 and 1'
      });
      return;
    }

    if (!location.lat || !location.lng) {
      res.status(400).json({
        success: false,
        message: 'Location must include lat and lng'
      });
      return;
    }

    // Check if sentinel exists
    const sentinel = await Sentinel.findOne({ deviceId: sentinelId.toUpperCase() });
    console.log('🔍 Sentinel lookup for:', sentinelId.toUpperCase());
    console.log('   Found:', sentinel ? `${sentinel.deviceId} (${sentinel.status})` : 'NOT FOUND');
    
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
      isVerified: false
    });

    await alert.save();

    console.log(`🚨 NEW ALERT: ${threatType} detected by ${sentinelId} (${Math.round(confidence * 100)}% confidence)`);
    console.log('   Alert ID:', alert._id);
    console.log('   Location:', `${location.lat}, ${location.lng}`);

    // Step 2: Update Sentinel status to 'alert'
    sentinel.status = SentinelStatus.ALERT;
    sentinel.lastSeen = new Date();
    await sentinel.save();
    console.log('✅ Sentinel status updated to:', sentinel.status);

    // Step 3: Emit real-time Socket.io event to connected dashboards
    if (io) {
      const alertData = {
        alert: alert.toJSON(),
        sentinel: sentinel.toJSON()
      };
      io.emit('new-alert', alertData);
      console.log('📡 Alert broadcasted to connected dashboards via WebSocket');
      console.log('   Event:', 'new-alert');
      console.log('   Connected clients:', io.sockets.sockets.size);
    } else {
      console.warn('⚠️  Socket.io not initialized - alert not broadcasted');
    }

    // Step 4: Send SMS notification via Huawei SMN
    try {
      console.log('📱 Attempting to send SMS notification...');
      await huaweiSMNService.sendAlertSMS({
        threatType,
        deviceId: sentinelId,
        confidence,
        location,
        timestamp: alert.timestamp
      });
      console.log('✅ SMS notification sent successfully');
    } catch (smsError) {
      console.error('❌ SMS notification failed:', smsError);
      // Don't fail the request if SMS fails - alert is already saved
    }

    console.log('=== ALERT CREATION COMPLETE ===\n');

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Alert created and notifications sent',
      data: {
        alert,
        sentinel: {
          deviceId: sentinel.deviceId,
          status: sentinel.status,
          location: sentinel.location
        }
      }
    });
  } catch (error) {
    console.error('❌ Error creating alert:', error);
    
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
 * Used by dashboard to display alert feed
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

    // Build query
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

    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions: any = { [sortBy as string]: sortOrder };

    // Execute query
    const alerts = await Alert.find(query)
      .sort(sortOptions)
      .limit(limitNum)
      .skip(skip)
      .lean();

    const total = await Alert.countDocuments(query);

    console.log(`📋 Retrieved ${alerts.length} alerts (page ${pageNum}/${Math.ceil(total / limitNum)})`);

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
    console.error('❌ Error fetching alerts:', error);
    
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
    console.error('❌ Error fetching alert:', error);
    
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

    console.log(`✅ Alert ${id} verification status: ${alert.isVerified}`);

    // Broadcast update to dashboards
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
    console.error('❌ Error verifying alert:', error);
    
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

    // Get alerts from last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await Alert.countDocuments({ timestamp: { $gte: last24Hours } });

    // Group by threat type
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
    console.error('❌ Error fetching alert stats:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
