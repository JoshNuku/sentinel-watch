import { Router } from 'express';
import {
  getAllAlerts,
  getAlertById,
  verifyAlert,
  getAlertStats
} from '../controllers';

const router = Router();

/**
 * Alert Routes
 * Base path: /api/alerts
 */


// GET /api/alerts - Get all alerts with filtering and pagination
router.get('/', getAllAlerts);

// GET /api/alerts/stats - Get alert statistics
router.get('/stats', getAlertStats);

// GET /api/alerts/:id - Get specific alert
router.get('/:id', getAlertById);

// PATCH /api/alerts/:id/verify - Verify/unverify alert
router.patch('/:id/verify', verifyAlert);

export default router;
