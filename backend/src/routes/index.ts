import { Router, Request, Response } from 'express';
import sentinelRoutes from './sentinelRoutes';
import alertRoutes from './alertRoutes';
import streamRoutes from './streamRoutes';
import { authenticate } from '../middleware/auth';
import { registerSentinel, updateSentinelStatus, updateSentinelStatusPut } from '../controllers';
import { createAlert } from '../controllers/alertController';

const router = Router();

/**
 * API Routes Index
 * Centralized route management
 */

// Health check endpoint (public)
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Project ORION API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Public IoT device endpoints (no auth required for Raspberry Pi devices)
router.post('/sentinels/register', registerSentinel);
// PUT from Raspberry Pi heartbeat should use the dedicated PUT handler
router.put('/sentinels/:deviceId/status', updateSentinelStatusPut);
router.patch('/sentinels/:deviceId/status', updateSentinelStatus);
router.post('/alerts', createAlert);

// Stream proxy (public - no auth required for video access)
router.use('/stream', streamRoutes);

// Protected dashboard routes (require authentication)
router.use('/sentinels', authenticate, sentinelRoutes);
router.use('/alerts', authenticate, alertRoutes);

// 404 handler for undefined API routes
router.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

export default router;
