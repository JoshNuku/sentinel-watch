import { Router } from 'express';
import {
  registerSentinel,
  getAllSentinels,
  getSentinelById,
  updateSentinelStatus,
  updateSentinelStatusPut,
  activateSentinel,
  deactivateSentinel,
  sendKeepAlive,
  getPiStatus,
  requestStreamStart,
  requestStreamStop
} from '../controllers';

const router = Router();

/**
 * Sentinel Routes
 * Base path: /api/sentinels
 */

// POST /api/sentinels/register - Register or update sentinel device
router.post('/register', registerSentinel);

// GET /api/sentinels - Get all sentinels (with optional status filter)
router.get('/', getAllSentinels);

// GET /api/sentinels/:deviceId - Get specific sentinel
router.get('/:deviceId', getSentinelById);

// GET /api/sentinels/:deviceId/pi-status - Get status directly from Pi
router.get('/:deviceId/pi-status', getPiStatus);

// PATCH /api/sentinels/:deviceId/status - Update sentinel status (dashboard)
router.patch('/:deviceId/status', updateSentinelStatus);

// PUT /api/sentinels/:deviceId/status - Update sentinel status (Pi heartbeat)
router.put('/:deviceId/status', updateSentinelStatusPut);

// POST /api/sentinels/:deviceId/activate - Activate sentinel (enter INTRUDER mode)
router.post('/:deviceId/activate', activateSentinel);

// POST /api/sentinels/:deviceId/deactivate - Deactivate sentinel (return to SENTRY mode)
router.post('/:deviceId/deactivate', deactivateSentinel);

// POST /api/sentinels/:deviceId/keepalive - Send keep-alive to prevent camera auto-stop
router.post('/:deviceId/keepalive', sendKeepAlive);

// POST /api/sentinels/:deviceId/stream/start - Request stream start
router.post('/:deviceId/stream/start', requestStreamStart);

// POST /api/sentinels/:deviceId/stream/stop - Request stream stop
router.post('/:deviceId/stream/stop', requestStreamStop);

export default router;
