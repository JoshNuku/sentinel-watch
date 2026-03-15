import mongoose, { Schema, Document } from 'mongoose';
import { ISentinel, SentinelStatus, Location } from '../types';

export interface SentinelDocument extends ISentinel, Document {}

const LocationSchema = new Schema<Location>(
  {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  { _id: false }
);

const SentinelSchema = new Schema<SentinelDocument>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: /^ORN-\d{3}$/,  // Format: ORN-001, ORN-002, etc.
    },
    status: {
      type: String,
      enum: Object.values(SentinelStatus),
      default: SentinelStatus.INACTIVE,
      required: true
    },
    location: {
      type: LocationSchema,
      required: true
    },
    batteryLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 100
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      required: true
    },
    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Optional field
          // Basic IP validation (IPv4)
          return /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
        },
        message: 'Invalid IP address format'
      }
    },
    streamUrl: {
      type: String,
      trim: true
    }
    ,
    triggerType: {
      type: String,
      trim: true,
      enum: ['microphone', 'remote', 'ai']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for faster queries
SentinelSchema.index({ deviceId: 1 });
SentinelSchema.index({ status: 1 });
SentinelSchema.index({ lastSeen: -1 });

// Virtual to check if sentinel is online (seen in last 5 minutes)
SentinelSchema.virtual('isOnline').get(function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastSeen > fiveMinutesAgo;
});

export const Sentinel = mongoose.model<SentinelDocument>('Sentinel', SentinelSchema);
