import { Router } from 'express';
import {
  registerSentinel,
  getAllSentinels,
  getSentinelById,
  updateSentinelStatus
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

// PATCH /api/sentinels/:deviceId/status - Update sentinel status
router.patch('/:deviceId/status', updateSentinelStatus);

export default router;
