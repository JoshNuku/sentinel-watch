/**
 * WebSocket Service for Real-Time Updates
 * Connects to backend Socket.io server for live alert notifications
 */

import { io, Socket } from 'socket.io-client';
import { type Sentinel, type Alert } from './api';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

export interface NewAlertEvent {
  alert: Alert;
  sentinel: Sentinel;
}

export interface AlertVerifiedEvent {
  alertId: string;
  isVerified: boolean;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket server:', WS_URL);

    const token = localStorage.getItem('token');

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      auth: {
        token: token ? `Bearer ${token}` : undefined,
      },
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from WebSocket server');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('connected', (data) => {
      console.log('📡 Server confirmation:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.reconnectAttempts++;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Giving up.');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to WebSocket server');
    });
  }

  /**
   * Subscribe to new alert events
   */
  onNewAlert(callback: (data: NewAlertEvent) => void): () => void {
    if (!this.socket) {
      console.warn('WebSocket not connected. Call connect() first.');
      return () => {};
    }

    this.socket.on('new-alert', callback);

    // Return unsubscribe function
    return () => {
      this.socket?.off('new-alert', callback);
    };
  }

  /**
   * Subscribe to alert verified events
   */
  onAlertVerified(callback: (data: AlertVerifiedEvent) => void): () => void {
    if (!this.socket) {
      console.warn('WebSocket not connected. Call connect() first.');
      return () => {};
    }

    this.socket.on('alert-verified', callback);

    // Return unsubscribe function
    return () => {
      this.socket?.off('alert-verified', callback);
    };
  }

  /**
   * Request sentinel status update
   */
  requestSentinelStatus(): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected');
      return;
    }

    this.socket.emit('request-sentinel-status');
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection status details
   */
  getStatus(): {
    connected: boolean;
    socketId: string | undefined;
    reconnectAttempts: number;
  } {
    return {
      connected: this.socket?.connected || false,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Export singleton instance
export const wsService = new WebSocketService();

// Auto-connect when module is imported (optional)
// Uncomment the line below to auto-connect
// wsService.connect();
