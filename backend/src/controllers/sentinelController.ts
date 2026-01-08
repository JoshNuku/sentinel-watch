import { Request, Response } from 'express';
import { Sentinel } from '../models';
import { SentinelStatus } from '../types';

/**
 * Sentinel Controller
 * Handles all sentinel device registration and management operations
 */

/**
 * POST /api/sentinels/register
 * Register or update sentinel device
 * Called by Raspberry Pi on startup or heartbeat
 */
export const registerSentinel = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      deviceId,
      location,
      batteryLevel,
      ipAddress,
      status,
      streamUrl
    } = req.body;

    // Validation
    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
      return;
    }

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Valid location (lat, lng) is required'
      });
      return;
    }

    // Find existing sentinel or create new one
    let sentinel = await Sentinel.findOne({ deviceId });

    if (sentinel) {
      // Update existing sentinel
      sentinel.location = location;
      sentinel.batteryLevel = batteryLevel ?? sentinel.batteryLevel;
      sentinel.lastSeen = new Date();
      sentinel.ipAddress = ipAddress ?? sentinel.ipAddress;
      sentinel.status = status ?? SentinelStatus.ACTIVE;
      sentinel.streamUrl = streamUrl ?? sentinel.streamUrl;

      await sentinel.save();

      console.log(`🔄 Sentinel ${deviceId} updated - Battery: ${sentinel.batteryLevel}%`);

      res.status(200).json({
        success: true,
        message: 'Sentinel updated successfully',
        data: sentinel
      });
    } else {
      // Create new sentinel
      sentinel = new Sentinel({
        deviceId,
        location,
        batteryLevel: batteryLevel ?? 100,
        lastSeen: new Date(),
        ipAddress,
        status: status ?? SentinelStatus.ACTIVE,
        streamUrl
      });

      await sentinel.save();

      console.log(`✅ New Sentinel registered: ${deviceId}`);

      res.status(201).json({
        success: true,
        message: 'Sentinel registered successfully',
        data: sentinel
      });
    }
  } catch (error) {
    console.error('❌ Error registering sentinel:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to register sentinel',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * GET /api/sentinels
 * Get all sentinels
 * Used by dashboard to display sentinel locations on map
 */
export const getAllSentinels = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }

    const sentinels = await Sentinel.find(query).sort({ lastSeen: -1 });

    console.log(`📡 Retrieved ${sentinels.length} sentinels`);

    res.status(200).json({
      success: true,
      count: sentinels.length,
      data: sentinels
    });
  } catch (error) {
    console.error('❌ Error fetching sentinels:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sentinels',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * GET /api/sentinels/:deviceId
 * Get specific sentinel by device ID
 */
export const getSentinelById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;

    const sentinel = await Sentinel.findOne({ deviceId: deviceId.toUpperCase() });

    if (!sentinel) {
      res.status(404).json({
        success: false,
        message: `Sentinel ${deviceId} not found`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: sentinel
    });
  } catch (error) {
    console.error('❌ Error fetching sentinel:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sentinel',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * PATCH /api/sentinels/:deviceId/status
 * Update sentinel status manually (for dashboard)
 */
export const updateSentinelStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { status, location, batteryLevel } = req.body;

    // Build update object
    const updateData: any = { lastSeen: new Date() };
    
    if (status) {
      if (!Object.values(SentinelStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${Object.values(SentinelStatus).join(', ')}`
        });
        return;
      }
      updateData.status = status;
    }
    
    if (location) {
      updateData.location = location;
    }
    
    if (batteryLevel !== undefined) {
      updateData.batteryLevel = batteryLevel;
    }

    const sentinel = await Sentinel.findOneAndUpdate(
      { deviceId: deviceId.toUpperCase() },
      updateData,
      { new: true }
    );

    if (!sentinel) {
      res.status(404).json({
        success: false,
        message: `Sentinel ${deviceId} not found`
      });
      return;
    }

    console.log(`🔄 Sentinel ${deviceId} status changed to ${status}`);

    res.status(200).json({
      success: true,
      message: 'Sentinel status updated',
      data: sentinel
    });
  } catch (error) {
    console.error('❌ Error updating sentinel status:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update sentinel status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
