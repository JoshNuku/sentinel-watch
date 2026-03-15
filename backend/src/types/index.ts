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
  EXCAVATOR = 'excavator',
  CHAINSAW = 'chainsaw',
  SPEECH = 'speech',
  ANIMAL = 'animal',
  UNKNOWN = 'unknown'
}

export enum TriggerType {
  MICROPHONE = 'microphone',
  REMOTE = 'remote',
  AI = 'ai'
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
  triggeredSensors?: string[]; // e.g. ['SOUND']
}
