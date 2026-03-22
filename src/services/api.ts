/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Service for Project ORION
 * Handles all backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Simple client-side cache + inflight dedupe to avoid spamming backend
const _inflightRequests = new Map<string, Promise<any>>();
const _responseCache: Record<string, { ts: number; data: any }> = {};
const CACHE_TTL = 5000; // ms

export interface Location {
  lat: number;
  lng: number;
}

export interface Sentinel {
  _id: string;
  deviceId: string;
  status: 'active' | 'inactive' | 'alert';
  location: Location;
  batteryLevel: number;
  lastSeen: string;
  ipAddress?: string;
  streamUrl?: string; // Direct video stream URL
  triggerType?: 'microphone' | 'remote' | 'ai';
  triggeredSensors?: string[];
}

export interface Alert {
  _id: string;
  sentinelId: string;
  threatType: 'Excavator' | 'Water Pump' | 'Dredge' | 'Person' | 'person' | 'car' | 'truck' | 'motorcycle' | 'bus' | 'excavator' | 'chainsaw' | 'speech' | 'animal' | 'unknown' | 'Vehicle';
  confidence: number;
  location: Location;
  timestamp: string;
  isVerified: boolean;
  imageUrl?: string;  // URL to saved alert image
  triggerType?: 'microphone' | 'remote' | 'ai';
  triggeredSensors?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AlertStatsResponse {
  success: boolean;
  data: {
    total: number;
    verified: number;
    unverified: number;
    last24Hours: number;
    byThreatType: Record<string, number>;
  };
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Sentinel API Methods
 */
export const sentinelAPI = {
  /**
   * Get all sentinels
   */
  getAll: async (status?: string): Promise<ApiResponse<Sentinel[]>> => {
    const query = status ? `?status=${status}` : '';
    return fetchAPI<ApiResponse<Sentinel[]>>(`/sentinels${query}`);
  },

  /**
   * Get specific sentinel by device ID
   */
  getById: async (deviceId: string): Promise<ApiResponse<Sentinel>> => {
    return fetchAPI<ApiResponse<Sentinel>>(`/sentinels/${deviceId}`);
  },

  /**
   * Update sentinel status
   */
  updateStatus: async (
    deviceId: string,
    status: 'active' | 'inactive' | 'alert'
  ): Promise<ApiResponse<Sentinel>> => {
    return fetchAPI<ApiResponse<Sentinel>>(`/sentinels/${deviceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Request stream start for a sentinel
   */
  // Prevent duplicate concurrent requests for the same sentinel
  _inflightRequestStream: new Map<string, Promise<ApiResponse<{ deviceId: string; streamUrl?: string }>>>(),
  requestStream: async (deviceId: string): Promise<ApiResponse<{ deviceId: string; streamUrl?: string }>> => {
    const key = deviceId;
    const existing = sentinelAPI._inflightRequestStream.get(key);
    if (existing) return existing;

    const p = fetchAPI<ApiResponse<{ deviceId: string; streamUrl?: string }>>(`/sentinels/${deviceId}/stream/start`, {
      method: 'POST',
    }).finally(() => {
      sentinelAPI._inflightRequestStream.delete(key);
    });

    sentinelAPI._inflightRequestStream.set(key, p);
    return p;
  },

  /**
   * Request stream stop for a sentinel
   */
  stopStream: async (deviceId: string): Promise<ApiResponse<{ message: string }>> => {
    return fetchAPI<ApiResponse<{ message: string }>>(`/sentinels/${deviceId}/stream/stop`, {
      method: 'POST',
    });
  },

  /**
   * Activate sentinel (enter INTRUDER mode for AI detection)
   * Call when user opens live feed
   */
  activate: async (deviceId: string): Promise<ApiResponse<{ mode: string; streamUrl: string }>> => {
    return fetchAPI<ApiResponse<{ mode: string; streamUrl: string }>>(`/sentinels/${deviceId}/activate`, {
      method: 'POST',
    });
  },

  /**
   * Deactivate sentinel (return to SENTRY mode)
   * Call when user closes live feed
   */
  deactivate: async (deviceId: string): Promise<ApiResponse<{ mode: string }>> => {
    return fetchAPI<ApiResponse<{ mode: string }>>(`/sentinels/${deviceId}/deactivate`, {
      method: 'POST',
    });
  },

  /**
   * Send keep-alive to prevent camera auto-stop
   * Call every 60 seconds while viewing stream
   */
  keepAlive: async (deviceId: string): Promise<ApiResponse<{ message: string }>> => {
    return fetchAPI<ApiResponse<{ message: string }>>(`/sentinels/${deviceId}/keepalive`, {
      method: 'POST',
    });
  },

  /**
   * Get Pi status directly (mode, camera state, etc.)
   */
  getPiStatus: async (deviceId: string): Promise<ApiResponse<{
    deviceId: string;
    mode: string;
    cameraActive: boolean;
    aiLoaded: boolean;
    streamIdleSeconds: number;
  }>> => {
    return fetchAPI<ApiResponse<{
      deviceId: string;
      mode: string;
      cameraActive: boolean;
      aiLoaded: boolean;
      streamIdleSeconds: number;
    }>>(`/sentinels/${deviceId}/pi-status`);
  },
};

/**
 * Alert API Methods
 */
export const alertAPI = {
  /**
   * Get all alerts with pagination
   */
  getAll: async (params?: {
    limit?: number;
    page?: number;
    sentinelId?: string;
    threatType?: string;
    isVerified?: boolean;
  }): Promise<PaginatedResponse<Alert>> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.sentinelId) queryParams.append('sentinelId', params.sentinelId);
    if (params?.threatType) queryParams.append('threatType', params.threatType);
    if (params?.isVerified !== undefined)
      queryParams.append('isVerified', params.isVerified.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const endpoint = `/alerts${query}`;

    // Return cached response if fresh
    const cached = _responseCache[endpoint];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Promise.resolve(cached.data as PaginatedResponse<Alert>);
    }

    // Deduplicate inflight requests
    const inflightKey = endpoint;
    const existing = _inflightRequests.get(inflightKey);
    if (existing) return existing;

    const p = fetchAPI<PaginatedResponse<Alert>>(endpoint)
      .then((res) => {
        _responseCache[endpoint] = { ts: Date.now(), data: res };
        return res;
      })
      .finally(() => {
        _inflightRequests.delete(inflightKey);
      });

    _inflightRequests.set(inflightKey, p);
    return p;
  },

  /**
   * Get alert statistics
   */
  getStats: async (): Promise<AlertStatsResponse> => {
    const endpoint = '/alerts/stats';

    const cached = _responseCache[endpoint];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Promise.resolve(cached.data as AlertStatsResponse);
    }

    const inflightKey = endpoint;
    const existing = _inflightRequests.get(inflightKey);
    if (existing) return existing;

    const p = fetchAPI<AlertStatsResponse>(endpoint)
      .then((res) => {
        _responseCache[endpoint] = { ts: Date.now(), data: res };
        return res;
      })
      .finally(() => _inflightRequests.delete(inflightKey));

    _inflightRequests.set(inflightKey, p);
    return p;
  },

  /**
   * Get specific alert by ID
   */
  getById: async (id: string): Promise<ApiResponse<Alert>> => {
    return fetchAPI<ApiResponse<Alert>>(`/alerts/${id}`);
  },

  /**
   * Verify an alert
   */
  verify: async (id: string, isVerified: boolean): Promise<ApiResponse<Alert>> => {
    return fetchAPI<ApiResponse<Alert>>(`/alerts/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ isVerified }),
    });
  },
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<{ success: boolean; uptime: number }> => {
  return fetchAPI('/health');
};

