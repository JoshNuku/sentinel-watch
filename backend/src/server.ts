import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import configurations and routes
import { connectDatabase } from './config/database';
import routes from './routes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { setSocketIO } from './controllers/alertController';
import { setSentinelSocketIO } from './controllers/sentinelController';
import { huaweiSMNService } from './services';
import { Sentinel } from './models';
import { SentinelStatus } from './types';
import path from 'path';

/**
 * PROJECT ORION - Backend Server
 * Command & Control Registry for AIoT Anti-Illegal Mining Surveillance
 */

// Initialize Express app
const app: Application = express();
const httpServer = createServer(app);

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// HTTP request logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting (prevent abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to API routes (not to Raspberry Pi endpoints)
app.use('/api/', limiter);

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================

const io = new SocketServer(httpServer, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:8080', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Dashboard connected: ${socket.id}`);
  console.log(`👥 Active connections: ${io.engine.clientsCount}`);

  // Send connection confirmation
  socket.emit('connected', {
    message: 'Connected to Project ORION Command & Control',
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // Handle dashboard requests
  socket.on('request-sentinel-status', () => {
    console.log('📡 Dashboard requested sentinel status');
    // Could emit current sentinel data here
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Dashboard disconnected: ${socket.id} - Reason: ${reason}`);
    console.log(`👥 Active connections: ${io.engine.clientsCount}`);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket.io error:', error);
  });
});

// Inject Socket.io instance into alert controller
setSocketIO(io);

// Inject Socket.io instance into sentinel controller
setSentinelSocketIO(io);

// ============================================
// API ROUTES
// ============================================

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Project ORION - Backend API',
    version: '1.0.0',
    description: 'AIoT Anti-Illegal Mining Surveillance System',
    endpoints: {
      health: '/api/health',
      sentinels: '/api/sentinels',
      alerts: '/api/alerts'
    },
    websocket: {
      status: 'enabled',
      connections: io.engine.clientsCount
    },
    services: {
      sms: huaweiSMNService.getStatus()
    }
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', routes);

// Serve uploaded alert images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// BACKGROUND JOBS
// ============================================

/**
 * Offline Detection Job
 * Marks sentinels as inactive if no heartbeat received for 90 seconds
 * Runs every 30 seconds
 */
const startOfflineDetectionJob = () => {
  setInterval(async () => {
    try {
      const threshold = new Date(Date.now() - 90000); // 90 seconds ago
      
      const result = await Sentinel.updateMany(
        { 
          lastSeen: { $lt: threshold }, 
          status: { $ne: SentinelStatus.INACTIVE } 
        },
        { status: SentinelStatus.INACTIVE }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`⚠️  Marked ${result.modifiedCount} sentinel(s) as inactive (no heartbeat for 90s)`);
        
        // Emit status update to connected dashboards
        const offlineSentinels = await Sentinel.find({ 
          lastSeen: { $lt: threshold },
          status: SentinelStatus.INACTIVE 
        });
        
        offlineSentinels.forEach(sentinel => {
          io.emit('sentinel-status-update', {
            deviceId: sentinel.deviceId,
            status: sentinel.status
          });
        });
      }
    } catch (error) {
      console.error('❌ Error in offline detection job:', error);
    }
  }, 30000); // Run every 30 seconds
  
  console.log('🔄 Offline detection job started (checking every 30s)');
};

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Unhandled Error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start background jobs
    startOfflineDetectionJob();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 PROJECT ORION - BACKEND SERVER STARTED');
      console.log('='.repeat(60));
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔌 WebSocket: Enabled (${io.engine.clientsCount} connections)`);
      console.log(`🗄️  Database: Connected`);
      const smsStatus = huaweiSMNService.getStatus() as { mode?: string };
      console.log(`📱 SMS Service: ${smsStatus.mode ?? 'unknown'} mode`);
      console.log(`🛡️  CORS: ${FRONTEND_URL}`);
      console.log('='.repeat(60) + '\n');
      console.log('📋 API Endpoints:');
      console.log('   GET    /api/health');
      console.log('   POST   /api/sentinels/register');
      console.log('   GET    /api/sentinels');
      console.log('   GET    /api/sentinels/:deviceId');
      console.log('   PATCH  /api/sentinels/:deviceId/status (dashboard)');
      console.log('   PUT    /api/sentinels/:deviceId/status (Pi heartbeat)');
      console.log('   POST   /api/sentinels/:deviceId/activate');
      console.log('   POST   /api/sentinels/:deviceId/deactivate');
      console.log('   POST   /api/sentinels/:deviceId/keepalive');
      console.log('   POST   /api/alerts');
      console.log('   GET    /api/alerts');
      console.log('   GET    /api/alerts/stats');
      console.log('   GET    /api/alerts/:id');
      console.log('   PATCH  /api/alerts/:id/verify');
      console.log('='.repeat(60) + '\n');
      console.log('✅ System ready to receive alerts from Sentinels\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

// Export for testing
export { app, httpServer, io };
