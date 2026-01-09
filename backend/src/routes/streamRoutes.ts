import { Router, Request, Response } from 'express';
import { Sentinel } from '../models';
import axios from 'axios';

const router = Router();

/**
 * GET /api/stream/:deviceId
 * Proxy video stream from Raspberry Pi through backend
 * This bypasses ngrok's browser warning page
 */
router.get('/:deviceId', async (req: Request, res: Response) => {
  let streamActive = false;
  
  try {
    const { deviceId } = req.params;
    
    // Find sentinel to get stream URL
    const sentinel = await Sentinel.findOne({ deviceId: deviceId.toUpperCase() });
    
    if (!sentinel || !sentinel.streamUrl) {
      res.status(404).json({
        success: false,
        message: 'Stream not available for this sentinel'
      });
      return;
    }

    console.log(`📹 Proxying stream for ${deviceId} from ${sentinel.streamUrl}`);

    // Fetch stream from ngrok URL
    // Important: Add ngrok-skip-browser-warning header to bypass the consent screen
    const response = await axios({
      method: 'GET',
      url: sentinel.streamUrl,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'Accept': 'multipart/x-mixed-replace, */*',
        'ngrok-skip-browser-warning': 'true',  // Bypass ngrok warning page
        'User-Agent': 'Mozilla/5.0 (compatible; SentinelWatch/1.0)'  // Some ngrok versions need a user agent
      }
    });

    // Forward headers
    res.setHeader('Content-Type', response.headers['content-type'] || 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'close');

    streamActive = true;

    // Handle client disconnect
    req.on('close', () => {
      console.log(`🔌 Client disconnected from stream: ${deviceId}`);
      if (response.data && !response.data.destroyed) {
        response.data.destroy();
      }
      streamActive = false;
    });

    // Handle stream errors
    response.data.on('error', (error: Error) => {
      console.error(`❌ Stream error for ${deviceId}:`, error.message);
      streamActive = false;
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Stream error' });
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    // Handle stream end
    response.data.on('end', () => {
      console.log(`✅ Stream ended for ${deviceId}`);
      streamActive = false;
      if (!res.writableEnded) {
        res.end();
      }
    });

    // Pipe the stream
    response.data.pipe(res);

  } catch (error) {
    console.error('❌ Stream proxy error:', error);
    streamActive = false;
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to proxy stream',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;