/**
 * Build video stream URL for a sentinel
 * Uses backend proxy to bypass ngrok warning page
 */
export const getStreamUrl = (sentinel: Sentinel): string | null => {
  // EXPERIMENTAL: Bypass ngrok completely if on the same local network
  const useLocalStream = import.meta.env.VITE_USE_LOCAL_STREAM === 'true';
  
  if (useLocalStream && sentinel.ipAddress) {
    console.log(`📡 Using direct local IP stream for ${sentinel.deviceId}: ${sentinel.ipAddress}`);
    return `http://${sentinel.ipAddress}:8080/stream`;
  }

  // Use backend proxy for ngrok URLs
  if (sentinel.streamUrl && sentinel.streamUrl.includes('ngrok')) {
    return `${API_BASE_URL}/stream/${sentinel.deviceId}`;
  }
  
  // If streamUrl is provided and not ngrok, use it directly
  if (sentinel.streamUrl) {
    return sentinel.streamUrl;
  }

  // If ipAddress is available as fallback
  if (sentinel.ipAddress) {
    return `http://${sentinel.ipAddress}:8080/stream`;
  }

  return null;
};

/**
 * Build absolute image URL for stored alert images.
 * If the provided `imagePath` is already an absolute URL, return it unchanged.
 * Otherwise prefix with `API_BASE_URL` so the frontend can load images served by the backend.
 */
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;

  // If API_BASE_URL includes the '/api' prefix, strip it so we point at the server root
  const apiRoot = API_BASE_URL.replace(/\/api$/, '') ;
  return `${apiRoot}${imagePath}`;
};
