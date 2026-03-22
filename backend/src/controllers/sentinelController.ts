import { Request, Response } from 'express';
import { Sentinel, Alert } from '../models';
import { SentinelStatus } from '../types';

/**
 * Sentinel Controller
 * Handles all sentinel device registration and management operations
 */

// Socket.io instance (will be injected from server.ts)
import { Server as SocketServer } from 'socket.io';
let io: SocketServer;

export const setSentinelSocketIO = (socketServer: SocketServer): void => {
  io = socketServer;
};

/**
 * Programmatic helper to request a Pi to create a public stream for a sentinel.
 * Returns an object describing success and streamUrl when available.
 */
export const initiateStream = async (deviceId: string): Promise<{ success: boolean; streamUrl?: string; message?: string }> => {
  try {
    const sentinel = await Sentinel.findOne({ deviceId: deviceId.toUpperCase() });
    if (!sentinel) return { success: false, message: 'Sentinel not found' };

    // Determine base URL for control endpoints
    let baseUrl: string | null = null;
    if (sentinel.streamUrl) {
      baseUrl = sentinel.streamUrl.replace('/stream', '');
    } else if (sentinel.ipAddress) {
      baseUrl = `http://${sentinel.ipAddress}:3000`;
    }

    if (!baseUrl) return { success: false, message: 'No known endpoint for sentinel' };

    try {
      await fetch(`${baseUrl}/control/request_stream`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
    } catch (fetchErr) {
      // non-fatal
      console.warn(`⚠ Failed to call Pi request_stream for ${deviceId}:`, fetchErr instanceof Error ? fetchErr.message : fetchErr);
    }

    // Poll DB for streamUrl to appear
    const timeoutMs = 30000; // 30s
    const pollInterval = 1500; // 1.5s
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const current = await Sentinel.findOne({ deviceId: deviceId.toUpperCase() });
      if (current && current.streamUrl) {
        return { success: true, streamUrl: current.streamUrl };
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, pollInterval));
    }

    return { success: false, message: 'Timed out waiting for sentinel to create stream URL' };
  } catch (err) {
    console.error('❌ Error in initiateStream:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
};

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
      streamUrl,
      triggerType
    } = req.body;

    // Helper: ensure ngrok stream URLs end with /stream
    const sanitizeStreamUrl = (url?: string | null): string | undefined => {
      if (!url) return undefined;
      try {
        const parsed = new URL(url);
        // Only force /stream for ngrok hostnames (covers ngrok.* domains)
        if (parsed.hostname.includes('ngrok')) {
          // normalize pathname and append '/stream' if missing
          const cleanPath = parsed.pathname.replace(/\/+$/g, '');
          if (!cleanPath.endsWith('/stream')) {
            parsed.pathname = (cleanPath === '/' || cleanPath === '') ? '/stream' : `${cleanPath}/stream`;
            return parsed.toString();
          }
        }
        return url;
      } catch (e) {
        // If URL parsing fails, return original value (let schema validation handle it)
        return url;
      }
    };

    const cleanedStreamUrl = sanitizeStreamUrl(streamUrl);

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
      sentinel.streamUrl = cleanedStreamUrl ?? sentinel.streamUrl;
      sentinel.triggerType = triggerType ?? sentinel.triggerType;

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
        streamUrl: cleanedStreamUrl,
        triggerType
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
    if (status) query.status = status;

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
      res.status(404).json({ success: false, message: `Sentinel ${deviceId} not found` });
      return;
    }

    res.status(200).json({ success: true, data: sentinel });
  } catch (error) {
    console.error('❌ Error fetching sentinel:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sentinel', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * PATCH /api/sentinels/:deviceId/status
 * Update sentinel status manually (from dashboard)
 */
export const updateSentinelStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { status, location, batteryLevel, triggerType } = req.body;

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

    if (location) updateData.location = location;
    if (batteryLevel !== undefined) updateData.batteryLevel = batteryLevel;
    if (triggerType) updateData.triggerType = triggerType;

    const sentinel = await Sentinel.findOneAndUpdate(
      { deviceId: deviceId.toUpperCase() },
      updateData,
      { new: true }
    );

    if (!sentinel) {
      res.status(404).json({ success: false, message: `Sentinel ${deviceId} not found` });
      return;
    }

    console.log(`🔄 Sentinel ${deviceId} status changed to ${status || 'unchanged'}`);

    // Emit status update to connected dashboards
    if (io && status) {
      io.emit('sentinel-status-update', {
        deviceId: sentinel.deviceId,
        status: sentinel.status,
        triggerType: sentinel.triggerType
      });
    }

    res.status(200).json({ success: true, message: 'Sentinel status updated', data: sentinel });
  } catch (error) {
    console.error('❌ Error updating sentinel status:', error);
    res.status(500).json({ success: false, message: 'Failed to update sentinel status', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * PUT /api/sentinels/:deviceId/status
 * Update sentinel status (called by Raspberry Pi heartbeat)
 * This is the endpoint the Pi calls every 60 seconds
 */
export const updateSentinelStatusPut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { status, location, batteryLevel, triggerType } = req.body;

    // Log incoming heartbeat for debugging
    console.log(`📥 Heartbeat PUT /api/sentinels/${deviceId}/status - body:`, JSON.stringify(req.body));

    // Basic validation: ensure location has numeric lat/lng when provided
    if (location && (typeof location.lat !== 'number' || typeof location.lng !== 'number')) {
      console.error('❌ Validation failed: invalid location in heartbeat', { deviceId, location });
      res.status(400).json({
        success: false,
        message: 'Valid location (lat, lng) is required and must be numbers'
      });
      return;
    }

    // Validate batteryLevel if provided
    if (batteryLevel !== undefined && (typeof batteryLevel !== 'number' || batteryLevel < 0 || batteryLevel > 100)) {
      console.error('❌ Validation failed: invalid batteryLevel in heartbeat', { deviceId, batteryLevel });
      res.status(400).json({
        success: false,
        message: 'batteryLevel must be a number between 0 and 100'
      });
      return;
    }

    // Validate status if provided
    if (status && !Object.values(SentinelStatus).includes(status)) {
      console.error('❌ Validation failed: invalid status in heartbeat', { deviceId, status });
      res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${Object.values(SentinelStatus).join(', ')}`
      });
      return;
    }

    const updateData: any = { lastSeen: new Date() };
    
    if (status) {
      updateData.status = status;
    }
    
    if (location) {
      updateData.location = location;
    }
    
    if (batteryLevel !== undefined) {
      updateData.batteryLevel = batteryLevel;
    }
    if (triggerType) {
      updateData.triggerType = triggerType;
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

    console.log(`\ud83d\udc93 Heartbeat from ${deviceId} - Status: ${sentinel.status}, Battery: ${sentinel.batteryLevel}%`);
    
    // Emit status update to connected dashboards
    if (io) {
      io.emit('sentinel-status-update', {
        deviceId: sentinel.deviceId,
        status: sentinel.status,
        batteryLevel: sentinel.batteryLevel,
        location: sentinel.location
        , triggerType: sentinel.triggerType
      });
    }

    res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    console.error('\u274c Error updating sentinel status:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * POST /api/sentinels/:deviceId/activate
 * Activate sentinel (enter INTRUDER mode) - Forwards to Raspberry Pi
 * Called when user opens live feed to enable AI detection
 */
export const activateSentinel = async (req: Request, res: Response): Promise<void> => {
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

    if (!sentinel.streamUrl) {
      res.status(400).json({
        success: false,
        message: `Sentinel ${deviceId} has no stream URL configured`
      });
      return;
    }

    // Extract base URL from stream URL (remove /stream suffix)
    const baseUrl = sentinel.streamUrl.replace('/stream', '');
    
    console.log(`\ud83d\udfe2 Activating sentinel ${deviceId} - calling ${baseUrl}/control/activate`);

    try {
      const response = await fetch(`${baseUrl}/control/activate`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json() as { mode: string; status?: string };
        console.log(`\u2705 Sentinel ${deviceId} activated - Mode: ${data.mode}`);
        
        // Update sentinel status in database
        sentinel.status = SentinelStatus.ALERT;
        sentinel.lastSeen = new Date();
        await sentinel.save();
        
        // Emit status update
        if (io) {
          io.emit('sentinel-status-update', {
            deviceId: sentinel.deviceId,
            status: sentinel.status
          });
        }
        
        res.status(200).json({
          success: true,
          message: `Sentinel ${deviceId} activated`,
          data: {
            mode: data.mode,
            streamUrl: sentinel.streamUrl
          }
        });
      } else {
        throw new Error(`Pi responded with status ${response.status}`);
      }
    } catch (fetchError) {
      console.error(`\u274c Failed to contact Pi for ${deviceId}:`, fetchError);
      res.status(503).json({
        success: false,
        message: `Failed to activate sentinel - device may be offline`,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('\u274c Error activating sentinel:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to activate sentinel',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * POST /api/sentinels/:deviceId/deactivate
 * Deactivate sentinel (return to SENTRY mode) - Forwards to Raspberry Pi
 * Called when user closes live feed to save battery
 */
export const deactivateSentinel = async (req: Request, res: Response): Promise<void> => {
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

    if (!sentinel.streamUrl) {
      res.status(400).json({
        success: false,
        message: `Sentinel ${deviceId} has no stream URL configured`
      });
      return;
    }

    // Extract base URL from stream URL
    const baseUrl = sentinel.streamUrl.replace('/stream', '');
    
    console.log(`\ud83d\udd34 Deactivating sentinel ${deviceId} - calling ${baseUrl}/control/deactivate`);

    try {
      const response = await fetch(`${baseUrl}/control/deactivate`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json() as { mode: string; status?: string };
        console.log(`\u2705 Sentinel ${deviceId} deactivated - Mode: ${data.mode}`);
        
        // Update sentinel status in database
        sentinel.status = SentinelStatus.ACTIVE;
        sentinel.lastSeen = new Date();
        await sentinel.save();
        
        // Emit status update
        if (io) {
          io.emit('sentinel-status-update', {
            deviceId: sentinel.deviceId,
            status: sentinel.status
          });
        }
        
        res.status(200).json({
          success: true,
          message: `Sentinel ${deviceId} deactivated`,
          data: { mode: data.mode }
        });
      } else {
        throw new Error(`Pi responded with status ${response.status}`);
      }
    } catch (fetchError) {
      console.error(`\u274c Failed to contact Pi for ${deviceId}:`, fetchError);
      res.status(503).json({
        success: false,
        message: `Failed to deactivate sentinel - device may be offline`,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('\u274c Error deactivating sentinel:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate sentinel',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * POST /api/sentinels/:deviceId/keepalive
 * Send keep-alive to sentinel to prevent camera auto-stop
 * Should be called every 60 seconds while user is viewing stream
 */
export const sendKeepAlive = async (req: Request, res: Response): Promise<void> => {
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

    if (!sentinel.streamUrl) {
      res.status(400).json({
        success: false,
        message: `Sentinel ${deviceId} has no stream URL configured`
      });
      return;
    }

    // Extract base URL from stream URL
    const baseUrl = sentinel.streamUrl.replace('/stream', '');

    try {
      const response = await fetch(`${baseUrl}/stream/keepalive`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        // Update lastSeen timestamp
        sentinel.lastSeen = new Date();
        await sentinel.save();
        
        res.status(200).json({
          success: true,
          message: 'Keep-alive sent'
        });
      } else {
        throw new Error(`Pi responded with status ${response.status}`);
      }
    } catch (fetchError) {
      console.error(`\u274c Keep-alive failed for ${deviceId}:`, fetchError);
      res.status(503).json({
        success: false,
        message: 'Keep-alive failed - device may be offline'
      });
    }
  } catch (error) {
    console.error('\u274c Error sending keep-alive:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send keep-alive',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * GET /api/sentinels/:deviceId/pi-status
 * Get current status from the Raspberry Pi directly
 */
export const getPiStatus = async (req: Request, res: Response): Promise<void> => {
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

    if (!sentinel.streamUrl) {
      res.status(400).json({
        success: false,
        message: `Sentinel ${deviceId} has no stream URL configured`
      });
      return;
    }

    // Extract base URL from stream URL
    const baseUrl = sentinel.streamUrl.replace('/stream', '');

    try {
      const response = await fetch(`${baseUrl}/status`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json() as { 
          mode: string; 
          camera_active: boolean; 
          ai_loaded: boolean; 
          stream_idle_seconds: number;
        };
        res.status(200).json({
          success: true,
          data: {
            deviceId: sentinel.deviceId,
            mode: data.mode,
            cameraActive: data.camera_active,
            aiLoaded: data.ai_loaded,
            streamIdleSeconds: data.stream_idle_seconds
          }
        });
      } else {
        throw new Error(`Pi responded with status ${response.status}`);
      }
    } catch (fetchError) {
      console.error(`\u274c Failed to get Pi status for ${deviceId}:`, fetchError);
      res.status(503).json({
        success: false,
        message: 'Failed to get Pi status - device may be offline'
      });
    }
  } catch (error) {
    console.error('\u274c Error getting Pi status:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get Pi status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * POST /api/sentinels/:deviceId/stream/start
 * Request stream start from a sentinel
 * Dashboard can use this to manually request feed from inactive sentinels
 */
export const requestStreamStart = async (req: Request, res: Response): Promise<void> => {
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

    console.log(`\ud83d\udcf9 Stream start requested for ${deviceId}`);

    // Determine base URL for control endpoints
    let baseUrl: string | null = null;
    if (sentinel.streamUrl) {
      baseUrl = sentinel.streamUrl.replace('/stream', '');
    } else if (sentinel.ipAddress) {
      // Fallback to local IP/port convention if available
      baseUrl = `http://${sentinel.ipAddress}:3000`;
    }

    if (!baseUrl) {
      res.status(400).json({
        success: false,
        message: 'No known endpoint for sentinel to request stream from'
      });
      return;
    }

    // Fire request to Pi to create a public stream (if supported)
    try {
      await fetch(`${baseUrl}/control/request_stream`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
    } catch (fetchErr) {
      // Log but continue to poll the DB for streamUrl — some Pi implementations
      // may return before the HTTP call completes or the tunnel is created.
      console.warn(`\u26A0 Failed to call Pi request_stream for ${deviceId}:`, fetchErr instanceof Error ? fetchErr.message : fetchErr);
    }

    // Poll the database for sentinel.streamUrl to appear
    const timeoutMs = 30000; // 30s
    const pollInterval = 2000; // 2s
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const current = await Sentinel.findOne({ deviceId: deviceId.toUpperCase() });
      if (current && current.streamUrl) {
        res.status(200).json({
          success: true,
          message: 'Stream URL available',
          data: {
            deviceId: current.deviceId,
            streamUrl: current.streamUrl
          }
        });
        return;
      }
      // wait
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, pollInterval));
    }

    // If we reach here, timed out
    res.status(504).json({
      success: false,
      message: 'Timed out waiting for sentinel to create stream URL'
    });
  } catch (error) {
    console.error('❌ Error requesting stream start:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to request stream start',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


/**
 * POST /api/sentinels/:deviceId/stream/stop
 * Request stream stop from a sentinel
 * Dashboard can use this to stop manual feed requests
 */
export const requestStreamStop = async (req: Request, res: Response): Promise<void> => {
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

    console.log(`🛑 Stream stop requested for ${deviceId}`);

    // Check for recent alerts — if any recent alerts exist for this sentinel, do NOT stop the stream.
    const recentWindowMs = 2 * 60 * 1000; // 2 minutes
    const recentThreshold = new Date(Date.now() - recentWindowMs);

    const recentAlertsCount = await Alert.countDocuments({
      sentinelId: deviceId.toUpperCase(),
      timestamp: { $gte: recentThreshold }
    });

    const activeAlertsCount = await Alert.countDocuments({
      sentinelId: deviceId.toUpperCase(),
      isVerified: false
    });

    if (sentinel.status === SentinelStatus.ALERT || recentAlertsCount > 0 || activeAlertsCount > 0) {
      console.log(`⛔ Not stopping stream for ${deviceId} — status=${sentinel.status}, recent=${recentAlertsCount}, activeUnverified=${activeAlertsCount}`);
      res.status(200).json({
        success: true,
        message: `Stream NOT stopped: active/unverified/recent alert(s) detected for ${deviceId}`
      });
      return;
    }

    // No recent alerts — safe to request stream stop on the Pi
    // Determine base URL for control endpoints
    let baseUrl: string | null = null;
    if (sentinel.streamUrl) {
      baseUrl = sentinel.streamUrl.replace('/stream', '');
    } else if (sentinel.ipAddress) {
      baseUrl = `http://${sentinel.ipAddress}:3000`;
    }

    if (!baseUrl) {
      console.warn(`⚠ No known endpoint for ${deviceId} to request stream stop`);
      res.status(200).json({ success: true, message: 'No Pi endpoint known — nothing to stop' });
      return;
    }

    try {
      // Prefer a dedicated stop endpoint if implemented
      const stopEndpoints = ['/control/stop_stream', '/control/deactivate', '/control/stop'];
      let stopped = false;

      for (const ep of stopEndpoints) {
        try {
          const url = `${baseUrl}${ep}`;
          console.log(`🛰 Calling Pi to stop stream: ${url}`);
          const response = await fetch(url, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true' } });
          if (response.ok) {
            stopped = true;
            console.log(`✅ Pi acknowledged stop at ${ep}`);
            break;
          }
        } catch (e) {
          // continue to next endpoint
        }
      }

      if (!stopped) {
        console.warn(`⚠ Pi did not acknowledge any stop endpoints for ${deviceId}`);
      }

      res.status(200).json({ success: true, message: `Stream stop request processed for ${deviceId}` });
    } catch (err) {
      console.error('❌ Error while requesting stream stop on Pi:', err);
      res.status(500).json({ success: false, message: 'Failed to request stream stop', error: err instanceof Error ? err.message : err });
    }
  } catch (error) {
    console.error('❌ Error requesting stream stop:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to request stream stop',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
