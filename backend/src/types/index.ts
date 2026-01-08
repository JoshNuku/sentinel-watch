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
  BUS = 'bus'
}

export interface ISentinel {
  deviceId: string;
  status: SentinelStatus;
  location: Location;
  batteryLevel: number;
  lastSeen: Date;
  ipAddress?: string;
  streamUrl?: string;
}

export interface IAlert {
  sentinelId: string;
  threatType: ThreatType;
  confidence: number;
  location: Location;
  timestamp: Date;
  isVerified: boolean;
}
