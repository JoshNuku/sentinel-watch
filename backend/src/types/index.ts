/**
 * Type Definitions for Project ORION
 */

export interface Location {
  lat: number;
  lng: number;
}

export enum SentinelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ALERT = 'alert'
}

export enum ThreatType {
  PERSON = 'person',
  CAR = 'car',
  TRUCK = 'truck',
  MOTORCYCLE = 'motorcycle',
  BUS = 'bus',
  ANIMAL = 'animal',
  UNKNOWN = 'unknown'
}

export enum TriggerType {
  // AI/Camera triggers
  AI = 'ai',
  CAMERA = 'camera',
  // Sensor triggers
  PIR = 'pir',
  VIBRATION = 'vibration',
  MOTION = 'motion',
  INFRARED = 'infrared',
  PRESSURE = 'pressure',
  LASER = 'laser',
  // Audio triggers
  MICROPHONE = 'microphone',
  SOUND = 'sound',
  // Other triggers
  REMOTE = 'remote',
  MANUAL = 'manual',
  GPIO = 'gpio'  // Generic GPIO (fallback)
}

export interface ISentinel {
  deviceId: string;
  status: SentinelStatus;
  location: Location;
  batteryLevel: number;
  lastSeen: Date;
  ipAddress?: string;
  streamUrl?: string;
  triggerType?: TriggerType;
}

export interface IAlert {
  sentinelId: string;
  threatType: ThreatType;
  confidence: number;
  location: Location;
  timestamp: Date;
  isVerified: boolean;
  imageUrl?: string;
  triggerType?: TriggerType;
  triggeredSensors?: string[]; // e.g. ['PIR','VIBRATION','SOUND'] or gpio pins
}
