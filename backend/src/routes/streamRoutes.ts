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
    const response = await axios({
      method: 'GET',
      url: sentinel.streamUrl,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'Accept': 'multipart/x-mixed-replace, */*'
      }
    });

    // Forward headers
    res.setHeader('Content-Type', response.headers['content-type'] || 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Pipe the stream
    response.data.pipe(res);

    // Handle errors
    response.data.on('error', (error: Error) => {
      console.error(`❌ Stream error for ${deviceId}:`, error.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Stream error' });
      }
    });

  } catch (error) {
    console.error('❌ Stream proxy error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to proxy stream',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

export default router;
